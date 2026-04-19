import {
  readSecureCourseAdminSession,
  secureCourseErrorResponse
} from "@/lib/securecourse-proxy";
import {
  createCourse,
  createEnrollment,
  createLesson,
  createLessonMaterial,
  createUploadIntent,
  createUser,
  issueToken,
  listAuditLogs,
  listCourses,
  listEnrollments,
  listStudentSessions,
  listTokens,
  listUsers,
  listVideoAssets,
  revokeEnrollment,
  revokeStudentSession,
  revokeToken
} from "@/lib/securecourse-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const adminSession = readSecureCourseAdminSession(request);

    if (!adminSession?.sessionId) {
      return NextResponse.json({ message: "Admin authentication is required." }, { status: 401 });
    }

    const resolvedParams = await params;
    const parts = resolvedParams.path || [];

    if (parts.length === 1 && parts[0] === "users") {
      return NextResponse.json(listUsers(adminSession.sessionId));
    }

    if (parts.length === 1 && parts[0] === "courses") {
      return NextResponse.json(listCourses(adminSession.sessionId));
    }

    if (parts.length === 1 && parts[0] === "enrollments") {
      return NextResponse.json(listEnrollments(adminSession.sessionId));
    }

    if (parts.length === 1 && parts[0] === "tokens") {
      return NextResponse.json(listTokens(adminSession.sessionId));
    }

    if (parts.length === 1 && parts[0] === "sessions") {
      return NextResponse.json(listStudentSessions(adminSession.sessionId));
    }

    if (parts.length === 2 && parts[0] === "videos" && parts[1] === "assets") {
      return NextResponse.json(listVideoAssets(adminSession.sessionId));
    }

    if (parts.length === 1 && parts[0] === "audit-logs") {
      return NextResponse.json(listAuditLogs(adminSession.sessionId));
    }

    return NextResponse.json({ message: "Admin route not found." }, { status: 404 });
  } catch (error) {
    return secureCourseErrorResponse(error, "Admin proxy failed.");
  }
}

export async function POST(request, { params }) {
  try {
    const adminSession = readSecureCourseAdminSession(request);

    if (!adminSession?.sessionId) {
      return NextResponse.json({ message: "Admin authentication is required." }, { status: 401 });
    }

    const resolvedParams = await params;
    const parts = resolvedParams.path || [];
    const body = await request.json().catch(() => ({}));

    if (parts.length === 1 && parts[0] === "users") {
      return NextResponse.json(createUser(adminSession.sessionId, body));
    }

    if (parts.length === 1 && parts[0] === "courses") {
      return NextResponse.json(createCourse(adminSession.sessionId, body));
    }

    if (parts.length === 3 && parts[0] === "courses" && parts[2] === "lessons") {
      return NextResponse.json(createLesson(adminSession.sessionId, parts[1], body));
    }

    if (parts.length === 3 && parts[0] === "lessons" && parts[2] === "materials") {
      return NextResponse.json(createLessonMaterial(adminSession.sessionId, parts[1], body));
    }

    if (parts.length === 1 && parts[0] === "enrollments") {
      return NextResponse.json(createEnrollment(adminSession.sessionId, body));
    }

    if (parts.length === 3 && parts[0] === "sessions" && parts[2] === "revoke") {
      return NextResponse.json(revokeStudentSession(adminSession.sessionId, parts[1], body.reason));
    }

    if (parts.length === 2 && parts[0] === "tokens" && parts[1] === "issue") {
      return NextResponse.json(issueToken(adminSession.sessionId, body));
    }

    if (parts.length === 2 && parts[0] === "videos" && parts[1] === "upload-intents") {
      return NextResponse.json(createUploadIntent(adminSession.sessionId, body));
    }

    return NextResponse.json({ message: "Admin route not found." }, { status: 404 });
  } catch (error) {
    return secureCourseErrorResponse(error, "Admin proxy failed.");
  }
}

export async function PATCH(request, { params }) {
  try {
    const adminSession = readSecureCourseAdminSession(request);

    if (!adminSession?.sessionId) {
      return NextResponse.json({ message: "Admin authentication is required." }, { status: 401 });
    }

    const resolvedParams = await params;
    const parts = resolvedParams.path || [];
    const body = await request.json().catch(() => ({}));

    if (parts.length === 3 && parts[0] === "tokens" && parts[2] === "revoke") {
      return NextResponse.json(revokeToken(adminSession.sessionId, parts[1], body.reason));
    }

    if (parts.length === 3 && parts[0] === "enrollments" && parts[2] === "revoke") {
      return NextResponse.json(revokeEnrollment(adminSession.sessionId, parts[1], body.reason));
    }

    return NextResponse.json({ message: "Admin route not found." }, { status: 404 });
  } catch (error) {
    return secureCourseErrorResponse(error, "Admin proxy failed.");
  }
}
