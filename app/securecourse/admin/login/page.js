"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AdminLoginPage() {
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
        setError(payload.error || "Login failed");
        return;
      }

      router.push(redirectTo);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: "400px",
        margin: "100px auto",
        padding: "2rem",
        border: "1px solid #ccc"
      }}
    >
      <h1>SecureCourse Admin Login</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Username:</label>
          <input
            onChange={(event) => setUsername(event.target.value)}
            required
            style={{ width: "100%", marginBottom: "1rem", padding: "0.5rem" }}
            type="text"
            value={username}
          />
        </div>
        <div>
          <label>Password:</label>
          <input
            onChange={(event) => setPassword(event.target.value)}
            required
            style={{ width: "100%", marginBottom: "1rem", padding: "0.5rem" }}
            type="password"
            value={password}
          />
        </div>
        {error ? <p style={{ color: "red" }}>{error}</p> : null}
        <button disabled={loading} style={{ width: "100%" }} type="submit">
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
      <p style={{ marginTop: "1rem", fontSize: "0.875rem", opacity: 0.7 }}>
        Default: manager / secretpass (set ADMIN_USERNAME/PASSWORD in .env.local)
      </p>
    </div>
  );
}
