import { readSecureCourseSession } from "@/lib/securecourse-proxy";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const session = readSecureCourseSession(request);

  if (!session) {
    return NextResponse.json({
      authenticated: false
    });
  }

  return NextResponse.json({
    authenticated: true,
    userId: session.userId,
    sessionId: session.sessionId
  });
}
