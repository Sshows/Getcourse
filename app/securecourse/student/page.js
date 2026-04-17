import Link from "next/link";
import SecureCourseStudentPreview from "@/components/securecourse-student-preview";
import { securecourseContent } from "@/lib/securecourse-content";
import styles from "../securecourse.module.css";

export const metadata = {
  title: "Student Cabinet — SecureCourse",
  description: "Protected learning cabinet for SecureCourse students. Watch lessons, track progress, and manage your session."
};

export default function SecureCourseStudentPage() {
  const { brand, studentApp } = securecourseContent;

  return (
    <main className={`${styles.page} ${styles.mobilePage}`}>
      <div className={styles.mobileShell}>
        <header className={styles.mobileTopbar} data-reveal>
          <Link className={styles.brand} href="/securecourse">
            <span className={styles.brandMark}>SC</span>
            <span>
              <strong>{brand.name}</strong>
              <small>Student cabinet</small>
            </span>
          </Link>

          <div className={styles.topnavActions}>
            <Link className={styles.ghostButton} href="/securecourse">
              Public site
            </Link>
            <Link className={styles.solidButton} href="/securecourse/admin">
              Admin panel
            </Link>
          </div>
        </header>

        <section className={styles.mobileHero} data-reveal>
          <div>
            <p className={styles.sectionKicker}>Web student cabinet</p>
            <h1 className={styles.workspaceTitle}>
              Students watch protected lessons in the browser
            </h1>
            <p className={styles.workspaceText}>
              {studentApp.lessonsLocation}
            </p>
          </div>

          <div className={styles.mobileHeroNotes}>
            <div className={styles.heroCard}>
              <strong>Session policy</strong>
              <p>Only one active session may hold streaming privileges at a time.</p>
            </div>
            <div className={styles.heroCard}>
              <strong>Protection policy</strong>
              <p>Watermark and screen-capture reactions stay in the lesson surface itself.</p>
            </div>
          </div>
        </section>

        <div className={styles.mobileLayout}>
          <SecureCourseStudentPreview />

          <aside className={styles.mobileSidebar}>
            <section className={styles.callout} data-reveal>
              <p className={styles.surfaceEyebrow}>What belongs in the student cabinet</p>
              <h2 className={styles.calloutTitle}>Protected learning loop</h2>
              <ul className={styles.ruleList}>
                <li>Course list and lesson navigation</li>
                <li>Video playback with watermark</li>
                <li>PDF and text material viewing</li>
                <li>Screen-capture handling and privacy overlay</li>
                <li>Progress updates bound to the active session</li>
              </ul>
            </section>

            <section className={styles.callout} data-reveal>
              <p className={styles.surfaceEyebrow}>Protection checklist</p>
              <h2 className={styles.calloutTitle}>Practical browser-aware measures</h2>
              <ul className={styles.ruleList}>
                {studentApp.protectionChecklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className={styles.callout} data-reveal>
              <p className={styles.surfaceEyebrow}>Reactions</p>
              <h2 className={styles.calloutTitle}>What happens when risk appears</h2>
              <div className={styles.reactionStack}>
                {studentApp.reactions.map((reaction) => (
                  <article className={styles.reactionCard} key={reaction.title}>
                    <strong>{reaction.title}</strong>
                    <p>{reaction.copy}</p>
                  </article>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
