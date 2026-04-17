import Link from "next/link";
import SecureCourseActivationPanel from "@/components/securecourse-activation-panel";
import { securecourseContent } from "@/lib/securecourse-content";
import styles from "./securecourse.module.css";

function SectionHeading({ kicker, title, copy }) {
  return (
    <div className={styles.sectionHead} data-reveal>
      <p className={styles.sectionKicker}>{kicker}</p>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <p className={styles.sectionText}>{copy}</p>
    </div>
  );
}

export default function SecureCourseLandingPage() {
  const { brand, publicSite } = securecourseContent;

  return (
    <main className={styles.page}>
      <div className={styles.ambient} aria-hidden="true" />

      <div className={styles.shell}>
        <header className={styles.topbar} data-reveal>
          <Link className={styles.brand} href="/securecourse">
            <span className={styles.brandMark}>SC</span>
            <span>
              <strong>{brand.name}</strong>
              <small>{brand.tagline}</small>
            </span>
          </Link>

          <nav className={styles.topnav} aria-label="SecureCourse sections">
            {publicSite.nav.map((item) => (
              <a className={styles.topnavLink} href={item.href} key={item.href}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className={styles.topnavActions}>
            <Link className={styles.ghostButton} href="/securecourse/admin">
              Admin
            </Link>
            <Link className={styles.solidButton} href="/securecourse/mobile">
              Student app
            </Link>
          </div>
        </header>

        <section className={styles.hero}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy} data-reveal>
              <p className={styles.eyebrow}>{publicSite.hero.eyebrow}</p>
              <h1 className={styles.heroTitle}>{publicSite.hero.title}</h1>
              <p className={styles.heroLead}>{publicSite.hero.lead}</p>

              <div className={styles.heroActions}>
                {publicSite.hero.actions.map((action) => (
                  <Link
                    className={
                      action.kind === "solid" ? styles.solidButton : styles.outlineButton
                    }
                    href={action.href}
                    key={action.href}
                  >
                    {action.label}
                  </Link>
                ))}
              </div>

              <p className={styles.heroNote}>
                Lessons are intentionally viewed in the app, not on the public website, because
                the app gives you more practical room for privacy handling and session control.
              </p>
            </div>

            <aside className={styles.heroPanel} data-reveal>
              <p className={styles.panelKicker}>Platform model</p>
              <div className={styles.panelList}>
                {publicSite.hero.notes.map((note) => (
                  <article className={styles.heroCard} key={note}>
                    <span className={styles.pulseDot} aria-hidden="true" />
                    <div>
                      <strong>{note}</strong>
                      <p>
                        {note === "Protected streaming via Mux or Cloudflare Stream"
                          ? "Video files never live in Git or the codebase."
                          : note === "One-time token activation"
                            ? "A token is issued for a person, expires quickly, and burns after first use."
                            : note === "Single active session per student"
                              ? "Redis-backed session state decides whether a device can continue."
                              : "Access, playback, logout, and administrative actions are recorded."}
                      </p>
                    </div>
                  </article>
                ))}
              </div>

              <div className={styles.metricStrip}>
                <div className={styles.metricCard}>
                  <span className={styles.metricValue}>3</span>
                  <span className={styles.metricLabel}>Interfaces</span>
                </div>
                <div className={styles.metricCard}>
                  <span className={styles.metricValue}>1</span>
                  <span className={styles.metricLabel}>Active session</span>
                </div>
                <div className={styles.metricCard}>
                  <span className={styles.metricValue}>0</span>
                  <span className={styles.metricLabel}>Raw video files in repo</span>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <SecureCourseActivationPanel />

        <section className={styles.section} id="interfaces">
          <SectionHeading
            kicker="Three interfaces"
            title="Each interface has one clear job"
            copy="The site is the public front door, the admin panel is the control room, and the app is the protected lesson environment."
          />

          <div className={styles.interfaceGrid}>
            <article className={styles.interfaceCard} data-reveal>
              <span className={styles.interfaceTag}>Public site</span>
              <h3>Marketing, activation, and routing</h3>
              <ul className={styles.interfaceList}>
                {publicSite.siteFeatures.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </article>

            <article className={styles.interfaceCard} data-reveal>
              <span className={styles.interfaceTag}>Admin panel</span>
              <h3>Operations, access, and content flow</h3>
              <ul className={styles.interfaceList}>
                {securecourseContent.admin.rules.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </article>

            <article className={styles.interfaceCard} data-reveal>
              <span className={styles.interfaceTag}>Mobile app</span>
              <h3>Protected lesson watching</h3>
              <ul className={styles.interfaceList}>
                {securecourseContent.studentApp.protectionChecklist.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className={styles.section} id="access-flow">
          <SectionHeading
            kicker="Access flow"
            title="One-time access is distributed across site, app, and backend"
            copy="A student can discover the product on the site, but the actual protected learning state begins only after activation and session binding."
          />

          <div className={styles.flowGrid}>
            {publicSite.accessFlow.map((step, index) => (
              <article className={styles.stepCard} key={step.title} data-reveal>
                <span className={styles.stepNumber}>{index + 1}</span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepCopy}>{step.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} id="video-flow">
          <SectionHeading
            kicker="Video pipeline"
            title="Video upload belongs to the admin panel, not the codebase"
            copy="The right MVP path is direct upload into a video provider, webhook confirmation, and secure playback credentials generated only for the active student session."
          />

          <div className={styles.flowGrid}>
            {publicSite.uploadFlow.map((step, index) => (
              <article className={styles.stepCard} key={step.title} data-reveal>
                <span className={styles.stepNumber}>{index + 1}</span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepCopy}>{step.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeading
            kicker="Logic split"
            title="Where each responsibility lives"
            copy="This prevents the classic mistake of putting too much trust in the browser, the player, or the video provider."
          />

          <div className={styles.logicGrid}>
            {publicSite.logicMatrix.map((card) => (
              <article className={styles.logicCard} key={card.title} data-reveal>
                <h3 className={styles.logicHeading}>{card.title}</h3>
                <p className={styles.logicCopy}>{card.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} id="protection">
          <SectionHeading
            kicker="Protection stack"
            title="Practical layers that reduce leakage and raise the cost of bypass"
            copy="No system can stop physical filming or every form of capture, but the combination below makes leaks harder, more expensive, and more traceable."
          />

          <div className={styles.securityGrid}>
            {publicSite.securityLayers.map((layer) => (
              <article className={styles.securityCard} key={layer.title} data-reveal>
                <h3 className={styles.securityTitle}>{layer.title}</h3>
                <p className={styles.securityCopy}>{layer.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeading
            kicker="Delivery plan"
            title="Build the three-interface MVP first"
            copy="Start with the foundation that actually controls access and playback, then harden and expand once the learning loop is stable."
          />

          <div className={styles.roadmapGrid}>
            {publicSite.roadmap.map((phase) => (
              <article className={styles.roadmapCard} key={phase.title} data-reveal>
                <p className={styles.roadmapMeta}>{phase.meta}</p>
                <h3 className={styles.roadmapTitle}>{phase.title}</h3>
                <ul className={styles.interfaceList}>
                  {phase.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.ctaBand} data-reveal>
          <div>
            <p className={styles.sectionKicker}>Prototype routes</p>
            <h2 className={styles.sectionTitle}>Explore each interface separately</h2>
            <p className={styles.sectionText}>
              The public site explains the model, the admin page shows operational control, and
              the mobile route demonstrates the protected viewing experience.
            </p>
          </div>
          <div className={styles.heroActions}>
            <Link className={styles.solidButton} href="/securecourse/admin">
              Admin panel
            </Link>
            <Link className={styles.outlineButton} href="/securecourse/mobile">
              Student app
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
