import {
  clearSecureCourseAdminSession,
  readSecureCourseAdminSession,
  secureCourseErrorResponse
} from "@/lib/securecourse-proxy";
import { logoutAdmin } from "@/lib/securecourse-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const adminSession = readSecureCourseAdminSession(request);

    if (adminSession?.sessionId) {
      logoutAdmin(adminSession.sessionId);
    }

    const response = NextResponse.json({ ok: true });
    clearSecureCourseAdminSession(request, response);
    return response;
  } catch (error) {
    return secureCourseErrorResponse(error, "Admin logout proxy failed.");
  }
}
