import { redirect } from "next/navigation";

// /securecourse/mobile is now the student web cabinet
export default function SecureCourseMobilePage() {
  redirect("/securecourse/student");
}
