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
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || "Invalid credentials");
        return;
      }

      router.push(redirectTo);
    } catch {
      setError("Network error — check your connection");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.ambient} aria-hidden="true" />
      <div className={styles.shell}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "80vh",
            gap: "2rem"
          }}
        >
          <div className={styles.brand} style={{ textDecoration: "none" }}>
            <span className={styles.brandMark}>SC</span>
            <span>
              <strong>SecureCourse</strong>
              <small>Admin access</small>
            </span>
          </div>

          <section
            className={styles.callout}
            style={{ width: "100%", maxWidth: "420px" }}
          >
            <p className={styles.surfaceEyebrow}>Authentication required</p>
            <h1 className={styles.calloutTitle} style={{ fontSize: "1.5rem" }}>
              Admin login
            </h1>

            <form className={styles.formStack} onSubmit={handleSubmit}>
              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Username</span>
                <input
                  autoComplete="username"
                  className={styles.fieldInput}
                  disabled={loading}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="manager"
                  required
                  type="text"
                  value={username}
                />
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Password</span>
                <input
                  autoComplete="current-password"
                  className={styles.fieldInput}
                  disabled={loading}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  type="password"
                  value={password}
                />
              </label>

              {error ? (
                <div className={styles.feedbackError}>{error}</div>
              ) : null}

              <button
                className={styles.solidButton}
                disabled={loading}
                style={{ width: "100%", justifyContent: "center" }}
                type="submit"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <p className={styles.helperText} style={{ marginTop: "1rem" }}>
              Set <code>ADMIN_USERNAME</code> and <code>ADMIN_PASSWORD</code> in{" "}
              <code>.env.local</code> to override defaults.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}
