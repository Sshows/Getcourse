"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import s from "../../securecourse.module.css";

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
      <section className={s.callout} style={{ width: "100%", maxWidth: "420px" }}>
        <p className={s.surfaceEyebrow}>ВХОД ДЛЯ МЕНЕДЖЕРА</p>
        <h1 className={s.calloutTitle} style={{ marginBottom: "1.5rem" }}>
          {isLogin ? "Админ-панель" : "Регистрация"}
        </h1>

        <form className={s.formStack} onSubmit={handleSubmit}>
          <label className={s.fieldGroup}>
            <span className={s.fieldLabel}>Email (логин)</span>
            <input
              className={s.fieldInput}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="manager@example.com"
              required
              type="text"
              value={username}
            />
          </label>

          <label className={s.fieldGroup}>
            <span className={s.fieldLabel}>Пароль</span>
            <input
              className={s.fieldInput}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль..."
              required
              type="password"
              value={password}
            />
          </label>

          {status === "error" && <div className={s.feedbackError}>{error}</div>}

          <button
            className={s.solidButton}
            disabled={status === "loading" || !username || !password}
            style={{ width: "100%", justifyContent: "center", marginTop: "0.5rem" }}
            type="submit"
          >
            {status === "loading" ? "Подождите..." : isLogin ? "Войти" : "Зарегистрироваться"}
          </button>
        </form>

        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <button 
            className={s.ghostButton} 
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
    <main className={s.page}>
      <div className={s.ambient} aria-hidden="true" />
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
