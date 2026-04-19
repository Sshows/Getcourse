import { Suspense } from "react";
import Link from "next/link";
import SecureCourseActivationPanel from "@/components/securecourse-activation-panel";
import s from "./securecourse.module.css";

const QUICK_POINTS = [
  "IELTS и английский",
  "Personal statement и scholarship essays",
  "Документы, дедлайны и поступление за рубеж"
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

        <section className={s.hero}>
          <div className={s.heroGrid}>
            <div className={s.heroCopy}>
              <p className={s.eyebrow}>Курсы по IELTS и admission</p>
              <h1 className={s.heroTitle}>Откройте доступ по токену и сразу переходите к урокам.</h1>
              <p className={s.heroLead}>
                Платформа для курсов по IELTS, английскому, документам, scholarship essays и поступлению за рубеж.
                Менеджер выдает одноразовый токен, ученик активирует его здесь и попадает в кабинет без обычной
                регистрации.
              </p>
              <div className={s.heroActions}>
                <a className={s.solidButton} href="#activation">
                  Активировать токен
                </a>
                <Link className={s.outlineButton} href="/securecourse/admin/login">
                  Открыть админку
                </Link>
              </div>
            </div>

            <aside className={s.heroPanel}>
              <p className={s.panelKicker}>Что внутри</p>
              <div className={s.panelList}>
                {QUICK_POINTS.map((item) => (
                  <article className={s.heroCard} key={item}>
                    <div>
                      <strong>{item}</strong>
                    </div>
                  </article>
                ))}
                <article className={s.heroCard}>
                  <div>
                    <strong>Доступ только по одноразовому токену</strong>
                    <p>Без логина и пароля для ученика. Один токен - одна сессия.</p>
                  </div>
                </article>
              </div>
            </aside>
          </div>
        </section>

        <div id="activation">
          <Suspense fallback={null}>
            <SecureCourseActivationPanel />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
