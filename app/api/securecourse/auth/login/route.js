import { NextResponse } from "next/server";

import {
  secureCourseErrorResponse,
  setSecureCourseSession
} from "@/lib/securecourse-proxy";
import { loginStudentOnWebsite } from "@/lib/securecourse-student-auth";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const payload = await loginStudentOnWebsite(request, body);
    const response = NextResponse.json(payload);
    setSecureCourseSession(request, response, payload);
    return response;
  } catch (error) {
    return secureCourseErrorResponse(error, "Student login failed.");
  }
}
