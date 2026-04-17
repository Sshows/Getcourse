"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  activateAccess,
  getSecureCourseSession,
  logoutAccess
} from "@/lib/securecourse-api";
import styles from "@/app/securecourse/securecourse.module.css";

export default function SecureCourseActivationPanel() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activation, setActivation] = useState(null);
  const [session, setSession] = useState({
    authenticated: false
  });

  useEffect(() => {
    getSecureCourseSession()
      .then((payload) => setSession(payload))
      .catch(() => {
        setSession({ authenticated: false });
      });
  }, []);

  async function handleActivate(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = await activateAccess({
        token,
        deviceId: "securecourse-web-preview",
        deviceFingerprint: "securecourse-web-preview",
        deviceLabel: "SecureCourse Web Activation",
        userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "browser"
      });

      setActivation(payload);
      setSession({
        authenticated: true,
        userId: payload.user.id,
        sessionId: payload.session.id
      });
      setToken("");
    } catch (requestError) {
      setError(requestError.message || "Activation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoading(true);
    setError("");

    try {
      await logoutAccess();
      setActivation(null);
      setSession({ authenticated: false });
    } catch (requestError) {
      setError(requestError.message || "Logout failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={styles.surface} id="activate" data-reveal>
      <div className={styles.surfaceHeader}>
        <div>
          <p className={styles.surfaceEyebrow}>Token activation</p>
          <h2 className={styles.surfaceTitle}>Turn a one-time token into one active session</h2>
        </div>
        <p className={styles.surfaceMeta}>
          This form talks to Next.js BFF routes, not directly to NestJS.
        </p>
      </div>

      <div className={styles.activationGrid}>
        <form className={styles.formStack} onSubmit={handleActivate}>
          <label className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>One-time token</span>
            <input
              className={styles.fieldInput}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Paste token from admin panel"
              required
              type="text"
              value={token}
            />
          </label>

          <div className={styles.calloutActions}>
            <button className={styles.solidButton} disabled={loading} type="submit">
              {loading ? "Activating..." : "Activate access"}
            </button>
            {session.authenticated ? (
              <button className={styles.outlineButton} onClick={handleLogout} type="button">
                Logout current session
              </button>
            ) : null}
          </div>

          {error ? <p className={styles.feedbackError}>{error}</p> : null}

          <p className={styles.helperText}>
            After successful activation the Next.js auth route stores `userId` and `sessionId`
            in secure HTTP-only cookies. Student pages then use those cookies to proxy protected
            requests into NestJS.
          </p>
        </form>

        <div className={styles.callout}>
          <p className={styles.surfaceEyebrow}>Current state</p>
          <h3 className={styles.calloutTitle}>
            {session.authenticated ? "Session is active" : "No student session yet"}
          </h3>

          {activation ? (
            <div className={styles.compactList}>
              <span>
                <strong>{activation.user.fullName}</strong>
              </span>
              <span>{activation.user.email}</span>
              <span>Session ID: {activation.session.id}</span>
            </div>
          ) : session.authenticated ? (
            <div className={styles.compactList}>
              <span>User ID: {session.userId}</span>
              <span>Session ID: {session.sessionId}</span>
            </div>
          ) : (
            <p className={styles.helperText}>
              Issue a token from the admin panel first, then come back here to activate it.
            </p>
          )}

          <div className={styles.calloutActions}>
            <Link className={styles.solidButton} href="/securecourse/mobile">
              Open student app
            </Link>
            <Link className={styles.outlineButton} href="/securecourse/admin">
              Return to admin
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
