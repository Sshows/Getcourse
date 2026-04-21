import { Suspense } from "react";
import Link from "next/link";

import SecureCourseActivationPanel from "@/components/securecourse-activation-panel";
import s from "./securecourse.module.css";

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
              <small>IELTS, английский и поступление за рубеж</small>
            </span>
          </Link>

          <div className={s.topnavActions}>
            <Link className={s.ghostButton} href="/securecourse/admin/login">
              Вход для команды
            </Link>
            <Link className={s.solidButton} href="/securecourse/student">
              Кабинет ученика
            </Link>
          </div>
        </header>

        <section className={s.callout}>
          <p className={s.surfaceEyebrow}>Доступ к курсам</p>
          <h1 className={s.calloutTitle}>Активируйте токен и откройте кабинет ученика.</h1>
          <p className={s.helperText} style={{ maxWidth: "40rem" }}>
            Один экран без лишних блоков: токен, переход в кабинет и вход для команды.
          </p>
          <div className={s.heroActions}>
            <a className={s.solidButton} href="#activation">
              Активировать токен
            </a>
            <Link className={s.outlineButton} href="/securecourse/student">
              Кабинет ученика
            </Link>
            <Link className={s.ghostButton} href="/securecourse/admin/login">
              Вход для команды
            </Link>
          </div>
        </section>

        <div id="activation" className={s.sectionSpacingTop}>
          <Suspense fallback={null}>
            <SecureCourseActivationPanel />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
