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
      <p className={styles.surfaceEyebrow}>Admin Auth</p>
      <h1 className={styles.calloutTitle} style={{ marginBottom: "1rem" }}>
        Sign in to SecureCourse admin
      </h1>
      <p className={styles.helperText} style={{ marginBottom: "1.2rem" }}>
        This page is only for `ADMIN` and `MANAGER` users. Students never register or sign in with a password.
      </p>

      <form className={styles.formStack} onSubmit={handleSubmit}>
        <label className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Admin email or username</span>
          <input
            className={styles.fieldInput}
            onChange={(event) => setLogin(event.target.value)}
            placeholder="admin or admin@securecourse.local"
            required
            type="text"
            value={login}
          />
        </label>

        <label className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Password</span>
          <input
            className={styles.fieldInput}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter admin password"
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
          {loading ? "Signing in..." : "Open admin panel"}
        </button>
      </form>

      <ul className={styles.ruleList} style={{ marginTop: "1.25rem" }}>
        <li>Bootstrap admin credentials live in the backend env.</li>
        <li>Set `ADMIN_USERNAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` for local runtime or Render.</li>
        <li>Set `SECURECOURSE_API_URL` in the frontend env so Vercel can reach the public NestJS backend.</li>
        <li>The browser stores only an HTTP-only admin session cookie.</li>
      </ul>
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
