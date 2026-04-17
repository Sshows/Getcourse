import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { AuditActorType, AuditEventType } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { SessionsService } from "../sessions/sessions.service";
import { VideosService } from "../videos/videos.service";
import { UpdateLessonProgressDto } from "./dto/update-lesson-progress.dto";

@Injectable()
export class StudentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionsService: SessionsService,
    private readonly videosService: VideosService,
    private readonly auditService: AuditService
  ) {}

  async listCourses(userId: string, sessionId: string) {
    await this.sessionsService.assertActiveSession(userId, sessionId);

    return this.prisma.enrollment.findMany({
      where: {
        userId,
        status: "ACTIVE"
      },
      include: {
        course: {
          include: {
            lessons: {
              orderBy: { position: "asc" }
            }
          }
        }
      },
      orderBy: { assignedAt: "desc" }
    });
  }

  async getLesson(userId: string, sessionId: string, lessonId: string) {
    await this.sessionsService.assertActiveSession(userId, sessionId);

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        course: true,
        materials: {
          orderBy: { position: "asc" }
        },
        videoAsset: true
      }
    });

    if (!lesson) {
      throw new NotFoundException("Lesson not found.");
    }

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId,
        courseId: lesson.courseId,
        status: "ACTIVE"
      }
    });

    if (!enrollment) {
      throw new UnauthorizedException("User has no access to this lesson.");
    }

    const progress = await this.prisma.lessonProgress.findUnique({
      where: {
        userId_lessonId: {
          userId,
          lessonId
        }
      }
    });

    return {
      lesson,
      enrollment,
      progress
    };
  }

  async getPlaybackAccess(userId: string, sessionId: string, lessonId: string) {
    return this.videosService.createPlaybackAccess(userId, sessionId, lessonId);
  }

  async updateLessonProgress(
    userId: string,
    sessionId: string,
    lessonId: string,
    dto: UpdateLessonProgressDto
  ) {
    await this.sessionsService.assertActiveSession(userId, sessionId);

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId }
    });

    if (!lesson) {
      throw new NotFoundException("Lesson not found.");
    }

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId,
        courseId: lesson.courseId,
        status: "ACTIVE"
      }
    });

    if (!enrollment) {
      throw new UnauthorizedException("User has no enrollment for this lesson.");
    }

    const progress = await this.prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId
        }
      },
      update: {
        progressPercent: dto.progressPercent,
        completed: dto.completed ?? dto.progressPercent >= 100,
        lastPositionSeconds: dto.lastPositionSeconds ?? 0,
        lastWatchedAt: new Date()
      },
      create: {
        userId,
        lessonId,
        enrollmentId: enrollment.id,
        progressPercent: dto.progressPercent,
        completed: dto.completed ?? dto.progressPercent >= 100,
        lastPositionSeconds: dto.lastPositionSeconds ?? 0,
        lastWatchedAt: new Date()
      }
    });

    const allProgress = await this.prisma.lessonProgress.findMany({
      where: {
        userId,
        enrollmentId: enrollment.id
      }
    });

    const total = allProgress.length
      ? allProgress.reduce((sum, item) => sum + item.progressPercent, 0) / allProgress.length
      : dto.progressPercent;

    await this.prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        progressPercent: Number(total.toFixed(2))
      }
    });

    await this.auditService.record({
      actorId: userId,
      actorType: AuditActorType.USER,
      eventType: AuditEventType.LESSON_UPDATED,
      entityType: "lesson_progress",
      entityId: progress.id,
      sessionId,
      metadata: {
        lessonId,
        progressPercent: dto.progressPercent
      }
    });

    return progress;
  }
}
