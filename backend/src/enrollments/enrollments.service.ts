import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditActorType, AuditEventType, EnrollmentStatus } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEnrollmentDto } from "./dto/create-enrollment.dto";

@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async listEnrollments() {
    return this.prisma.enrollment.findMany({
      include: {
        user: true,
        course: true
      },
      orderBy: { assignedAt: "desc" }
    });
  }

  async createEnrollment(dto: CreateEnrollmentDto) {
    const enrollment = await this.prisma.enrollment.upsert({
      where: {
        userId_courseId: {
          userId: dto.userId,
          courseId: dto.courseId
        }
      },
      update: {
        status: EnrollmentStatus.ACTIVE,
        revokedAt: null,
        revokedReason: null
      },
      create: {
        userId: dto.userId,
        courseId: dto.courseId,
        status: EnrollmentStatus.ACTIVE
      },
      include: {
        user: true,
        course: true
      }
    });

    await this.auditService.record({
      actorType: AuditActorType.ADMIN,
      eventType: AuditEventType.ENROLLMENT_CREATED,
      entityType: "enrollment",
      entityId: enrollment.id,
      metadata: dto.note
        ? {
            note: dto.note
          }
        : undefined
    });

    return enrollment;
  }

  async revokeEnrollment(enrollmentId: string, reason?: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId }
    });

    if (!enrollment) {
      throw new NotFoundException("Enrollment not found.");
    }

    const updated = await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: EnrollmentStatus.REVOKED,
        revokedAt: new Date(),
        revokedReason: reason || "revoked_by_admin"
      }
    });

    await this.auditService.record({
      actorType: AuditActorType.ADMIN,
      eventType: AuditEventType.ENROLLMENT_REVOKED,
      entityType: "enrollment",
      entityId: enrollmentId,
      metadata: {
        reason: reason || "revoked_by_admin"
      }
    });

    return updated;
  }
}
