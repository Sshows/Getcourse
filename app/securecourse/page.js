import Link from "next/link";
import SecureCourseActivationPanel from "@/components/securecourse-activation-panel";
import s from "./securecourse.module.css";

const PRODUCT_PILLARS = [
  {
    title: "IELTS и английский",
    description:
      "Видеоуроки по Writing, Speaking, vocabulary и academic English с понятной структурой и материалами."
  },
  {
    title: "Поступление за рубеж",
    description:
      "Маршрут по shortlist, дедлайнам, документам, scholarship essays, personal statement и admission strategy."
  },
  {
    title: "Доступ только по токену",
    description:
      "Ученик не регистрируется сам. Менеджер выдает одноразовый токен, токен активирует одну сессию и дальше сгорает."
  }
];

const PROGRAMS = [
  "IELTS Writing Bootcamp",
  "IELTS Speaking Intensive",
  "Study Abroad Application Roadmap",
  "Personal Statement & Motivation Letter",
  "Scholarship Essays & Documents",
  "University Admission Timeline"
];

const PRODUCT_FLOW = [
  "Менеджер создает ученика и зачисляет его на курс.",
  "В админке генерируется одноразовый токен и сразу копируется.",
  "Ученик открывает эту страницу и вводит токен без логина и пароля.",
  "После активации открывается кабинет только с назначенными курсами.",
  "Видео и конспекты доступны внутри кабинета, а старая сессия не живет бесконечно."
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
              <p className={s.eyebrow}>Курсы по IELTS, английскому и поступлению</p>
              <h1 className={s.heroTitle}>Одна web-платформа для обучения, документов и admission flow.</h1>
              <p className={s.heroLead}>
                SecureCourse помогает менеджеру выдавать доступ к курсам по IELTS, personal statement, scholarship
                essays и admission documents, а ученику - быстро открыть уроки по одноразовому токену без обычной
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
              <p className={s.panelKicker}>Что уже должно работать в продукте</p>
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
            <p className={s.sectionKicker}>Продуктовые направления</p>
            <h2 className={s.sectionTitle}>Не абстрактная LMS, а сервис для реальных admission-задач.</h2>
          </div>

          <div className={s.flowGrid}>
            {PROGRAMS.map((program, index) => (
              <article className={s.stepCard} key={program}>
                <span className={s.stepNumber}>{index + 1}</span>
                <p className={s.helperText} style={{ color: "var(--text-soft)", fontSize: "1rem" }}>
                  {program}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className={s.section}>
          <div className={s.sectionHead}>
            <p className={s.sectionKicker}>Как это работает</p>
            <h2 className={s.sectionTitle}>Сценарий для менеджера и ученика должен быть прямым и без тупиков.</h2>
          </div>

          <div className={s.flowGrid}>
            {PRODUCT_FLOW.map((step, index) => (
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
            <p className={s.surfaceEyebrow}>Три роли внутри одного сервиса</p>
            <h2 className={s.calloutTitle} style={{ fontSize: "2rem", marginBottom: "1rem" }}>
              Публичная страница активирует токен, админка управляет курсами, кабинет открывает уроки ученику.
            </h2>
            <p className={s.helperText} style={{ color: "var(--text-soft)", maxWidth: "56rem" }}>
              Здесь ученик вводит токен, в админке менеджер создает курс, урок и загрузку видео, а после активации
              ученик видит только свои IELTS и admission-программы.
            </p>
          </div>

          <div className={s.heroActions}>
            <Link className={s.solidButton} href="/securecourse/admin/login">
              Перейти в админку
            </Link>
            <Link className={s.outlineButton} href="/securecourse/student">
              Открыть кабинет ученика
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
