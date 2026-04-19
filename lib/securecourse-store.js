import "server-only";
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import path from "path";

class SecureCourseError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "SecureCourseError";
    this.status = status;
  }
}

const STORE_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(STORE_DIR, "securecourse-store.json");
const UPLOADS_DIR = path.join(STORE_DIR, "uploads");
const DEFAULT_VIDEO_URL =
  process.env.SECURECOURSE_SAMPLE_VIDEO_URL ||
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
const STUDENT_SESSION_IDLE_MINUTES = Number(process.env.SESSION_IDLE_MINUTES || 15);
const ADMIN_SESSION_HOURS = Number(process.env.ADMIN_SESSION_HOURS || 12);
const videoReadyTimers = new Map();
const DEMO_STUDENTS = [
  { fullName: "Айгерим Нурбекова", email: "aigerim@globaladmissions.local" },
  { fullName: "Данияр Садыков", email: "daniyar@globaladmissions.local" },
  { fullName: "Мадина Тулеген", email: "madina@globaladmissions.local" }
];
const DEMO_COURSES = [
  {
    title: "IELTS Writing Bootcamp",
    slug: "ielts-writing-bootcamp",
    shortDescription: "Task 1 и Task 2, словарь, аргументация и проверка эссе под IELTS Academic.",
    description:
      "Практический курс по IELTS Writing для студентов, которые хотят дойти до 6.5-7.5+ и перестать писать шаблонно.",
    lessons: [
      {
        title: "Task 2: структура эссе на 7.0+",
        slug: "task-2-essay-structure",
        duration: 1180,
        content:
          "Разбираем introduction, thesis, topic sentence, explanation, example и связки, которые делают Task 2 логичным.",
        notes:
          "Конспект: шаблон introduction, логика body paragraph, фразы для argument development и чеклист самопроверки."
      },
      {
        title: "Task 1: графики, таблицы и overview",
        slug: "task-1-graphs-and-overview",
        duration: 1020,
        content:
          "Показываем, как быстро считывать данные, писать overview и строить comparative paragraphs без лишней воды.",
        notes:
          "Useful phrases for increase, decline, remain stable, compare and contrast, плюс skeleton для ответа."
      }
    ]
  },
  {
    title: "IELTS Speaking Intensive",
    slug: "ielts-speaking-intensive",
    shortDescription: "Part 1, Part 2, Part 3, уверенная речь, идеи для ответов и работа с таймером.",
    description:
      "Интенсив для тех, кому нужно звучать естественно на Speaking и держать ответ без долгих пауз и заученных фраз.",
    lessons: [
      {
        title: "Speaking Part 1: fluent and natural answers",
        slug: "speaking-part-1-fluent-answers",
        duration: 960,
        content:
          "Отрабатываем короткие естественные ответы, расширение мысли и уверенный старт ответа даже на неудобных темах.",
        notes:
          "Формула 1-2-1, вопросы про hometown, studies, routines и фразы, которые помогают выиграть пару секунд."
      }
    ]
  },
  {
    title: "Study Abroad Application Roadmap",
    slug: "study-abroad-application-roadmap",
    shortDescription: "Страны, shortlist, дедлайны, application tracker и стратегический план поступления.",
    description:
      "Курс помогает выстроить весь маршрут поступления за рубеж: от выбора программы до отправки документов.",
    lessons: [
      {
        title: "Shortlist стран и университетов",
        slug: "shortlist-countries-and-universities",
        duration: 860,
        content:
          "Собираем shortlist под бюджет, академический профиль, IELTS requirement, scholarships и карьерную цель.",
        notes:
          "Матрица shortlist: country, tuition, scholarship, deadline, language requirement, notes по fit."
      },
      {
        title: "Дедлайны и application tracker",
        slug: "deadlines-and-application-tracker",
        duration: 910,
        content:
          "Строим систему дедлайнов по essays, references, transcripts, interviews и scholarship rounds.",
        notes:
          "Шаблон tracker: fee, recommendations, transcripts, CV, IELTS, submission status и follow-up."
      }
    ]
  },
  {
    title: "Personal Statement & Motivation Letter",
    slug: "personal-statement-motivation-letter",
    shortDescription: "Логика сильного narrative, структура письма и позиционирование кандидата.",
    description:
      "Курс для personal statement и motivation letter под бакалавриат, магистратуру и scholarship applications.",
    lessons: [
      {
        title: "Структура personal statement",
        slug: "personal-statement-framework",
        duration: 1240,
        content:
          "Разбираем hook, academic fit, goals и closing так, чтобы текст не выглядел общим и не терял фокус.",
        notes:
          "План по абзацам: opening story, academic turning point, why this program, future impact и editing checklist."
      }
    ]
  },
  {
    title: "Scholarship Essays & Documents",
    slug: "scholarship-essays-documents",
    shortDescription: "Scholarship essay, achievements, supporting docs и логика конкурсной подачи.",
    description:
      "Курс о том, как собрать scholarship application без пробелов: essay, activity list, awards и подтверждающие файлы.",
    lessons: [
      {
        title: "Scholarship essay: impact and leadership",
        slug: "scholarship-essay-impact-and-leadership",
        duration: 990,
        content:
          "Показываем, как раскрывать impact, leadership и community contribution без пустых общих формулировок.",
        notes:
          "Framework: challenge -> action -> measurable result -> future impact. Плюс список слабых штампов."
      }
    ]
  },
  {
    title: "University Admission Timeline",
    slug: "university-admission-timeline",
    shortDescription: "Путь от профиля абитуриента до offer letter, visa docs и pre-departure checklist.",
    description:
      "Курс собирает весь admission timeline в одну систему и помогает видеть следующий шаг без хаоса.",
    lessons: [
      {
        title: "Admission calendar: from profile to offer",
        slug: "admission-calendar-profile-to-offer",
        duration: 880,
        content:
          "Полная карта пути: profile review, test prep, essays, references, submit, interview, offer и visa prep.",
        notes:
          "Таймлайн по месяцам: IELTS, essays, recommendation letters, scholarship round, interview, enrollment deposit."
      }
    ]
  }
];
const DEMO_ENROLLMENTS = [
  {
    email: "aigerim@globaladmissions.local",
    courseSlug: "ielts-writing-bootcamp",
    note: "Подготовка к IELTS Academic и retake по Writing."
  },
  {
    email: "aigerim@globaladmissions.local",
    courseSlug: "personal-statement-motivation-letter",
    note: "Подача на магистратуру в Великобританию."
  },
  {
    email: "daniyar@globaladmissions.local",
    courseSlug: "study-abroad-application-roadmap",
    note: "Собирает shortlist по Канаде и Европе."
  },
  {
    email: "daniyar@globaladmissions.local",
    courseSlug: "university-admission-timeline",
    note: "Нужен пошаговый admission calendar."
  },
  {
    email: "madina@globaladmissions.local",
    courseSlug: "ielts-speaking-intensive",
    note: "Улучшает speaking перед interviews."
  },
  {
    email: "madina@globaladmissions.local",
    courseSlug: "scholarship-essays-documents",
    note: "Готовит scholarship essays и supporting docs."
  }
];

