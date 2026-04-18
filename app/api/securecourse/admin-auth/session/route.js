import {
  readSecureCourseAdminSession,
  secureCourseErrorResponse
} from "@/lib/securecourse-proxy";
import { getAdminSessionView } from "@/lib/securecourse-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const adminSession = readSecureCourseAdminSession(request);

    if (!adminSession?.sessionId) {
      return NextResponse.json({
        authenticated: false
      });
    }

    return NextResponse.json(getAdminSessionView(adminSession.sessionId));
  } catch (error) {
    return NextResponse.json({
      authenticated: false
    });
  }
}
