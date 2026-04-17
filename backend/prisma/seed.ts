import { AccessTokenStatus, AccessTokenType, AuditEventType, CourseStatus, LessonStatus, MaterialType, PrismaClient, Role, SessionStatus, UserStatus, VideoAssetStatus, VideoProvider } from "@prisma/client";
import { createHash } from "crypto";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function main() {
  const prisma = new PrismaClient();
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RedisLib = redisUrl.startsWith("mock://") ? require("ioredis-mock") : require("ioredis");
  const redis = new RedisLib(redisUrl.startsWith("mock://") ? undefined : redisUrl);
  const now = new Date();
  const idleMinutes = Number(process.env.SESSION_IDLE_MINUTES || 15);
  const idleExpiresAt = new Date(now.getTime() + idleMinutes * 60 * 1000);

  const admin = await prisma.user.upsert({
    where: { email: "admin@securecourse.local" },
    update: {
      fullName: "SecureCourse Admin",
      role: Role.ADMIN,
      status: UserStatus.ACTIVE
    },
    create: {
      email: "admin@securecourse.local",
      fullName: "SecureCourse Admin",
      role: Role.ADMIN,
      status: UserStatus.ACTIVE
    }
  });

  const student = await prisma.user.upsert({
    where: { email: "student@securecourse.local" },
    update: {
      fullName: "Test Student",
      role: Role.STUDENT,
      status: UserStatus.ACTIVE
    },
    create: {
      email: "student@securecourse.local",
      fullName: "Test Student",
      role: Role.STUDENT,
      status: UserStatus.ACTIVE
    }
  });

  const course = await prisma.course.upsert({
    where: { slug: "python-for-analysts" },
    update: {
      title: "Python for Analysts",
      shortDescription: "Seeded test course",
      description: "Course used for local end-to-end runtime verification.",
      status: CourseStatus.PUBLISHED
    },
    create: {
      slug: "python-for-analysts",
      title: "Python for Analysts",
      shortDescription: "Seeded test course",
      description: "Course used for local end-to-end runtime verification.",
      status: CourseStatus.PUBLISHED
    }
  });

  const lesson = await prisma.lesson.upsert({
    where: {
      courseId_slug: {
        courseId: course.id,
        slug: "lesson-1-intro"
      }
    },
    update: {
      title: "Lesson 1. Intro",
      position: 1,
      summary: "Seeded lesson for testing",
      status: LessonStatus.PUBLISHED
    },
    create: {
      courseId: course.id,
      slug: "lesson-1-intro",
      title: "Lesson 1. Intro",
      position: 1,
      summary: "Seeded lesson for testing",
      status: LessonStatus.PUBLISHED
    }
  });

  await prisma.lessonMaterial.upsert({
    where: {
      lessonId_position: {
        lessonId: lesson.id,
        position: 1
      }
    },
    update: {
      title: "Intro notes",
      type: MaterialType.TEXT,
      contentText: "Seeded notes for the first lesson."
    },
    create: {
      lessonId: lesson.id,
      title: "Intro notes",
      type: MaterialType.TEXT,
      position: 1,
      contentText: "Seeded notes for the first lesson."
    }
  });

  const enrollment = await prisma.enrollment.upsert({
    where: {
      userId_courseId: {
        userId: student.id,
        courseId: course.id
      }
    },
    update: {
      status: "ACTIVE",
      revokedAt: null,
      revokedReason: null
    },
    create: {
      userId: student.id,
      courseId: course.id,
      status: "ACTIVE"
    }
  });

  await prisma.videoAsset.upsert({
    where: { lessonId: lesson.id },
    update: {
      provider: VideoProvider.MUX,
      status: VideoAssetStatus.READY,
      externalAssetId: "seed-mux-asset-1",
      playbackId: "seed-playback-id-1",
      playbackPolicy: "signed",
      readyAt: now
    },
    create: {
      lessonId: lesson.id,
      provider: VideoProvider.MUX,
      status: VideoAssetStatus.READY,
      externalAssetId: "seed-mux-asset-1",
      playbackId: "seed-playback-id-1",
      playbackPolicy: "signed",
      readyAt: now
    }
  });

  const rawToken = "seed-student-token-001";
  const accessToken = await prisma.accessToken.upsert({
    where: {
      tokenHash: sha256(rawToken)
    },
    update: {
      userId: student.id,
      enrollmentId: enrollment.id,
      issuedById: admin.id,
      tokenType: AccessTokenType.TOKEN,
      status: AccessTokenStatus.ISSUED,
      activationExpiresAt: new Date(now.getTime() + 30 * 60 * 1000),
      usedAt: null,
      revokedAt: null,
      revokedReason: null
    },
    create: {
      userId: student.id,
      enrollmentId: enrollment.id,
      issuedById: admin.id,
      tokenType: AccessTokenType.TOKEN,
      tokenHash: sha256(rawToken),
      status: AccessTokenStatus.ISSUED,
      activationExpiresAt: new Date(now.getTime() + 30 * 60 * 1000)
    }
  });

  const seededSessionId = "seed-session-001";
  await prisma.userSession.upsert({
    where: { id: seededSessionId },
    update: {
      userId: student.id,
      accessTokenId: accessToken.id,
      status: SessionStatus.ACTIVE,
      deviceId: "seed-device-1",
      deviceFingerprint: "seed-fingerprint-1",
      deviceLabel: "Browser / Seed Session",
      ipAddress: "127.0.0.1",
      userAgent: "seed-script",
      lastSeenAt: now,
      idleExpiresAt
    },
    create: {
      id: seededSessionId,
      userId: student.id,
      accessTokenId: accessToken.id,
      status: SessionStatus.ACTIVE,
      deviceId: "seed-device-1",
      deviceFingerprint: "seed-fingerprint-1",
      deviceLabel: "Browser / Seed Session",
      ipAddress: "127.0.0.1",
      userAgent: "seed-script",
      lastSeenAt: now,
      idleExpiresAt
    }
  });

  await redis.set(
    `securecourse:active-session:user:${student.id}`,
    JSON.stringify({
      sessionId: seededSessionId,
      userId: student.id,
      idleExpiresAt: idleExpiresAt.toISOString()
    }),
    "EX",
    idleMinutes * 60
  );

  await redis.set(
    `securecourse:session:${seededSessionId}`,
    JSON.stringify({
      userId: student.id,
      active: true
    }),
    "EX",
    idleMinutes * 60
  );

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      actorType: "ADMIN",
      eventType: AuditEventType.USER_CREATED,
      entityType: "seed",
      entityId: student.id,
      metadata: {
        note: "Seed data created"
      }
    }
  });

  console.log(
    JSON.stringify(
      {
        admin: {
          email: admin.email
        },
        student: {
          email: student.email,
          userId: student.id
        },
        course: {
          id: course.id,
          slug: course.slug
        },
        lesson: {
          id: lesson.id
        },
        accessToken: {
          id: accessToken.id,
          rawToken
        },
        session: {
          id: seededSessionId
        }
      },
      null,
      2
    )
  );

  await redis.quit();
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
