import { NextResponse } from "next/server";

export const SECURECOURSE_USER_COOKIE = "securecourse-user-id";
export const SECURECOURSE_SESSION_COOKIE = "securecourse-session-id";

function getApiBase() {
  return (process.env.SECURECOURSE_API_URL || "http://127.0.0.1:4000/api").replace(/\/+$/, "");
}

function getCookieOptions(request) {
  const hostname = request ? new URL(request.url).hostname : "";
  const isLocalHost =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && !isLocalHost,
    path: "/",
    maxAge: 60 * 60 * 24
  };
}

export function readSecureCourseSession(request) {
  const userId = request.cookies.get(SECURECOURSE_USER_COOKIE)?.value;
  const sessionId = request.cookies.get(SECURECOURSE_SESSION_COOKIE)?.value;

  if (!userId || !sessionId) {
    return null;
  }

  return { userId, sessionId };
}

export function setSecureCourseSession(request, response, payload) {
  response.cookies.set(SECURECOURSE_USER_COOKIE, payload.user.id, getCookieOptions(request));
  response.cookies.set(SECURECOURSE_SESSION_COOKIE, payload.session.id, getCookieOptions(request));
}

export function clearSecureCourseSession(request, response) {
  const expired = {
    ...getCookieOptions(request),
    maxAge: 0
  };

  response.cookies.set(SECURECOURSE_USER_COOKIE, "", expired);
  response.cookies.set(SECURECOURSE_SESSION_COOKIE, "", expired);
}

export async function fetchSecureCourse(path, options = {}) {
  const { method = "GET", headers = {}, body, searchParams } = options;
  const target = new URL(`${getApiBase()}${path.startsWith("/") ? path : `/${path}`}`);

  if (searchParams) {
    target.search = searchParams.toString();
  }

  const requestHeaders = new Headers(headers);
  let requestBody = body;

  if (body !== undefined && !(body instanceof FormData) && typeof body !== "string") {
    requestHeaders.set("content-type", requestHeaders.get("content-type") || "application/json");
    requestBody = JSON.stringify(body);
  }

  return fetch(target, {
    method,
    headers: requestHeaders,
    body: requestBody,
    cache: "no-store"
  });
}

export async function readBackendResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (!text) {
    return null;
  }

  if (contentType.includes("application/json")) {
    return JSON.parse(text);
  }

  return text;
}

export async function toNextResponse(response) {
  const body = await response.text();
  const nextResponse = new NextResponse(body, {
    status: response.status
  });
  const contentType = response.headers.get("content-type");

  if (contentType) {
    nextResponse.headers.set("content-type", contentType);
  }

  return nextResponse;
}

export async function proxySecureCourseRequest(request, backendPath, options = {}) {
  const { headers = {} } = options;
  const searchParams = new URL(request.url).searchParams;
  const contentType = request.headers.get("content-type");
  const requestHeaders = { ...headers };

  if (contentType) {
    requestHeaders["content-type"] = contentType;
  }

  const body =
    request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();

  const response = await fetchSecureCourse(backendPath, {
    method: request.method,
    headers: requestHeaders,
    body,
    searchParams
  });

  return toNextResponse(response);
}

export function secureCourseErrorResponse(error, fallbackMessage = "SecureCourse proxy error.") {
  return NextResponse.json(
    {
      message: error instanceof Error ? error.message : fallbackMessage
    },
    {
      status: 500
    }
  );
}
