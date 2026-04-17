import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditActorType, AuditEventType } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCourseDto } from "./dto/create-course.dto";
import { CreateLessonMaterialDto } from "./dto/create-lesson-material.dto";
import { CreateLessonDto } from "./dto/create-lesson.dto";

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async listCourses() {
    return this.prisma.course.findMany({
      include: {
        lessons: {
          orderBy: { position: "asc" }
        },
        enrollments: true
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async getCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        lessons: {
          include: {
            materials: {
              orderBy: { position: "asc" }
            },
            videoAsset: true
          },
          orderBy: { position: "asc" }
        }
      }
    });

    if (!course) {
      throw new NotFoundException("Course not found.");
    }

    return course;
  }

  async createCourse(dto: CreateCourseDto) {
    const course = await this.prisma.course.create({
      data: {
        title: dto.title.trim(),
        slug: dto.slug.trim(),
        shortDescription: dto.shortDescription,
        description: dto.description,
        status: dto.status
      }
    });

    await this.auditService.record({
      actorType: AuditActorType.ADMIN,
      eventType: AuditEventType.COURSE_CREATED,
      entityType: "course",
      entityId: course.id
    });

    return course;
  }

  async createLesson(courseId: string, dto: CreateLessonDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      throw new NotFoundException("Course not found.");
    }

    const lesson = await this.prisma.lesson.create({
      data: {
        courseId,
        title: dto.title.trim(),
        slug: dto.slug.trim(),
        position: dto.position,
        summary: dto.summary,
        body: dto.body,
        estimatedMinutes: dto.estimatedMinutes,
        status: dto.status
      }
    });

    await this.auditService.record({
      actorType: AuditActorType.ADMIN,
      eventType: AuditEventType.LESSON_CREATED,
      entityType: "lesson",
      entityId: lesson.id,
      metadata: {
        courseId
      }
    });

    return lesson;
  }

  async createLessonMaterial(lessonId: string, dto: CreateLessonMaterialDto) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId }
    });

    if (!lesson) {
      throw new NotFoundException("Lesson not found.");
    }

    const material = await this.prisma.lessonMaterial.create({
      data: {
        lessonId,
        title: dto.title.trim(),
        type: dto.type,
        position: dto.position,
        contentText: dto.contentText,
        fileKey: dto.fileKey,
        fileName: dto.fileName,
        fileUrl: dto.fileUrl,
        mimeType: dto.mimeType
      }
    });

    await this.auditService.record({
      actorType: AuditActorType.ADMIN,
      eventType: AuditEventType.LESSON_UPDATED,
      entityType: "lesson_material",
      entityId: material.id,
      metadata: {
        lessonId
      }
    });

    return material;
  }
}
