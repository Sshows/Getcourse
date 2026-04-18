import {
  readSecureCourseSession,
  secureCourseErrorResponse
} from "@/lib/securecourse-proxy";
import {
  getStudentLesson,
  listStudentCourses,
  requestPlaybackAccess,
  updateLessonProgress
} from "@/lib/securecourse-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function unauthenticatedResponse() {
  return NextResponse.json(
    {
      message: "Student session is not active."
    },
    {
      status: 401
    }
  );
}

export async function GET(request, { params }) {
  const session = readSecureCourseSession(request);

  if (!session) {
    return unauthenticatedResponse();
  }

  try {
    const resolvedParams = await params;
    const parts = resolvedParams.path || [];

    if (parts.length === 1 && parts[0] === "courses") {
      return NextResponse.json(listStudentCourses(session.userId, session.sessionId));
    }

    if (parts.length === 2 && parts[0] === "lessons") {
      return NextResponse.json(getStudentLesson(session.userId, session.sessionId, parts[1]));
    }

    return NextResponse.json({ message: "Student route not found." }, { status: 404 });
  } catch (error) {
    return secureCourseErrorResponse(error, "Student proxy failed.");
  }
}

export async function POST(request, { params }) {
  const session = readSecureCourseSession(request);

  if (!session) {
    return unauthenticatedResponse();
  }

  try {
    const resolvedParams = await params;
    const parts = resolvedParams.path || [];

    if (parts.length === 3 && parts[0] === "lessons" && parts[2] === "playback-access") {
      return NextResponse.json(requestPlaybackAccess(session.userId, session.sessionId, parts[1]));
    }

    if (parts.length === 3 && parts[0] === "lessons" && parts[2] === "progress") {
      const body = await request.json();
      return NextResponse.json(updateLessonProgress(session.userId, session.sessionId, parts[1], body));
    }

    return NextResponse.json({ message: "Student route not found." }, { status: 404 });
  } catch (error) {
    return secureCourseErrorResponse(error, "Student proxy failed.");
  }
}
