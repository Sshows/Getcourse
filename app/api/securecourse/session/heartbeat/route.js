import {
  readSecureCourseSession,
  secureCourseErrorResponse
} from "@/lib/securecourse-proxy";
import { heartbeatStudentSession } from "@/lib/securecourse-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const session = readSecureCourseSession(request);

  if (!session) {
    return NextResponse.json(
      {
        message: "Student session is not active."
      },
      {
        status: 401
      }
    );
  }

  try {
    return NextResponse.json(heartbeatStudentSession(session.userId, session.sessionId));
  } catch (error) {
    return secureCourseErrorResponse(error, "Heartbeat proxy failed.");
  }
}
