"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  createCourse,
  createEnrollment,
  createUser,
  getDashboardSnapshot,
  issueToken,
  logoutAdmin,
  revokeSession,
  revokeToken
} from "@/lib/securecourse-api";
import styles from "../../securecourse.module.css";

function toneClass(tone) {
  if (tone === "green") return styles.toneGreen;
  if (tone === "blue") return styles.toneBlue;
  if (tone === "red") return styles.toneRed;
  return styles.toneGold;
}

function badgeClass(value) {
  const normalized = String(value || "").toLowerCase();

  if (normalized.includes("active") || normalized.includes("ready") || normalized.includes("published")) {
    return styles.badgeGreen;
  }

  if (normalized.includes("used") || normalized.includes("processing") || normalized.includes("waiting")) {
    return styles.badgeBlue;
  }

  if (normalized.includes("revoked") || normalized.includes("blocked") || normalized.includes("error")) {
    return styles.badgeRed;
  }

  return styles.badgeGold;
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function SecureCourseAdminPage() {
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copiedToken, setCopiedToken] = useState("");
  const [lastIssuedToken, setLastIssuedToken] = useState(null);
  const [data, setData] = useState({
    metrics: {
      activeSessions: 0,
      issuedTokensToday: 0,
      readyVideoAssets: 0,
      totalUsers: 0
    },
    users: [],
    courses: [],
    tokens: [],
    sessions: [],
    uploads: [],
    logs: []
  });
  const [forms, setForms] = useState({
    createUser: {
      fullName: "",
      email: ""
    },
    createCourse: {
      title: "",
      slug: "",
      shortDescription: ""
    },
    enrollment: {
      userId: "",
      courseId: ""
    },
    token: {
      enrollmentId: ""
    }
  });

  async function loadAdminData() {
    setLoading(true);
    setError("");

    try {
      const snapshot = await getDashboardSnapshot();
      setData(snapshot);
    } catch (requestError) {
      if (requestError.status === 401) {
        window.location.assign("/securecourse/admin/login?redirectTo=/securecourse/admin");
        return;
      }

      setError(requestError.message || "Failed to load admin dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData();
  }, []);

  const activeEnrollments = useMemo(
    () =>
      data.users.flatMap((user) =>
        (user.enrollments || [])
          .filter((enrollment) => enrollment.status === "ACTIVE")
          .map((enrollment) => ({
            ...enrollment,
            user
          }))
      ),
    [data.users]
  );

  useEffect(() => {
    if (!forms.enrollment.userId && data.users[0]?.id) {
      updateForm("enrollment", "userId", data.users[0].id);
    }

    if (!forms.enrollment.courseId && data.courses[0]?.id) {
      updateForm("enrollment", "courseId", data.courses[0].id);
    }

    if (!forms.token.enrollmentId && activeEnrollments[0]?.id) {
      updateForm("token", "enrollmentId", activeEnrollments[0].id);
    }
  }, [
    activeEnrollments,
    data.courses,
    data.users,
    forms.enrollment.courseId,
    forms.enrollment.userId,
    forms.token.enrollmentId
  ]);

  function updateForm(section, field, value) {
    setForms((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value
      }
    }));
  }

  async function handleCreateUser(event) {
    event.preventDefault();
    setBusyAction("create-user");
    setError("");
    setNotice("");

    try {
      await createUser({
        email: forms.createUser.email,
        fullName: forms.createUser.fullName,
        role: "STUDENT",
        status: "ACTIVE"
      });

      setForms((current) => ({
        ...current,
        createUser: {
          fullName: "",
          email: ""
        }
      }));
      setNotice("Student created. Next step: enroll the student into a course.");
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.message || "Failed to create student.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleCreateCourse(event) {
    event.preventDefault();
    setBusyAction("create-course");
    setError("");
    setNotice("");

    try {
      const slug = forms.createCourse.slug || slugify(forms.createCourse.title);
      await createCourse({
        title: forms.createCourse.title,
        slug,
        shortDescription: forms.createCourse.shortDescription,
        description: forms.createCourse.shortDescription,
        status: "PUBLISHED"
      });

      setForms((current) => ({
        ...current,
        createCourse: {
          title: "",
          slug: "",
          shortDescription: ""
        }
      }));
      setNotice("Course created and published.");
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.message || "Failed to create course.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleCreateEnrollment(event) {
    event.preventDefault();
    setBusyAction("create-enrollment");
    setError("");
    setNotice("");

    try {
      await createEnrollment({
        userId: forms.enrollment.userId,
        courseId: forms.enrollment.courseId,
        note: "Assigned by manager from admin panel"
      });

      setNotice("Enrollment created. The student can now receive a one-time token.");
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.message || "Failed to create enrollment.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleIssueToken(event) {
    event.preventDefault();
    setBusyAction("issue-token");
    setError("");
    setNotice("");

    try {
      const enrollment = activeEnrollments.find((item) => item.id === forms.token.enrollmentId);

      if (!enrollment) {
        throw new Error("Choose an active enrollment first.");
      }

      const issued = await issueToken({
        userId: enrollment.userId,
        enrollmentId: enrollment.id,
        activationExpiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
        note: "Issued from SecureCourse admin panel"
      });

      setLastIssuedToken({
        id: issued.id,
        token: issued.token,
        userEmail: enrollment.user.email,
        courseTitle: enrollment.course.title,
        expiresAt: issued.activationExpiresAt
      });
      setCopiedToken("");
      setNotice("One-time token issued. Give it to the student and they can activate access on the public page.");
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.message || "Failed to issue token.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleCopyToken(rawToken) {
    try {
      await navigator.clipboard.writeText(rawToken);
      setCopiedToken(rawToken);
      setNotice("Token copied. Students use this token on the public activation page.");
    } catch {
      setError("Copy failed. Please copy the token manually.");
    }
  }

  async function handleRevokeToken(tokenId) {
    setBusyAction(`revoke-token-${tokenId}`);
    setError("");
    setNotice("");

    try {
      await revokeToken(tokenId, "revoked_by_manager");
      setNotice("Token revoked.");
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.message || "Failed to revoke token.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleRevokeSession(sessionId) {
    setBusyAction(`revoke-session-${sessionId}`);
    setError("");
    setNotice("");

    try {
      await revokeSession(sessionId, "revoked_by_manager");
      setNotice("Student session revoked.");
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.message || "Failed to revoke session.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleAdminLogout() {
    setBusyAction("logout-admin");
    setError("");
    setNotice("");

    try {
      await logoutAdmin();
      window.location.assign("/securecourse/admin/login");
    } catch (requestError) {
      setError(requestError.message || "Failed to log out.");
    } finally {
      setBusyAction("");
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.ambient} aria-hidden="true" />
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.surfaceEyebrow}>SecureCourse Admin</p>
          <h1 className={styles.heroTitle}>Control center for one-time access, sessions, and protected lessons.</h1>
          <p className={styles.heroDescription}>
            This Railway deployment runs the public website, admin panel, and secure token flows in one service.
          </p>
          <div className={styles.inlineActions}>
            <button className={styles.solidButton} onClick={loadAdminData} type="button">
              Refresh data
            </button>
            <button
              className={styles.ghostButton}
              disabled={busyAction === "logout-admin"}
              onClick={handleAdminLogout}
              type="button"
            >
              {busyAction === "logout-admin" ? "Signing out..." : "Logout"}
            </button>
            <Link className={styles.inlineLink} href="/securecourse">
              Open public page
            </Link>
          </div>
        </div>
        <div className={styles.metricGrid}>
          <article className={`${styles.metricCard} ${toneClass("green")}`}>
            <span className={styles.metricLabel}>Students</span>
            <strong className={styles.metricValue}>{data.metrics.totalUsers}</strong>
            <span className={styles.metricMeta}>{data.metrics.activeUsers || 0} active</span>
          </article>
          <article className={`${styles.metricCard} ${toneClass("blue")}`}>
            <span className={styles.metricLabel}>Active Sessions</span>
            <strong className={styles.metricValue}>{data.metrics.activeSessions}</strong>
            <span className={styles.metricMeta}>single-device policy enforced</span>
          </article>
          <article className={`${styles.metricCard} ${toneClass("gold")}`}>
            <span className={styles.metricLabel}>Issued Today</span>
            <strong className={styles.metricValue}>{data.metrics.issuedTokensToday}</strong>
            <span className={styles.metricMeta}>one-time tokens</span>
          </article>
          <article className={`${styles.metricCard} ${toneClass("red")}`}>
            <span className={styles.metricLabel}>Ready Videos</span>
            <strong className={styles.metricValue}>{data.metrics.readyVideoAssets}</strong>
            <span className={styles.metricMeta}>protected playback assets</span>
          </article>
        </div>
      </section>

      {error ? <div className={styles.feedbackError}>{error}</div> : null}
      {notice ? <div className={styles.feedbackSuccess}>{notice}</div> : null}

      <section className={styles.dashboardGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.surfaceEyebrow}>Create student</p>
              <h2 className={styles.panelTitle}>Student provisioning</h2>
            </div>
          </div>
          <form className={styles.formStack} onSubmit={handleCreateUser}>
            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Full name</span>
              <input
                className={styles.fieldInput}
                onChange={(event) => updateForm("createUser", "fullName", event.target.value)}
                placeholder="Aruzhan Sarsen"
                required
                value={forms.createUser.fullName}
              />
            </label>
            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Email</span>
              <input
                className={styles.fieldInput}
                onChange={(event) => updateForm("createUser", "email", event.target.value)}
                placeholder="student@example.com"
                required
                type="email"
                value={forms.createUser.email}
              />
            </label>
            <button className={styles.solidButton} disabled={busyAction === "create-user"} type="submit">
              {busyAction === "create-user" ? "Creating..." : "Create student"}
            </button>
          </form>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.surfaceEyebrow}>Create course</p>
              <h2 className={styles.panelTitle}>Course publishing</h2>
            </div>
          </div>
          <form className={styles.formStack} onSubmit={handleCreateCourse}>
            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Title</span>
              <input
                className={styles.fieldInput}
                onChange={(event) => updateForm("createCourse", "title", event.target.value)}
                placeholder="Secure Python Cohort"
                required
                value={forms.createCourse.title}
              />
            </label>
            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Slug</span>
              <input
                className={styles.fieldInput}
                onChange={(event) => updateForm("createCourse", "slug", event.target.value)}
                placeholder="secure-python-cohort"
                value={forms.createCourse.slug}
              />
            </label>
            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Short description</span>
              <textarea
                className={styles.fieldTextarea}
                onChange={(event) => updateForm("createCourse", "shortDescription", event.target.value)}
                placeholder="One-line summary for the student dashboard."
                required
                rows={3}
                value={forms.createCourse.shortDescription}
              />
            </label>
            <button className={styles.solidButton} disabled={busyAction === "create-course"} type="submit">
              {busyAction === "create-course" ? "Publishing..." : "Create course"}
            </button>
          </form>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.surfaceEyebrow}>Assign access</p>
              <h2 className={styles.panelTitle}>Enrollments</h2>
            </div>
          </div>
          <form className={styles.formStack} onSubmit={handleCreateEnrollment}>
            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Student</span>
              <select
                className={styles.fieldSelect}
                onChange={(event) => updateForm("enrollment", "userId", event.target.value)}
                required
                value={forms.enrollment.userId}
              >
                <option value="">Select student</option>
                {data.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName} ({user.email})
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Course</span>
              <select
                className={styles.fieldSelect}
                onChange={(event) => updateForm("enrollment", "courseId", event.target.value)}
                required
                value={forms.enrollment.courseId}
              >
                <option value="">Select course</option>
                {data.courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </label>
            <button className={styles.solidButton} disabled={busyAction === "create-enrollment"} type="submit">
              {busyAction === "create-enrollment" ? "Assigning..." : "Create enrollment"}
            </button>
          </form>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.surfaceEyebrow}>Issue token</p>
              <h2 className={styles.panelTitle}>One-time access</h2>
            </div>
          </div>
          <form className={styles.formStack} onSubmit={handleIssueToken}>
            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Active enrollment</span>
              <select
                className={styles.fieldSelect}
                onChange={(event) => updateForm("token", "enrollmentId", event.target.value)}
                required
                value={forms.token.enrollmentId}
              >
                <option value="">Select enrollment</option>
                {activeEnrollments.map((enrollment) => (
                  <option key={enrollment.id} value={enrollment.id}>
                    {enrollment.user.fullName} {"->"} {enrollment.course.title}
                  </option>
                ))}
              </select>
            </label>
            <button className={styles.solidButton} disabled={busyAction === "issue-token"} type="submit">
              {busyAction === "issue-token" ? "Issuing..." : "Generate token"}
            </button>
          </form>

          {lastIssuedToken ? (
            <div className={styles.tokenReveal}>
              <p className={styles.tokenRevealLabel}>Last raw token</p>
              <code className={styles.tokenRevealValue}>{lastIssuedToken.token}</code>
              <p className={styles.tokenRevealMeta}>
                {lastIssuedToken.userEmail} · {lastIssuedToken.courseTitle} · expires{" "}
                {formatDateTime(lastIssuedToken.expiresAt)}
              </p>
              <button className={styles.ghostButton} onClick={() => handleCopyToken(lastIssuedToken.token)} type="button">
                {copiedToken === lastIssuedToken.token ? "Copied" : "Copy token"}
              </button>
            </div>
          ) : null}
        </article>
      </section>

      <section className={styles.dashboardGrid}>
        <article className={styles.panelWide}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.surfaceEyebrow}>Users</p>
              <h2 className={styles.panelTitle}>Students</h2>
            </div>
          </div>
          {loading ? (
            <p className={styles.helperText}>Loading dashboard data...</p>
          ) : (
            <div className={styles.dataTable}>
              <div className={styles.dataTableHead}>
                <span>Name</span>
                <span>Status</span>
                <span>Courses</span>
              </div>
              {data.users.map((user) => (
                <div className={styles.dataTableRow} key={user.id}>
                  <span>
                    <strong>{user.fullName}</strong>
                    <small>{user.email}</small>
                  </span>
                  <span className={`${styles.statusBadge} ${badgeClass(user.status)}`}>{user.status}</span>
                  <span>{user.enrollments?.length || 0}</span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className={styles.panelWide}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.surfaceEyebrow}>Courses</p>
              <h2 className={styles.panelTitle}>Published courses</h2>
            </div>
          </div>
          {loading ? (
            <p className={styles.helperText}>Loading courses...</p>
          ) : (
            <div className={styles.dataTable}>
              <div className={styles.dataTableHead}>
                <span>Course</span>
                <span>Status</span>
                <span>Lessons</span>
              </div>
              {data.courses.map((course) => (
                <div className={styles.dataTableRow} key={course.id}>
                  <span>
                    <strong>{course.title}</strong>
                    <small>{course.slug}</small>
                  </span>
                  <span className={`${styles.statusBadge} ${badgeClass(course.status)}`}>{course.status}</span>
                  <span>{course.lessons?.length || 0}</span>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className={styles.dashboardGrid}>
        <article className={styles.panelWide}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.surfaceEyebrow}>Tokens</p>
              <h2 className={styles.panelTitle}>Access control</h2>
            </div>
          </div>
          {loading ? (
            <p className={styles.helperText}>Loading tokens...</p>
          ) : (
            <div className={styles.dataTable}>
              <div className={styles.dataTableHead}>
                <span>Student</span>
                <span>Status</span>
                <span>Expiry</span>
                <span>Actions</span>
              </div>
              {data.tokens.map((token) => (
                <div className={styles.dataTableRow} key={token.id}>
                  <span>
                    <strong>{token.user?.email || "Unknown"}</strong>
                    <small>{token.enrollment?.course?.title || "No course"}</small>
                  </span>
                  <span className={`${styles.statusBadge} ${badgeClass(token.status)}`}>{token.status}</span>
                  <span>{formatDateTime(token.activationExpiresAt)}</span>
                  <span>
                    {token.status === "ISSUED" ? (
                      <button
                        className={styles.inlineLinkButton}
                        disabled={busyAction === `revoke-token-${token.id}`}
                        onClick={() => handleRevokeToken(token.id)}
                        type="button"
                      >
                        Revoke
                      </button>
                    ) : (
                      <span className={styles.helperText}>No action</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className={styles.panelWide}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.surfaceEyebrow}>Sessions</p>
              <h2 className={styles.panelTitle}>Active student sessions</h2>
            </div>
          </div>
          {loading ? (
            <p className={styles.helperText}>Loading sessions...</p>
          ) : (
            <div className={styles.dataTable}>
              <div className={styles.dataTableHead}>
                <span>Student</span>
                <span>Status</span>
                <span>Last seen</span>
                <span>Actions</span>
              </div>
              {data.sessions.map((session) => (
                <div className={styles.dataTableRow} key={session.id}>
                  <span>
                    <strong>{session.user?.email || "Unknown"}</strong>
                    <small>{session.deviceLabel || "Browser session"}</small>
                  </span>
                  <span className={`${styles.statusBadge} ${badgeClass(session.status)}`}>{session.status}</span>
                  <span>{formatDateTime(session.lastSeenAt)}</span>
                  <span>
                    {session.status === "ACTIVE" ? (
                      <button
                        className={styles.inlineLinkButton}
                        disabled={busyAction === `revoke-session-${session.id}`}
                        onClick={() => handleRevokeSession(session.id)}
                        type="button"
                      >
                        Revoke
                      </button>
                    ) : (
                      <span className={styles.helperText}>No action</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className={styles.dashboardGrid}>
        <article className={styles.panelWide}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.surfaceEyebrow}>Video pipeline</p>
              <h2 className={styles.panelTitle}>Protected assets</h2>
            </div>
          </div>
          {loading ? (
            <p className={styles.helperText}>Loading uploads...</p>
          ) : (
            <div className={styles.dataTable}>
              <div className={styles.dataTableHead}>
                <span>Lesson</span>
                <span>Status</span>
                <span>Provider</span>
              </div>
              {data.uploads.map((asset) => (
                <div className={styles.dataTableRow} key={asset.id}>
                  <span>
                    <strong>{asset.lessonTitle || "Lesson video"}</strong>
                    <small>{asset.playbackId || asset.assetId || "pending asset"}</small>
                  </span>
                  <span className={`${styles.statusBadge} ${badgeClass(asset.status)}`}>{asset.status}</span>
                  <span>{asset.provider}</span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className={styles.panelWide}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.surfaceEyebrow}>Audit</p>
              <h2 className={styles.panelTitle}>Recent events</h2>
            </div>
          </div>
          {loading ? (
            <p className={styles.helperText}>Loading logs...</p>
          ) : (
            <div className={styles.dataTable}>
              <div className={styles.dataTableHead}>
                <span>Event</span>
                <span>Actor</span>
                <span>When</span>
              </div>
              {data.logs.map((log) => (
                <div className={styles.dataTableRow} key={log.id}>
                  <span>
                    <strong>{log.eventType}</strong>
                    <small>{log.entityType || "system"}</small>
                  </span>
                  <span>{log.actorType}</span>
                  <span>{formatDateTime(log.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
