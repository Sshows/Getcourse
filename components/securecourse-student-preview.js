"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getSecureCourseSession,
  getStudentCourses,
  getStudentLesson,
  heartbeatSession,
  logoutAccess,
  requestPlaybackAccess
} from "@/lib/securecourse-api";
import { securecourseContent } from "@/lib/securecourse-content";
import styles from "@/app/securecourse/securecourse.module.css";

const screens = [
  { id: "login", label: "Login" },
  { id: "courses", label: "Courses" },
  { id: "lesson", label: "Lesson" }
];

function formatClock(date) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

function formatManifestHint(playback) {
  if (!playback?.manifestUrl) {
    return "Playback access has not been requested yet.";
  }

  return playback.manifestUrl;
}

export default function SecureCourseStudentPreview() {
  const { studentApp } = securecourseContent;
  const [screen, setScreen] = useState("login");
  const [captureMode, setCaptureMode] = useState(false);
  const [backgroundMode, setBackgroundMode] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [playbackLoading, setPlaybackLoading] = useState(false);
  const [error, setError] = useState("");
  const [session, setSession] = useState({
    authenticated: false,
    userId: "",
    sessionId: ""
  });
  const [enrollments, setEnrollments] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [lessonPayload, setLessonPayload] = useState(null);
  const [playbackPayload, setPlaybackPayload] = useState(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function loadCoursesAndSession() {
    setLoading(true);
    setError("");

    try {
      const sessionPayload = await getSecureCourseSession();

      if (!sessionPayload.authenticated) {
        setSession({
          authenticated: false,
          userId: "",
          sessionId: ""
        });
        setEnrollments([]);
        setSelectedCourseId("");
        setSelectedLessonId("");
        setLessonPayload(null);
        setPlaybackPayload(null);
        setScreen("login");
        return;
      }

      const coursePayload = await getStudentCourses();
      const firstEnrollment = coursePayload[0];
      const firstLesson = firstEnrollment?.course?.lessons?.[0];

      setSession(sessionPayload);
      setEnrollments(coursePayload);
      setSelectedCourseId(firstEnrollment?.course?.id || "");
      setSelectedLessonId(firstLesson?.id || "");
      setScreen(firstLesson ? "courses" : "login");
    } catch (requestError) {
      setSession({
        authenticated: false,
        userId: "",
        sessionId: ""
      });
      setEnrollments([]);
      setSelectedCourseId("");
      setSelectedLessonId("");
      setLessonPayload(null);
      setPlaybackPayload(null);
      setScreen("login");
      setError(requestError.message || "Failed to load student session.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCoursesAndSession();
  }, []);

  useEffect(() => {
    if (!session.authenticated) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      heartbeatSession().catch(() => {
        setError("Session heartbeat failed. Reload or activate access again.");
      });
    }, 45000);

    return () => window.clearInterval(interval);
  }, [session.authenticated]);

  useEffect(() => {
    if (!session.authenticated || !selectedLessonId) {
      setLessonPayload(null);
      setPlaybackPayload(null);
      return;
    }

    let cancelled = false;

    async function loadLesson() {
      setLessonLoading(true);
      setError("");

      try {
        const payload = await getStudentLesson(selectedLessonId);

        if (!cancelled) {
          setLessonPayload(payload);
          setPlaybackPayload(null);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message || "Failed to load lesson.");
        }
      } finally {
        if (!cancelled) {
          setLessonLoading(false);
        }
      }
    }

    loadLesson();

    return () => {
      cancelled = true;
    };
  }, [selectedLessonId, session.authenticated]);

  const selectedEnrollment = enrollments.find(
    (enrollment) => enrollment.course.id === selectedCourseId
  );
  const selectedCourse = selectedEnrollment?.course;
  const liveLesson = lessonPayload?.lesson;
  const liveMaterials = liveLesson?.materials || [];
  const liveLessonList = selectedCourse?.lessons || [];

  const watermark = useMemo(() => {
    const email = lessonPayload?.enrollment?.user?.email || session.userId || "securecourse";
    const sessionId = session.sessionId || "no-session";
    return `${email}\n${sessionId}\n${formatClock(now)}`;
  }, [lessonPayload?.enrollment?.user?.email, now, session.sessionId, session.userId]);

  async function handleRequestPlayback() {
    if (!selectedLessonId) {
      return;
    }

    setPlaybackLoading(true);
    setError("");

    try {
      const payload = await requestPlaybackAccess(selectedLessonId);
      setPlaybackPayload(payload);
      setScreen("lesson");
    } catch (requestError) {
      setError(requestError.message || "Failed to request playback access.");
    } finally {
      setPlaybackLoading(false);
    }
  }

  async function handleLogout() {
    setError("");

    try {
      await logoutAccess();
      await loadCoursesAndSession();
    } catch (requestError) {
      setError(requestError.message || "Logout failed.");
    }
  }

  function openCourse(courseId) {
    const enrollment = enrollments.find((item) => item.course.id === courseId);
    const firstLesson = enrollment?.course?.lessons?.[0];

    setSelectedCourseId(courseId);
    setSelectedLessonId(firstLesson?.id || "");
    setScreen(firstLesson ? "lesson" : "courses");
  }

  function openLesson(lessonId) {
    setSelectedLessonId(lessonId);
    setScreen("lesson");
  }

  if (loading) {
    return <section className={styles.studentWorkspace}>Loading student session...</section>;
  }

  return (
    <section className={styles.studentWorkspace}>
      <div className={styles.studentToolbar} data-reveal>
        <div className={styles.switcher}>
          {screens.map((item) => (
            <button
              className={`${styles.switcherButton} ${screen === item.id ? styles.switcherButtonActive : ""}`}
              key={item.id}
              onClick={() => setScreen(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className={styles.toggleRow}>
          <button
            className={`${styles.toggleChip} ${captureMode ? styles.toggleChipActive : ""}`}
            onClick={() => setCaptureMode((value) => !value)}
            type="button"
          >
            Simulate screen capture
          </button>
          <button
            className={`${styles.toggleChip} ${backgroundMode ? styles.toggleChipActive : ""}`}
            onClick={() => setBackgroundMode((value) => !value)}
            type="button"
          >
            Simulate background mode
          </button>
        </div>
      </div>

      {error ? <div className={styles.feedbackError}>{error}</div> : null}

      <div className={styles.studentStage}>
        <div className={styles.phoneStage} data-reveal>
          <div className={styles.phoneFrame}>
            <div className={`${styles.phoneScreen} ${backgroundMode ? styles.phoneScreenDimmed : ""}`}>
              <div className={styles.phoneTopbar}>
                <span>
                  {screen === "login"
                    ? "Activate access"
                    : session.authenticated
                      ? `Session ${session.sessionId.slice(0, 8)}`
                      : "Protected student app"}
                </span>
                <span className={styles.phoneStatus}>Protected view</span>
              </div>

              <div className={styles.phoneBody}>
                {screen === "login" ? (
                  <div className={styles.loginCard}>
                    <p className={styles.cardEyebrow}>One-time access</p>
                    <h3 className={styles.cardTitle}>
                      {session.authenticated ? "Session is ready" : "Activate this device"}
                    </h3>
                    <p className={styles.cardCopy}>
                      {session.authenticated
                        ? "Your active session is stored in secure cookies by the Next.js auth route. You can go straight to courses and request playback."
                        : "Use the public SecureCourse page to activate a one-time token. After that the student app will load live courses from the backend."}
                    </p>

                    <div className={styles.tokenMetaGrid}>
                      <div className={styles.metaTile}>
                        <span>Current state</span>
                        <strong>{session.authenticated ? "Session active" : "No session"}</strong>
                      </div>
                      <div className={styles.metaTile}>
                        <span>Backend path</span>
                        <strong>/api/securecourse/auth/activate</strong>
                      </div>
                    </div>

                    <div className={styles.calloutActions}>
                      <Link className={styles.solidButton} href="/securecourse#activate">
                        Open activation form
                      </Link>
                      {session.authenticated ? (
                        <button className={styles.outlineButton} onClick={() => setScreen("courses")} type="button">
                          Open courses
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {screen === "courses" ? (
                  <div className={styles.courseList}>
                    {enrollments.length === 0 ? (
                      <div className={styles.emptyState}>No enrolled courses for this session.</div>
                    ) : (
                      enrollments.map((enrollment) => (
                        <button
                          className={styles.courseCard}
                          key={enrollment.id}
                          onClick={() => openCourse(enrollment.course.id)}
                          type="button"
                        >
                          <div className={styles.courseCardTop}>
                            <strong>{enrollment.course.title}</strong>
                            <span>{Math.round(enrollment.progressPercent || 0)}%</span>
                          </div>
                          <p>{enrollment.course.lessons.length} lessons</p>
                          <div className={styles.progressTrack}>
                            <div
                              className={styles.progressFill}
                              style={{ width: `${Math.round(enrollment.progressPercent || 0)}%` }}
                            />
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                ) : null}

                {screen === "lesson" ? (
                  <div className={styles.lessonView}>
                    <div className={styles.videoCanvas}>
                      <div className={styles.videoBackdrop}>
                        {playbackPayload?.playback?.provider || playbackPayload?.provider || "Protected HLS stream"}
                      </div>
                      <div className={styles.watermark}>
                        {watermark.split("\n").map((line) => (
                          <span key={line}>{line}</span>
                        ))}
                      </div>
                      <div className={styles.videoControls}>
                        <span className={styles.controlDot} />
                        <div className={styles.videoProgress}>
                          <div
                            className={styles.videoProgressFill}
                            style={{
                              width: `${Math.round(lessonPayload?.progress?.progressPercent || 0)}%`
                            }}
                          />
                        </div>
                        <span className={styles.videoTime}>
                          {liveLesson?.estimatedMinutes ? `${liveLesson.estimatedMinutes} min` : "Ready"}
                        </span>
                      </div>
                    </div>

                    <div className={styles.lessonMeta}>
                      <p className={styles.cardEyebrow}>{selectedCourse?.title || "SecureCourse lesson"}</p>
                      <h3 className={styles.lessonTitle}>
                        {lessonLoading ? "Loading lesson..." : liveLesson?.title || "Select a lesson"}
                      </h3>
                      <p className={styles.cardCopy}>
                        {liveLesson?.summary ||
                          liveLesson?.body ||
                          "This lesson is loaded from the live temporary student cabinet."}
                      </p>
                    </div>

                    <div className={styles.calloutActions}>
                      <button
                        className={styles.solidButton}
                        disabled={playbackLoading || !selectedLessonId}
                        onClick={handleRequestPlayback}
                        type="button"
                      >
                        {playbackLoading ? "Requesting..." : "Request playback access"}
                      </button>
                      <button className={styles.outlineButton} onClick={() => setScreen("courses")} type="button">
                        Back to courses
                      </button>
                    </div>

                    <div className={styles.materialsBlock}>
                      <strong>Playback status</strong>
                      <p className={styles.cardCopy}>{formatManifestHint(playbackPayload?.playback)}</p>
                    </div>

                    <div className={styles.materialsBlock}>
                      <strong>Lesson materials</strong>
                      <ul className={styles.materialList}>
                        {liveMaterials.length === 0 ? (
                          <li>No materials yet.</li>
                        ) : (
                          liveMaterials.map((item) => <li key={item.id}>{item.title}</li>)
                        )}
                      </ul>
                    </div>

                    <div className={styles.miniLessonList}>
                      {liveLessonList.map((item) => (
                        <button
                          className={styles.miniLessonItem}
                          key={item.id}
                          onClick={() => openLesson(item.id)}
                          type="button"
                        >
                          <span
                            className={`${styles.lessonMark} ${
                              lessonPayload?.progress?.completed || selectedLessonId === item.id
                                ? styles.lessonMarkDone
                                : ""
                            }`}
                          >
                            {selectedLessonId === item.id ? ">" : "OK"}
                          </span>
                          <span>{item.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className={styles.phoneNav}>
                <button
                  className={`${styles.phoneNavItem} ${screen === "courses" ? styles.phoneNavItemActive : ""}`}
                  onClick={() => setScreen("courses")}
                  type="button"
                >
                  Courses
                </button>
                <button
                  className={`${styles.phoneNavItem} ${screen === "lesson" ? styles.phoneNavItemActive : ""}`}
                  onClick={() => setScreen("lesson")}
                  type="button"
                >
                  Lesson
                </button>
                <button className={styles.phoneNavItem} onClick={handleLogout} type="button">
                  Logout
                </button>
              </div>

              {backgroundMode ? (
                <div className={styles.snapshotShield}>
                  <strong>App switcher privacy mode</strong>
                  <p>Sensitive lesson view hidden while the app is in background.</p>
                </div>
              ) : null}

              {captureMode && screen === "lesson" ? (
                <div className={styles.protectionOverlay}>
                  <strong>Screen capture detected</strong>
                  <p>Protected content is obscured while the session remains under review.</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <aside className={styles.studentInfoCol} data-reveal>
          <section className={styles.infoPanel}>
            <p className={styles.surfaceEyebrow}>Active session</p>
            <h3 className={styles.calloutTitle}>Bound to one student and one device</h3>
            <ul className={styles.ruleList}>
              <li>{session.authenticated ? session.userId : "No active user"}</li>
              <li>{session.authenticated ? session.sessionId : "No active session"}</li>
              <li>Last heartbeat: {session.authenticated ? formatClock(now) : "—"}</li>
              <li>Courses loaded: {enrollments.length}</li>
            </ul>
          </section>

          <section className={styles.infoPanel}>
            <p className={styles.surfaceEyebrow}>Live flow</p>
            <h3 className={styles.calloutTitle}>What this preview does now</h3>
            <ul className={styles.ruleList}>
              <li>Reads student session from Next.js secure cookies</li>
              <li>Loads enrolled courses through `/api/securecourse/student/courses`</li>
              <li>Loads lesson detail on demand</li>
              <li>Requests real playback access from the backend</li>
              <li>Sends heartbeat while the student session is active</li>
            </ul>
          </section>

          <section className={styles.infoPanel}>
            <p className={styles.surfaceEyebrow}>Protection checklist</p>
            <h3 className={styles.calloutTitle}>Practical OS-aware measures</h3>
            <ul className={styles.ruleList}>
              {studentApp.protectionChecklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.infoPanel}>
            <p className={styles.surfaceEyebrow}>Reactions</p>
            <h3 className={styles.calloutTitle}>Risk handling in the lesson layer</h3>
            <div className={styles.reactionStack}>
              {studentApp.reactions.map((reaction) => (
                <article className={styles.reactionCard} key={reaction.title}>
                  <strong>{reaction.title}</strong>
                  <p>{reaction.copy}</p>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
