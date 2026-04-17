import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAdminSessionValue, ADMIN_COOKIE_NAME } from "@/lib/admin-auth";

export default async function SecureCourseAdminLayout({ children }) {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (!verifyAdminSessionValue(sessionValue)) {
    redirect("/securecourse/admin/login");
  }

  return children;
}
