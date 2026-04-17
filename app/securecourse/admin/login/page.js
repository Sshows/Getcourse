"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "../../securecourse.module.css";

function AdminLoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/securecourse/admin";

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include"
      });

      if (response.ok) {
        window.location.href = redirectTo;
      } else {
        setStatus("error");
        setError("Неверный логин или пароль");
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
        <h1 className={s.calloutTitle} style={{ marginBottom: "1.5rem" }}>Админ-панель</h1>

        <form className={s.formStack} onSubmit={handleLogin}>
          <label className={s.fieldGroup}>
            <span className={s.fieldLabel}>Логин (ADMIN_USERNAME)</span>
            <input
              className={s.fieldInput}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="manager"
              required
              type="text"
              value={username}
            />
          </label>

          <label className={s.fieldGroup}>
            <span className={s.fieldLabel}>Пароль (ADMIN_PASSWORD)</span>
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
            {status === "loading" ? "Вход..." : "Войти"}
          </button>
        </form>

        <div className={s.helperText} style={{ marginTop: "1.5rem", padding: "1rem", borderRadius: "1rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          Данные для входа задаются в файле <strong>.env.local</strong>:<br />
          <code style={{ display: "block", marginTop: "0.5rem", color: "var(--teal)" }}>
            ADMIN_USERNAME=manager<br/>
            ADMIN_PASSWORD=secretpass
          </code>
          На Vercel укажите их в разделе Environment Variables. Пароль не хранится в открытом виде.
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
