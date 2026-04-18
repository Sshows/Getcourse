import {
  fetchSecureCourse,
  readBackendResponse,
  secureCourseErrorResponse,
  setSecureCourseAdminSession
} from "@/lib/securecourse-proxy";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const response = await fetchSecureCourse("/admin-auth/login", {
      method: "POST",
      body: {
        login: body.login,
        password: body.password
      }
    });
    const payload = await readBackendResponse(response);

    if (!response.ok) {
      return NextResponse.json(payload || { message: "Admin login failed." }, { status: response.status });
    }

    const nextResponse = NextResponse.json(payload);
    setSecureCourseAdminSession(request, nextResponse, payload);
    return nextResponse;
  } catch (error) {
    return secureCourseErrorResponse(error, "Admin login proxy failed.");
  }
}
