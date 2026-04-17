import {
  fetchSecureCourse,
  readBackendResponse,
  secureCourseErrorResponse,
  setSecureCourseSession
} from "@/lib/securecourse-proxy";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const response = await fetchSecureCourse("/auth/activate", {
      method: "POST",
      body
    });
    const payload = await readBackendResponse(response);

    if (!response.ok) {
      return NextResponse.json(payload || { message: "Activation failed." }, { status: response.status });
    }

    const nextResponse = NextResponse.json(payload);
    setSecureCourseSession(request, nextResponse, payload);
    return nextResponse;
  } catch (error) {
    return secureCourseErrorResponse(error, "Activation proxy failed.");
  }
}
