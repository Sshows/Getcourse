"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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
      setError(requestError.message || "Не удалось выполнить вход.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={styles.callout} style={{ width: "100%", maxWidth: "460px" }}>
      <p className={styles.surfaceEyebrow}>Вход для команды</p>
      <h1 className={styles.calloutTitle} style={{ marginBottom: "1rem" }}>
        Авторизация в админке SecureCourse
      </h1>
      <p className={styles.helperText} style={{ marginBottom: "1.2rem" }}>
        Здесь входят только администратор и менеджер. Ученики не логинятся паролем: им выдается одноразовый токен на
        публичной странице.
      </p>

      <form className={styles.formStack} onSubmit={handleSubmit}>
        <label className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Логин или email</span>
          <input
            className={styles.fieldInput}
            onChange={(event) => setLogin(event.target.value)}
            placeholder="admin"
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
          {loading ? "Входим..." : "Войти в админку"}
        </button>

        <div className={styles.compactList} style={{ marginTop: "1rem" }}>
          <Link className={styles.inlineLinkButton} href="/securecourse">
            На главную
          </Link>
          <Link className={styles.inlineLinkButton} href="/securecourse">
            Открыть публичную страницу
          </Link>
          <Link className={styles.inlineLinkButton} href="/securecourse/student">
            Назад к сайту
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