function nowIso() {
  return new Date().toISOString();
}

function futureIso(minutesFromNow) {
  return new Date(Date.now() + minutesFromNow * 60 * 1000).toISOString();
}

function futureHoursIso(hoursFromNow) {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

function hashToken(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, passwordHash) {
  if (!passwordHash) {
    return false;
  }

  const [salt, expectedHash] = String(passwordHash).split(":");

  if (!salt || !expectedHash) {
    return false;
  }

  const actualHash = scryptSync(password, salt, 64).toString("hex");
  const expectedBuffer = Buffer.from(expectedHash, "hex");
  const actualBuffer = Buffer.from(actualHash, "hex");

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

function createOneTimeToken() {
  return randomBytes(18).toString("base64url");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureUploadsDir() {
  if (!existsSync(UPLOADS_DIR)) {
    mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function sanitizeFileName(value) {
  return String(value || "video.mp4")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "video.mp4";
}

function normalizeVideoStatus(value) {
  const allowed = new Set(["waiting_upload", "uploading", "processing", "ready", "error"]);
  const normalized = String(value || "").trim().toLowerCase();
  return allowed.has(normalized) ? normalized : "waiting_upload";
}

function reconcileState(state) {
  const timestamp = Date.now();
  let changed = false;

  state.accessTokens.forEach((token) => {
    if (token.status === "ISSUED" && new Date(token.activationExpiresAt).getTime() <= timestamp) {
      token.status = "EXPIRED";
      token.updatedAt = nowIso();
      changed = true;
    }
  });

  state.adminSessions.forEach((session) => {
    if (session.status === "ACTIVE" && new Date(session.expiresAt).getTime() <= timestamp) {
      session.status = "EXPIRED";
      session.revokedAt = nowIso();
      session.revokedReason = "admin_session_expired";
      session.updatedAt = nowIso();
      changed = true;
    }
  });

  state.userSessions.forEach((session) => {
    if (session.status === "ACTIVE" && new Date(session.idleExpiresAt).getTime() <= timestamp) {
      session.status = "EXPIRED";
      session.revokedAt = nowIso();
      session.revokedReason = "student_session_idle_timeout";
      session.updatedAt = nowIso();
      changed = true;
    }
  });

  if (changed) {
    persistState(state);
  }
}

function flushToDisk(state) {
  if (!existsSync(STORE_DIR)) {
    mkdirSync(STORE_DIR, { recursive: true });
  }
  const tempFile = `${STORE_FILE}.tmp`;
  writeFileSync(tempFile, JSON.stringify(state, null, 2));
  renameSync(tempFile, STORE_FILE);
}

function ensureStoreFile() {
  if (!existsSync(STORE_DIR)) {
    mkdirSync(STORE_DIR, { recursive: true });
  }

  ensureUploadsDir();

  if (!existsSync(STORE_FILE)) {
    const state = createInitialState();
    persistState(state);
  }
}

function createInitialState() {
  const state = {
    version: 1,
    users: [],
    adminSessions: [],
    courses: [],
    lessons: [],
    lessonMaterials: [],
    enrollments: [],
    accessTokens: [],
    userSessions: [],
    lessonProgress: [],
    videoAssets: [],
    auditLogs: [],
    webhookEvents: [],
    siteLeads: []
  };

  seedAdmin(state);
  ensureProductDemoData(state);
  return state;
}

function seedAdmin(state) {
  const email = (process.env.ADMIN_EMAIL || "admin@securecourse.local").toLowerCase();
  const username = (process.env.ADMIN_USERNAME || "admin").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const timestamp = nowIso();

  let admin = state.users.find((user) => user.role === "ADMIN");

  if (!admin) {
    admin = {
      id: randomUUID(),
      email,
      username,
      fullName: "SecureCourse Admin",
      role: "ADMIN",
      status: "ACTIVE",
      passwordHash: hashPassword(password),
      createdAt: timestamp,
      updatedAt: timestamp
    };
    state.users.push(admin);
  } else {
    admin.email = email;
    admin.username = username;
    admin.fullName = admin.fullName || "SecureCourse Admin";
    admin.role = "ADMIN";
    admin.status = "ACTIVE";
    admin.passwordHash =
      admin.passwordHash && verifyPassword(password, admin.passwordHash)
        ? admin.passwordHash
        : hashPassword(password);
    admin.updatedAt = timestamp;
  }
}

function ensureDemoStudent(state, student) {
  const timestamp = nowIso();
  let record = state.users.find((item) => item.email === student.email);

  if (!record) {
    record = {
      id: randomUUID(),
      email: student.email,
      username: null,
      fullName: student.fullName,
      role: "STUDENT",
      status: "ACTIVE",
      passwordHash: null,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    state.users.push(record);
  } else {
    record.fullName = student.fullName;
    record.role = "STUDENT";
    record.status = "ACTIVE";
    record.updatedAt = timestamp;
  }

  return record;
}

function ensureDemoCourse(state, courseSpec) {
  const timestamp = nowIso();
  let course = state.courses.find((item) => item.slug === courseSpec.slug);

  if (!course) {
    course = {
      id: randomUUID(),
      title: courseSpec.title,
      slug: courseSpec.slug,
      shortDescription: courseSpec.shortDescription,
      description: courseSpec.description,
      status: "PUBLISHED",
      createdAt: timestamp,
      updatedAt: timestamp
    };
    state.courses.push(course);
  } else {
    course.title = courseSpec.title;
    course.shortDescription = courseSpec.shortDescription;
    course.description = courseSpec.description;
    course.status = "PUBLISHED";
    course.updatedAt = timestamp;
  }

  courseSpec.lessons.forEach((lessonSpec, index) => {
    let lesson = state.lessons.find((item) => item.courseId === course.id && item.slug === lessonSpec.slug);

    if (!lesson) {
      lesson = {
        id: randomUUID(),
        courseId: course.id,
        title: lessonSpec.title,
        slug: lessonSpec.slug,
        position: index + 1,
        status: "PUBLISHED",
        duration: lessonSpec.duration || 0,
        content: lessonSpec.content,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      state.lessons.push(lesson);
    } else {
      lesson.title = lessonSpec.title;
      lesson.position = index + 1;
      lesson.status = "PUBLISHED";
      lesson.duration = lessonSpec.duration || 0;
      lesson.content = lessonSpec.content;
      lesson.updatedAt = timestamp;
    }

    let material = state.lessonMaterials.find((item) => item.lessonId === lesson.id && item.position === 1);

    if (!material) {
      material = {
        id: randomUUID(),
        lessonId: lesson.id,
        title: "Конспект урока",
        type: "TEXT",
        url: null,
        content: lessonSpec.notes,
        position: 1,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      state.lessonMaterials.push(material);
    } else {
      material.title = "Конспект урока";
      material.type = "TEXT";
      material.url = null;
      material.content = lessonSpec.notes;
      material.position = 1;
      material.updatedAt = timestamp;
    }

    let asset = state.videoAssets.find((item) => item.lessonId === lesson.id);

    if (!asset) {
      asset = {
        id: randomUUID(),
        lessonId: lesson.id,
        provider: "LOCAL_SAMPLE",
        status: "ready",
        externalUploadId: null,
        externalAssetId: null,
        uploadUrl: null,
        playbackId: `local-${lesson.id}`,
        manifestUrl: DEFAULT_VIDEO_URL,
        fileName: "sample-lesson.mp4",
        fileSize: null,
        mimeType: "video/mp4",
        storagePath: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        readyAt: timestamp
      };
      state.videoAssets.push(asset);
    } else if (!asset.storagePath) {
      asset.provider = asset.provider || "LOCAL_SAMPLE";
      asset.status = "ready";
      asset.playbackId = asset.playbackId || `local-${lesson.id}`;
      asset.manifestUrl = asset.manifestUrl || DEFAULT_VIDEO_URL;
      asset.fileName = asset.fileName || "sample-lesson.mp4";
      asset.mimeType = asset.mimeType || "video/mp4";
      asset.readyAt = asset.readyAt || timestamp;
      asset.updatedAt = timestamp;
    }
  });
}

function ensureDemoEnrollment(state, student, courseSlug, note) {
  const course = state.courses.find((item) => item.slug === courseSlug);

  if (!student || !course) {
    return;
  }

  const timestamp = nowIso();
  const enrollment = state.enrollments.find(
    (item) => item.userId === student.id && item.courseId === course.id && item.status === "ACTIVE"
  );

  if (!enrollment) {
    state.enrollments.push({
      id: randomUUID(),
      userId: student.id,
      courseId: course.id,
      status: "ACTIVE",
      note,
      progressPercent: 0,
      assignedAt: timestamp,
      updatedAt: timestamp
    });
    return;
  }

  enrollment.note = note || enrollment.note;
  enrollment.updatedAt = timestamp;
}

function ensureProductDemoData(state) {
  const studentsByEmail = new Map();

  DEMO_STUDENTS.forEach((student) => {
    studentsByEmail.set(student.email, ensureDemoStudent(state, student));
  });

  DEMO_COURSES.forEach((courseSpec) => {
    ensureDemoCourse(state, courseSpec);
  });

  DEMO_ENROLLMENTS.forEach((item) => {
    ensureDemoEnrollment(state, studentsByEmail.get(item.email), item.courseSlug, item.note);
  });
}

function loadState() {
  if (global.__SECURECOURSE_STATE__) {
    return global.__SECURECOURSE_STATE__;
  }

  ensureStoreFile();
  const raw = readFileSync(STORE_FILE, "utf8");
  const state = JSON.parse(raw);

  state.users ||= [];
  state.adminSessions ||= [];
  state.courses ||= [];
  state.lessons ||= [];
  state.lessonMaterials ||= [];
  state.enrollments ||= [];
  state.accessTokens ||= [];
  state.userSessions ||= [];
  state.lessonProgress ||= [];
  state.videoAssets ||= [];
  state.auditLogs ||= [];
  state.webhookEvents ||= [];
  state.siteLeads ||= [];

  seedAdmin(state);
  ensureProductDemoData(state);
  reconcileState(state);
  
  global.__SECURECOURSE_STATE__ = state;
  flushToDisk(state);
  return state;
}

function persistState(state) {
  global.__SECURECOURSE_STATE__ = state;
  flushToDisk(state);
}

function recordAudit(state, entry) {
  state.auditLogs.unshift({
    id: randomUUID(),
    actorId: entry.actorId || null,
    actorType: entry.actorType || "SYSTEM",
    eventType: entry.eventType,
    entityType: entry.entityType || null,
    entityId: entry.entityId || null,
    sessionId: entry.sessionId || null,
    metadata: entry.metadata || {},
    createdAt: nowIso()
  });

  state.auditLogs = state.auditLogs.slice(0, 200);
}

function getUserById(state, userId) {
  return state.users.find((user) => user.id === userId) || null;
}

function getCourseById(state, courseId) {
  return state.courses.find((course) => course.id === courseId) || null;
}

function getEnrollmentById(state, enrollmentId) {
  return state.enrollments.find((enrollment) => enrollment.id === enrollmentId) || null;
}

function getLessonById(state, lessonId) {
  return state.lessons.find((lesson) => lesson.id === lessonId) || null;
}

function buildCourseView(state, course) {
  const lessons = state.lessons
    .filter((lesson) => lesson.courseId === course.id)
    .sort((left, right) => left.position - right.position);
  const enrollments = state.enrollments.filter((enrollment) => enrollment.courseId === course.id);

  return {
    ...course,
    lessons: lessons.map((lesson) => ({
      ...lesson
    })),
    enrollments: enrollments.map((enrollment) => ({
      ...enrollment
    }))
  };
}

function buildEnrollmentView(state, enrollment) {
  const course = getCourseById(state, enrollment.courseId);
  return {
    ...enrollment,
    course: course ? buildCourseView(state, course) : null
  };
}

function buildUserView(state, user) {
  const enrollments = state.enrollments
    .filter((enrollment) => enrollment.userId === user.id)
    .map((enrollment) => buildEnrollmentView(state, enrollment));

  return {
    ...user,
    enrollments
  };
}

function buildTokenView(state, token) {
  const user = getUserById(state, token.userId);
  const enrollment = getEnrollmentById(state, token.enrollmentId);

  return {
    ...token,
    user: user
      ? {
          id: user.id,
          email: user.email,
          fullName: user.fullName
        }
      : null,
    enrollment: enrollment ? buildEnrollmentView(state, enrollment) : null
  };
}

function buildStudentSessionView(state, session) {
  const user = getUserById(state, session.userId);

  return {
    ...session,
    user: user
      ? {
          id: user.id,
          email: user.email,
          fullName: user.fullName
        }
      : null
  };
}

function buildVideoAssetView(state, asset) {
  const lesson = getLessonById(state, asset.lessonId);
  const course = lesson ? getCourseById(state, lesson.courseId) : null;

  return {
    ...asset,
    status: normalizeVideoStatus(asset.status),
    lessonTitle: lesson?.title || null,
    courseTitle: course?.title || null,
    lesson: lesson
      ? {
          ...lesson,
          course: course
            ? {
                id: course.id,
                title: course.title,
                slug: course.slug
              }
            : null
        }
      : null
  };
}

function ensureAdminSession(state, sessionId) {
  const session = state.adminSessions.find((item) => item.id === sessionId);

  if (!session || session.status !== "ACTIVE") {
    throw new SecureCourseError(401, "Admin authentication is required.");
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    session.status = "EXPIRED";
    session.revokedAt = nowIso();
    session.revokedReason = "admin_session_expired";
    session.updatedAt = nowIso();
    persistState(state);
    throw new SecureCourseError(401, "Admin session expired.");
  }

  const user = getUserById(state, session.userId);

  if (!user || user.status !== "ACTIVE" || !["ADMIN", "MANAGER"].includes(user.role)) {
    throw new SecureCourseError(401, "Admin user is not allowed.");
  }

  session.lastSeenAt = nowIso();
  session.updatedAt = nowIso();
  persistState(state);

  return { session, user };
}

function ensureStudentSession(state, userId, sessionId, options = {}) {
  const session = state.userSessions.find((item) => item.id === sessionId && item.userId === userId);

  if (!session || session.status !== "ACTIVE") {
    throw new SecureCourseError(401, "Student session is not active.");
  }

  if (new Date(session.idleExpiresAt).getTime() <= Date.now()) {
    session.status = "EXPIRED";
    session.revokedAt = nowIso();
    session.revokedReason = "student_session_idle_timeout";
    session.updatedAt = nowIso();
    persistState(state);
    throw new SecureCourseError(401, "Student session expired.");
  }

  const user = getUserById(state, session.userId);

  if (!user || user.status !== "ACTIVE" || user.role !== "STUDENT") {
    throw new SecureCourseError(401, "Student access is no longer active.");
  }

  if (options.touch !== false) {
    session.lastSeenAt = nowIso();
    session.idleExpiresAt = futureIso(STUDENT_SESSION_IDLE_MINUTES);
    session.updatedAt = nowIso();
    persistState(state);
  }

  return { session, user };
}

function seedLessonBundle(state, courseId) {
  const timestamp = nowIso();
  const lessonId = randomUUID();
  const assetId = randomUUID();
  const materialId = randomUUID();

  state.lessons.push({
    id: lessonId,
    courseId,
    title: "Lesson 1. Secure access intro",
    slug: "lesson-1-secure-access-intro",
    position: 1,
    status: "PUBLISHED",
    duration: 185,
    content:
      "This is the default lesson created with every course so the student token flow can be tested end-to-end.",
    createdAt: timestamp,
    updatedAt: timestamp
  });

  state.lessonMaterials.push({
    id: materialId,
    lessonId,
    title: "Lesson notes",
    type: "TEXT",
    url: null,
    content:
      "Student access is token-only. Admins create students, enroll them, issue one-time tokens, and the token opens one session.",
    position: 1,
    createdAt: timestamp,
    updatedAt: timestamp
  });

  state.videoAssets.push({
    id: assetId,
    lessonId,
    provider: "LOCAL_SAMPLE",
    status: "ready",
    externalUploadId: null,
    externalAssetId: null,
    uploadUrl: null,
    playbackId: `local-${lessonId}`,
    manifestUrl: DEFAULT_VIDEO_URL,
    createdAt: timestamp,
    updatedAt: timestamp,
    readyAt: timestamp
  });
}

function scheduleVideoAssetReady(assetId) {
  const existing = videoReadyTimers.get(assetId);

  if (existing) {
    clearTimeout(existing);
  }

  const timer = setTimeout(() => {
    try {
      const state = loadState();
      const asset = state.videoAssets.find((item) => item.id === assetId);

      if (!asset || asset.status !== "processing") {
        return;
      }

      asset.status = "ready";
      asset.updatedAt = nowIso();
      asset.readyAt = nowIso();
      persistState(state);
    } catch {
      // Best-effort transition for local MVP upload flow.
    } finally {
      videoReadyTimers.delete(assetId);
    }
  }, 1200);

  videoReadyTimers.set(assetId, timer);
}

export function loginAdmin(login, password, metadata = {}) {
  const state = loadState();
  const normalizedLogin = String(login || "").trim().toLowerCase();
  const user = state.users.find(
    (item) =>
      ["ADMIN", "MANAGER"].includes(item.role) &&
      item.status === "ACTIVE" &&
      (item.email === normalizedLogin || item.username === normalizedLogin)
  );

  if (!user || !verifyPassword(String(password || ""), user.passwordHash)) {
    recordAudit(state, {
      actorType: "ANONYMOUS",
      eventType: "LOGIN_FAILED",
      entityType: "admin_auth",
      metadata: {
        login: normalizedLogin
      }
    });
    persistState(state);
    throw new SecureCourseError(401, "Invalid admin credentials.");
  }

  const timestamp = nowIso();
  const session = {
    id: randomUUID(),
    userId: user.id,
    status: "ACTIVE",
    ipAddress: metadata.ipAddress || null,
    userAgent: metadata.userAgent || null,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastSeenAt: timestamp,
    expiresAt: futureHoursIso(ADMIN_SESSION_HOURS),
    revokedAt: null,
    revokedReason: null
  };

  state.adminSessions.push(session);
  recordAudit(state, {
    actorId: user.id,
    actorType: "ADMIN",
    eventType: "LOGIN_SUCCEEDED",
    entityType: "admin_session",
    entityId: session.id,
    sessionId: session.id
  });
  persistState(state);

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

export function getAdminSessionView(sessionId) {
  const state = loadState();
  const { session, user } = ensureAdminSession(state, sessionId);

  return {
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      role: user.role
    },
    session: {
      id: session.id,
      expiresAt: session.expiresAt,
      lastSeenAt: session.lastSeenAt
    }
  };
}

export function logoutAdmin(sessionId) {
  const state = loadState();
  const session = state.adminSessions.find((item) => item.id === sessionId);

  if (session && session.status === "ACTIVE") {
    session.status = "LOGGED_OUT";
    session.revokedAt = nowIso();
    session.revokedReason = "admin_logout";
    session.updatedAt = nowIso();

    recordAudit(state, {
      actorId: session.userId,
      actorType: "ADMIN",
      eventType: "LOGOUT",
      entityType: "admin_session",
      entityId: session.id,
      sessionId: session.id
    });
    persistState(state);
  }

  return {
    ok: true
  };
}

export function listUsers(adminSessionId) {
  const state = loadState();
  ensureAdminSession(state, adminSessionId);

  return state.users
    .filter((user) => user.role === "STUDENT")
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((user) => buildUserView(state, user));
}

export function createUser(adminSessionId, payload) {
  const state = loadState();
  const { user: adminUser } = ensureAdminSession(state, adminSessionId);
  const email = String(payload.email || "").trim().toLowerCase();
  const fullName = String(payload.fullName || "").trim();

  if (!email || !fullName) {
    throw new SecureCourseError(400, "Full name and email are required.");
  }

  if (state.users.some((user) => user.email === email)) {
    throw new SecureCourseError(409, "A user with this email already exists.");
  }

  const timestamp = nowIso();
  const user = {
    id: randomUUID(),
    email,
    username: null,
    fullName,
    role: payload.role || "STUDENT",
    status: payload.status || "ACTIVE",
    passwordHash: null,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  state.users.push(user);
  recordAudit(state, {
    actorId: adminUser.id,
    actorType: "ADMIN",
    eventType: "USER_CREATED",
    entityType: "user",
    entityId: user.id
  });
  persistState(state);

  return buildUserView(state, user);
}

export function listCourses(adminSessionId) {
  const state = loadState();
  ensureAdminSession(state, adminSessionId);

  return state.courses
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((course) => buildCourseView(state, course));
}

export function createCourse(adminSessionId, payload) {
  const state = loadState();
  const { user: adminUser } = ensureAdminSession(state, adminSessionId);
  const title = String(payload.title || "").trim();
  const slug = String(payload.slug || "").trim().toLowerCase();

  if (!title || !slug) {
    throw new SecureCourseError(400, "Course title and slug are required.");
  }

  if (state.courses.some((course) => course.slug === slug)) {
    throw new SecureCourseError(409, "Course slug already exists.");
  }

  const timestamp = nowIso();
  const course = {
    id: randomUUID(),
    title,
    slug,
    shortDescription: String(payload.shortDescription || "").trim(),
    description: String(payload.description || "").trim(),
    status: payload.status || "PUBLISHED",
    createdAt: timestamp,
    updatedAt: timestamp
  };

  state.courses.push(course);
  recordAudit(state, {
    actorId: adminUser.id,
    actorType: "ADMIN",
    eventType: "COURSE_CREATED",
    entityType: "course",
    entityId: course.id
  });
  persistState(state);

  return buildCourseView(state, course);
}

export function createLesson(adminSessionId, courseId, payload) {
  const state = loadState();
  const { user: adminUser } = ensureAdminSession(state, adminSessionId);
  const course = getCourseById(state, courseId);

  if (!course) {
    throw new SecureCourseError(404, "Course not found.");
  }

  const title = String(payload.title || "").trim();
  const slug = String(payload.slug || "").trim().toLowerCase();

  if (!title || !slug) {
    throw new SecureCourseError(400, "Lesson title and slug are required.");
  }

  if (state.lessons.some((item) => item.courseId === courseId && item.slug === slug)) {
    throw new SecureCourseError(409, "Lesson slug already exists in this course.");
  }

  const lesson = {
    id: randomUUID(),
    courseId,
    title,
    slug,
    position:
      Number(payload.position) ||
      state.lessons.filter((item) => item.courseId === courseId).length + 1,
    status: payload.status || "PUBLISHED",
    duration: Number(payload.duration || 0),
    content: String(payload.content || "").trim(),
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  state.lessons.push(lesson);
  recordAudit(state, {
    actorId: adminUser.id,
    actorType: "ADMIN",
    eventType: "LESSON_CREATED",
    entityType: "lesson",
    entityId: lesson.id
  });
  persistState(state);

  return clone(lesson);
}

export function createLessonMaterial(adminSessionId, lessonId, payload) {
  const state = loadState();
  const { user: adminUser } = ensureAdminSession(state, adminSessionId);
  const lesson = getLessonById(state, lessonId);

  if (!lesson) {
    throw new SecureCourseError(404, "Lesson not found.");
  }

  const material = {
    id: randomUUID(),
    lessonId,
    title: String(payload.title || "").trim() || "Material",
    type: payload.type || "TEXT",
    url: payload.url || null,
    content: payload.content || null,
    position:
      Number(payload.position) ||
      state.lessonMaterials.filter((item) => item.lessonId === lessonId).length + 1,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  state.lessonMaterials.push(material);
  recordAudit(state, {
    actorId: adminUser.id,
    actorType: "ADMIN",
    eventType: "LESSON_UPDATED",
    entityType: "lesson_material",
    entityId: material.id
  });
  persistState(state);

  return clone(material);
}

export function listEnrollments(adminSessionId) {
  const state = loadState();
  ensureAdminSession(state, adminSessionId);

  return state.enrollments
    .slice()
    .sort((left, right) => right.assignedAt.localeCompare(left.assignedAt))
    .map((enrollment) => buildEnrollmentView(state, enrollment));
}

export function createEnrollment(adminSessionId, payload) {
  const state = loadState();
  const { user: adminUser } = ensureAdminSession(state, adminSessionId);
  const user = getUserById(state, payload.userId);
  const course = getCourseById(state, payload.courseId);

  if (!user || user.role !== "STUDENT") {
    throw new SecureCourseError(404, "Student user not found.");
  }

  if (!course) {
    throw new SecureCourseError(404, "Course not found.");
  }

  if (state.enrollments.some((enrollment) => enrollment.userId === user.id && enrollment.courseId === course.id && enrollment.status === "ACTIVE")) {
    throw new SecureCourseError(409, "Student is already enrolled in this course.");
  }

  const timestamp = nowIso();
  const enrollment = {
    id: randomUUID(),
    userId: user.id,
    courseId: course.id,
    status: "ACTIVE",
    note: payload.note || null,
    progressPercent: 0,
    assignedAt: timestamp,
    updatedAt: timestamp
  };

  state.enrollments.push(enrollment);
  recordAudit(state, {
    actorId: adminUser.id,
    actorType: "ADMIN",
    eventType: "ENROLLMENT_CREATED",
    entityType: "enrollment",
    entityId: enrollment.id
  });
  persistState(state);

  return buildEnrollmentView(state, enrollment);
}

export function revokeEnrollment(adminSessionId, enrollmentId, reason) {
  const state = loadState();
  const { user: adminUser } = ensureAdminSession(state, adminSessionId);
  const enrollment = getEnrollmentById(state, enrollmentId);

  if (!enrollment) {
    throw new SecureCourseError(404, "Enrollment not found.");
  }

  enrollment.status = "REVOKED";
  enrollment.updatedAt = nowIso();
  enrollment.note = reason || enrollment.note;
  recordAudit(state, {
    actorId: adminUser.id,
    actorType: "ADMIN",
    eventType: "ENROLLMENT_REVOKED",
    entityType: "enrollment",
    entityId: enrollment.id
  });
  persistState(state);

  return buildEnrollmentView(state, enrollment);
}

export function listTokens(adminSessionId) {
  const state = loadState();
  ensureAdminSession(state, adminSessionId);

  return state.accessTokens
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((token) => buildTokenView(state, token));
}

export function issueToken(adminSessionId, payload) {
  const state = loadState();
  const { user: adminUser, session } = ensureAdminSession(state, adminSessionId);
  const user = getUserById(state, payload.userId);
  const enrollment = getEnrollmentById(state, payload.enrollmentId);

  if (!user || user.role !== "STUDENT") {
    throw new SecureCourseError(404, "Student not found.");
  }

  if (!enrollment || enrollment.userId !== user.id || enrollment.status !== "ACTIVE") {
    throw new SecureCourseError(400, "A valid active enrollment is required.");
  }

  const rawToken = createOneTimeToken();
  const timestamp = nowIso();
  const token = {
    id: randomUUID(),
    userId: user.id,
    enrollmentId: enrollment.id,
    issuedById: adminUser.id,
    type: "TOKEN",
    status: "ISSUED",
    tokenHash: hashToken(rawToken),
    note: payload.note || null,
    createdAt: timestamp,
    updatedAt: timestamp,
    activationExpiresAt: payload.activationExpiresAt || futureIso(20),
    usedAt: null,
    revokedAt: null,
    revokedReason: null,
    preview: `${rawToken.slice(0, 4)}...${rawToken.slice(-4)}`
  };

  state.accessTokens.push(token);
  recordAudit(state, {
    actorId: adminUser.id,
    actorType: "ADMIN",
    eventType: "ACCESS_TOKEN_ISSUED",
    entityType: "access_token",
    entityId: token.id,
    sessionId: session.id
  });
  persistState(state);

  return {
    ...buildTokenView(state, token),
    token: rawToken
  };
}

export function revokeToken(adminSessionId, tokenId, reason) {
  const state = loadState();
  const { user: adminUser, session } = ensureAdminSession(state, adminSessionId);
  const token = state.accessTokens.find((item) => item.id === tokenId);

  if (!token) {
    throw new SecureCourseError(404, "Token not found.");
  }

  token.status = "REVOKED";
  token.revokedAt = nowIso();
  token.revokedReason = reason || "revoked_by_manager";
  token.updatedAt = nowIso();
  recordAudit(state, {
    actorId: adminUser.id,
    actorType: "ADMIN",
    eventType: "ACCESS_TOKEN_REVOKED",
    entityType: "access_token",
    entityId: token.id,
    sessionId: session.id
  });
  persistState(state);

  return buildTokenView(state, token);
}

function revokeActiveStudentSessions(state, userId, reason) {
  const timestamp = nowIso();

  state.userSessions.forEach((session) => {
    if (session.userId === userId && session.status === "ACTIVE") {
      session.status = "REPLACED";
      session.revokedAt = timestamp;
      session.revokedReason = reason;
      session.updatedAt = timestamp;
    }
  });
}

export function activateToken(payload) {
  const state = loadState();
  const rawToken = String(payload.token || "").trim();
  const token = state.accessTokens.find((item) => item.tokenHash === hashToken(rawToken));

  if (!token) {
    throw new SecureCourseError(401, "Token is invalid.");
  }

  if (token.status !== "ISSUED") {
    recordAudit(state, {
      actorType: "ANONYMOUS",
      eventType: "ACCESS_TOKEN_REUSE_BLOCKED",
      entityType: "access_token",
      entityId: token.id
    });
    persistState(state);
    throw new SecureCourseError(401, "Token is no longer available.");
  }

  if (new Date(token.activationExpiresAt).getTime() <= Date.now()) {
    token.status = "EXPIRED";
    token.updatedAt = nowIso();
    persistState(state);
    throw new SecureCourseError(401, "Token expired.");
  }

  const user = getUserById(state, token.userId);
  const enrollment = getEnrollmentById(state, token.enrollmentId);

  if (!user || user.status !== "ACTIVE" || !enrollment || enrollment.status !== "ACTIVE") {
    throw new SecureCourseError(403, "Student access is no longer active.");
  }

  revokeActiveStudentSessions(state, user.id, "replaced_by_new_token_activation");

  const timestamp = nowIso();
  const session = {
    id: randomUUID(),
    userId: user.id,
    accessTokenId: token.id,
    status: "ACTIVE",
    deviceId: payload.deviceId || "web",
    deviceFingerprint: payload.deviceFingerprint || "web",
    deviceLabel: payload.deviceLabel || "Web browser",
    userAgent: payload.userAgent || null,
    ipAddress: payload.ipAddress || null,
    createdAt: timestamp,
    updatedAt: timestamp,
    startedAt: timestamp,
    lastSeenAt: timestamp,
    idleExpiresAt: futureIso(STUDENT_SESSION_IDLE_MINUTES),
    revokedAt: null,
    revokedReason: null
  };

  token.status = "USED";
  token.usedAt = timestamp;
  token.updatedAt = timestamp;
  state.userSessions.push(session);

  recordAudit(state, {
    actorId: user.id,
    actorType: "USER",
    eventType: "ACCESS_TOKEN_USED",
    entityType: "access_token",
    entityId: token.id,
    sessionId: session.id
  });
  persistState(state);

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName
    },
    enrollment: buildEnrollmentView(state, enrollment),
    session: {
      id: session.id,
      startedAt: session.startedAt,
      idleExpiresAt: session.idleExpiresAt
    }
  };
}

export function logoutStudent(userId, sessionId) {
  const state = loadState();
  const session = state.userSessions.find((item) => item.id === sessionId && item.userId === userId);

  if (!session) {
    return {
      ok: true
    };
  }

  if (session.status === "ACTIVE") {
    session.status = "LOGGED_OUT";
    session.revokedAt = nowIso();
    session.revokedReason = "student_logout";
    session.updatedAt = nowIso();
    recordAudit(state, {
      actorId: userId,
      actorType: "USER",
      eventType: "LOGOUT",
      entityType: "student_session",
      entityId: session.id,
      sessionId: session.id
    });
    persistState(state);
  }

  return {
    ok: true
  };
}

export function getStudentSessionView(userId, sessionId) {
  const state = loadState();

  try {
    const { user } = ensureStudentSession(state, userId, sessionId, { touch: false });
    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName
      },
      userId,
      sessionId
    };
  } catch {
    return {
      authenticated: false
    };
  }
}

export function listStudentCourses(userId, sessionId) {
  const state = loadState();
  ensureStudentSession(state, userId, sessionId);

  return state.enrollments
    .filter((enrollment) => enrollment.userId === userId && enrollment.status === "ACTIVE")
    .sort((left, right) => right.assignedAt.localeCompare(left.assignedAt))
    .map((enrollment) => buildEnrollmentView(state, enrollment));
}

export function getStudentLesson(userId, sessionId, lessonId) {
  const state = loadState();
  ensureStudentSession(state, userId, sessionId);
  const lesson = getLessonById(state, lessonId);

  if (!lesson) {
    throw new SecureCourseError(404, "Lesson not found.");
  }

  const enrollment = state.enrollments.find(
    (item) => item.userId === userId && item.courseId === lesson.courseId && item.status === "ACTIVE"
  );

  if (!enrollment) {
    throw new SecureCourseError(403, "Student is not enrolled in this lesson.");
  }

  const course = getCourseById(state, lesson.courseId);
  const materials = state.lessonMaterials
    .filter((item) => item.lessonId === lesson.id)
    .sort((left, right) => left.position - right.position);
  const videoAsset = state.videoAssets.find((item) => item.lessonId === lesson.id) || null;
  const progress =
    state.lessonProgress.find((item) => item.userId === userId && item.lessonId === lesson.id) || null;

  return {
    lesson: {
      ...lesson,
      course: course
        ? {
            id: course.id,
            title: course.title,
            slug: course.slug
          }
        : null,
      materials,
      videoAsset
    },
    enrollment: buildEnrollmentView(state, enrollment),
    progress
  };
}

export function requestPlaybackAccess(userId, sessionId, lessonId) {
  const state = loadState();
  ensureStudentSession(state, userId, sessionId);
  const lesson = getLessonById(state, lessonId);

  if (!lesson) {
    throw new SecureCourseError(404, "Lesson not found.");
  }

  const enrollment = state.enrollments.find(
    (item) => item.userId === userId && item.courseId === lesson.courseId && item.status === "ACTIVE"
  );

  if (!enrollment) {
    throw new SecureCourseError(403, "Student is not enrolled in this course.");
  }

  const asset = state.videoAssets.find((item) => item.lessonId === lesson.id);

  if (!asset || normalizeVideoStatus(asset.status) !== "ready" || !asset.manifestUrl) {
    throw new SecureCourseError(404, "Video is not ready.");
  }

  recordAudit(state, {
    actorId: userId,
    actorType: "USER",
    eventType: "PLAYBACK_ACCESS_GRANTED",
    entityType: "video_asset",
    entityId: asset.id,
    sessionId
  });
  persistState(state);

  return {
    provider: asset.provider,
    lessonId,
    playback: {
      playbackId: asset.playbackId,
      manifestUrl: asset.manifestUrl,
      token: "local-playback-token"
    }
  };
}

export function updateLessonProgress(userId, sessionId, lessonId, payload) {
  const state = loadState();
  ensureStudentSession(state, userId, sessionId);
  const lesson = getLessonById(state, lessonId);

  if (!lesson) {
    throw new SecureCourseError(404, "Lesson not found.");
  }

  const enrollment = state.enrollments.find(
    (item) => item.userId === userId && item.courseId === lesson.courseId && item.status === "ACTIVE"
  );

  if (!enrollment) {
    throw new SecureCourseError(403, "Student is not enrolled in this lesson.");
  }

  const existing = state.lessonProgress.find((item) => item.userId === userId && item.lessonId === lessonId);
  const timestamp = nowIso();
  const progress = existing || {
    id: randomUUID(),
    userId,
    enrollmentId: enrollment.id,
    lessonId,
    createdAt: timestamp
  };

  progress.progressPercent = Number(payload.progressPercent || 0);
  progress.completed = payload.completed ?? progress.progressPercent >= 100;
  progress.lastPositionSeconds = Number(payload.lastPositionSeconds || 0);
  progress.lastWatchedAt = timestamp;
  progress.updatedAt = timestamp;

  if (!existing) {
    state.lessonProgress.push(progress);
  }

  const enrollmentProgress = state.lessonProgress.filter((item) => item.enrollmentId === enrollment.id);
  const percent =
    enrollmentProgress.length === 0
      ? progress.progressPercent
      : enrollmentProgress.reduce((sum, item) => sum + Number(item.progressPercent || 0), 0) /
        enrollmentProgress.length;

  enrollment.progressPercent = Number(percent.toFixed(2));
  enrollment.updatedAt = timestamp;

  recordAudit(state, {
    actorId: userId,
    actorType: "USER",
    eventType: "LESSON_UPDATED",
    entityType: "lesson_progress",
    entityId: progress.id,
    sessionId
  });
  persistState(state);

  return clone(progress);
}

export function heartbeatStudentSession(userId, sessionId) {
  const state = loadState();
  const { session } = ensureStudentSession(state, userId, sessionId);

  recordAudit(state, {
    actorId: userId,
    actorType: "USER",
    eventType: "SESSION_HEARTBEAT",
    entityType: "student_session",
    entityId: session.id,
    sessionId: session.id
  });
  persistState(state);

  return {
    ok: true,
    session: buildStudentSessionView(state, session)
  };
}

export function listStudentSessions(adminSessionId) {
  const state = loadState();
  ensureAdminSession(state, adminSessionId);

  return state.userSessions
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((session) => buildStudentSessionView(state, session));
}

export function revokeStudentSession(adminSessionId, sessionId, reason) {
  const state = loadState();
  const { user: adminUser, session: adminSession } = ensureAdminSession(state, adminSessionId);
  const session = state.userSessions.find((item) => item.id === sessionId);

  if (!session) {
    throw new SecureCourseError(404, "Student session not found.");
  }

  session.status = "REVOKED";
  session.revokedAt = nowIso();
  session.revokedReason = reason || "revoked_by_manager";
  session.updatedAt = nowIso();
  recordAudit(state, {
    actorId: adminUser.id,
    actorType: "ADMIN",
    eventType: "SESSION_REVOKED",
    entityType: "student_session",
    entityId: session.id,
    sessionId: adminSession.id
  });
  persistState(state);

  return buildStudentSessionView(state, session);
}

export function listAuditLogs(adminSessionId) {
  const state = loadState();
  ensureAdminSession(state, adminSessionId);
  return clone(state.auditLogs);
}

export function listVideoAssets(adminSessionId) {
  const state = loadState();
  ensureAdminSession(state, adminSessionId);

  return state.videoAssets
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((asset) => buildVideoAssetView(state, asset));
}

export function createUploadIntent(adminSessionId, payload) {
  const state = loadState();
  const { user: adminUser, session } = ensureAdminSession(state, adminSessionId);
  const lesson = getLessonById(state, payload.lessonId);

  if (!lesson) {
    throw new SecureCourseError(404, "Lesson not found.");
  }

  let asset = state.videoAssets.find((item) => item.lessonId === lesson.id);
  const timestamp = nowIso();

  if (!asset) {
    asset = {
      id: randomUUID(),
      lessonId: lesson.id,
      provider: payload.provider || "RAILWAY_LOCAL",
      status: "waiting_upload",
      externalUploadId: randomUUID(),
      externalAssetId: null,
      uploadUrl: null,
      playbackId: `local-${lesson.id}`,
      manifestUrl: null,
      fileName: null,
      fileSize: null,
      mimeType: null,
      storagePath: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      readyAt: null
    };
    state.videoAssets.push(asset);
  } else {
    asset.provider = payload.provider || asset.provider || "RAILWAY_LOCAL";
    asset.status = "waiting_upload";
    asset.manifestUrl = null;
    asset.fileName = null;
    asset.fileSize = null;
    asset.mimeType = null;
    asset.storagePath = null;
    asset.readyAt = null;
    asset.updatedAt = timestamp;
  }

  asset.uploadUrl = `/api/securecourse/admin/videos/assets/${asset.id}/upload`;
  asset.fileName = payload.fileName || asset.fileName;
  asset.fileSize = Number(payload.fileSize || asset.fileSize || 0) || null;
  asset.mimeType = payload.mimeType || asset.mimeType || null;

  recordAudit(state, {
    actorId: adminUser.id,
    actorType: "ADMIN",
    eventType: "VIDEO_UPLOAD_INTENT_CREATED",
    entityType: "video_asset",
    entityId: asset.id,
    sessionId: session.id
  });
  persistState(state);

  return {
    assetId: asset.id,
    provider: asset.provider,
    status: asset.status,
    uploadUrl: asset.uploadUrl,
    externalUploadId: asset.externalUploadId,
    asset: buildVideoAssetView(state, asset)
  };
}

export function uploadVideoAsset(adminSessionId, assetId, payload) {
  const state = loadState();
  const { user: adminUser, session } = ensureAdminSession(state, adminSessionId);
  const asset = state.videoAssets.find((item) => item.id === assetId);

  if (!asset) {
    throw new SecureCourseError(404, "Video asset not found.");
  }

  if (!payload?.buffer || !Buffer.isBuffer(payload.buffer) || payload.buffer.length === 0) {
    asset.status = "error";
    asset.updatedAt = nowIso();
    persistState(state);
    throw new SecureCourseError(400, "Video file is required.");
  }

  ensureUploadsDir();

  const timestamp = nowIso();
  const safeName = sanitizeFileName(payload.fileName || `${asset.id}.mp4`);
  const targetPath = path.join(UPLOADS_DIR, `${asset.id}-${safeName}`);

  asset.status = "uploading";
  asset.updatedAt = timestamp;
  persistState(state);

  writeFileSync(targetPath, payload.buffer);

  asset.fileName = safeName;
  asset.fileSize = payload.buffer.length;
  asset.mimeType = payload.mimeType || "video/mp4";
  asset.storagePath = targetPath;
  asset.status = "processing";
  asset.manifestUrl = `/api/securecourse/videos/${asset.id}`;
  asset.updatedAt = nowIso();
  asset.readyAt = null;

  recordAudit(state, {
    actorId: adminUser.id,
    actorType: "ADMIN",
    eventType: "VIDEO_UPLOAD_RECEIVED",
    entityType: "video_asset",
    entityId: asset.id,
    sessionId: session.id,
    metadata: {
      fileName: safeName,
      fileSize: payload.buffer.length,
      mimeType: asset.mimeType
    }
  });
  persistState(state);
  scheduleVideoAssetReady(asset.id);

  return buildVideoAssetView(state, asset);
}

export function getStudentVideoAsset(userId, sessionId, assetId) {
  const state = loadState();
  ensureStudentSession(state, userId, sessionId);
  const asset = state.videoAssets.find((item) => item.id === assetId);

  if (!asset) {
    throw new SecureCourseError(404, "Video asset not found.");
  }

  const lesson = getLessonById(state, asset.lessonId);

  if (!lesson) {
    throw new SecureCourseError(404, "Lesson not found.");
  }

  const enrollment = state.enrollments.find(
    (item) => item.userId === userId && item.courseId === lesson.courseId && item.status === "ACTIVE"
  );

  if (!enrollment) {
    throw new SecureCourseError(403, "Student is not enrolled in this course.");
  }

  if (normalizeVideoStatus(asset.status) !== "ready") {
    throw new SecureCourseError(409, "Video asset is not ready yet.");
  }

  if (asset.storagePath && existsSync(asset.storagePath)) {
    return {
      mode: "buffer",
      fileName: asset.fileName || `${asset.id}.mp4`,
      mimeType: asset.mimeType || "video/mp4",
      buffer: readFileSync(asset.storagePath)
    };
  }

  if (asset.manifestUrl && /^https?:\/\//.test(asset.manifestUrl)) {
    return {
      mode: "redirect",
      location: asset.manifestUrl
    };
  }

  throw new SecureCourseError(404, "Playable video source not found.");
}

export function getAdminSnapshot(adminSessionId) {
  return {
    users: listUsers(adminSessionId),
    courses: listCourses(adminSessionId),
    tokens: listTokens(adminSessionId),
    sessions: listStudentSessions(adminSessionId),
    uploads: listVideoAssets(adminSessionId),
    logs: listAuditLogs(adminSessionId)
  };
}

export { SecureCourseError };
