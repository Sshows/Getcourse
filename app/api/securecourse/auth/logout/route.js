import {
  clearSecureCourseSession,
  readSecureCourseSession,
  secureCourseErrorResponse
} from "@/lib/securecourse-proxy";
import { logoutStudent } from "@/lib/securecourse-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const session = readSecureCourseSession(request);
    let payload = { ok: true };

    if (session) {
      payload = logoutStudent(session.userId, session.sessionId) || payload;
    }

    const nextResponse = NextResponse.json(payload, { status: 200 });
    clearSecureCourseSession(request, nextResponse);
    return nextResponse;
  } catch (error) {
    return secureCourseErrorResponse(error, "Logout proxy failed.");
  }
}
