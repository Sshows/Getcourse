import {
  proxySecureCourseRequest,
  readSecureCourseSession,
  secureCourseErrorResponse
} from "@/lib/securecourse-proxy";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function buildStudentPath(paramsPromise) {
  const params = await paramsPromise;
  return `/student/${params.path.join("/")}`;
}

function buildSessionHeaders(request) {
  const session = readSecureCourseSession(request);

  if (!session) {
    return null;
  }

  return {
    "x-user-id": session.userId,
    "x-session-id": session.sessionId
  };
}

function unauthenticatedResponse() {
  return NextResponse.json(
    {
      message: "Student session is not active."
    },
    {
      status: 401
    }
  );
}

export async function GET(request, { params }) {
  const headers = buildSessionHeaders(request);

  if (!headers) {
    return unauthenticatedResponse();
  }

  try {
    return await proxySecureCourseRequest(request, await buildStudentPath(params), {
      headers
    });
  } catch (error) {
    return secureCourseErrorResponse(error, "Student proxy failed.");
  }
}

export async function POST(request, { params }) {
  const headers = buildSessionHeaders(request);

  if (!headers) {
    return unauthenticatedResponse();
  }

  try {
    return await proxySecureCourseRequest(request, await buildStudentPath(params), {
      headers
    });
  } catch (error) {
    return secureCourseErrorResponse(error, "Student proxy failed.");
  }
}
