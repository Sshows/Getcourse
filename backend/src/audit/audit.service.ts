import { Injectable } from "@nestjs/common";
import { AuditActorType, AuditEventType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type AuditRecordInput = {
  actorId?: string | null;
  actorType: AuditActorType;
  eventType: AuditEventType;
  entityType: string;
  entityId?: string | null;
  sessionId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditRecordInput) {
    return this.prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        actorType: input.actorType,
        eventType: input.eventType,
        entityType: input.entityType,
        entityId: input.entityId,
        sessionId: input.sessionId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: input.metadata
      }
    });
  }

  async list(eventType?: string) {
    return this.prisma.auditLog.findMany({
      where: eventType ? { eventType: eventType as AuditEventType } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200
    });
  }
}
