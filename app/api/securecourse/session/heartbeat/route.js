import {
  fetchSecureCourse,
  readBackendResponse,
  readSecureCourseSession,
  secureCourseErrorResponse
} from "@/lib/securecourse-proxy";
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
    const response = await fetchSecureCourse("/session/heartbeat", {
      method: "POST",
      body: session
    });
    const payload = await readBackendResponse(response);

    return NextResponse.json(payload, {
      status: response.status
    });
  } catch (error) {
    return secureCourseErrorResponse(error, "Heartbeat proxy failed.");
  }
}
