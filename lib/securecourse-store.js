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
const DEFAULT_VIDEO_URL =
  process.env.SECURECOURSE_SAMPLE_VIDEO_URL ||
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
const STUDENT_SESSION_IDLE_MINUTES = Number(process.env.SESSION_IDLE_MINUTES || 15);
const ADMIN_SESSION_HOURS = Number(process.env.ADMIN_SESSION_HOURS || 12);

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

function ensureStoreFile() {
  if (!existsSync(STORE_DIR)) {
    mkdirSync(STORE_DIR, { recursive: true });
  }

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
    admin.passwordHash = hashPassword(password);
    admin.updatedAt = timestamp;
  }
}

function loadState() {
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
  persistState(state);
  return state;
}

function persistState(state) {
  if (!existsSync(STORE_DIR)) {
    mkdirSync(STORE_DIR, { recursive: true });
  }

  const tempFile = `${STORE_FILE}.tmp`;
  writeFileSync(tempFile, JSON.stringify(state, null, 2));
  renameSync(tempFile, STORE_FILE);
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
    status: "READY",
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
  seedLessonBundle(state, course.id);
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
    ensureStudentSession(state, userId, sessionId, { touch: false });
    return {
      authenticated: true,
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

  if (!asset || asset.status !== "READY" || !asset.manifestUrl) {
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
      provider: payload.provider || "LOCAL_SAMPLE",
      status: "READY",
      externalUploadId: null,
      externalAssetId: null,
      uploadUrl: null,
      playbackId: `local-${lesson.id}`,
      manifestUrl: DEFAULT_VIDEO_URL,
      createdAt: timestamp,
      updatedAt: timestamp,
      readyAt: timestamp
    };
    state.videoAssets.push(asset);
  } else {
    asset.provider = payload.provider || asset.provider || "LOCAL_SAMPLE";
    asset.status = "READY";
    asset.manifestUrl = DEFAULT_VIDEO_URL;
    asset.readyAt = timestamp;
    asset.updatedAt = timestamp;
  }

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
    uploadUrl: "local://sample-upload",
    externalUploadId: asset.externalUploadId
  };
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
