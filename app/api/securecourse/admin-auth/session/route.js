import {
  fetchSecureCourse,
  readBackendResponse,
  readSecureCourseAdminSession,
  secureCourseErrorResponse
} from "@/lib/securecourse-proxy";
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

    const response = await fetchSecureCourse("/admin-auth/me", {
      headers: {
        "x-admin-session-id": adminSession.sessionId
      }
    });

    if (!response.ok) {
      return NextResponse.json({
        authenticated: false
      });
    }

    const payload = await readBackendResponse(response);
    return NextResponse.json(payload);
  } catch (error) {
    return secureCourseErrorResponse(error, "Admin session proxy failed.");
  }
}
