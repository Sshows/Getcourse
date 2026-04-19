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
      setNotice("Токен активирован. Открываем кабинет ученика.");
      router.push("/securecourse/student");
    } catch (requestError) {
      setError(requestError.message || "Не удалось активировать токен.");
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
      setNotice("Текущая сессия ученика завершена.");
    } catch (requestError) {
      setError(requestError.message || "Не удалось завершить сессию.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={styles.surface} id="activation">
      <div className={styles.surfaceHeader}>
        <div>
          <p className={styles.surfaceEyebrow}>Активация доступа</p>
          <h2 className={styles.surfaceTitle}>Введите одноразовый токен, чтобы открыть кабинет ученика.</h2>
        </div>
        <p className={styles.helperText} style={{ maxWidth: "34rem", color: "var(--text-soft)" }}>
          Ученики не создают аккаунт сами. Менеджер создает ученика, назначает курс, выдает токен и отправляет его в
          WhatsApp, Telegram или email.
        </p>
      </div>

      <div className={styles.gridTwo} style={{ padding: "2rem" }}>
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

          <div className={styles.heroActions}>
            <button className={styles.solidButton} disabled={loading || !token} type="submit">
              {loading ? "Активируем..." : "Активировать доступ"}
            </button>
            {session.authenticated ? (
              <button className={styles.outlineButton} onClick={handleLogout} type="button">
                Завершить текущую сессию
              </button>
            ) : null}
          </div>

          {error ? <p className={styles.feedbackError}>{error}</p> : null}
          {notice ? <p className={styles.feedbackSuccess}>{notice}</p> : null}

          <p className={styles.helperText}>
            После успешной активации токен становится `USED`. Для повторного входа после logout нужен новый токен от
            менеджера.
          </p>
        </form>

        <div className={styles.callout}>
          <p className={styles.surfaceEyebrow}>Текущее состояние</p>
          <h3 className={styles.calloutTitle}>
            {session.authenticated ? "Сессия ученика уже активна" : "Пока нет активной ученической сессии"}
          </h3>

          {activation ? (
            <div className={styles.compactList}>
              <span>
                <strong>{activation.user.fullName}</strong>
              </span>
              <span>{activation.user.email}</span>
              <span>Session ID: {activation.session.id}</span>
              <span>Курс: {activation.enrollment.course?.title || "Назначенный курс"}</span>
            </div>
          ) : session.authenticated ? (
            <div className={styles.compactList}>
              <span>{session.user?.fullName || "Активная сессия"}</span>
              <span>User ID: {session.userId}</span>
              <span>Session ID: {session.sessionId}</span>
            </div>
          ) : (
            <p className={styles.helperText}>
              Начните с админки: создайте ученика, назначьте курс, выпустите токен и отправьте его ученику.
            </p>
          )}

          <div className={styles.heroActions}>
            <Link className={styles.solidButton} href="/securecourse/student">
              Открыть кабинет ученика
            </Link>
            <Link className={styles.outlineButton} href="/securecourse/admin/login">
              Открыть админку
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
