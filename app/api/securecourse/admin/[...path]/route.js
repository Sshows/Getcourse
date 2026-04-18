import {
  proxySecureCourseRequest,
  readSecureCourseAdminSession,
  secureCourseErrorResponse
} from "@/lib/securecourse-proxy";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function buildAdminPath(paramsPromise) {
  const params = await paramsPromise;
  return `/admin/${params.path.join("/")}`;
}

export async function GET(request, { params }) {
  try {
    const adminSession = readSecureCourseAdminSession(request);

    if (!adminSession?.sessionId) {
      return NextResponse.json({ message: "Admin authentication is required." }, { status: 401 });
    }

    return await proxySecureCourseRequest(request, await buildAdminPath(params), {
      headers: {
        "x-admin-session-id": adminSession.sessionId
      }
    });
  } catch (error) {
    return secureCourseErrorResponse(error, "Admin proxy failed.");
  }
}

export async function POST(request, { params }) {
  try {
    const adminSession = readSecureCourseAdminSession(request);

    if (!adminSession?.sessionId) {
      return NextResponse.json({ message: "Admin authentication is required." }, { status: 401 });
    }

    return await proxySecureCourseRequest(request, await buildAdminPath(params), {
      headers: {
        "x-admin-session-id": adminSession.sessionId
      }
    });
  } catch (error) {
    return secureCourseErrorResponse(error, "Admin proxy failed.");
  }
}

export async function PATCH(request, { params }) {
  try {
    const adminSession = readSecureCourseAdminSession(request);

    if (!adminSession?.sessionId) {
      return NextResponse.json({ message: "Admin authentication is required." }, { status: 401 });
    }

    return await proxySecureCourseRequest(request, await buildAdminPath(params), {
      headers: {
        "x-admin-session-id": adminSession.sessionId
      }
    });
  } catch (error) {
    return secureCourseErrorResponse(error, "Admin proxy failed.");
  }
}
