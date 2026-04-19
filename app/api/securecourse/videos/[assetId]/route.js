import { readSecureCourseSession, secureCourseErrorResponse } from "@/lib/securecourse-proxy";
import { getStudentVideoAsset } from "@/lib/securecourse-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const session = readSecureCourseSession(request);

    if (!session) {
      return NextResponse.json({ message: "Student session is not active." }, { status: 401 });
    }

    const resolvedParams = await params;
    const payload = getStudentVideoAsset(session.userId, session.sessionId, resolvedParams.assetId);

    if (payload.mode === "redirect") {
      return NextResponse.redirect(payload.location);
    }

    return new NextResponse(payload.buffer, {
      status: 200,
      headers: {
        "content-type": payload.mimeType,
        "content-length": String(payload.buffer.length),
        "content-disposition": `inline; filename="${payload.fileName}"`,
        "cache-control": "private, no-store"
      }
    });
  } catch (error) {
    return secureCourseErrorResponse(error, "Protected video request failed.");
  }
}
