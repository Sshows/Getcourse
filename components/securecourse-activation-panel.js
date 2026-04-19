"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { activateAccess, getSecureCourseSession, logoutAccess } from "@/lib/securecourse-api";
import styles from "@/app/securecourse/securecourse.module.css";

export default function SecureCourseActivationPanel() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activation, setActivation] = useState(null);
  const [session, setSession] = useState({
    authenticated: false,
    user: null,
    userId: "",
    sessionId: ""
  });

  useEffect(() => {
    getSecureCourseSession()
      .then((payload) =>
        setSession({
          authenticated: payload.authenticated,
          user: payload.user || null,
          userId: payload.userId || "",
          sessionId: payload.sessionId || ""
        })
      )
      .catch(() => {
        setSession({
          authenticated: false,
          user: null,
          userId: "",
          sessionId: ""
        });
      });
  }, []);

  async function handleActivate(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const payload = await activateAccess({
        token,
        deviceId: "securecourse-web",
        deviceFingerprint: "securecourse-web",
        deviceLabel: "Web browser",
        userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "browser"
      });

      setActivation(payload);
      setSession({
        authenticated: true,
        user: payload.user,
        userId: payload.user.id,
        sessionId: payload.session.id
      });
      setToken("");
      setNotice("Access activated. Redirecting to the student cabinet.");
      router.push("/securecourse/student");
    } catch (requestError) {
      setError(requestError.message || "Activation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      await logoutAccess();
      setActivation(null);
      setSession({
        authenticated: false,
        user: null,
        userId: "",
        sessionId: ""
      });
      setNotice("The current student session has been closed.");
    } catch (requestError) {
      setError(requestError.message || "Logout failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={styles.surface} id="activation">
      <div className={styles.surfaceHeader}>
        <div>
          <p className={styles.surfaceEyebrow}>Token activation</p>
          <h2 className={styles.surfaceTitle}>Paste the one-time token to open student access.</h2>
        </div>
        <p className={styles.helperText} style={{ maxWidth: "34rem", color: "var(--text-soft)" }}>
          Students do not sign up with email and password. A manager creates the student, enrolls them, issues a
          one-time token, and the token opens exactly one active session.
        </p>
      </div>

      <div className={styles.gridTwo} style={{ padding: "2rem" }}>
        <form className={styles.formStack} onSubmit={handleActivate}>
          <label className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>One-time token</span>
            <input
              className={styles.fieldInput}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Paste the token from the admin panel"
              required
              type="text"
              value={token}
            />
          </label>

          <div className={styles.heroActions}>
            <button className={styles.solidButton} disabled={loading || !token} type="submit">
              {loading ? "Activating..." : "Activate access"}
            </button>
            {session.authenticated ? (
              <button className={styles.outlineButton} onClick={handleLogout} type="button">
                End current session
              </button>
            ) : null}
          </div>

          {error ? <p className={styles.feedbackError}>{error}</p> : null}
          {notice ? <p className={styles.feedbackSuccess}>{notice}</p> : null}

          <p className={styles.helperText}>
            The token becomes `USED` after successful activation. To enter again after logout, the student needs a new
            token from the manager.
          </p>
        </form>

        <div className={styles.callout}>
          <p className={styles.surfaceEyebrow}>Current state</p>
          <h3 className={styles.calloutTitle}>
            {session.authenticated ? "A student session is active" : "No active student session yet"}
          </h3>

          {activation ? (
            <div className={styles.compactList}>
              <span>
                <strong>{activation.user.fullName}</strong>
              </span>
              <span>{activation.user.email}</span>
              <span>Session ID: {activation.session.id}</span>
              <span>Course: {activation.enrollment.course?.title || "Assigned course"}</span>
            </div>
          ) : session.authenticated ? (
            <div className={styles.compactList}>
              <span>{session.user?.fullName || "Student session"}</span>
              <span>User ID: {session.userId}</span>
              <span>Session ID: {session.sessionId}</span>
            </div>
          ) : (
            <p className={styles.helperText}>
              Start in the admin panel: create a student, assign a course, generate a token, and send it to the student.
            </p>
          )}

          <div className={styles.heroActions}>
            <Link className={styles.solidButton} href="/securecourse/student">
              Open student cabinet
            </Link>
            <Link className={styles.outlineButton} href="/securecourse/admin/login">
              Open admin panel
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
