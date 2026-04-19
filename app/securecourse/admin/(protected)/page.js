"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  createCourse,
  createEnrollment,
  createLesson,
  createLessonMaterial,
  createUploadIntent,
  createUser,
  getAdminSession,
  getDashboardSnapshot,
  getUploads,
  issueToken,
  logoutAdmin,
  revokeSession,
  revokeToken
} from "@/lib/securecourse-api";
import styles from "../../securecourse.module.css";

function badgeClass(value) {
  const normalized = String(value || "").toLowerCase();

  if (normalized.includes("active") || normalized.includes("ready") || normalized.includes("published")) {
    return `${styles.badge} ${styles.badgeGreen}`;
  }

  if (normalized.includes("used") || normalized.includes("processing") || normalized.includes("waiting")) {
    return `${styles.badge} ${styles.badgeBlue}`;
  }

  if (normalized.includes("revoked") || normalized.includes("blocked") || normalized.includes("error")) {
    return `${styles.badge} ${styles.badgeRed}`;
  }

  return `${styles.badge} ${styles.badgeGold}`;
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function SecureCourseAdminPage() {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copiedToken, setCopiedToken] = useState("");
  const [adminSession, setAdminSession] = useState(null);
  const [lastIssuedToken, setLastIssuedToken] = useState(null);
  const [selectedUploadFile, setSelectedUploadFile] = useState(null);
  const [uploadState, setUploadState] = useState(null);
  const [data, setData] = useState({
    metrics: {
      activeSessions: 0,
      issuedTokensToday: 0,
      readyVideoAssets: 0,
      totalUsers: 0,
      activeUsers: 0
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
    lesson: {
      courseId: "",
      title: "",
      slug: "",
      content: "",
      notes: ""
    },
    enrollment: {
      userId: "",
      courseId: ""
    },
    token: {
      enrollmentId: ""
    },
    upload: {
      lessonId: "",
      provider: "RAILWAY_LOCAL"
    }
  });

  const lessonOptions = useMemo(
    () =>
      data.courses.flatMap((course) =>
        (course.lessons || []).map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          status: lesson.status,
          courseId: course.id,
          courseTitle: course.title
        }))
      ),
    [data.courses]
  );

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

  const selectedUploadLesson = useMemo(
    () => lessonOptions.find((lesson) => lesson.id === forms.upload.lessonId) || null,
    [forms.upload.lessonId, lessonOptions]
  );

  async function loadAdminData(options = {}) {
    const showSpinner = options.showSpinner ?? true;

    if (showSpinner) {
      setLoading(true);
    }

    setError("");

    try {
      const [sessionPayload, snapshot] = await Promise.all([getAdminSession(), getDashboardSnapshot()]);
      setAdminSession(sessionPayload);
      setData(snapshot);
      return snapshot;
    } catch (requestError) {
      if (requestError.status === 401) {
        window.location.assign("/securecourse/admin/login?redirectTo=/securecourse/admin");
        return null;
      }

      setError(requestError.message || "Failed to load the admin dashboard.");
      return null;
    } finally {
      if (showSpinner) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadAdminData();
  }, []);

  useEffect(() => {
    if (!forms.lesson.courseId && data.courses[0]?.id) {
      updateForm("lesson", "courseId", data.courses[0].id);
    }

    if (!forms.enrollment.userId && data.users[0]?.id) {
      updateForm("enrollment", "userId", data.users[0].id);
    }

    if (!forms.enrollment.courseId && data.courses[0]?.id) {
      updateForm("enrollment", "courseId", data.courses[0].id);
    }

    if (!forms.token.enrollmentId && activeEnrollments[0]?.id) {
      updateForm("token", "enrollmentId", activeEnrollments[0].id);
    }

    if (!forms.upload.lessonId && lessonOptions[0]?.id) {
      updateForm("upload", "lessonId", lessonOptions[0].id);
    }
  }, [
    activeEnrollments,
    data.courses,
    data.users,
    forms.enrollment.courseId,
    forms.enrollment.userId,
    forms.lesson.courseId,
    forms.token.enrollmentId,
    forms.upload.lessonId,
    lessonOptions
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
      await loadAdminData({ showSpinner: false });
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
      setNotice("Course created. Add the first lesson and upload the video next.");
      const snapshot = await loadAdminData({ showSpinner: false });

      if (snapshot?.courses?.[0]?.id && !forms.lesson.courseId) {
        updateForm("lesson", "courseId", snapshot.courses[0].id);
      }
    } catch (requestError) {
      setError(requestError.message || "Failed to create course.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleCreateLesson(event) {
    event.preventDefault();
    setBusyAction("create-lesson");
    setError("");
    setNotice("");

    try {
      const slug = forms.lesson.slug || slugify(forms.lesson.title);
      const lesson = await createLesson(forms.lesson.courseId, {
        title: forms.lesson.title,
        slug,
        status: "PUBLISHED",
        content: forms.lesson.content
      });

      if (forms.lesson.notes.trim()) {
        await createLessonMaterial(lesson.id, {
          title: `${forms.lesson.title} notes`,
          type: "TEXT",
          content: forms.lesson.notes
        });
      }

      setForms((current) => ({
        ...current,
        lesson: {
          ...current.lesson,
          title: "",
          slug: "",
          content: "",
          notes: ""
        },
        upload: {
          ...current.upload,
          lessonId: lesson.id
        }
      }));
      setNotice("Lesson created. You can upload the lesson video now.");
      await loadAdminData({ showSpinner: false });
    } catch (requestError) {
      setError(requestError.message || "Failed to create lesson.");
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

      setNotice("Enrollment created. You can issue a one-time token next.");
      await loadAdminData({ showSpinner: false });
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
        activationExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
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
      setNotice("Token issued. Copy it now and send it to the student.");
      await loadAdminData({ showSpinner: false });
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
      setNotice("Token copied. Send it to the student from this screen.");
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
      await loadAdminData({ showSpinner: false });
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
      await loadAdminData({ showSpinner: false });
    } catch (requestError) {
      setError(requestError.message || "Failed to revoke session.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleUploadVideo(event) {
    event.preventDefault();
    setBusyAction("upload-video");
    setError("");
    setNotice("");

    try {
      if (!forms.upload.lessonId) {
        throw new Error("Choose a lesson first.");
      }

      if (!selectedUploadFile) {
        throw new Error("Choose a video file to upload.");
      }

      const intent = await createUploadIntent({
        lessonId: forms.upload.lessonId,
        provider: forms.upload.provider,
        fileName: selectedUploadFile.name,
        fileSize: selectedUploadFile.size,
        mimeType: selectedUploadFile.type
      });

      setUploadState({
        assetId: intent.assetId,
        status: intent.status,
        lessonTitle: selectedUploadLesson?.title || "Lesson",
        fileName: selectedUploadFile.name
      });

      const formData = new FormData();
      formData.append("file", selectedUploadFile);

      const uploadResponse = await fetch(intent.uploadUrl, {
        method: "POST",
        body: formData,
        credentials: "same-origin",
        cache: "no-store"
      });
      const uploadPayload = await uploadResponse.json().catch(() => null);

      if (!uploadResponse.ok) {
        throw new Error(uploadPayload?.message || "Upload failed.");
      }

      setUploadState({
        assetId: intent.assetId,
        status: uploadPayload?.asset?.status || "processing",
        lessonTitle: selectedUploadLesson?.title || "Lesson",
        fileName: selectedUploadFile.name
      });

      setNotice("Upload received. Processing video...");

      for (let attempt = 0; attempt < 12; attempt += 1) {
        await wait(700);
        const uploads = await getUploads();
        const currentAsset = uploads.find((item) => item.id === intent.assetId);

        if (currentAsset) {
          setUploadState({
            assetId: currentAsset.id,
            status: currentAsset.status,
            lessonTitle: currentAsset.lessonTitle || selectedUploadLesson?.title || "Lesson",
            fileName: currentAsset.fileName || selectedUploadFile.name
          });
        }

        if (currentAsset && ["ready", "error"].includes(String(currentAsset.status || "").toLowerCase())) {
          break;
        }
      }

      await loadAdminData({ showSpinner: false });
      setSelectedUploadFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setNotice("Upload flow finished. The lesson now has a playable video asset.");
    } catch (requestError) {
      setError(requestError.message || "Video upload failed.");
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
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.surfaceEyebrow}>Admin workspace</p>
              <h1 className={styles.heroTitle}>Run the full English and study abroad delivery flow in one panel.</h1>
              <p className={styles.heroLead}>
                Create students, build courses and lessons, enroll learners, issue one-time tokens, upload videos, and
                manage active sessions from one Railway deployment.
              </p>
              <div className={styles.heroActions}>
                <button className={styles.solidButton} onClick={() => loadAdminData()} type="button">
                  Refresh dashboard
                </button>
                <button
                  className={styles.outlineButton}
                  disabled={busyAction === "logout-admin"}
                  onClick={handleAdminLogout}
                  type="button"
                >
                  {busyAction === "logout-admin" ? "Signing out..." : "Logout"}
                </button>
                <Link className={styles.ghostButton} href="/securecourse">
                  Public page
                </Link>
              </div>
            </div>

            <aside className={styles.heroPanel}>
              <p className={styles.panelKicker}>Signed in as</p>
              <div className={styles.panelList}>
                <article className={styles.heroCard}>
                  <div>
                    <strong>{adminSession?.user?.fullName || adminSession?.user?.username || "Admin user"}</strong>
                    <p>{adminSession?.user?.email || "Authenticated admin session"}</p>
                  </div>
                </article>
                <article className={styles.heroCard}>
                  <div>
                    <strong>Recommended order</strong>
                    <p>Create student → create course → create lesson → enroll → issue token → upload video.</p>
                  </div>
                </article>
                <article className={styles.heroCard}>
                  <div>
                    <strong>Activation path</strong>
                    <p>Students activate the token on the public page and continue in the student cabinet.</p>
                  </div>
                </article>
              </div>
            </aside>
          </div>
        </section>

        <section className={styles.metricStrip}>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Students</span>
            <strong className={styles.metricValue}>{data.metrics.totalUsers}</strong>
            <span className={styles.statusMeta}>{data.metrics.activeUsers} active</span>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Tokens today</span>
            <strong className={styles.metricValue}>{data.metrics.issuedTokensToday}</strong>
            <span className={styles.statusMeta}>one-time access links and codes</span>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Active sessions</span>
            <strong className={styles.metricValue}>{data.metrics.activeSessions}</strong>
            <span className={styles.statusMeta}>single active student session enforced</span>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Ready videos</span>
            <strong className={styles.metricValue}>{data.metrics.readyVideoAssets}</strong>
            <span className={styles.statusMeta}>playable lesson assets</span>
          </article>
        </section>

        {error ? <p className={styles.feedbackError}>{error}</p> : null}
        {notice ? <p className={styles.feedbackSuccess}>{notice}</p> : null}

        <section className={styles.gridTwo} style={{ paddingTop: "2rem" }}>
          <article className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <p className={styles.surfaceEyebrow}>Step 1</p>
                <h2 className={styles.surfaceTitle}>Create a student</h2>
              </div>
            </div>
            <div style={{ padding: "2rem" }}>
              <form className={styles.formStack} onSubmit={handleCreateUser}>
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Student full name</span>
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
            </div>
          </article>

          <article className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <p className={styles.surfaceEyebrow}>Step 2</p>
                <h2 className={styles.surfaceTitle}>Create a course</h2>
              </div>
            </div>
            <div style={{ padding: "2rem" }}>
              <form className={styles.formStack} onSubmit={handleCreateCourse}>
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Course title</span>
                  <input
                    className={styles.fieldInput}
                    onChange={(event) => updateForm("createCourse", "title", event.target.value)}
                    placeholder="IELTS Writing Sprint"
                    required
                    value={forms.createCourse.title}
                  />
                </label>
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Slug</span>
                  <input
                    className={styles.fieldInput}
                    onChange={(event) => updateForm("createCourse", "slug", event.target.value)}
                    placeholder="ielts-writing-sprint"
                    value={forms.createCourse.slug}
                  />
                </label>
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Short description</span>
                  <textarea
                    className={styles.fieldTextarea}
                    onChange={(event) => updateForm("createCourse", "shortDescription", event.target.value)}
                    placeholder="A short intro for the student dashboard."
                    required
                    value={forms.createCourse.shortDescription}
                  />
                </label>
                <button className={styles.solidButton} disabled={busyAction === "create-course"} type="submit">
                  {busyAction === "create-course" ? "Creating..." : "Create course"}
                </button>
              </form>
            </div>
          </article>
        </section>

        <section className={styles.gridTwo} style={{ paddingTop: "1.25rem" }}>
          <article className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <p className={styles.surfaceEyebrow}>Step 3</p>
                <h2 className={styles.surfaceTitle}>Create a lesson and notes</h2>
              </div>
            </div>
            <div style={{ padding: "2rem" }}>
              <form className={styles.formStack} onSubmit={handleCreateLesson}>
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Course</span>
                  <select
                    className={styles.fieldSelect}
                    onChange={(event) => updateForm("lesson", "courseId", event.target.value)}
                    required
                    value={forms.lesson.courseId}
                  >
                    <option value="">Select course</option>
                    {data.courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Lesson title</span>
                  <input
                    className={styles.fieldInput}
                    onChange={(event) => updateForm("lesson", "title", event.target.value)}
                    placeholder="Lesson 1. Personal statement structure"
                    required
                    value={forms.lesson.title}
                  />
                </label>
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Lesson slug</span>
                  <input
                    className={styles.fieldInput}
                    onChange={(event) => updateForm("lesson", "slug", event.target.value)}
                    placeholder="lesson-1-personal-statement-structure"
                    value={forms.lesson.slug}
                  />
                </label>
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Lesson summary</span>
                  <textarea
                    className={styles.fieldTextarea}
                    onChange={(event) => updateForm("lesson", "content", event.target.value)}
                    placeholder="Short lesson summary shown in the cabinet."
                    value={forms.lesson.content}
                  />
                </label>
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Lesson notes</span>
                  <textarea
                    className={styles.fieldTextarea}
                    onChange={(event) => updateForm("lesson", "notes", event.target.value)}
                    placeholder="Checklist, vocabulary, university links, or any supporting notes."
                    value={forms.lesson.notes}
                  />
                </label>
                <button className={styles.solidButton} disabled={busyAction === "create-lesson"} type="submit">
                  {busyAction === "create-lesson" ? "Saving..." : "Create lesson"}
                </button>
              </form>
            </div>
          </article>

          <article className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <p className={styles.surfaceEyebrow}>Step 4</p>
                <h2 className={styles.surfaceTitle}>Enroll and issue token</h2>
              </div>
            </div>
            <div style={{ padding: "2rem", display: "grid", gap: "1.5rem" }}>
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
                <button className={styles.outlineButton} disabled={busyAction === "create-enrollment"} type="submit">
                  {busyAction === "create-enrollment" ? "Assigning..." : "Enroll student"}
                </button>
              </form>

              <form className={styles.formStack} onSubmit={handleIssueToken}>
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Active enrollment</span>
                  <select
                    className={styles.fieldSelect}
                    onChange={(event) => updateForm("token", "enrollmentId", event.target.value)}
                    required
                    value={forms.token.enrollmentId}
                  >
                    <option value="">Select active enrollment</option>
                    {activeEnrollments.map((enrollment) => (
                      <option key={enrollment.id} value={enrollment.id}>
                        {enrollment.user.fullName} / {enrollment.course.title}
                      </option>
                    ))}
                  </select>
                </label>
                <button className={styles.solidButton} disabled={busyAction === "issue-token"} type="submit">
                  {busyAction === "issue-token" ? "Generating..." : "Generate token"}
                </button>
              </form>

              {lastIssuedToken ? (
                <div className={styles.tokenReveal}>
                  <p className={styles.surfaceEyebrow}>Latest raw token</p>
                  <code className={styles.tokenRevealValue}>{lastIssuedToken.token}</code>
                  <p className={styles.tokenRevealMeta}>
                    {lastIssuedToken.userEmail} · {lastIssuedToken.courseTitle} · expires{" "}
                    {formatDateTime(lastIssuedToken.expiresAt)}
                  </p>
                  <div className={styles.heroActions}>
                    <button className={styles.solidButton} onClick={() => handleCopyToken(lastIssuedToken.token)} type="button">
                      {copiedToken === lastIssuedToken.token ? "Copied" : "Copy token"}
                    </button>
                    <Link className={styles.outlineButton} href="/securecourse#activation">
                      Open activation page
                    </Link>
                  </div>
                </div>
              ) : (
                <p className={styles.helperText}>
                  Generate a token and it will appear here immediately with a copy action.
                </p>
              )}
            </div>
          </article>
        </section>

        <section className={styles.surface} style={{ marginTop: "1.25rem" }}>
          <div className={styles.surfaceHeader}>
            <div>
              <p className={styles.surfaceEyebrow}>Step 5</p>
              <h2 className={styles.surfaceTitle}>Upload lesson video</h2>
            </div>
          </div>
          <div style={{ padding: "2rem" }} className={styles.gridTwo}>
            <form className={styles.formStack} onSubmit={handleUploadVideo}>
              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Lesson</span>
                <select
                  className={styles.fieldSelect}
                  onChange={(event) => updateForm("upload", "lessonId", event.target.value)}
                  required
                  value={forms.upload.lessonId}
                >
                  <option value="">Select lesson</option>
                  {lessonOptions.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.courseTitle} / {lesson.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Provider label</span>
                <select
                  className={styles.fieldSelect}
                  onChange={(event) => updateForm("upload", "provider", event.target.value)}
                  value={forms.upload.provider}
                >
                  <option value="RAILWAY_LOCAL">Railway local upload</option>
                  <option value="MUX">Mux style upload intent</option>
                  <option value="CLOUDFLARE_STREAM">Cloudflare Stream style upload intent</option>
                </select>
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Video file</span>
                <input
                  ref={fileInputRef}
                  accept="video/*"
                  className={styles.fieldInput}
                  onChange={(event) => setSelectedUploadFile(event.target.files?.[0] || null)}
                  type="file"
                />
              </label>

              <button className={styles.solidButton} disabled={busyAction === "upload-video"} type="submit">
                {busyAction === "upload-video" ? "Uploading..." : "Upload video"}
              </button>
            </form>

            <div className={styles.callout}>
              <p className={styles.surfaceEyebrow}>Upload status</p>
              <h3 className={styles.calloutTitle}>
                {uploadState ? `${uploadState.lessonTitle}: ${uploadState.status}` : "No upload started yet"}
              </h3>
              <p className={styles.helperText} style={{ color: "var(--text-soft)" }}>
                Flow: waiting_upload → uploading → processing → ready. After the asset is ready, students can open the
                lesson and receive playback access.
              </p>
              {uploadState ? (
                <div className={styles.compactList}>
                  <span>Asset ID: {uploadState.assetId}</span>
                  <span>File: {uploadState.fileName}</span>
                  <span className={badgeClass(uploadState.status)}>{uploadState.status}</span>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className={styles.gridTwo} style={{ paddingTop: "1.25rem" }}>
          <article className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <p className={styles.surfaceEyebrow}>Students and courses</p>
                <h2 className={styles.surfaceTitle}>Current catalog</h2>
              </div>
            </div>
            <div style={{ padding: "2rem", display: "grid", gap: "1.5rem" }}>
              <div className={styles.surfaceGrid}>
                <p className={styles.surfaceEyebrow}>Students</p>
                {loading && !data.users.length ? (
                  <p className={styles.helperText}>Loading students...</p>
                ) : data.users.length ? (
                  <div className={styles.compactList}>
                    {data.users.map((user) => (
                      <div className={styles.materialCard} key={user.id}>
                        <strong>{user.fullName}</strong>
                        <p className={styles.helperText}>{user.email}</p>
                        <span className={badgeClass(user.status)}>{user.status}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.helperText}>No students yet.</p>
                )}
              </div>

              <div className={styles.surfaceGrid}>
                <p className={styles.surfaceEyebrow}>Courses</p>
                {loading && !data.courses.length ? (
                  <p className={styles.helperText}>Loading courses...</p>
                ) : data.courses.length ? (
                  <div className={styles.compactList}>
                    {data.courses.map((course) => (
                      <div className={styles.materialCard} key={course.id}>
                        <strong>{course.title}</strong>
                        <p className={styles.helperText}>{course.shortDescription || "Course description pending."}</p>
                        <div className={styles.compactList}>
                          {(course.lessons || []).map((lesson) => (
                            <span key={lesson.id}>
                              {lesson.title} <span className={badgeClass(lesson.status)}>{lesson.status}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.helperText}>No courses yet.</p>
                )}
              </div>
            </div>
          </article>

          <article className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <p className={styles.surfaceEyebrow}>Tokens and sessions</p>
                <h2 className={styles.surfaceTitle}>Live access control</h2>
              </div>
            </div>
            <div style={{ padding: "2rem", display: "grid", gap: "1.5rem" }}>
              <div className={styles.surfaceGrid}>
                <p className={styles.surfaceEyebrow}>Tokens</p>
                {loading && !data.tokens.length ? (
                  <p className={styles.helperText}>Loading tokens...</p>
                ) : data.tokens.length ? (
                  <div className={styles.miniTable}>
                    <div className={styles.miniTableHeader}>
                      <span>Student</span>
                      <span>Status</span>
                      <span>Expires</span>
                      <span>Action</span>
                    </div>
                    {data.tokens.map((token) => (
                      <div className={styles.miniTableRow} key={token.id}>
                        <span>
                          <strong>{token.user?.fullName || token.user?.email || "Student"}</strong>
                          <small>{token.enrollment?.course?.title || "Course"}</small>
                        </span>
                        <span className={badgeClass(token.status)}>{token.status}</span>
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
                            <span className={styles.helperText}>-</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.helperText}>No tokens issued yet.</p>
                )}
              </div>

              <div className={styles.surfaceGrid}>
                <p className={styles.surfaceEyebrow}>Sessions</p>
                {loading && !data.sessions.length ? (
                  <p className={styles.helperText}>Loading sessions...</p>
                ) : data.sessions.length ? (
                  <div className={styles.miniTable}>
                    <div className={styles.miniTableHeader}>
                      <span>Student</span>
                      <span>Status</span>
                      <span>Last seen</span>
                      <span>Action</span>
                    </div>
                    {data.sessions.map((session) => (
                      <div className={styles.miniTableRow} key={session.id}>
                        <span>
                          <strong>{session.user?.fullName || session.user?.email || "Student"}</strong>
                          <small>{session.deviceLabel || "Web browser"}</small>
                        </span>
                        <span className={badgeClass(session.status)}>{session.status}</span>
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
                            <span className={styles.helperText}>-</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.helperText}>No active student sessions yet.</p>
                )}
              </div>
            </div>
          </article>
        </section>

        <section className={styles.gridTwo} style={{ paddingTop: "1.25rem", paddingBottom: "3rem" }}>
          <article className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <p className={styles.surfaceEyebrow}>Video assets</p>
                <h2 className={styles.surfaceTitle}>Upload pipeline</h2>
              </div>
            </div>
            <div style={{ padding: "2rem" }}>
              {loading && !data.uploads.length ? (
                <p className={styles.helperText}>Loading uploads...</p>
              ) : data.uploads.length ? (
                <div className={styles.miniTable}>
                  <div className={styles.miniTableHeader}>
                    <span>Lesson</span>
                    <span>Status</span>
                    <span>Provider</span>
                    <span>Updated</span>
                  </div>
                  {data.uploads.map((asset) => (
                    <div className={styles.miniTableRow} key={asset.id}>
                      <span>
                        <strong>{asset.lessonTitle || "Lesson video"}</strong>
                        <small>{asset.courseTitle || "Course"}</small>
                      </span>
                      <span className={badgeClass(asset.status)}>{asset.status}</span>
                      <span>{asset.provider}</span>
                      <span>{formatDateTime(asset.updatedAt)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.helperText}>No video assets yet.</p>
              )}
            </div>
          </article>

          <article className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <p className={styles.surfaceEyebrow}>Audit log</p>
                <h2 className={styles.surfaceTitle}>Recent actions</h2>
              </div>
            </div>
            <div style={{ padding: "2rem" }}>
              {loading && !data.logs.length ? (
                <p className={styles.helperText}>Loading recent activity...</p>
              ) : data.logs.length ? (
                <div className={styles.compactList}>
                  {data.logs.slice(0, 10).map((log) => (
                    <div className={styles.materialCard} key={log.id}>
                      <strong>{log.eventType}</strong>
                      <p className={styles.helperText}>
                        {log.actorType} · {log.entityType || "system"} · {formatDateTime(log.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.helperText}>No audit events yet.</p>
              )}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
