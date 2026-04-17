"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  createCourse,
  createEnrollment,
  createUser,
  getDashboardSnapshot,
  issueToken,
  revokeSession
} from "@/lib/securecourse-api";
import { securecourseContent } from "@/lib/securecourse-content";
import styles from "../securecourse.module.css";

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

  if (
    normalized.includes("used") ||
    normalized.includes("processing") ||
    normalized.includes("expiring") ||
    normalized.includes("waiting")
  ) {
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
  const { brand, admin } = securecourseContent;
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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
      setError(requestError.message || "Failed to load SecureCourse admin data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData();
  }, []);

  const activeEnrollments = data.users.flatMap((user) =>
    (user.enrollments || [])
      .filter((enrollment) => enrollment.status === "ACTIVE")
      .map((enrollment) => ({
        ...enrollment,
        user
      }))
  );

  useEffect(() => {
    if (!forms.enrollment.userId && data.users[0]?.id) {
      setForms((current) => ({
        ...current,
        enrollment: {
          ...current.enrollment,
          userId: data.users[0].id
        }
      }));
    }

    if (!forms.enrollment.courseId && data.courses[0]?.id) {
      setForms((current) => ({
        ...current,
        enrollment: {
          ...current.enrollment,
          courseId: data.courses[0].id
        }
      }));
    }

    if (!forms.token.enrollmentId && activeEnrollments[0]?.id) {
      setForms((current) => ({
        ...current,
        token: {
          enrollmentId: activeEnrollments[0].id
        }
      }));
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
      setNotice("Student created. You can enroll them into a course now.");
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
        note: "Assigned from SecureCourse admin UI"
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
        note: "Issued from SecureCourse admin UI"
      });

      setLastIssuedToken({
        token: issued.token,
        userEmail: enrollment.user.email,
        courseTitle: enrollment.course.title,
        expiresAt: issued.activationExpiresAt
      });
      setNotice("One-time token issued. Use it on the public activation form.");
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.message || "Failed to issue token.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleRevokeSession(sessionId) {
    setBusyAction(`revoke-${sessionId}`);
    setError("");
    setNotice("");

    try {
      await revokeSession(sessionId, "revoked_from_securecourse_admin_ui");
      setNotice("Session revoked.");
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.message || "Failed to revoke session.");
    } finally {
      setBusyAction("");
    }
  }

  const usersById = Object.fromEntries(data.users.map((user) => [user.id, user]));

  if (loading) {
    return <main className={styles.page}>Loading SecureCourse live admin...</main>;
  }

  return (
    <main className={`${styles.page} ${styles.workspacePage}`}>
      <div className={styles.workspaceShell}>
        <aside className={styles.sidebar}>
          <Link className={styles.brand} href="/securecourse">
            <span className={styles.brandMark}>SC</span>
            <span>
              <strong>{brand.name}</strong>
              <small>Admin via Next BFF</small>
            </span>
          </Link>

          <div className={styles.sidebarSection}>
            <p className={styles.sidebarLabel}>Navigation</p>
            {admin.nav.map((item, index) => (
              <div
                className={`${styles.sidebarLink} ${index === 0 ? styles.sidebarLinkActive : ""}`}
                key={item}
              >
                <span>{item}</span>
                {index === 0 ? <span className={styles.sidebarDot} aria-hidden="true" /> : null}
              </div>
            ))}
          </div>

          <div className={styles.sidebarSection}>
            <p className={styles.sidebarLabel}>Security rules</p>
            <ul className={styles.sidebarList}>
              {admin.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>

          <div className={styles.sidebarUser}>
            <strong>securecourse-admin-ui</strong>
            <span>Next.js BFF to NestJS API</span>
          </div>
        </aside>

        <div className={styles.adminMain}>
          <header className={styles.workspaceTopbar} data-reveal>
            <div>
              <p className={styles.sectionKicker}>Web admin / live</p>
              <h1 className={styles.workspaceTitle}>Users, courses, tokens, sessions, and logs</h1>
              <p className={styles.workspaceText}>
                This page now talks to Next.js route handlers under <code>/api/securecourse</code>,
                and those handlers proxy into the live NestJS backend.
              </p>
            </div>

            <div className={styles.workspaceActions}>
              <button className={styles.outlineButton} onClick={loadAdminData} type="button">
                Refresh live data
              </button>
              <Link className={styles.solidButton} href="/securecourse">
                Open activation page
              </Link>
            </div>
          </header>

          {error ? <div className={styles.feedbackError}>{error}</div> : null}
          {notice ? <div className={styles.feedbackSuccess}>{notice}</div> : null}

          {lastIssuedToken ? (
            <section className={styles.feedbackCard} data-reveal>
              <p className={styles.surfaceEyebrow}>Latest one-time token</p>
              <h2 className={styles.surfaceTitle}>Use this on the public SecureCourse page</h2>
              <div className={styles.tokenCard}>
                <span className={styles.tokenLabel}>Raw token</span>
                <code>{lastIssuedToken.token}</code>
              </div>
              <p className={styles.helperText}>
                Student: <strong>{lastIssuedToken.userEmail}</strong> | Course:{" "}
                <strong>{lastIssuedToken.courseTitle}</strong>
              </p>
              <div className={styles.calloutActions}>
                <Link className={styles.solidButton} href="/securecourse#activate">
                  Activate on public site
                </Link>
                <span className={styles.helperText}>
                  Expires at {formatDateTime(lastIssuedToken.expiresAt)}
                </span>
              </div>
            </section>
          ) : null}

          <section className={styles.metricGrid}>
            {[
              {
                label: "Active sessions",
                value: String(data.metrics.activeSessions),
                tone: "green"
              },
              {
                label: "Issued tokens today",
                value: String(data.metrics.issuedTokensToday),
                tone: "blue"
              },
              {
                label: "Ready video assets",
                value: String(data.metrics.readyVideoAssets),
                tone: "gold"
              },
              {
                label: "Total users",
                value: String(data.metrics.totalUsers),
                tone: "gold"
              }
            ].map((metric) => (
              <article className={styles.statCard} key={metric.label} data-reveal>
                <span className={styles.statLabel}>{metric.label}</span>
                <strong className={`${styles.statValue} ${toneClass(metric.tone)}`}>{metric.value}</strong>
              </article>
            ))}
          </section>

          <div className={styles.adminColumns}>
            <div className={styles.workspaceBody}>
              <section className={styles.surface} data-reveal>
                <div className={styles.surfaceHeader}>
                  <div>
                    <p className={styles.surfaceEyebrow}>Courses</p>
                    <h2 className={styles.surfaceTitle}>Live course inventory</h2>
                  </div>
                  <p className={styles.surfaceMeta}>GET /api/admin/courses through Next BFF.</p>
                </div>

                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th>Lessons</th>
                        <th>Enrollments</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.courses.length === 0 ? (
                        <tr>
                          <td className={styles.emptyState} colSpan={4}>No courses yet.</td>
                        </tr>
                      ) : (
                        data.courses.map((course) => (
                          <tr key={course.id}>
                            <td>
                              <strong>{course.title}</strong>
                              <div className={styles.helperText}>{course.slug}</div>
                            </td>
                            <td>{course.lessons?.length || 0}</td>
                            <td>{course.enrollments?.length || 0}</td>
                            <td>
                              <span className={`${styles.badge} ${badgeClass(course.status)}`}>
                                {course.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className={styles.surface} data-reveal>
                <div className={styles.surfaceHeader}>
                  <div>
                    <p className={styles.surfaceEyebrow}>Users</p>
                    <h2 className={styles.surfaceTitle}>Live student directory</h2>
                  </div>
                  <p className={styles.surfaceMeta}>GET /api/admin/users through Next BFF.</p>
                </div>

                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Courses</th>
                        <th>Status</th>
                        <th>Session</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.users.length === 0 ? (
                        <tr>
                          <td className={styles.emptyState} colSpan={5}>No users yet.</td>
                        </tr>
                      ) : (
                        data.users.map((user) => {
                          const session = data.sessions.find(
                            (item) => item.userId === user.id && item.status === "ACTIVE"
                          );

                          return (
                            <tr key={user.id}>
                              <td>
                                <strong>{user.fullName}</strong>
                                <div className={styles.helperText}>{user.email}</div>
                              </td>
                              <td>{user.role}</td>
                              <td>
                                {user.enrollments?.length ? (
                                  <div className={styles.compactList}>
                                    {user.enrollments.map((enrollment) => (
                                      <span key={enrollment.id}>{enrollment.course.title}</span>
                                    ))}
                                  </div>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td>
                                <span className={`${styles.badge} ${badgeClass(user.status)}`}>
                                  {user.status}
                                </span>
                              </td>
                              <td>
                                {session ? (
                                  <>
                                    <strong>{session.deviceLabel || session.deviceId || "Device"}</strong>
                                    <div className={styles.helperText}>
                                      Last seen {formatDateTime(session.lastSeenAt)}
                                    </div>
                                  </>
                                ) : (
                                  "No active session"
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className={styles.surface} data-reveal>
                <div className={styles.surfaceHeader}>
                  <div>
                    <p className={styles.surfaceEyebrow}>Access control</p>
                    <h2 className={styles.surfaceTitle}>Issued one-time tokens</h2>
                  </div>
                  <p className={styles.surfaceMeta}>GET /api/admin/tokens and POST /issue via Next BFF.</p>
                </div>

                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Token record</th>
                        <th>User</th>
                        <th>Course</th>
                        <th>Issued</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.tokens.length === 0 ? (
                        <tr>
                          <td className={styles.emptyState} colSpan={5}>No tokens yet.</td>
                        </tr>
                      ) : (
                        data.tokens.map((token) => (
                          <tr key={token.id}>
                            <td>
                              <code className={styles.codePill}>{token.id}</code>
                            </td>
                            <td>{token.user?.email || "-"}</td>
                            <td>{token.enrollment?.course?.title || "-"}</td>
                            <td>{formatDateTime(token.createdAt)}</td>
                            <td>
                              <span className={`${styles.badge} ${badgeClass(token.status)}`}>
                                {token.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className={styles.surface} data-reveal>
                <div className={styles.surfaceHeader}>
                  <div>
                    <p className={styles.surfaceEyebrow}>Sessions</p>
                    <h2 className={styles.surfaceTitle}>Single-session enforcement</h2>
                  </div>
                  <p className={styles.surfaceMeta}>GET /api/admin/sessions and POST revoke via Next BFF.</p>
                </div>

                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Device</th>
                        <th>IP</th>
                        <th>Started</th>
                        <th>Last activity</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.sessions.length === 0 ? (
                        <tr>
                          <td className={styles.emptyState} colSpan={7}>No active sessions.</td>
                        </tr>
                      ) : (
                        data.sessions.map((session) => (
                          <tr key={session.id}>
                            <td>{session.user?.email || "-"}</td>
                            <td>{session.deviceLabel || session.deviceId || "Unknown device"}</td>
                            <td>{session.ipAddress || "-"}</td>
                            <td>{formatDateTime(session.createdAt)}</td>
                            <td>{formatDateTime(session.lastSeenAt)}</td>
                            <td>
                              <span className={`${styles.badge} ${badgeClass(session.status)}`}>
                                {session.status}
                              </span>
                            </td>
                            <td>
                              <button
                                className={styles.tableActionButton}
                                disabled={busyAction === `revoke-${session.id}`}
                                onClick={() => handleRevokeSession(session.id)}
                                type="button"
                              >
                                {busyAction === `revoke-${session.id}` ? "Revoking..." : "Revoke"}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className={styles.surface} data-reveal>
                <div className={styles.surfaceHeader}>
                  <div>
                    <p className={styles.surfaceEyebrow}>Video pipeline</p>
                    <h2 className={styles.surfaceTitle}>Asset status from live backend</h2>
                  </div>
                  <p className={styles.surfaceMeta}>Video upload UI stays next, direct upload stays provider-side.</p>
                </div>

                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Lesson</th>
                        <th>Course</th>
                        <th>Asset reference</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.uploads.length === 0 ? (
                        <tr>
                          <td className={styles.emptyState} colSpan={4}>No video assets yet.</td>
                        </tr>
                      ) : (
                        data.uploads.map((asset) => (
                          <tr key={asset.id}>
                            <td>{asset.lesson?.title || "-"}</td>
                            <td>{asset.lesson?.course?.title || "-"}</td>
                            <td>
                              <code className={styles.codePill}>
                                {asset.externalAssetId || asset.playbackId || asset.externalUploadId || asset.id}
                              </code>
                            </td>
                            <td>
                              <span className={`${styles.badge} ${badgeClass(asset.status)}`}>
                                {asset.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className={styles.surface} data-reveal>
                <div className={styles.surfaceHeader}>
                  <div>
                    <p className={styles.surfaceEyebrow}>Audit log</p>
                    <h2 className={styles.surfaceTitle}>Live critical events</h2>
                  </div>
                  <p className={styles.surfaceMeta}>GET /api/admin/audit-logs through Next BFF.</p>
                </div>

                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Event</th>
                        <th>Actor</th>
                        <th>Entity</th>
                        <th>Session</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.logs.length === 0 ? (
                        <tr>
                          <td className={styles.emptyState} colSpan={5}>No audit logs yet.</td>
                        </tr>
                      ) : (
                        data.logs.map((log) => (
                          <tr key={log.id}>
                            <td>{formatDateTime(log.createdAt)}</td>
                            <td>{log.eventType}</td>
                            <td>
                              {log.actorId
                                ? usersById[log.actorId]?.email || usersById[log.actorId]?.fullName || log.actorId
                                : log.actorType}
                            </td>
                            <td>
                              {log.entityType}
                              {log.entityId ? ` / ${log.entityId}` : ""}
                            </td>
                            <td>{log.sessionId || "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <aside className={styles.adminRail}>
              <section className={styles.callout} data-reveal>
                <p className={styles.surfaceEyebrow}>Quick actions</p>
                <h2 className={styles.calloutTitle}>Create a student</h2>
                <form className={styles.formStack} onSubmit={handleCreateUser}>
                  <label className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Full name</span>
                    <input
                      className={styles.fieldInput}
                      onChange={(event) => updateForm("createUser", "fullName", event.target.value)}
                      placeholder="Ivan Ivanov"
                      required
                      type="text"
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
              </section>

              <section className={styles.callout} data-reveal>
                <p className={styles.surfaceEyebrow}>Quick actions</p>
                <h2 className={styles.calloutTitle}>Create a course</h2>
                <form className={styles.formStack} onSubmit={handleCreateCourse}>
                  <label className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Title</span>
                    <input
                      className={styles.fieldInput}
                      onChange={(event) => updateForm("createCourse", "title", event.target.value)}
                      placeholder="Analytics 101"
                      required
                      type="text"
                      value={forms.createCourse.title}
                    />
                  </label>
                  <label className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Slug</span>
                    <input
                      className={styles.fieldInput}
                      onChange={(event) => updateForm("createCourse", "slug", event.target.value)}
                      placeholder="analytics-101"
                      type="text"
                      value={forms.createCourse.slug}
                    />
                  </label>
                  <label className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Short description</span>
                    <input
                      className={styles.fieldInput}
                      onChange={(event) => updateForm("createCourse", "shortDescription", event.target.value)}
                      placeholder="Short summary for admins and students"
                      type="text"
                      value={forms.createCourse.shortDescription}
                    />
                  </label>
                  <button className={styles.outlineButton} disabled={busyAction === "create-course"} type="submit">
                    {busyAction === "create-course" ? "Creating..." : "Create course"}
                  </button>
                </form>
              </section>

              <section className={styles.callout} data-reveal>
                <p className={styles.surfaceEyebrow}>Quick actions</p>
                <h2 className={styles.calloutTitle}>Enroll a student</h2>
                <form className={styles.formStack} onSubmit={handleCreateEnrollment}>
                  <label className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Student</span>
                    <select
                      className={styles.fieldInput}
                      onChange={(event) => updateForm("enrollment", "userId", event.target.value)}
                      value={forms.enrollment.userId}
                    >
                      {data.users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.fullName} - {user.email}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Course</span>
                    <select
                      className={styles.fieldInput}
                      onChange={(event) => updateForm("enrollment", "courseId", event.target.value)}
                      value={forms.enrollment.courseId}
                    >
                      {data.courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className={styles.outlineButton}
                    disabled={busyAction === "create-enrollment" || !data.users.length || !data.courses.length}
                    type="submit"
                  >
                    {busyAction === "create-enrollment" ? "Enrolling..." : "Create enrollment"}
                  </button>
                </form>
              </section>

              <section className={styles.callout} data-reveal>
                <p className={styles.surfaceEyebrow}>Quick actions</p>
                <h2 className={styles.calloutTitle}>Issue one-time token</h2>
                <form className={styles.formStack} onSubmit={handleIssueToken}>
                  <label className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Active enrollment</span>
                    <select
                      className={styles.fieldInput}
                      onChange={(event) => updateForm("token", "enrollmentId", event.target.value)}
                      value={forms.token.enrollmentId}
                    >
                      {activeEnrollments.map((enrollment) => (
                        <option key={enrollment.id} value={enrollment.id}>
                          {enrollment.user.email} - {enrollment.course.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className={styles.solidButton}
                    disabled={busyAction === "issue-token" || !activeEnrollments.length}
                    type="submit"
                  >
                    {busyAction === "issue-token" ? "Issuing..." : "Issue token"}
                  </button>
                  <p className={styles.helperText}>
                    First working UI flow: create user, enroll, issue token, activate on public
                    site, request playback in student app.
                  </p>
                </form>
              </section>

              <section className={styles.callout} data-reveal>
                <p className={styles.surfaceEyebrow}>What is live now</p>
                <h2 className={styles.calloutTitle}>Next.js BFF integration status</h2>
                <ul className={styles.ruleList}>
                  <li>Dashboard metrics are live</li>
                  <li>Users, courses, tokens, sessions, logs are live</li>
                  <li>Create user, create course, enroll, issue token are live</li>
                  <li>Student activation and playback are wired through Next cookies</li>
                </ul>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
