import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  createAdminSessionValue,
  getAdminCookieOptions
} from "@/lib/admin-auth";

export async function POST(request) {
  try {
    const body = await request.json();
    const username = String(body?.username || "").trim();
    const password = String(body?.password || "");

    const backendUrl = process.env.SECURECOURSE_API_URL || "http://127.0.0.1:4000/api";
    
    const backendResponse = await fetch(`${backendUrl}/admin/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    if (!backendResponse.ok) {
      const err = await backendResponse.json().catch(() => ({}));
      return NextResponse.json({ error: err.message || "Failed to register" }, { status: 400 });
    }

    const payload = await backendResponse.json();

    const response = NextResponse.json({ success: true, user: payload });
    response.cookies.set(
      ADMIN_COOKIE_NAME,
      createAdminSessionValue(),
      getAdminCookieOptions(request)
    );

    return response;
  } catch (err) {
    console.error("Admin register error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
