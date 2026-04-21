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

function formatCountdown(value) {
  if (!value) {
    return "-";
  }

  const diff = Math.max(0, Math.floor((new Date(value).getTime() - Date.now()) / 1000));
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

export default function SecureCourseStudentPage() {
  const [session, setSession] = useState({
    checking: true,
    authenticated: false,
    user: null,
    userId: "",
    sessionId: "",
    sessionMeta: null
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
          sessionId: "",
          sessionMeta: null
        });
        setCourses([]);
        return;
      }

      setSession({
        checking: false,
        authenticated: true,
        user: payload.user || null,
        userId: payload.userId || payload.user?.id || "",
        sessionId: payload.sessionId || payload.session?.id || "",
        sessionMeta: payload.session || null
      });

      await loadCourses();
    } catch (requestError) {
      setSession({
        checking: false,
        authenticated: false,
        user: null,
        userId: "",
        sessionId: "",
        sessionMeta: null
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

    const timer = setInterval(async () => {
      try {
        const heartbeat = await heartbeatSession();

        if (heartbeat?.session) {
          setSession((current) => ({
            ...current,
            sessionId: heartbeat.session.id || current.sessionId,
            sessionMeta: heartbeat.session,
            user: heartbeat.session.user || current.user
          }));
        }
      } catch {
        return undefined;
      }
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
      setNotice("Прогресс сохранен. Урок отмечен как завершенный.");
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
        sessionId: "",
        sessionMeta: null
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
            <p className={s.helperText}>Если токен уже активирован или ученик уже вошел через email/телефон, кабинет откроется автоматически.</p>
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
            <p className={s.surfaceEyebrow}>Доступ к кабинету</p>
            <h1 className={s.calloutTitle}>Сначала активируйте токен или войдите через подтвержденный student account.</h1>
            <p className={s.helperText} style={{ color: "var(--text-soft)" }}>
              На публичной странице ученик может либо ввести одноразовый токен от менеджера, либо зарегистрироваться по
              email и телефону, пройти двойную верификацию и дальше заходить уже как в обычный web-кабинет.
            </p>
            {error ? <p className={s.feedbackError}>{error}</p> : null}
            <div className={s.heroActions}>
              <Link className={s.solidButton} href="/securecourse#activation">
                Активировать токен
              </Link>
              <Link className={s.outlineButton} href="/securecourse#student-registration">
                Регистрация и вход
              </Link>
              <Link className={s.ghostButton} href="/securecourse/admin/login">
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
              <Link className={s.outlineButton} href="/securecourse#activation">
                Другой токен
              </Link>
              <Link className={s.ghostButton} href="/securecourse#student-registration">
                Войти другим аккаунтом
              </Link>
              <button className={s.solidButton} disabled={busyAction === "logout"} onClick={handleLogout} type="button">
                {busyAction === "logout" ? "Завершаем..." : "Выйти"}
              </button>
            </div>
          </div>

          <div className={`${s.gridThree} ${s.panelBody}`}>
            <div className={s.materialCard}>
              <p className={s.surfaceEyebrow}>Профиль</p>
              <strong>{session.user?.fullName || "Student access"}</strong>
              <p className={s.helperText}>
                {session.user?.email || "Email не указан"}
                {session.user?.phone ? <><br />{session.user.phone}</> : null}
              </p>
            </div>
            <div className={s.materialCard}>
              <p className={s.surfaceEyebrow}>Сессия</p>
              <strong>{session.sessionId}</strong>
              <p className={s.helperText}>
                До idle timeout: {formatCountdown(session.sessionMeta?.idleExpiresAt)}
                <br />
                Последняя активность: {formatDateTime(session.sessionMeta?.lastSeenAt)}
              </p>
            </div>
            <div className={s.materialCard}>
              <p className={s.surfaceEyebrow}>Назначено курсов</p>
              <strong>{courses.length}</strong>
              <p className={s.helperText}>В кабинете видны только те программы, которые назначены именно вам.</p>
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

            <div className={s.surfaceContent}>
              {!courses.length ? (
                <p className={s.helperText}>
                  Пока нет назначенных курсов. Если вы только что зарегистрировались, менеджер должен зачислить вас на
                  курс или выдать токен доступа.
                </p>
              ) : null}

              <div className={s.courseList}>
                {courses.map((enrollment) => {
                  const isSelected = selectedEnrollmentId === enrollment.id;

                  return (
                    <button
                      className={isSelected ? s.courseCardActive : s.courseCard}
                      key={enrollment.id}
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
                      type="button"
                    >
                      <div>
                        <p className={s.surfaceEyebrow}>{enrollment.course?.title}</p>
                        <h3 style={{ margin: "0 0 0.35rem" }}>{enrollment.course?.shortDescription || "Назначенный курс"}</h3>
                        <p className={s.helperText}>{enrollment.course?.description || "Описание курса появится здесь."}</p>
                      </div>
                      <div className={s.compactList}>
                        <span>Уроков: {(enrollment.course?.lessons || []).length}</span>
                        <span>Прогресс: {enrollment.progressPercent ?? 0}%</span>
                        <span className={badgeClass(enrollment.status)}>{enrollment.status}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedCourse ? (
                <div className={s.sectionSpacingTop}>
                  <p className={s.surfaceEyebrow}>Уроки курса</p>
                  <div className={s.compactList}>
                    {lessons.map((lesson) => (
                      <button
                        className={lessonState.lesson?.id === lesson.id ? s.solidButton : s.ghostButton}
                        key={lesson.id}
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
