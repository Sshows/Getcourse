import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditActorType, AuditEventType, UserStatus } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async listUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        enrollments: {
          include: {
            course: true
          }
        }
      }
    });
  }

  async createUser(dto: CreateUserDto) {
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        fullName: dto.fullName.trim(),
        role: dto.role,
        status: dto.status,
        passwordHash: dto.passwordHash
      }
    });

    await this.auditService.record({
      actorId: user.id,
      actorType: user.role === "STUDENT" ? AuditActorType.USER : AuditActorType.ADMIN,
      eventType: AuditEventType.USER_CREATED,
      entityType: "user",
      entityId: user.id
    });

    return user;
  }

  async updateStatus(userId: string, dto: UpdateUserStatusDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existing) {
      throw new NotFoundException("User not found.");
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: dto.status,
        blockedAt: dto.status === UserStatus.BLOCKED ? new Date() : null,
        blockedReason: dto.status === UserStatus.BLOCKED ? dto.blockedReason : null
      }
    });

    await this.auditService.record({
      actorId: user.id,
      actorType: user.role === "STUDENT" ? AuditActorType.USER : AuditActorType.ADMIN,
      eventType:
        dto.status === UserStatus.BLOCKED
          ? AuditEventType.USER_BLOCKED
          : AuditEventType.USER_UNBLOCKED,
      entityType: "user",
      entityId: user.id,
      metadata: dto.blockedReason
        ? {
            reason: dto.blockedReason
          }
        : undefined
    });

    return user;
  }
}
