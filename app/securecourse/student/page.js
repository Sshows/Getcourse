"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getSecureCourseSession,
  getStudentCourses,
  getStudentLesson,
  heartbeatSession,
  logoutAccess,
  requestPlaybackAccess,
  updateLessonProgress
} from "@/lib/securecourse-api";
import s from "../securecourse.module.css";

function badgeClass(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized.includes("active") || normalized.includes("ready") || normalized.includes("completed")) {
    return `${s.badge} ${s.badgeGreen}`;
  }

  if (normalized.includes("used") || normalized.includes("processing") || normalized.includes("waiting")) {
    return `${s.badge} ${s.badgeBlue}`;
  }

  if (normalized.includes("revoked") || normalized.includes("expired") || normalized.includes("error")) {
    return `${s.badge} ${s.badgeRed}`;
  }

  return `${s.badge} ${s.badgeGold}`;
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

export default function SecureCourseStudentPage() {
  const [session, setSession] = useState({
    checking: true,
    authenticated: false,
    userId: "",
    sessionId: ""
  });
  const [courses, setCourses] = useState([]);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("");
  const [lessonState, setLessonState] = useState({
    loading: false,
    lesson: null,
    enrollment: null,
    progress: null,
    playback: null,
    error: ""
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyAction, setBusyAction] = useState("");

  async function loadCourses() {
    const payload = await getStudentCourses();
    setCourses(payload);
    return payload;
  }

  async function hydrateSession() {
    setError("");

    try {
      const payload = await getSecureCourseSession();

      if (!payload.authenticated) {
        setSession({
          checking: false,
          authenticated: false,
          userId: "",
          sessionId: ""
        });
        setCourses([]);
        return;
      }

      setSession({
        checking: false,
        authenticated: true,
        userId: payload.userId,
        sessionId: payload.sessionId
      });

      await loadCourses();
    } catch (requestError) {
      setSession({
        checking: false,
        authenticated: false,
        userId: "",
        sessionId: ""
      });
      setError(requestError.message || "Не удалось проверить сессию ученика.");
    }
  }

  useEffect(() => {
    hydrateSession();
  }, []);

  useEffect(() => {
    if (!session.authenticated) {
      return undefined;
    }

    const timer = setInterval(() => {
      heartbeatSession().catch(() => undefined);
    }, 60_000);

    return () => clearInterval(timer);
  }, [session.authenticated]);

  useEffect(() => {
    if (!selectedEnrollmentId && courses[0]?.id) {
      setSelectedEnrollmentId(courses[0].id);
    }
  }, [courses, selectedEnrollmentId]);

  const selectedEnrollment = useMemo(
    () => courses.find((item) => item.id === selectedEnrollmentId) || null,
    [courses, selectedEnrollmentId]
  );

  const selectedCourse = selectedEnrollment?.course || null;
  const lessons = selectedCourse?.lessons || [];

  async function handleOpenLesson(lessonId) {
    setLessonState({
      loading: true,
      lesson: null,
      enrollment: null,
      progress: null,
      playback: null,
      error: ""
    });
    setNotice("");
    setError("");

    try {
      const lessonPayload = await getStudentLesson(lessonId);
      let playbackPayload = null;
      let playbackError = "";

      try {
        playbackPayload = await requestPlaybackAccess(lessonId);
      } catch (playbackRequestError) {
        playbackError =
          playbackRequestError.message || "Видео пока не готово или недоступно для текущей сессии.";
      }

      setLessonState({
        loading: false,
        lesson: lessonPayload.lesson,
        enrollment: lessonPayload.enrollment,
        progress: lessonPayload.progress,
        playback: playbackPayload?.playback || null,
        error: playbackError
      });
    } catch (requestError) {
      setLessonState({
        loading: false,
        lesson: null,
        enrollment: null,
        progress: null,
        playback: null,
        error: requestError.message || "Не удалось загрузить урок."
      });
    }
  }

  async function handleMarkCompleted() {
    if (!lessonState.lesson) {
      return;
    }

    setBusyAction("complete-lesson");
    setError("");
    setNotice("");

    try {
      await updateLessonProgress(lessonState.lesson.id, {
        progressPercent: 100,
        completed: true,
        lastPositionSeconds: lessonState.progress?.lastPositionSeconds || 0
      });
      setNotice("Прогресс обновлен. Урок отмечен как завершенный.");
      await loadCourses();
      await handleOpenLesson(lessonState.lesson.id);
    } catch (requestError) {
      setError(requestError.message || "Не удалось обновить прогресс.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleLogout() {
    setBusyAction("logout");
    setError("");
    setNotice("");

    try {
      await logoutAccess();
      setSession({
        checking: false,
        authenticated: false,
        userId: "",
        sessionId: ""
      });
      setCourses([]);
      setSelectedEnrollmentId("");
      setLessonState({
        loading: false,
        lesson: null,
        enrollment: null,
        progress: null,
        playback: null,
        error: ""
      });
    } catch (requestError) {
      setError(requestError.message || "Не удалось завершить сессию.");
    } finally {
      setBusyAction("");
    }
  }

  if (session.checking) {
    return (
      <main className={s.page}>
        <div className={s.ambient} aria-hidden="true" />
        <div className={s.shell}>
          <section className={s.callout}>
            <p className={s.surfaceEyebrow}>Проверка доступа</p>
            <h1 className={s.calloutTitle}>Проверяем активную сессию ученика</h1>
            <p className={s.helperText}>Если токен уже активирован, кабинет откроется автоматически.</p>
          </section>
        </div>
      </main>
    );
  }

  if (!session.authenticated) {
    return (
      <main className={s.page}>
        <div className={s.ambient} aria-hidden="true" />
        <div className={s.shell}>
          <section className={s.callout}>
            <p className={s.surfaceEyebrow}>Token-only student access</p>
            <h1 className={s.calloutTitle}>Сначала активируйте одноразовый токен</h1>
            <p className={s.helperText}>
              У учеников нет обычной регистрации и пароля. Доступ выдается менеджером через
              одноразовый токен на публичной странице.
            </p>
            {error ? <p className={s.feedbackError}>{error}</p> : null}
            <div className={s.calloutActions}>
              <Link className={s.solidButton} href="/securecourse">
                Перейти к активации токена
              </Link>
              <Link className={s.outlineButton} href="/securecourse/admin/login">
                Войти как администратор
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={s.page}>
      <div className={s.ambient} aria-hidden="true" />
      <div className={s.shell}>
        <section className={s.surface}>
          <div className={s.surfaceHeader}>
            <div>
              <p className={s.surfaceEyebrow}>Кабинет ученика</p>
              <h1 className={s.surfaceTitle}>Доступ открыт только в рамках текущей активной сессии</h1>
            </div>
            <div className={s.calloutActions}>
              <Link className={s.outlineButton} href="/securecourse">
                Активировать другой токен
              </Link>
              <button
                className={s.solidButton}
                disabled={busyAction === "logout"}
                onClick={handleLogout}
                type="button"
              >
                {busyAction === "logout" ? "Завершаю..." : "Выйти"}
              </button>
            </div>
          </div>

          <div className={s.compactList}>
            <span>User ID: {session.userId}</span>
            <span>Session ID: {session.sessionId}</span>
            <span>Heartbeat: каждые 60 секунд</span>
          </div>

          {error ? <p className={s.feedbackError}>{error}</p> : null}
          {notice ? <p className={s.feedbackSuccess}>{notice}</p> : null}
        </section>

        <section
          className={s.section}
          style={{ display: "grid", gridTemplateColumns: "1.05fr 1.15fr", gap: "1.25rem", padding: 0 }}
        >
          <div className={s.surface}>
            <div className={s.surfaceHeader}>
              <div>
                <p className={s.surfaceEyebrow}>Назначенные курсы</p>
                <h2 className={s.surfaceTitle}>Выберите курс и урок</h2>
              </div>
            </div>

            {!courses.length ? (
              <p className={s.helperText}>Пока нет активных назначений. Обратитесь к менеджеру.</p>
            ) : (
              <div className={s.compactList}>
                {courses.map((enrollment) => (
                  <button
                    key={enrollment.id}
                    className={selectedEnrollmentId === enrollment.id ? s.solidButton : s.outlineButton}
                    onClick={() => {
                      setSelectedEnrollmentId(enrollment.id);
                      setLessonState({
                        loading: false,
                        lesson: null,
                        enrollment: null,
                        progress: null,
                        playback: null,
                        error: ""
                      });
                    }}
                    style={{ justifyContent: "space-between" }}
                    type="button"
                  >
                    <span>{enrollment.course.title}</span>
                    <span className={badgeClass(enrollment.status)}>{enrollment.status}</span>
                  </button>
                ))}
              </div>
            )}

            {selectedCourse ? (
              <div style={{ marginTop: "1.25rem" }}>
                <p className={s.helperText} style={{ marginBottom: "0.75rem" }}>
                  {selectedCourse.shortDescription || "Курс без краткого описания."}
                </p>
                <div className={s.compactList}>
                  {lessons.map((lesson) => (
                    <button
                      key={lesson.id}
                      className={
                        lessonState.lesson?.id === lesson.id ? s.solidButton : s.ghostButton
                      }
                      onClick={() => handleOpenLesson(lesson.id)}
                      style={{ justifyContent: "space-between" }}
                      type="button"
                    >
                      <span>{lesson.title}</span>
                      <span className={badgeClass(lesson.status)}>{lesson.status}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className={s.surface}>
            <div className={s.surfaceHeader}>
              <div>
                <p className={s.surfaceEyebrow}>Урок</p>
                <h2 className={s.surfaceTitle}>
                  {lessonState.lesson ? lessonState.lesson.title : "Выберите урок из назначенного курса"}
                </h2>
              </div>
            </div>

            {lessonState.loading ? (
              <p className={s.helperText}>Загружаем детали урока и playback access...</p>
            ) : lessonState.lesson ? (
              <div className={s.compactList}>
                <span>Курс: {lessonState.lesson.course.title}</span>
                <span>Статус урока: {lessonState.lesson.status}</span>
                <span>Прогресс: {lessonState.progress?.progressPercent ?? 0}%</span>
                <span>Последний просмотр: {formatDateTime(lessonState.progress?.lastWatchedAt)}</span>
              </div>
            ) : (
              <p className={s.helperText}>
                Здесь появится видео, материалы и прогресс после выбора урока.
              </p>
            )}

            {lessonState.lesson ? (
              <div style={{ marginTop: "1rem", display: "grid", gap: "1rem" }}>
                <div
                  style={{
                    border: "1px solid var(--card-border)",
                    borderRadius: "var(--radius-lg)",
                    overflow: "hidden",
                    minHeight: "18rem",
                    background: "rgba(0, 0, 0, 0.5)",
                    boxShadow: "inset 0 0 20px rgba(0,0,0,0.8)"
                  }}
                >
                  {lessonState.playback?.manifestUrl ? (
                    <video
                      controls
                      src={lessonState.playback.manifestUrl}
                      style={{ width: "100%", height: "100%", minHeight: "18rem", display: "block" }}
                    />
                  ) : (
                    <div
                      style={{
                        minHeight: "18rem",
                        display: "grid",
                        placeItems: "center",
                        padding: "1.5rem",
                        color: "var(--text-soft)",
                        textAlign: "center"
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: "1.1rem", color: "#fff" }}>Защищенное видео</strong>
                        <p style={{ marginTop: "0.6rem" }}>
                          {lessonState.error || "Для этого урока еще нет готового playback access."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className={s.callout}>
                  <p className={s.surfaceEyebrow}>Материалы урока</p>
                  {lessonState.lesson.materials.length ? (
                    <div className={s.compactList}>
                      {lessonState.lesson.materials.map((material) => (
                        <div
                          key={material.id}
                          style={{
                            padding: "1rem",
                            border: "1px solid var(--card-border)",
                            borderRadius: "var(--radius-md)",
                            background: "rgba(0,0,0,0.2)"
                          }}
                        >
                          <strong>{material.title}</strong>
                          <p style={{ margin: "0.35rem 0 0", color: "var(--text-soft)" }}>
                            {material.type}
                            {material.url ? ` · ${material.url}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={s.helperText}>Дополнительные материалы пока не добавлены.</p>
                  )}
                </div>

                <div className={s.calloutActions}>
                  <button
                    className={s.solidButton}
                    disabled={busyAction === "complete-lesson"}
                    onClick={handleMarkCompleted}
                    type="button"
                  >
                    {busyAction === "complete-lesson" ? "Сохраняю..." : "Отметить урок завершенным"}
                  </button>
                  <span className={s.helperText}>
                    Playback access выдается только после проверки enrollment и активной сессии.
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
