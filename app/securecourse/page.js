import Link from "next/link";
import SecureCourseActivationPanel from "@/components/securecourse-activation-panel";
import s from "./securecourse.module.css";

const FEATURES = [
  {
    title: "Одноразовые токены доступа",
    description:
      "Менеджер выдает токен конкретному ученику. После первой активации токен переходит в USED и больше не работает."
  },
  {
    title: "Одна активная сессия",
    description:
      "Backend контролирует только одну активную сессию на ученика. Новый вход заменяет или блокирует предыдущую сессию по правилам безопасности."
  },
  {
    title: "Защищенный video pipeline",
    description:
      "Видео не попадает в Git и не хранится в коде. Админ создает upload intent, файл уходит напрямую в Mux или Cloudflare Stream, а ученик получает только playback access."
  },
  {
    title: "Полный аудит действий",
    description:
      "Логируются входы админов, выпуск и отзыв токенов, активация доступа, сессии, просмотр уроков и webhook-события видеопровайдера."
  }
];

const INTERFACES = [
  {
    title: "Публичный сайт",
    description:
      "Точка входа для лендинга, заявки, активации токена и объяснения, что ученикам не нужен обычный логин и пароль."
  },
  {
    title: "Веб-админка",
    description:
      "Рабочее место ADMIN и MANAGER: ученики, курсы, назначения, токены, сессии, аудит и загрузка видео."
  },
  {
    title: "Временный student web cabinet",
    description:
      "Тестовая защищенная среда для MVP, чтобы проверить весь поток до отдельного мобильного приложения."
  }
];

const STEPS = [
  "Менеджер создает ученика и назначает курс.",
  "Менеджер выпускает одноразовый токен и копирует его из админки.",
  "Ученик вводит токен на публичной странице.",
  "Backend активирует токен, переводит его в USED и создает сессию.",
  "Ученик открывает кабинет и получает доступ только к назначенным урокам."
];

export default function SecureCoursePublicPage() {
  return (
    <main className={s.page}>
      <div className={s.ambient} aria-hidden="true" />
      <div className={s.shell}>
        <header className={s.topbar}>
          <Link className={s.brand} href="/securecourse" style={{ textDecoration: "none" }}>
            <span className={s.brandMark}>SC</span>
            <span>
              <strong>SecureCourse</strong>
              <small>Public site + admin + token-only student access</small>
            </span>
          </Link>

          <div className={s.topnavActions}>
            <Link className={s.ghostButton} href="/securecourse/admin/login">
              Войти в админку
            </Link>
            <Link className={s.solidButton} href="/securecourse/student">
              Открыть кабинет ученика
            </Link>
          </div>
        </header>

        <section className={s.hero}>
          <div className={s.heroGrid}>
            <div className={s.heroCopy}>
              <p className={s.eyebrow}>Рабочий web/admin MVP</p>
              <h1 className={s.heroTitle}>Закрытая обучающая платформа с token-only доступом для учеников</h1>
              <p className={s.heroLead}>
                Админы и менеджеры входят по обычной серверной авторизации. Ученики не
                регистрируются и не используют логин/пароль: доступ открывается только по
                одноразовому токену, который после активации сгорает.
              </p>
              <div className={s.heroActions}>
                <Link className={s.solidButton} href="/securecourse/admin/login">
                  Открыть admin login
                </Link>
                <a className={s.outlineButton} href="#activation">
                  Активировать токен
                </a>
              </div>
            </div>

            <aside className={s.heroPanel}>
              <p className={s.panelKicker}>Что уже заложено в MVP</p>
              <div className={s.panelList}>
                <article className={s.heroCard}>
                  <div>
                    <strong>Admin auth</strong>
                    <p>DB-backed admin user, password hash, httpOnly admin session cookie</p>
                  </div>
                </article>
                <article className={s.heroCard}>
                  <div>
                    <strong>Token flow for students</strong>
                    <p>ISSUED → USED / REVOKED / EXPIRED без обычной регистрации ученика</p>
                  </div>
                </article>
                <article className={s.heroCard}>
                  <div>
                    <strong>Single active session</strong>
                    <p>Студентский доступ выдается только в рамках одной активной сессии</p>
                  </div>
                </article>
              </div>
            </aside>
          </div>
        </section>

        <section className={s.section}>
          <div className={s.sectionHead}>
            <p className={s.sectionKicker}>Три интерфейса проекта</p>
            <h2 className={s.sectionTitle}>Каждая часть отвечает за свою зону доступа</h2>
          </div>

          <div className={s.interfaceGrid}>
            {INTERFACES.map((item) => (
              <article className={s.interfaceCard} key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={s.section}>
          <div className={s.sectionHead}>
            <p className={s.sectionKicker}>Ключевые свойства системы</p>
            <h2 className={s.sectionTitle}>Что защищает доступ уже на web/admin MVP</h2>
          </div>

          <div className={s.interfaceGrid}>
            {FEATURES.map((item) => (
              <article className={s.interfaceCard} key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={s.section}>
          <div className={s.sectionHead}>
            <p className={s.sectionKicker}>Как это работает</p>
            <h2 className={s.sectionTitle}>Путь ученика без регистрации и пароля</h2>
          </div>

          <div className={s.flowGrid}>
            {STEPS.map((step, index) => (
              <article className={s.stepCard} key={step}>
                <span className={s.stepNumber}>{index + 1}</span>
                <p className={s.stepCopy}>{step}</p>
              </article>
            ))}
          </div>
        </section>

        <div id="activation">
          <SecureCourseActivationPanel />
        </div>

        <section className={s.callout} style={{ marginTop: "4rem" }}>
          <div>
            <p className={s.surfaceEyebrow}>Следующий шаг</p>
            <h2 className={s.calloutTitle} style={{ fontSize: "2rem", marginBottom: "1.5rem" }}>
              Сначала web/admin MVP, затем отдельное mobile app
            </h2>
          </div>
          <div className={s.heroActions}>
            <Link className={s.solidButton} href="/securecourse/admin">
              Перейти в админку
            </Link>
            <Link className={s.outlineButton} href="/securecourse/student">
              Открыть student cabinet
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
