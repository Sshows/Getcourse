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

  return new Intl.DateTimeFormat("en-US", {
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
      setError(requestError.message || "Could not verify the student session.");
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
        playbackError = requestError.message || "Video is not ready yet.";
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
        error: requestError.message || "Could not load the lesson."
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
      setNotice("Lesson marked as completed.");
      await loadCourses();
      await openLesson(lessonState.lesson.id);
    } catch (requestError) {
      setError(requestError.message || "Could not update progress.");
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
      setError(requestError.message || "Could not close the session.");
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
            <p className={s.surfaceEyebrow}>Checking access</p>
            <h1 className={s.calloutTitle}>Verifying the active student session.</h1>
            <p className={s.helperText}>If the token was already activated, the cabinet will open automatically.</p>
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
            <p className={s.surfaceEyebrow}>Token-only access</p>
            <h1 className={s.calloutTitle}>Activate a one-time token before opening the student cabinet.</h1>
            <p className={s.helperText} style={{ color: "var(--text-soft)" }}>
              Students do not use a regular password. The manager sends a one-time token from the admin panel, and that
              token opens the session for the assigned English or admissions courses.
            </p>
            {error ? <p className={s.feedbackError}>{error}</p> : null}
            <div className={s.heroActions}>
              <Link className={s.solidButton} href="/securecourse">
                Activate token
              </Link>
              <Link className={s.outlineButton} href="/securecourse/admin/login">
                Admin login
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
              <p className={s.surfaceEyebrow}>Student cabinet</p>
              <h1 className={s.surfaceTitle}>
                {session.user?.fullName || "Student"} can view assigned English and study abroad lessons.
              </h1>
            </div>
            <div className={s.heroActions}>
              <Link className={s.outlineButton} href="/securecourse">
                Activate another token
              </Link>
              <button className={s.solidButton} disabled={busyAction === "logout"} onClick={handleLogout} type="button">
                {busyAction === "logout" ? "Closing..." : "Logout"}
              </button>
            </div>
          </div>

          <div className={s.gridThree} style={{ padding: "2rem" }}>
            <div className={s.materialCard}>
              <p className={s.surfaceEyebrow}>Student</p>
              <strong>{session.user?.fullName || "Student account"}</strong>
              <p className={s.helperText}>{session.user?.email || "Assigned by manager"}</p>
            </div>
            <div className={s.materialCard}>
              <p className={s.surfaceEyebrow}>Session</p>
              <strong>{session.sessionId}</strong>
              <p className={s.helperText}>Heartbeat keeps the session alive every 60 seconds.</p>
            </div>
            <div className={s.materialCard}>
              <p className={s.surfaceEyebrow}>Courses</p>
              <strong>{courses.length}</strong>
              <p className={s.helperText}>Only currently assigned courses are visible.</p>
            </div>
          </div>
        </section>

        {error ? <p className={s.feedbackError}>{error}</p> : null}
        {notice ? <p className={s.feedbackSuccess}>{notice}</p> : null}

        <section className={s.gridTwo} style={{ paddingTop: "2rem" }}>
          <div className={s.surface}>
            <div className={s.surfaceHeader}>
              <div>
                <p className={s.surfaceEyebrow}>Assigned courses</p>
                <h2 className={s.surfaceTitle}>Choose a course and lesson.</h2>
              </div>
            </div>

            <div style={{ padding: "2rem" }}>
              {!courses.length ? (
                <p className={s.helperText}>No active enrollments yet. Ask your manager to assign a course.</p>
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
                    {selectedCourse.shortDescription || "This course contains guided lessons and downloadable notes."}
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
                <p className={s.surfaceEyebrow}>Lesson view</p>
                <h2 className={s.surfaceTitle}>
                  {lessonState.lesson ? lessonState.lesson.title : "Select a lesson to open the player and notes."}
                </h2>
              </div>
            </div>

            <div style={{ padding: "2rem", display: "grid", gap: "1.25rem" }}>
              {lessonState.loading ? <p className={s.helperText}>Loading lesson and playback access...</p> : null}

              {!lessonState.loading && !lessonState.lesson ? (
                <p className={s.helperText}>The lesson details, video, and materials will appear here.</p>
              ) : null}

              {lessonState.lesson ? (
                <>
                  <div className={s.compactList}>
                    <span>Course: {lessonState.lesson.course?.title || "Assigned course"}</span>
                    <span>Progress: {lessonState.progress?.progressPercent ?? 0}%</span>
                    <span>Last watched: {formatDateTime(lessonState.progress?.lastWatchedAt)}</span>
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
                      <div style={{ padding: "2rem", minHeight: "18rem", display: "grid", placeItems: "center" }}>
                        <p className={s.helperText}>{lessonState.error || "Video is not ready yet."}</p>
                      </div>
                    )}
                  </div>

                  {lessonState.lesson.content ? (
                    <div className={s.materialCard}>
                      <p className={s.surfaceEyebrow}>Lesson summary</p>
                      <p className={s.helperText} style={{ color: "var(--text-soft)", whiteSpace: "pre-wrap" }}>
                        {lessonState.lesson.content}
                      </p>
                    </div>
                  ) : null}

                  <div className={s.surfaceGrid}>
                    <p className={s.surfaceEyebrow}>Materials</p>
                    {lessonState.lesson.materials?.length ? (
                      lessonState.lesson.materials.map((material) => (
                        <div className={s.materialCard} key={material.id}>
                          <strong>{material.title}</strong>
                          <p className={s.helperText} style={{ color: "var(--text-soft)", marginTop: "0.5rem" }}>
                            {material.content || material.url || "Material attached to this lesson."}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className={s.helperText}>No materials yet for this lesson.</p>
                    )}
                  </div>

                  <div className={s.heroActions}>
                    <button
                      className={s.solidButton}
                      disabled={busyAction === "complete-lesson"}
                      onClick={markCompleted}
                      type="button"
                    >
                      {busyAction === "complete-lesson" ? "Saving..." : "Mark lesson as completed"}
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
