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
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export default function SecureCourseStudentPage() {
  const [session, setSession] = useState({
    checking: true,
    authenticated: false,
    user: null,
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
          user: null,
          userId: "",
          sessionId: ""
        });
        setCourses([]);
        return;
      }

      setSession({
        checking: false,
        authenticated: true,
        user: payload.user || null,
        userId: payload.userId,
        sessionId: payload.sessionId
      });

      await loadCourses();
    } catch (requestError) {
      setSession({
        checking: false,
        authenticated: false,
        user: null,
        userId: "",
        sessionId: ""
      });
      setError(requestError.message || "Не удалось проверить ученическую сессию.");
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

  async function openLesson(lessonId) {
    setLessonState({
      loading: true,
      lesson: null,
      enrollment: null,
      progress: null,
      playback: null,
      error: ""
    });

    try {
      const lessonPayload = await getStudentLesson(lessonId);
      let playback = null;
      let playbackError = "";

      try {
        const playbackPayload = await requestPlaybackAccess(lessonId);
        playback = playbackPayload.playback;
      } catch (requestError) {
        playbackError = requestError.message || "Видео еще не готово.";
      }

      setLessonState({
        loading: false,
        lesson: lessonPayload.lesson,
        enrollment: lessonPayload.enrollment,
        progress: lessonPayload.progress,
        playback,
        error: playbackError
      });
    } catch (requestError) {
      setLessonState({
        loading: false,
        lesson: null,
        enrollment: null,
        progress: null,
        playback: null,
        error: requestError.message || "Не удалось открыть урок."
      });
    }
  }

  async function markCompleted() {
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
      await openLesson(lessonState.lesson.id);
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
        user: null,
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
            <p className={s.surfaceEyebrow}>Проверяем доступ</p>
            <h1 className={s.calloutTitle}>Смотрим, есть ли активная сессия ученика.</h1>
            <p className={s.helperText}>Если токен уже был активирован, кабинет откроется автоматически.</p>
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
            <p className={s.surfaceEyebrow}>Только по токену</p>
            <h1 className={s.calloutTitle}>Сначала активируйте одноразовый токен на публичной странице.</h1>
            <p className={s.helperText} style={{ color: "var(--text-soft)" }}>
              Ученики не используют обычный логин и пароль. Менеджер выдает токен, а токен открывает доступ к
              назначенным курсам по IELTS, английскому и admission documents.
            </p>
            {error ? <p className={s.feedbackError}>{error}</p> : null}
            <div className={s.heroActions}>
              <Link className={s.solidButton} href="/securecourse">
                Активировать токен
              </Link>
              <Link className={s.outlineButton} href="/securecourse/admin/login">
                Вход для команды
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
              <h1 className={s.surfaceTitle}>
                {session.user?.fullName || "Ученик"}, здесь ваши курсы по английскому и поступлению.
              </h1>
            </div>
            <div className={s.heroActions}>
              <Link className={s.outlineButton} href="/securecourse">
                Активировать другой токен
              </Link>
              <button className={s.solidButton} disabled={busyAction === "logout"} onClick={handleLogout} type="button">
                {busyAction === "logout" ? "Завершаем..." : "Выйти"}
              </button>
            </div>
          </div>

          <div className={`${s.gridThree} ${s.panelBody}`}>
            <div className={s.materialCard}>
              <p className={s.surfaceEyebrow}>Ученик</p>
              <strong>{session.user?.fullName || "Ученический доступ"}</strong>
              <p className={s.helperText}>{session.user?.email || "Назначено менеджером"}</p>
            </div>
            <div className={s.materialCard}>
              <p className={s.surfaceEyebrow}>Сессия</p>
              <strong>{session.sessionId}</strong>
              <p className={s.helperText}>Heartbeat обновляет сессию каждые 60 секунд.</p>
            </div>
            <div className={s.materialCard}>
              <p className={s.surfaceEyebrow}>Курсы</p>
              <strong>{courses.length}</strong>
              <p className={s.helperText}>Видны только назначенные программы.</p>
            </div>
          </div>
        </section>

        {error ? <p className={s.feedbackError}>{error}</p> : null}
        {notice ? <p className={s.feedbackSuccess}>{notice}</p> : null}

        <section className={`${s.gridTwo} ${s.sectionSpacingTop}`}>
          <div className={s.surface}>
            <div className={s.surfaceHeader}>
              <div>
                <p className={s.surfaceEyebrow}>Назначенные курсы</p>
                <h2 className={s.surfaceTitle}>Выберите курс и откройте урок.</h2>
              </div>
            </div>

            <div className={s.panelBody}>
              {!courses.length ? (
                <p className={s.helperText}>Пока нет активных зачислений. Попросите менеджера назначить курс.</p>
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
                <div style={{ marginTop: "1.5rem" }}>
                  <p className={s.helperText} style={{ color: "var(--text-soft)", marginBottom: "1rem" }}>
                    {selectedCourse.shortDescription || "Курс содержит уроки, видео и материалы."}
                  </p>
                  <div className={s.compactList}>
                    {lessons.map((lesson) => (
                      <button
                        key={lesson.id}
                        className={lessonState.lesson?.id === lesson.id ? s.solidButton : s.ghostButton}
                        onClick={() => openLesson(lesson.id)}
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
          </div>

          <div className={s.surface}>
            <div className={s.surfaceHeader}>
              <div>
                <p className={s.surfaceEyebrow}>Урок</p>
                <h2 className={s.surfaceTitle}>
                  {lessonState.lesson ? lessonState.lesson.title : "Выберите урок, чтобы открыть видео и материалы."}
                </h2>
              </div>
            </div>

            <div className={s.surfaceContent}>
              {lessonState.loading ? <p className={s.helperText}>Загружаем урок и доступ к видео...</p> : null}

              {!lessonState.loading && !lessonState.lesson ? (
                <p className={s.helperText}>Здесь появятся видео, конспект и прогресс по выбранному уроку.</p>
              ) : null}

              {lessonState.lesson ? (
                <>
                  <div className={s.compactList}>
                    <span>Курс: {lessonState.lesson.course?.title || "Назначенный курс"}</span>
                    <span>Прогресс: {lessonState.progress?.progressPercent ?? 0}%</span>
                    <span>Последний просмотр: {formatDateTime(lessonState.progress?.lastWatchedAt)}</span>
                  </div>

                  <div className={s.videoFrame}>
                    {lessonState.playback?.manifestUrl ? (
                      <video
                        controls
                        playsInline
                        preload="metadata"
                        src={lessonState.playback.manifestUrl}
                        style={{ width: "100%", display: "block", aspectRatio: "16 / 9", background: "#000" }}
                      />
                    ) : (
                      <div className={s.videoPlaceholder}>
                        <p className={s.helperText}>{lessonState.error || "Видео еще не готово."}</p>
                      </div>
                    )}
                  </div>

                  {lessonState.lesson.content ? (
                    <div className={s.materialCard}>
                      <p className={s.surfaceEyebrow}>О чем урок</p>
                      <p className={s.helperText} style={{ color: "var(--text-soft)", whiteSpace: "pre-wrap" }}>
                        {lessonState.lesson.content}
                      </p>
                    </div>
                  ) : null}

                  <div className={s.surfaceGrid}>
                    <p className={s.surfaceEyebrow}>Материалы</p>
                    {lessonState.lesson.materials?.length ? (
                      lessonState.lesson.materials.map((material) => (
                        <div className={s.materialCard} key={material.id}>
                          <strong>{material.title}</strong>
                          <p className={s.helperText} style={{ color: "var(--text-soft)", marginTop: "0.5rem" }}>
                            {material.content || material.url || "Материал прикреплен к уроку."}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className={s.helperText}>Для этого урока пока нет дополнительных материалов.</p>
                    )}
                  </div>

                  <div className={s.heroActions}>
                    <button
                      className={s.solidButton}
                      disabled={busyAction === "complete-lesson"}
                      onClick={markCompleted}
                      type="button"
                    >
                      {busyAction === "complete-lesson" ? "Сохраняем..." : "Отметить урок завершенным"}
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
