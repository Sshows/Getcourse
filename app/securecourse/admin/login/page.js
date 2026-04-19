"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAdmin } from "@/lib/securecourse-api";
import styles from "../../securecourse.module.css";

function LoginForm() {
  const searchParams = useSearchParams();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const redirectTo = searchParams.get("redirectTo") || "/securecourse/admin";

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await loginAdmin({
        login,
        password
      });

      window.location.assign(redirectTo);
    } catch (requestError) {
      setError(requestError.message || "Admin login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={styles.callout} style={{ width: "100%", maxWidth: "440px" }}>
      <p className={styles.surfaceEyebrow}>Админ-доступ</p>
      <h1 className={styles.calloutTitle} style={{ marginBottom: "1rem" }}>
        Вход в панель управления
      </h1>
      <p className={styles.helperText} style={{ marginBottom: "1.2rem" }}>
        Только для сотрудников и кураторов. Студенты заходят по одноразовым токенам на главной странице.
      </p>

      <form className={styles.formStack} onSubmit={handleSubmit}>
        <label className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Логин или Email</span>
          <input
            className={styles.fieldInput}
            onChange={(event) => setLogin(event.target.value)}
            placeholder="manager"
            required
            type="text"
            value={login}
          />
        </label>

        <label className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Пароль</span>
          <input
            className={styles.fieldInput}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Введите пароль"
            required
            type="password"
            value={password}
          />
        </label>

        {error ? <div className={styles.feedbackError}>{error}</div> : null}

        <button
          className={styles.solidButton}
          disabled={loading || !login || !password}
          style={{ width: "100%", justifyContent: "center" }}
          type="submit"
        >
          {loading ? "Авторизация..." : "Войти"}
        </button>
        
        <div style={{ marginTop: "1rem", textAlign: "center" }}>
           <Link href="/securecourse" className={styles.inlineLinkButton}>
             Вернуться на главную страницу (для студентов)
           </Link>
        </div>
      </form>
    </section>
  );
}

export default function SecureCourseAdminLoginPage() {
  return (
    <main className={styles.page}>
      <div className={styles.ambient} aria-hidden="true" />
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          width: "min(100% - 2rem, 78rem)",
          margin: "0 auto"
        }}
      >
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
