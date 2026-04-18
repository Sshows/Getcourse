import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuditActorType, AuditEventType, Role, SessionStatus, UserStatus } from "@prisma/client";
import { randomUUID } from "crypto";
import { AuditService } from "../audit/audit.service";
import { verifyPassword } from "../common/utils/hash.util";
import { PrismaService } from "../prisma/prisma.service";
import { LoginAdminDto } from "./dto/login-admin.dto";

@Injectable()
export class AdminAuthService {
  private readonly sessionHours = Number(process.env.ADMIN_SESSION_HOURS || 12);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  private getSessionExpiry() {
    return new Date(Date.now() + this.sessionHours * 60 * 60 * 1000);
  }

  private async markSessionExpired(sessionId: string) {
    await this.prisma.adminSession.updateMany({
      where: {
        id: sessionId,
        status: SessionStatus.ACTIVE
      },
      data: {
        status: SessionStatus.EXPIRED,
        revokedAt: new Date(),
        revokedReason: "admin_session_expired"
      }
    });
  }

  async login(dto: LoginAdminDto, metadata: { ipAddress?: string; userAgent?: string }) {
    const login = dto.login.toLowerCase().trim();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: login }, { username: login }]
      }
    });

    const hasValidRole = user?.role === Role.ADMIN || user?.role === Role.MANAGER;
    const hasValidPassword = verifyPassword(dto.password, user?.passwordHash);

    if (!user || !hasValidRole || user.status !== UserStatus.ACTIVE || !hasValidPassword) {
      await this.auditService.record({
        actorType: AuditActorType.ANONYMOUS,
        eventType: AuditEventType.LOGIN_FAILED,
        entityType: "admin_auth",
        metadata: {
          login
        },
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent
      });

      throw new UnauthorizedException("Invalid admin credentials.");
    }

    const session = await this.prisma.adminSession.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        status: SessionStatus.ACTIVE,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        expiresAt: this.getSessionExpiry()
      }
    });

    await this.auditService.record({
      actorId: user.id,
      actorType: AuditActorType.ADMIN,
      eventType: AuditEventType.LOGIN_SUCCEEDED,
      entityType: "admin_session",
      entityId: session.id,
      sessionId: session.id,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        role: user.role
      },
      session: {
        id: session.id,
        expiresAt: session.expiresAt
      }
    };
  }

  async assertAdminSession(sessionId: string) {
    const session = await this.prisma.adminSession.findUnique({
      where: { id: sessionId },
      include: {
        user: true
      }
    });

    if (!session || session.status !== SessionStatus.ACTIVE) {
      throw new UnauthorizedException("Admin session is invalid.");
    }

    if (session.expiresAt.getTime() < Date.now()) {
      await this.markSessionExpired(session.id);
      throw new UnauthorizedException("Admin session expired.");
    }

    if (session.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("Admin user is blocked.");
    }

    if (session.user.role !== Role.ADMIN && session.user.role !== Role.MANAGER) {
      throw new UnauthorizedException("User does not have admin access.");
    }

    await this.prisma.adminSession.update({
      where: { id: session.id },
      data: {
        lastSeenAt: new Date()
      }
    });

    return session;
  }

  async getSessionView(sessionId: string) {
    const session = await this.assertAdminSession(sessionId);

    return {
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        username: session.user.username,
        fullName: session.user.fullName,
        role: session.user.role
      },
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
        lastSeenAt: session.lastSeenAt
      }
    };
  }

  async logout(sessionId: string) {
    const session = await this.prisma.adminSession.findUnique({
      where: { id: sessionId },
      include: {
        user: true
      }
    });

    if (!session) {
      return { ok: true };
    }

    if (session.status === SessionStatus.ACTIVE) {
      await this.prisma.adminSession.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.LOGGED_OUT,
          revokedAt: new Date(),
          revokedReason: "admin_logout"
        }
      });

      await this.auditService.record({
        actorId: session.userId,
        actorType: AuditActorType.ADMIN,
        eventType: AuditEventType.LOGOUT,
        entityType: "admin_session",
        entityId: session.id,
        sessionId: session.id,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent
      });
    }

    return { ok: true };
  }
}
