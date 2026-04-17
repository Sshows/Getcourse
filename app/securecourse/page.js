"use client";

import Link from "next/link";
import { useState } from "react";
import s from "./securecourse.module.css";

const FEATURES = [
  {
    icon: "🔐",
    title: "Одноразовые токены доступа",
    desc: "Менеджер выдаёт токен конкретному ученику. После активации токен сгорает. Повторный вход — новый токен.",
  },
  {
    icon: "📱",
    title: "Одна активная сессия",
    desc: "Ученик может смотреть с одного устройства одновременно. Попытка войти с другого — старая сессия блокируется.",
  },
  {
    icon: "🎬",
    title: "Защищённое видео",
    desc: "Видео хранится в Mux или Cloudflare Stream. Ни одного файла в репозитории. Студент получает подписанную ссылку только на время урока.",
  },
  {
    icon: "📋",
    title: "Полный аудит",
    desc: "Каждое действие логируется: вход, активация токена, просмотр видео, выход, отзыв сессии.",
  },
  {
    icon: "🪪",
    title: "Динамический водяной знак",
    desc: "Email, ID сессии и время отображаются поверх видео. Утечки можно отследить.",
  },
  {
    icon: "⚡",
    title: "Мгновенный выход",
    desc: "Неактивность, смена устройства или ручной logout — сессия удаляется на сервере немедленно.",
  },
];

const STEPS = [
  { n: "1", title: "Создать ученика", desc: "Менеджер добавляет email в систему" },
  { n: "2", title: "Выдать токен", desc: "Одноразовый токен с коротким TTL" },
  { n: "3", title: "Ученик активирует", desc: "На этой странице или через ссылку" },
  { n: "4", title: "Сессия открыта", desc: "Доступ к курсам и урокам в браузере" },
];

