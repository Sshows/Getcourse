import { readSecureCourseSession } from "@/lib/securecourse-proxy";
import { getStudentSessionView } from "@/lib/securecourse-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const session = readSecureCourseSession(request);

    if (!session) {
      return NextResponse.json({
        authenticated: false
      });
    }

    return NextResponse.json(getStudentSessionView(session.userId, session.sessionId));
  } catch {
    return NextResponse.json({
      authenticated: false
    });
  }
}
