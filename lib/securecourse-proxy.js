import { NextResponse } from "next/server";

export const SECURECOURSE_USER_COOKIE = "securecourse-user-id";
export const SECURECOURSE_SESSION_COOKIE = "securecourse-session-id";
export const SECURECOURSE_ADMIN_SESSION_COOKIE = "securecourse-admin-session-id";

function readCookieValue(request, name) {
  const directCookie = request?.cookies?.get?.(name);

  if (typeof directCookie === "string" && directCookie) {
    return directCookie;
  }

  if (directCookie && typeof directCookie.value === "string") {
    return directCookie.value;
  }

  const rawCookieHeader = request?.headers?.get?.("cookie");

  if (!rawCookieHeader) {
    return null;
  }

  const cookie = rawCookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.slice(name.length + 1));
}

function getApiBase() {
  const configuredUrl = process.env.SECURECOURSE_API_URL;

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://127.0.0.1:4000/api";
  }

  throw new Error(
    "SECURECOURSE_API_URL is not configured. Deploy the NestJS backend and set the public backend API URL in the frontend environment."
  );
}

function getCookieOptions(request) {
  const hostname = request ? new URL(request.url).hostname : "";
  const isLocalHost =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  const forceInsecureCookies = process.env.SECURECOURSE_FORCE_INSECURE_COOKIES === "true";

  return {
    httpOnly: true,
    sameSite: "lax",
    secure: !forceInsecureCookies && process.env.NODE_ENV === "production" && !isLocalHost,
    path: "/",
    maxAge: 60 * 60 * 24
  };
}

export function readSecureCourseSession(request) {
  const userId = readCookieValue(request, SECURECOURSE_USER_COOKIE);
  const sessionId = readCookieValue(request, SECURECOURSE_SESSION_COOKIE);

  if (!userId || !sessionId) {
    return null;
  }

  return { userId, sessionId };
}

export function readSecureCourseAdminSession(request) {
  const sessionId = readCookieValue(request, SECURECOURSE_ADMIN_SESSION_COOKIE);

  if (!sessionId) {
    return null;
  }

  return {
    sessionId
  };
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

export function setSecureCourseAdminSession(request, response, payload) {
  response.cookies.set(
    SECURECOURSE_ADMIN_SESSION_COOKIE,
    payload.session.id,
    getCookieOptions(request)
  );
}

export function clearSecureCourseAdminSession(request, response) {
  response.cookies.set(SECURECOURSE_ADMIN_SESSION_COOKIE, "", {
    ...getCookieOptions(request),
    maxAge: 0
  });
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
  const message =
    error instanceof Error ? error.message : fallbackMessage;
  const status =
    error && typeof error === "object" && "status" in error && Number.isFinite(Number(error.status))
      ? Number(error.status)
      : null;

  const normalized = String(message || "").toLowerCase();
  const backendUnavailable =
    normalized.includes("fetch failed") ||
    normalized.includes("econnrefused") ||
    normalized.includes("enotfound") ||
    normalized.includes("backend api url") ||
    normalized.includes("securecourse_api_url");

  return NextResponse.json(
    {
      message: backendUnavailable
        ? "SecureCourse backend is unavailable. Deploy the NestJS backend on Render and set SECURECOURSE_API_URL in the frontend env."
        : message
    },
    {
      status: status || (backendUnavailable ? 503 : 500)
    }
  );
}