export default function PublicPage() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");

  async function handleActivate(e) {
    e.preventDefault();
    if (!token.trim()) return;
    setStatus("loading");
    setMessage("");

    try {
      const r = await fetch("/api/securecourse/auth/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
        credentials: "include",
      });
      const data = await r.json().catch(() => ({}));

      if (r.ok) {
        setStatus("success");
        setMessage("Доступ открыт! Переходим в кабинет...");
        setTimeout(() => (window.location.href = "/securecourse/student"), 1200);
      } else {
        setStatus("error");
        setMessage(data.message || "Неверный или истёкший токен.");
      }
    } catch {
      setStatus("error");
      setMessage("Ошибка сети. Попробуйте ещё раз.");
    }
  }

  return (
    <main className={s.page}>
      <div className={s.ambient} aria-hidden="true" />
      <div className={s.shell}>

        {/* ─── NAV ─── */}
        <header className={s.topbar}>
          <Link className={s.brand} href="/securecourse" style={{ textDecoration: "none" }}>
            <span className={s.brandMark}>SC</span>
            <span>
              <strong>SecureCourse</strong>
              <small>Платформа защищённого обучения</small>
            </span>
          </Link>
          <nav className={s.topnav}>
            <a className={s.topnavLink} href="#features">Возможности</a>
            <a className={s.topnavLink} href="#how">Как работает</a>
            <a className={s.topnavLink} href="#activate">Активация</a>
          </nav>
          <div className={s.topnavActions}>
            <Link className={s.ghostButton} href="/securecourse/admin">Войти как менеджер</Link>
            <Link className={s.solidButton} href="/securecourse/student">Кабинет ученика</Link>
          </div>
        </header>

        {/* ─── HERO ─── */}
        <section className={s.hero}>
          <div className={s.heroGrid}>
            <div className={s.heroCopy}>
              <p className={s.eyebrow}>Платформа типа GetCourse</p>
              <h1 className={s.heroTitle}>Продавайте курсы с защитой от утечек</h1>
              <p className={s.heroLead}>
                Одноразовые токены доступа, одна активная сессия на ученика, защищённое стриминговое видео — всё в браузере без отдельного приложения.
              </p>
              <div className={s.heroActions}>
                <Link className={s.solidButton} href="/securecourse/admin">Открыть админку</Link>
                <a className={s.outlineButton} href="#activate">Активировать доступ</a>
              </div>
            </div>

            <aside className={s.heroPanel}>
              <p className={s.panelKicker}>Статус платформы</p>
              <div className={s.panelList}>
                {[
                  { icon: "✓", label: "Backend API", sub: "NestJS / PostgreSQL / Redis" },
                  { icon: "✓", label: "Система токенов", sub: "One-time, burn after use" },
                  { icon: "✓", label: "Сессии", sub: "Single device lock via Redis" },
                  { icon: "✓", label: "Видеопровайдер", sub: "Mux / Cloudflare Stream" },
                ].map((item) => (
                  <article className={s.heroCard} key={item.label}>
                    <span className={s.pulseDot} aria-hidden="true" />
                    <div>
                      <strong>{item.label}</strong>
                      <p>{item.sub}</p>
                    </div>
                  </article>
                ))}
              </div>
              <div className={s.metricStrip}>
                <div className={s.metricCard}>
                  <span className={s.metricValue}>3</span>
                  <span className={s.metricLabel}>интерфейса</span>
                </div>
                <div className={s.metricCard}>
                  <span className={s.metricValue}>1</span>
                  <span className={s.metricLabel}>сессия / ученик</span>
                </div>
                <div className={s.metricCard}>
                  <span className={s.metricValue}>0</span>
                  <span className={s.metricLabel}>файлов в repo</span>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* ─── ACTIVATION ─── */}
        <section id="activate" className={s.section}>
          <div className={s.callout} style={{ maxWidth: "540px", margin: "0 auto" }}>
            <p className={s.surfaceEyebrow}>Активация доступа</p>
            <h2 className={s.calloutTitle}>Введите токен доступа</h2>
            <p className={s.workspaceText} style={{ marginBottom: "1.25rem" }}>
              Токен выдаётся менеджером и действует 20 минут. После первой активации сгорает.
            </p>
            <form className={s.formStack} onSubmit={handleActivate}>
              <label className={s.fieldGroup}>
                <span className={s.fieldLabel}>Токен доступа</span>
                <input
                  className={s.fieldInput}
                  disabled={status === "loading" || status === "success"}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Например: abc-123-xyz"
                  type="text"
                  value={token}
                />
              </label>
              {status === "error" && <div className={s.feedbackError}>{message}</div>}
              {status === "success" && <div className={s.feedbackSuccess}>{message}</div>}
              <button
                className={s.solidButton}
                disabled={status === "loading" || status === "success" || !token.trim()}
                style={{ width: "100%", justifyContent: "center" }}
                type="submit"
              >
                {status === "loading" ? "Активирую…" : status === "success" ? "Готово ✓" : "Активировать доступ"}
              </button>
            </form>
          </div>
        </section>

        {/* ─── FEATURES ─── */}
        <section id="features" className={s.section}>
          <div className={s.sectionHead}>
            <p className={s.sectionKicker}>Возможности платформы</p>
            <h2 className={s.sectionTitle}>Всё что нужно для защищённого обучения</h2>
          </div>
          <div className={s.interfaceGrid} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            {FEATURES.map((f) => (
              <article className={s.interfaceCard} key={f.title} style={{ padding: "1.5rem" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>{f.icon}</div>
                <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem", fontWeight: 700 }}>{f.title}</h3>
                <p style={{ margin: 0, color: "var(--text-soft)", lineHeight: 1.6, fontSize: "0.92rem" }}>{f.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section id="how" className={s.section}>
          <div className={s.sectionHead}>
            <p className={s.sectionKicker}>Как работает доступ</p>
            <h2 className={s.sectionTitle}>4 шага от выдачи до урока</h2>
          </div>
          <div className={s.flowGrid} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            {STEPS.map((step) => (
              <article className={s.stepCard} key={step.n}>
                <span className={s.stepNumber}>{step.n}</span>
                <h3 className={s.stepTitle}>{step.title}</h3>
                <p className={s.stepCopy}>{step.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className={s.ctaBand} style={{ marginTop: "2rem", flexWrap: "wrap" }}>
          <div>
            <p className={s.sectionKicker}>Готово к работе</p>
            <h2 className={s.sectionTitle} style={{ fontSize: "2rem" }}>Начните прямо сейчас</h2>
          </div>
          <div className={s.heroActions}>
            <Link className={s.solidButton} href="/securecourse/admin">Открыть админку</Link>
            <Link className={s.outlineButton} href="/securecourse/student">Кабинет ученика</Link>
          </div>
        </section>

      </div>
    </main>
  );
}
