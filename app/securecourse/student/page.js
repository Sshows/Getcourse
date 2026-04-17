"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import s from "../securecourse.module.css";

function formatDuration(seconds) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// ── Views ──────────────────────────────────────────────
function ActivateView({ onSuccess }) {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
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
        setMessage("Доступ открыт!");
        setTimeout(() => onSuccess(), 800);
      } else {
        setStatus("error");
        setMessage(data.message || "Неверный или истёкший токен.");
      }
    } catch {
      setStatus("error");
      setMessage("Ошибка сети.");
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <section className={s.callout} style={{ width: "100%", maxWidth: "480px" }}>
        <p className={s.surfaceEyebrow}>Добро пожаловать</p>
        <h2 className={s.calloutTitle}>Введите токен доступа</h2>
        <p className={s.helperText} style={{ marginBottom: "1.25rem", marginTop: "0.5rem" }}>
          Токен выдаётся менеджером. После первой активации он сгорает.
        </p>
        <form className={s.formStack} onSubmit={handleSubmit}>
          <label className={s.fieldGroup}>
            <span className={s.fieldLabel}>Токен доступа</span>
            <input
              autoFocus
              className={s.fieldInput}
              disabled={status === "loading" || status === "success"}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Вставьте токен здесь"
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
            {status === "loading" ? "Проверяю…" : "Активировать"}
          </button>
        </form>
        <p className={s.helperText} style={{ marginTop: "1rem" }}>
          Нет токена? Обратитесь к менеджеру или на{" "}
          <Link href="/securecourse" style={{ color: "var(--teal)" }}>главную страницу</Link>.
        </p>
      </section>
    </div>
  );
}

