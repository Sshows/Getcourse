import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import {
  AccessTokenStatus,
  AuditActorType,
  AuditEventType,
  EnrollmentStatus
} from "@prisma/client";
import { randomUUID } from "crypto";
import { AuditService } from "../audit/audit.service";
import { createOneTimeToken, sha256 } from "../common/utils/hash.util";
import { PrismaService } from "../prisma/prisma.service";
import { SessionsService } from "../sessions/sessions.service";
import { ActivateAccessTokenDto } from "./dto/activate-access-token.dto";
import { IssueAccessTokenDto } from "./dto/issue-access-token.dto";

@Injectable()
export class AccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionsService: SessionsService,
    private readonly auditService: AuditService
  ) {}

  async listTokens() {
    return this.prisma.accessToken.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true
          }
        },
        enrollment: {
          include: {
            course: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async issueToken(dto: IssueAccessTokenDto) {
    const rawToken = createOneTimeToken();
    const tokenHash = sha256(rawToken);

    const accessToken = await this.prisma.accessToken.create({
      data: {
        userId: dto.userId,
        enrollmentId: dto.enrollmentId,
        issuedById: dto.issuedById,
        tokenType: dto.tokenType,
        tokenHash,
        activationExpiresAt: new Date(dto.activationExpiresAt),
        metadata: dto.note
          ? {
              note: dto.note
            }
          : undefined
      }
    });

    await this.auditService.record({
      actorId: dto.issuedById || dto.userId,
      actorType: dto.issuedById ? AuditActorType.ADMIN : AuditActorType.USER,
      eventType: AuditEventType.ACCESS_TOKEN_ISSUED,
      entityType: "access_token",
      entityId: accessToken.id,
      metadata: {
        userId: dto.userId,
        enrollmentId: dto.enrollmentId || null
      }
    });

    return {
      ...accessToken,
      token: rawToken
    };
  }

  async revokeToken(tokenId: string, reason?: string) {
    const token = await this.prisma.accessToken.findUnique({
      where: { id: tokenId }
    });

    if (!token) {
      throw new NotFoundException("Access token not found.");
    }

    const revoked = await this.prisma.accessToken.update({
      where: { id: tokenId },
      data: {
        status: AccessTokenStatus.REVOKED,
        revokedAt: new Date(),
        revokedReason: reason || "revoked_by_admin"
      }
    });

    await this.auditService.record({
      actorId: token.userId,
      actorType: AuditActorType.USER,
      eventType: AuditEventType.ACCESS_TOKEN_REVOKED,
      entityType: "access_token",
      entityId: tokenId,
      metadata: {
        reason: reason || "revoked_by_admin"
      }
    });

    return revoked;
  }

  async activateToken(dto: ActivateAccessTokenDto) {
    const tokenHash = sha256(dto.token);
    const accessToken = await this.prisma.accessToken.findUnique({
      where: { tokenHash },
      include: {
        user: true,
        enrollment: true
      }
    });

    if (!accessToken) {
      await this.auditService.record({
        actorType: AuditActorType.ANONYMOUS,
        eventType: AuditEventType.LOGIN_FAILED,
        entityType: "access_token",
        metadata: {
          reason: "token_not_found"
        }
      });
      throw new UnauthorizedException("Token is invalid.");
    }

    if (accessToken.status !== AccessTokenStatus.ISSUED) {
      await this.auditService.record({
        actorId: accessToken.userId,
        actorType: AuditActorType.USER,
        eventType: AuditEventType.ACCESS_TOKEN_REUSE_BLOCKED,
        entityType: "access_token",
        entityId: accessToken.id
      });
      throw new UnauthorizedException("Token was already used or revoked.");
    }

    if (accessToken.activationExpiresAt.getTime() < Date.now()) {
      await this.prisma.accessToken.update({
        where: { id: accessToken.id },
        data: {
          status: AccessTokenStatus.EXPIRED
        }
      });

      throw new UnauthorizedException("Token expired before activation.");
    }

    if (accessToken.user.status === "BLOCKED") {
      throw new UnauthorizedException("User is blocked.");
    }

    if (accessToken.enrollment && accessToken.enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new UnauthorizedException("Enrollment is not active.");
    }

    const sessionId = randomUUID();
    const usedAt = new Date();

    const session = await this.sessionsService.createSession({
      userId: accessToken.userId,
      accessTokenId: accessToken.id,
      sessionId,
      deviceId: dto.deviceId,
      deviceFingerprint: dto.deviceFingerprint,
      deviceLabel: dto.deviceLabel,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.accessToken.update({
        where: { id: accessToken.id },
        data: {
          status: AccessTokenStatus.USED,
          usedAt
        }
      });

      if (accessToken.enrollmentId) {
        await tx.enrollment.update({
          where: { id: accessToken.enrollmentId },
          data: {
            activatedAt: usedAt
          }
        });
      }
    });

    await this.auditService.record({
      actorId: accessToken.userId,
      actorType: AuditActorType.USER,
      eventType: AuditEventType.ACCESS_TOKEN_USED,
      entityType: "access_token",
      entityId: accessToken.id,
      sessionId: session.id
    });

    await this.auditService.record({
      actorId: accessToken.userId,
      actorType: AuditActorType.USER,
      eventType: AuditEventType.LOGIN_SUCCEEDED,
      entityType: "user_session",
      entityId: session.id,
      sessionId: session.id,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent
    });

    return {
      user: {
        id: accessToken.user.id,
        email: accessToken.user.email,
        fullName: accessToken.user.fullName,
        role: accessToken.user.role
      },
      session: {
        id: session.id,
        idleExpiresAt: session.idleExpiresAt
      },
      enrollmentId: accessToken.enrollmentId || null
    };
  }

  async logout(userId: string, sessionId: string) {
    if (!userId || !sessionId) {
      throw new BadRequestException("userId and sessionId are required.");
    }

    return this.sessionsService.logout(userId, sessionId);
  }
}
