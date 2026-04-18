import {
  secureCourseErrorResponse,
  setSecureCourseAdminSession
} from "@/lib/securecourse-proxy";
import { loginAdmin } from "@/lib/securecourse-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const payload = loginAdmin(body.login, body.password, {
      ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
      userAgent: request.headers.get("user-agent") || null
    });

    const nextResponse = NextResponse.json(payload);
    setSecureCourseAdminSession(request, nextResponse, payload);
    return nextResponse;
  } catch (error) {
    return secureCourseErrorResponse(error, "Admin login proxy failed.");
  }
}