function CoursesView({ courses, onSelectCourse }) {
  if (!courses.length) {
    return (
      <div className={s.callout}>
        <p className={s.surfaceEyebrow}>Курсы</p>
        <h2 className={s.calloutTitle}>Нет активных курсов</h2>
        <p className={s.helperText}>Обратитесь к менеджеру для зачисления на курс.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className={s.surfaceTitle} style={{ marginBottom: "1rem" }}>Мои курсы</h2>
      <div className={s.courseList}>
        {courses.map((enrollment) => {
          const course = enrollment.course || enrollment;
          const lessons = course.lessons || [];
          return (
            <button
              className={s.courseCard}
              key={enrollment.id}
              onClick={() => onSelectCourse(enrollment)}
              style={{ cursor: "pointer", border: "1px solid var(--line)" }}
            >
              <div className={s.courseCardTop}>
                <strong>{course.title}</strong>
                <span className={`${s.badge} ${s.badgeGreen}`}>{enrollment.status || "ACTIVE"}</span>
              </div>
              <p>{course.shortDescription || "Курс защищённого обучения"}</p>
              <div className={s.progressTrack}>
                <div className={s.progressFill} style={{ width: `${enrollment.progress || 0}%` }} />
              </div>
              <p style={{ fontSize: "0.8rem", marginTop: "0.5rem", color: "var(--text-muted)" }}>
                {lessons.length} уроков · {enrollment.progress || 0}% завершено
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LessonsView({ enrollment, onSelectLesson, onBack }) {
  const course = enrollment.course || enrollment;
  const lessons = course.lessons || [];

  return (
    <div>
      <button
        className={s.ghostButton}
        onClick={onBack}
        style={{ marginBottom: "1rem" }}
        type="button"
      >
        ← Назад к курсам
      </button>
      <div className={s.surface} style={{ marginBottom: "1rem" }}>
        <div className={s.surfaceHeader}>
          <div>
            <p className={s.surfaceEyebrow}>Курс</p>
            <h2 className={s.surfaceTitle}>{course.title}</h2>
          </div>
        </div>
        {lessons.length === 0 ? (
          <p className={s.helperText}>Уроки ещё не добавлены.</p>
        ) : (
          <div className={s.miniLessonList}>
            {lessons.map((lesson, i) => (
              <button
                className={s.miniLessonItem}
                key={lesson.id}
                onClick={() => onSelectLesson(lesson)}
                style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                type="button"
              >
                <span className={`${s.lessonMark} ${lesson.progress?.completed ? s.lessonMarkDone : ""}`}>
                  {lesson.progress?.completed ? "✓" : i + 1}
                </span>
                <div>
                  <div style={{ color: "var(--text)", fontWeight: 600 }}>{lesson.title}</div>
                  {lesson.duration ? (
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {formatDuration(lesson.duration)}
                    </div>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LessonView({ lesson, enrollment, onBack }) {
  const [playback, setPlayback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPlayback() {
      setLoading(true);
      setError("");
      try {
        const r = await fetch(`/api/securecourse/student/lessons/${lesson.id}/playback-access`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
        if (r.ok) {
          const data = await r.json();
          setPlayback(data);
        } else if (r.status === 404 || r.status === 400) {
          setError("Видео ещё не готово или недоступно.");
        } else {
          setError("Нет доступа к просмотру.");
        }
      } catch {
        setError("Ошибка загрузки видео.");
      } finally {
        setLoading(false);
      }
    }
    loadPlayback();
  }, [lesson.id]);

  const materials = lesson.materials || [];

  return (
    <div>
      <button className={s.ghostButton} onClick={onBack} style={{ marginBottom: "1rem" }} type="button">
        ← К списку уроков
      </button>

      <div className={s.studentStage}>
        <div>
          {/* Video area */}
          <div className={s.videoCanvas}>
            {loading ? (
              <div className={s.videoBackdrop}>Загрузка видео…</div>
            ) : error ? (
              <div className={s.videoBackdrop} style={{ flexDirection: "column", gap: "0.5rem" }}>
                <span>🎬</span>
                <span style={{ fontSize: "0.85rem" }}>{error}</span>
              </div>
            ) : playback?.playbackUrl ? (
              <video
                controls
                src={playback.playbackUrl}
                style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "inherit" }}
              />
            ) : (
              <div className={s.videoBackdrop}>
                <div>
                  <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🔒</div>
                  <div>Защищённое видео</div>
                  <div style={{ fontSize: "0.8rem", marginTop: "0.3rem", opacity: 0.6 }}>
                    Доступно только в текущей сессии
                  </div>
                </div>
              </div>
            )}
            {!loading && !error && (
              <div className={s.watermark}>
                <span>Protected</span>
                <span>{new Date().toLocaleTimeString("ru-RU")}</span>
              </div>
            )}
          </div>

          {/* Lesson info */}
          <div className={s.lessonMeta} style={{ marginTop: "1rem" }}>
            <h2 className={s.lessonTitle} style={{ fontSize: "1.4rem" }}>{lesson.title}</h2>
            {lesson.description && (
              <p style={{ color: "var(--text-soft)", lineHeight: 1.7 }}>{lesson.description}</p>
            )}
          </div>

          {/* Materials */}
          {materials.length > 0 && (
            <div className={s.callout} style={{ marginTop: "1rem" }}>
              <p className={s.surfaceEyebrow}>Материалы урока</p>
              <ul className={s.materialList} style={{ marginTop: "0.75rem" }}>
                {materials.map((m) => (
                  <li key={m.id}>
                    <a
                      href={m.url || "#"}
                      rel="noreferrer"
                      style={{ color: "var(--teal)" }}
                      target="_blank"
                    >
                      {m.title || m.type}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside>
          <div className={s.callout}>
            <p className={s.surfaceEyebrow}>Текущий курс</p>
            <h3 style={{ margin: "0.4rem 0 0", color: "var(--text)", fontSize: "1rem" }}>
              {enrollment?.course?.title || "Курс"}
            </h3>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────
export default function StudentCabinet() {
  const [view, setView] = useState("loading"); // loading | activate | courses | lessons | lesson
  const [sessionData, setSessionData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [error, setError] = useState("");

  // Check session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const r = await fetch("/api/securecourse/auth/session", { credentials: "include" });
        if (r.ok) {
          const data = await r.json();
          setSessionData(data);
          await loadCourses();
          setView("courses");
        } else {
          setView("activate");
        }
      } catch {
        setView("activate");
      }
    }
    checkSession();
  }, []);

  async function loadCourses() {
    try {
      const r = await fetch("/api/securecourse/student/courses", { credentials: "include" });
      if (r.ok) {
        const data = await r.json();
        setCourses(Array.isArray(data) ? data : data.enrollments || []);
      }
    } catch {
      setError("Не удалось загрузить курсы.");
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/securecourse/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      setView("activate");
      setSessionData(null);
      setCourses([]);
    }
  }

  if (view === "loading") {
    return (
      <main className={`${s.page} ${s.mobilePage}`}>
        <div className={s.mobileShell}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
            <p style={{ color: "var(--text-soft)" }}>Загрузка…</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={`${s.page} ${s.mobilePage}`}>
      <div className={s.ambient} aria-hidden="true" />
      <div className={s.mobileShell}>

        {/* ─── TOPBAR ─── */}
        <header className={s.mobileTopbar}>
          <Link className={s.brand} href="/securecourse" style={{ textDecoration: "none" }}>
            <span className={s.brandMark}>SC</span>
            <span>
              <strong>SecureCourse</strong>
              <small>Кабинет ученика</small>
            </span>
          </Link>
          <div className={s.topnavActions}>
            {sessionData && (
              <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                {sessionData.user?.email || sessionData.email || ""}
              </span>
            )}
            {view !== "activate" && (
              <button className={s.outlineButton} onClick={handleLogout} type="button">
                Выйти
              </button>
            )}
            <Link className={s.ghostButton} href="/securecourse/admin">Админка</Link>
          </div>
        </header>

        {/* ─── CONTENT ─── */}
        <div style={{ marginTop: "1.5rem" }}>
          {error && <div className={s.feedbackError} style={{ marginBottom: "1rem" }}>{error}</div>}

          {view === "activate" && (
            <ActivateView
              onSuccess={async () => {
                await loadCourses();
                setView("courses");
              }}
            />
          )}

          {view === "courses" && (
            <CoursesView
              courses={courses}
              onSelectCourse={(enrollment) => {
                setSelectedEnrollment(enrollment);
                setView("lessons");
              }}
            />
          )}

          {view === "lessons" && selectedEnrollment && (
            <LessonsView
              enrollment={selectedEnrollment}
              onBack={() => setView("courses")}
              onSelectLesson={(lesson) => {
                setSelectedLesson(lesson);
                setView("lesson");
              }}
            />
          )}

          {view === "lesson" && selectedLesson && (
            <LessonView
              enrollment={selectedEnrollment}
              lesson={selectedLesson}
              onBack={() => setView("lessons")}
            />
          )}
        </div>

      </div>
    </main>
  );
}
