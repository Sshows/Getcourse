export class SecureCourseApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "SecureCourseApiError";
    this.status = status;
  }
}

const DEFAULT_WEB_URL = "https://securecourse-backend-production.up.railway.app";

function getWebUrl() {
  return String(process.env.EXPO_PUBLIC_SECURECOURSE_WEB_URL || DEFAULT_WEB_URL).replace(/\/+$/, "");
}

export function getSecureCourseWebUrl() {
  return getWebUrl();
}

export type StudentUser = {
  id: string;
  email: string;
  fullName: string;
};

export type LessonMaterial = {
  id: string;
  lessonId: string;
  title: string;
  type: string;
  content?: string | null;
  fileUrl?: string | null;
  linkUrl?: string | null;
  position: number;
};

export type LessonSummary = {
  id: string;
  courseId: string;
  title: string;
  slug: string;
  content?: string | null;
  notes?: string | null;
  durationSeconds?: number | null;
  position: number;
  status?: string;
};

export type VideoAsset = {
  id: string;
  lessonId: string;
  provider: string;
  status: string;
  manifestUrl?: string | null;
  playbackId?: string | null;
};

export type CourseView = {
  id: string;
  title: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  lessons: LessonSummary[];
};

export type EnrollmentView = {
  id: string;
  userId: string;
  courseId: string;
  status: string;
  note?: string | null;
  progressPercent?: number | null;
  assignedAt?: string;
  course: CourseView | null;
};

export type StudentSessionRecord = {
  userId: string;
  sessionId: string;
  user: StudentUser;
  startedAt: string;
  idleExpiresAt: string;
  enrollment: EnrollmentView | null;
  webUrl: string;
};

export type ActivationResponse = {
  user: StudentUser;
  enrollment: EnrollmentView;
  session: {
    id: string;
    startedAt: string;
    idleExpiresAt: string;
  };
};

export type StudentSessionView = {
  authenticated: boolean;
  user?: StudentUser;
  userId?: string;
  sessionId?: string;
};

export type StudentCoursesResponse = EnrollmentView[];

export type StudentLessonResponse = {
  lesson: LessonSummary & {
    course: Pick<CourseView, "id" | "title" | "slug"> | null;
    materials: LessonMaterial[];
    videoAsset: VideoAsset | null;
  };
  enrollment: EnrollmentView;
  progress: {
    progressPercent?: number;
    completed?: boolean;
    lastPositionSeconds?: number;
    lastWatchedAt?: string;
  } | null;
};

export type PlaybackAccessResponse = {
  provider: string;
  lessonId: string;
  playback: {
    playbackId?: string | null;
    manifestUrl: string;
    token?: string | null;
  };
};

export type HeartbeatResponse = {
  ok: boolean;
  session?: {
    id: string;
    idleExpiresAt: string;
    status: string;
    lastSeenAt: string;
  };
};

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  session?: Pick<StudentSessionRecord, "userId" | "sessionId"> | null;
};

function buildHeaders(session?: Pick<StudentSessionRecord, "userId" | "sessionId"> | null) {
  const headers = new Headers();
  headers.set("accept", "application/json");

  if (session?.userId && session?.sessionId) {
    headers.set("x-securecourse-user-id", session.userId);
    headers.set("x-securecourse-session-id", session.sessionId);
  }

  return headers;
}

async function readResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  const raw = await response.text();
  const payload = raw && contentType.includes("application/json") ? JSON.parse(raw) : raw;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : `SecureCourse request failed with status ${response.status}.`;
    throw new SecureCourseApiError(response.status, message);
  }

  return payload as T;
}

async function secureCourseRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = buildHeaders(options.session);
  let body: BodyInit | undefined;

  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(options.body);
  }

  const response = await fetch(`${getWebUrl()}${path}`, {
    method: options.method || "GET",
    headers,
    body
  });

  return readResponse<T>(response);
}

export async function activateStudentToken(input: {
  token: string;
  deviceId: string;
  deviceFingerprint: string;
  deviceLabel: string;
  userAgent: string;
}) {
  return secureCourseRequest<ActivationResponse>("/api/securecourse/auth/activate", {
    method: "POST",
    body: input
  });
}

export async function getStudentSession(session: Pick<StudentSessionRecord, "userId" | "sessionId">) {
  return secureCourseRequest<StudentSessionView>("/api/securecourse/auth/session", {
    session
  });
}

export async function logoutStudentSession(session: Pick<StudentSessionRecord, "userId" | "sessionId">) {
  return secureCourseRequest<{ ok: boolean }>("/api/securecourse/auth/logout", {
    method: "POST",
    session
  });
}

export async function getStudentCourses(session: Pick<StudentSessionRecord, "userId" | "sessionId">) {
  return secureCourseRequest<StudentCoursesResponse>("/api/securecourse/student/courses", {
    session
  });
}

export async function getStudentLesson(
  session: Pick<StudentSessionRecord, "userId" | "sessionId">,
  lessonId: string
) {
  return secureCourseRequest<StudentLessonResponse>(
    `/api/securecourse/student/lessons/${lessonId}`,
    {
      session
    }
  );
}

export async function requestPlaybackAccess(
  session: Pick<StudentSessionRecord, "userId" | "sessionId">,
  lessonId: string
) {
  return secureCourseRequest<PlaybackAccessResponse>(
    `/api/securecourse/student/lessons/${lessonId}/playback-access`,
    {
      method: "POST",
      session
    }
  );
}

export async function updateLessonProgress(
  session: Pick<StudentSessionRecord, "userId" | "sessionId">,
  lessonId: string,
  payload: {
    progressPercent: number;
    completed?: boolean;
    lastPositionSeconds?: number;
  }
) {
  return secureCourseRequest<StudentLessonResponse["progress"]>(
    `/api/securecourse/student/lessons/${lessonId}/progress`,
    {
      method: "POST",
      session,
      body: payload
    }
  );
}

export async function heartbeatStudentSession(
  session: Pick<StudentSessionRecord, "userId" | "sessionId">
) {
  return secureCourseRequest<HeartbeatResponse>("/api/securecourse/session/heartbeat", {
    method: "POST",
    session
  });
}
