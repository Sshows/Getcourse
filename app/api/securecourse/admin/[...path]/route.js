import { proxySecureCourseRequest, secureCourseErrorResponse } from "@/lib/securecourse-proxy";

export const dynamic = "force-dynamic";

async function buildAdminPath(paramsPromise) {
  const params = await paramsPromise;
  return `/admin/${params.path.join("/")}`;
}

export async function GET(request, { params }) {
  try {
    return await proxySecureCourseRequest(request, await buildAdminPath(params));
  } catch (error) {
    return secureCourseErrorResponse(error, "Admin proxy failed.");
  }
}

export async function POST(request, { params }) {
  try {
    return await proxySecureCourseRequest(request, await buildAdminPath(params));
  } catch (error) {
    return secureCourseErrorResponse(error, "Admin proxy failed.");
  }
}

export async function PATCH(request, { params }) {
  try {
    return await proxySecureCourseRequest(request, await buildAdminPath(params));
  } catch (error) {
    return secureCourseErrorResponse(error, "Admin proxy failed.");
  }
}
