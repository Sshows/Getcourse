import {
  clearSecureCourseAdminSession,
  fetchSecureCourse,
  readSecureCourseAdminSession,
  secureCourseErrorResponse
} from "@/lib/securecourse-proxy";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const adminSession = readSecureCourseAdminSession(request);

    if (adminSession?.sessionId) {
      await fetchSecureCourse("/admin-auth/logout", {
        method: "POST",
        headers: {
          "x-admin-session-id": adminSession.sessionId
        }
      });
    }

    const response = NextResponse.json({ ok: true });
    clearSecureCourseAdminSession(request, response);
    return response;
  } catch (error) {
    return secureCourseErrorResponse(error, "Admin logout proxy failed.");
  }
}
