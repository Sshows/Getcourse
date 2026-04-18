import {
  secureCourseErrorResponse,
  setSecureCourseSession
} from "@/lib/securecourse-proxy";
import { activateToken } from "@/lib/securecourse-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const payload = activateToken({
      ...body,
      ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
      userAgent: body.userAgent || request.headers.get("user-agent") || null
    });

    const nextResponse = NextResponse.json(payload);
    setSecureCourseSession(request, nextResponse, payload);
    return nextResponse;
  } catch (error) {
    return secureCourseErrorResponse(error, "Activation proxy failed.");
  }
}
