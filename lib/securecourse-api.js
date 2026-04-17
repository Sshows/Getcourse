const BFF_BASE = "/api/securecourse";

async function readResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

async function apiRequest(path, options = {}) {
  const { method = "GET", body, headers = {} } = options;
  const requestHeaders = new Headers(headers);
  let requestBody;

  if (body !== undefined) {
    requestHeaders.set("content-type", "application/json");
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(`${BFF_BASE}${path}`, {
    method,
    headers: requestHeaders,
    body: requestBody,
    credentials: "same-origin",
    cache: "no-store"
  });

  const payload = await readResponse(response);

  if (!response.ok) {
    const message =
      (payload && typeof payload === "object" && payload.message) ||
      `SecureCourse request failed: ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export function getUsers() {
  return apiRequest("/admin/users");
}

export function createUser(payload) {
  return apiRequest("/admin/users", {
    method: "POST",
    body: payload
  });
}

export function getCourses() {
  return apiRequest("/admin/courses");
}

export function getCourse(courseId) {
  return apiRequest(`/admin/courses/${courseId}`);
}

export function createCourse(payload) {
  return apiRequest("/admin/courses", {
    method: "POST",
    body: payload
  });
}

export function createLesson(courseId, payload) {
  return apiRequest(`/admin/courses/${courseId}/lessons`, {
    method: "POST",
    body: payload
  });
}

export function createLessonMaterial(lessonId, payload) {
  return apiRequest(`/admin/lessons/${lessonId}/materials`, {
    method: "POST",
    body: payload
  });
}

export function getEnrollments() {
  return apiRequest("/admin/enrollments");
}

export function createEnrollment(payload) {
  return apiRequest("/admin/enrollments", {
    method: "POST",
    body: payload
  });
}

export function getTokens() {
  return apiRequest("/admin/tokens");
}

export function issueToken(payload) {
  return apiRequest("/admin/tokens/issue", {
    method: "POST",
    body: payload
  });
}

export function revokeToken(tokenId, reason) {
  return apiRequest(`/admin/tokens/${tokenId}/revoke`, {
    method: "PATCH",
    body: { reason }
  });
}

export function getSessions() {
  return apiRequest("/admin/sessions");
}

export function revokeSession(sessionId, reason) {
  return apiRequest(`/admin/sessions/${sessionId}/revoke`, {
    method: "POST",
    body: { reason }
  });
}

export function getUploads() {
  return apiRequest("/admin/videos/assets");
}

export function createUploadIntent(payload) {
  return apiRequest("/admin/videos/upload-intents", {
    method: "POST",
    body: payload
  });
}

export function getAuditLogs() {
  return apiRequest("/admin/audit-logs");
}

export async function getDashboardSnapshot() {
  const [users, courses, tokens, sessions, uploads, logs] = await Promise.all([
    getUsers(),
    getCourses(),
    getTokens(),
    getSessions(),
    getUploads(),
    getAuditLogs()
  ]);

  const today = new Date().toDateString();
  const issuedTokensToday = tokens.filter((token) => {
    const createdAt = token.createdAt ? new Date(token.createdAt).toDateString() : "";
    return createdAt === today;
  }).length;
  const readyVideoAssets = uploads.filter((asset) => asset.status === "READY").length;

  return {
    users,
    courses,
    tokens,
    sessions,
    uploads,
    logs,
    metrics: {
      totalUsers: users.length,
      activeUsers: users.filter((user) => user.status === "ACTIVE").length,
      activeSessions: sessions.filter((session) => session.status === "ACTIVE").length,
      issuedTokensToday,
      readyVideoAssets
    }
  };
}

export function activateAccess(payload) {
  return apiRequest("/auth/activate", {
    method: "POST",
    body: payload
  });
}

export function logoutAccess() {
  return apiRequest("/auth/logout", {
    method: "POST",
    body: {}
  });
}

export function getSecureCourseSession() {
  return apiRequest("/auth/session");
}

export function getStudentCourses() {
  return apiRequest("/student/courses");
}

export function getStudentLesson(lessonId) {
  return apiRequest(`/student/lessons/${lessonId}`);
}

export function requestPlaybackAccess(lessonId) {
  return apiRequest(`/student/lessons/${lessonId}/playback-access`, {
    method: "POST",
    body: {}
  });
}

export function updateLessonProgress(lessonId, payload) {
  return apiRequest(`/student/lessons/${lessonId}/progress`, {
    method: "POST",
    body: payload
  });
}

export function heartbeatSession() {
  return apiRequest("/session/heartbeat", {
    method: "POST",
    body: {}
  });
}
