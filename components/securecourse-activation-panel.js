"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  activateAccess,
  getSecureCourseSession,
  logoutAccess
} from "@/lib/securecourse-api";
import styles from "@/app/securecourse/securecourse.module.css";

export default function SecureCourseActivationPanel() {
  const router = useRouter();
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
          <p className={styles.surfaceEyebrow}>Активация ученического доступа</p>
          <h2 className={styles.surfaceTitle}>Один токен открывает одну активную сессию</h2>
        </div>
        <p className={styles.helperText} style={{ maxWidth: "400px" }}>
          У ученика нет обычной регистрации. Менеджер выдает одноразовый токен, а backend
          превращает его в активную сессию только после успешной проверки.
        </p>
      </div>

      <div style={{ display: "grid", gap: "3rem", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", padding: "2.5rem" }}>
        <form className={styles.formStack} onSubmit={handleActivate}>
          <label className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>Одноразовый токен</span>
            <input
              className={styles.fieldInput}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Вставьте токен из админки"
              required
              type="text"
              value={token}
            />
          </label>

          <div className={styles.calloutActions}>
            <button className={styles.solidButton} disabled={loading} type="submit">
              {loading ? "Активирую..." : "Активировать доступ"}
            </button>
            {session.authenticated ? (
              <button className={styles.outlineButton} onClick={handleLogout} type="button">
                Завершить текущую сессию
              </button>
            ) : null}
          </div>

          {error ? <p className={styles.feedbackError}>{error}</p> : null}

          <p className={styles.helperText}>
            После активации браузер получает только защищенные HTTP-only cookies. Обычный
            student password flow здесь не используется.
          </p>
        </form>

        <div className={styles.callout}>
          <p className={styles.surfaceEyebrow}>Текущее состояние</p>
          <h3 className={styles.calloutTitle}>
            {session.authenticated ? "Сессия ученика активна" : "Сессия еще не открыта"}
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
              Сначала выпустите токен в админке, затем вернитесь сюда и активируйте его.
            </p>
          )}

          <div className={styles.calloutActions}>
            <Link className={styles.solidButton} href="/securecourse/student">
              Открыть кабинет ученика
            </Link>
            <Link className={styles.outlineButton} href="/securecourse/admin">
              Вернуться в админку
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
