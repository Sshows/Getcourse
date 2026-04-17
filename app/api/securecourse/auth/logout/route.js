import {
  clearSecureCourseSession,
  fetchSecureCourse,
  readBackendResponse,
  readSecureCourseSession,
  secureCourseErrorResponse
} from "@/lib/securecourse-proxy";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const session = readSecureCourseSession(request);
    let payload = { ok: true };
    let status = 200;

    if (session) {
      const response = await fetchSecureCourse("/auth/logout", {
        method: "POST",
        body: session
      });

      payload = (await readBackendResponse(response)) || payload;
      status = response.status;
    }

    const nextResponse = NextResponse.json(payload, { status });
    clearSecureCourseSession(request, nextResponse);
    return nextResponse;
  } catch (error) {
    return secureCourseErrorResponse(error, "Logout proxy failed.");
  }
}
