import { fetchSecureCourse, SECURECOURSE_ADMIN_SESSION_COOKIE } from "@/lib/securecourse-proxy";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function SecureCourseAdminLayout({ children }) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SECURECOURSE_ADMIN_SESSION_COOKIE)?.value;

  if (!sessionId) {
    redirect("/securecourse/admin/login?redirectTo=/securecourse/admin");
  }

  try {
    const response = await fetchSecureCourse("/admin-auth/me", {
      headers: {
        "x-admin-session-id": sessionId
      }
    });

    if (!response.ok) {
      redirect("/securecourse/admin/login?redirectTo=/securecourse/admin");
    }
  } catch {
    redirect("/securecourse/admin/login?redirectTo=/securecourse/admin");
  }

  return children;
}
