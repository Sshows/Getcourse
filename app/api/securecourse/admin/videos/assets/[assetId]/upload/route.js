import {
  readSecureCourseAdminSession,
  secureCourseErrorResponse
} from "@/lib/securecourse-proxy";
import { uploadVideoAsset } from "@/lib/securecourse-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  try {
    const adminSession = readSecureCourseAdminSession(request);

    if (!adminSession?.sessionId) {
      return NextResponse.json({ message: "Admin authentication is required." }, { status: 401 });
    }

    const resolvedParams = await params;
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ message: "Video file is required." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const asset = uploadVideoAsset(adminSession.sessionId, resolvedParams.assetId, {
      fileName: file.name,
      mimeType: file.type,
      buffer
    });

    return NextResponse.json({
      ok: true,
      asset
    });
  } catch (error) {
    return secureCourseErrorResponse(error, "Video upload failed.");
  }
}
