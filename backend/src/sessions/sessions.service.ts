import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { AuditActorType, AuditEventType, SessionStatus } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

type ActiveSessionCache = {
  sessionId: string;
  userId: string;
  idleExpiresAt: string;
};

@Injectable()
export class SessionsService {
  private readonly idleMinutes = Number(process.env.SESSION_IDLE_MINUTES || 15);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly auditService: AuditService
  ) {}

  private getActiveSessionKey(userId: string) {
    return `securecourse:active-session:user:${userId}`;
  }

  private getSessionStateKey(sessionId: string) {
    return `securecourse:session:${sessionId}`;
  }

  private getIdleTtlSeconds() {
    return this.idleMinutes * 60;
  }

  async createSession(input: {
    userId: string;
    accessTokenId?: string | null;
    sessionId: string;
    deviceId?: string;
    deviceFingerprint?: string;
    deviceLabel?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const currentActive = await this.redis.get<ActiveSessionCache>(this.getActiveSessionKey(input.userId));

    if (currentActive?.sessionId) {
      await this.forceReplaceSession(input.userId, currentActive.sessionId, input.sessionId);
    }

    const idleExpiresAt = new Date(Date.now() + this.getIdleTtlSeconds() * 1000);

    const session = await this.prisma.userSession.create({
      data: {
        id: input.sessionId,
        userId: input.userId,
        accessTokenId: input.accessTokenId,
        status: SessionStatus.ACTIVE,
        deviceId: input.deviceId,
        deviceFingerprint: input.deviceFingerprint,
        deviceLabel: input.deviceLabel,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        idleExpiresAt
      }
    });

    await this.redis.set(
      this.getActiveSessionKey(input.userId),
      {
        sessionId: session.id,
        userId: input.userId,
        idleExpiresAt: idleExpiresAt.toISOString()
      },
      this.getIdleTtlSeconds()
    );

    await this.redis.set(
      this.getSessionStateKey(session.id),
      {
        userId: input.userId,
        active: true
      },
      this.getIdleTtlSeconds()
    );

    return session;
  }

  async assertActiveSession(userId: string, sessionId: string) {
    const activeSession = await this.redis.get<ActiveSessionCache>(this.getActiveSessionKey(userId));

    if (!activeSession || activeSession.sessionId !== sessionId) {
      throw new UnauthorizedException("Session is not active for this user.");
    }

    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId }
    });

    if (!session || session.userId !== userId || session.status !== SessionStatus.ACTIVE) {
      throw new UnauthorizedException("Session record is invalid or revoked.");
    }

    if (session.idleExpiresAt.getTime() < Date.now()) {
      await this.revokeSession(sessionId, "idle_timeout");
      throw new UnauthorizedException("Session expired due to inactivity.");
    }

    return session;
  }

  async heartbeat(userId: string, sessionId: string) {
    const session = await this.assertActiveSession(userId, sessionId);
    const idleExpiresAt = new Date(Date.now() + this.getIdleTtlSeconds() * 1000);

    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: {
        lastSeenAt: new Date(),
        idleExpiresAt
      }
    });

    await this.redis.set(
      this.getActiveSessionKey(userId),
      {
        sessionId,
        userId,
        idleExpiresAt: idleExpiresAt.toISOString()
      },
      this.getIdleTtlSeconds()
    );

    await this.redis.set(
      this.getSessionStateKey(sessionId),
      {
        userId,
        active: true
      },
      this.getIdleTtlSeconds()
    );

    await this.auditService.record({
      actorId: userId,
      actorType: AuditActorType.USER,
      eventType: AuditEventType.SESSION_HEARTBEAT,
      entityType: "user_session",
      entityId: sessionId,
      sessionId
    });

    return {
      ok: true,
      sessionId,
      idleExpiresAt
    };
  }

  async revokeSession(sessionId: string, reason: string) {
    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      throw new NotFoundException("Session not found.");
    }

    if (session.status !== SessionStatus.ACTIVE) {
      return session;
    }

    const revoked = await this.prisma.userSession.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.REVOKED,
        revokedAt: new Date(),
        revokedReason: reason
      }
    });

    await this.redis.del(this.getSessionStateKey(sessionId));

    const active = await this.redis.get<ActiveSessionCache>(this.getActiveSessionKey(session.userId));
    if (active?.sessionId === sessionId) {
      await this.redis.del(this.getActiveSessionKey(session.userId));
    }

    await this.auditService.record({
      actorId: session.userId,
      actorType: AuditActorType.USER,
      eventType: AuditEventType.SESSION_REVOKED,
      entityType: "user_session",
      entityId: sessionId,
      sessionId,
      metadata: {
        reason
      }
    });

    return revoked;
  }

  async logout(userId: string, sessionId: string) {
    const session = await this.assertActiveSession(userId, sessionId);

    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.LOGGED_OUT,
        revokedAt: new Date(),
        revokedReason: "logout"
      }
    });

    await this.redis.del(this.getSessionStateKey(sessionId));
    await this.redis.del(this.getActiveSessionKey(userId));

    await this.auditService.record({
      actorId: userId,
      actorType: AuditActorType.USER,
      eventType: AuditEventType.LOGOUT,
      entityType: "user_session",
      entityId: session.id,
      sessionId: session.id
    });

    return {
      ok: true
    };
  }

  async listActiveSessions() {
    return this.prisma.userSession.findMany({
      where: {
        status: SessionStatus.ACTIVE
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true
          }
        }
      },
      orderBy: {
        lastSeenAt: "desc"
      }
    });
  }

  private async forceReplaceSession(userId: string, previousSessionId: string, replacementSessionId: string) {
    const updated = await this.prisma.userSession.updateMany({
      where: {
        id: previousSessionId,
        userId,
        status: SessionStatus.ACTIVE
      },
      data: {
        status: SessionStatus.REPLACED,
        revokedAt: new Date(),
        revokedReason: "replaced_by_new_login",
        replacedBySessionId: replacementSessionId
      }
    });

    if (updated.count === 0) {
      throw new ConflictException("Unable to replace current active session.");
    }

    await this.redis.del(this.getSessionStateKey(previousSessionId));

    await this.auditService.record({
      actorId: userId,
      actorType: AuditActorType.USER,
      eventType: AuditEventType.SESSION_REPLACED,
      entityType: "user_session",
      entityId: previousSessionId,
      sessionId: previousSessionId,
      metadata: {
        replacementSessionId
      }
    });
  }
}
