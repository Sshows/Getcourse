import { NextResponse } from "next/server";

import { secureCourseErrorResponse } from "@/lib/securecourse-proxy";
import { beginStudentRegistration } from "@/lib/securecourse-student-auth";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const payload = await beginStudentRegistration(request, body);
    return NextResponse.json(payload);
  } catch (error) {
    return secureCourseErrorResponse(error, "Student registration failed.");
  }
}
