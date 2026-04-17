"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "../../securecourse.module.css";

function LoginForm() {
  const searchParams = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const redirectTo = searchParams.get("redirectTo") || "/securecourse/admin";

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("loading");
    setError("");

    try {
      const endpoint = isLogin ? "/api/admin/login" : "/api/admin/register";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        window.location.href = redirectTo;
      } else {
        setStatus("error");
        const data = await response.json().catch(() => ({}));
        setError(data.error || "Ошибка аутентификации");
      }
    } catch {
      setStatus("error");
      setError("Ошибка соединения");
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <section className={styles.callout} style={{ width: "100%", maxWidth: "420px" }}>
        <p className={styles.surfaceEyebrow}>ВХОД ДЛЯ МЕНЕДЖЕРА</p>
        <h1 className={styles.calloutTitle} style={{ marginBottom: "1.5rem" }}>
          {isLogin ? "Админ-панель" : "Регистрация"}
        </h1>

        <form className={styles.formStack} onSubmit={handleSubmit}>
          <label className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>Email (логин)</span>
            <input
              className={styles.fieldInput}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="manager@example.com"
              required
              type="text"
              value={username}
            />
          </label>

          <label className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>Пароль</span>
            <input
              className={styles.fieldInput}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль..."
              required
              type="password"
              value={password}
            />
          </label>

          {status === "error" && <div className={styles.feedbackError}>{error}</div>}

          <button
            className={styles.solidButton}
            disabled={status === "loading" || !username || !password}
            style={{ width: "100%", justifyContent: "center", marginTop: "0.5rem" }}
            type="submit"
          >
            {status === "loading" ? "Подождите..." : isLogin ? "Войти" : "Зарегистрироваться"}
          </button>
        </form>

        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <button 
            className={styles.ghostButton} 
            onClick={() => { setIsLogin(!isLogin); setStatus("idle"); setError(""); }}
            type="button"
          >
            {isLogin ? "Создать аккаунт администратора" : "Уже есть аккаунт? Войти"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function SecureCourseAdminLogin() {
  return (
    <main className={styles.page}>
      <div className={styles.ambient} aria-hidden="true" />
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
