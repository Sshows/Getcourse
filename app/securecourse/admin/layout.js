import { SECURECOURSE_ADMIN_SESSION_COOKIE } from "@/lib/securecourse-proxy";
import { getAdminSessionView } from "@/lib/securecourse-store";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function SecureCourseAdminLayout({ children }) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SECURECOURSE_ADMIN_SESSION_COOKIE)?.value;

  if (!sessionId) {
    redirect("/securecourse/admin/login?redirectTo=/securecourse/admin");
  }

  try {
    getAdminSessionView(sessionId);
  } catch {
    redirect("/securecourse/admin/login?redirectTo=/securecourse/admin");
  }

  return children;
}
