import Link from "next/link";
import SecureCourseActivationPanel from "@/components/securecourse-activation-panel";
import s from "./securecourse.module.css";

const PRODUCT_PILLARS = [
  {
    title: "English language tracks",
    description:
      "Structured video lessons for IELTS, academic writing, speaking practice, and vocabulary for international study."
  },
  {
    title: "Study abroad roadmap",
    description:
      "Courses for university selection, application strategy, deadlines, and scholarship preparation."
  },
  {
    title: "Token-only student access",
    description:
      "Students do not create accounts. A manager issues a one-time token, the token activates one session, and the old token is burned."
  }
];

const ADMIN_FLOW = [
  "Create a student profile in the admin panel.",
  "Create a course for English or admissions coaching.",
  "Add a lesson and notes for that course.",
  "Enroll the student into the course.",
  "Generate a one-time token and copy it immediately.",
  "Upload the lesson video with Upload video.",
  "Send the token to the student in WhatsApp, Telegram, or email."
];

const STUDENT_FLOW = [
  "Open the public page and paste the one-time token.",
  "Activate access with no separate login or password.",
  "Enter the student cabinet with assigned courses only.",
  "Open the lesson and watch the protected video.",
  "Read notes, check materials, and continue progress in one session."
];

export default function SecureCoursePublicPage() {
  return (
    <main className={s.page}>
      <div className={s.ambient} aria-hidden="true" />
      <div className={s.shell}>
        <header className={s.topbar}>
          <Link className={s.brand} href="/securecourse" style={{ textDecoration: "none" }}>
            <span className={s.brandMark}>GA</span>
            <span>
              <strong>Global Admissions Academy</strong>
              <small>English + study abroad courses</small>
            </span>
          </Link>

          <div className={s.topnavActions}>
            <Link className={s.ghostButton} href="/securecourse/admin/login">
              Admin login
            </Link>
            <Link className={s.solidButton} href="/securecourse/student">
              Student cabinet
            </Link>
          </div>
        </header>

        <section className={s.hero}>
          <div className={s.heroGrid}>
            <div className={s.heroCopy}>
              <p className={s.eyebrow}>Web-only course platform</p>
              <h1 className={s.heroTitle}>English and study abroad courses with one-time token access.</h1>
              <p className={s.heroLead}>
                This MVP is built for language prep, university applications, document guidance, and lesson delivery.
                Managers work in the admin panel, students activate a one-time token on this page, and then continue in
                a protected web cabinet.
              </p>
              <div className={s.heroActions}>
                <a className={s.solidButton} href="#activation">
                  Activate token
                </a>
                <Link className={s.outlineButton} href="/securecourse/admin/login">
                  Open admin
                </Link>
              </div>
            </div>

            <aside className={s.heroPanel}>
              <p className={s.panelKicker}>What this platform already supports</p>
              <div className={s.panelList}>
                {PRODUCT_PILLARS.map((item) => (
                  <article className={s.heroCard} key={item.title}>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className={s.section}>
          <div className={s.sectionHead}>
            <p className={s.sectionKicker}>Admin workflow</p>
            <h2 className={s.sectionTitle}>A manager should be able to finish the whole delivery flow in one place.</h2>
          </div>

          <div className={s.flowGrid}>
            {ADMIN_FLOW.map((step, index) => (
              <article className={s.stepCard} key={step}>
                <span className={s.stepNumber}>{index + 1}</span>
                <p className={s.helperText} style={{ color: "var(--text-soft)", fontSize: "1rem" }}>
                  {step}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className={s.section}>
          <div className={s.sectionHead}>
            <p className={s.sectionKicker}>Student workflow</p>
            <h2 className={s.sectionTitle}>No student password flow, no extra onboarding.</h2>
          </div>

          <div className={s.flowGrid}>
            {STUDENT_FLOW.map((step, index) => (
              <article className={s.stepCard} key={step}>
                <span className={s.stepNumber}>{index + 1}</span>
                <p className={s.helperText} style={{ color: "var(--text-soft)", fontSize: "1rem" }}>
                  {step}
                </p>
              </article>
            ))}
          </div>
        </section>

        <div id="activation">
          <SecureCourseActivationPanel />
        </div>

        <section className={s.callout} style={{ marginTop: "4rem" }}>
          <div>
            <p className={s.surfaceEyebrow}>Three linked interfaces</p>
            <h2 className={s.calloutTitle} style={{ fontSize: "2rem", marginBottom: "1rem" }}>
              Public landing, admin workspace, and student cabinet all run in one Railway deployment.
            </h2>
            <p className={s.helperText} style={{ color: "var(--text-soft)", maxWidth: "56rem" }}>
              The admin side manages students, courses, lessons, tokens, sessions, and uploads. The public page handles
              activation. The student cabinet opens only after token activation and shows assigned English and study
              abroad courses.
            </p>
          </div>

          <div className={s.heroActions}>
            <Link className={s.solidButton} href="/securecourse/admin/login">
              Go to admin
            </Link>
            <Link className={s.outlineButton} href="/securecourse/student">
              Open student cabinet
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
