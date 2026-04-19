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

  async function handleCreateDemoData() {
    if (!window.confirm("Создать демонстрационные курсы и студентов?")) return;
    setBusyAction("demo-data");
    setError("");
    setNotice("");
    try {
      const student1 = await createUser({ fullName: "Аружан Сарсен", email: "aruzhan@example.com", role: "STUDENT", status: "ACTIVE" });
      const student2 = await createUser({ fullName: "Алишер Койшыбаев", email: "alisher@example.com", role: "STUDENT", status: "ACTIVE" });
      
      const course1 = await createCourse({ title: "IELTS Intensive 7.5+", slug: "ielts-intensive", shortDescription: "Полный курс подготовки к IELTS Academic.", description: "Полный курс", status: "PUBLISHED" });
      const course2 = await createCourse({ title: "Ivy League Admissions", slug: "ivy-league", shortDescription: "Стратегия написания Personal Statement.", description: "Гайд", status: "PUBLISHED" });
      
      const lesson1 = await createLesson(course1.id, { title: "Урок 1. Структура IELTS Writing Task 2", slug: "ielts-writing-1", status: "PUBLISHED", content: "Пишем эссе на 7.5 баллов." });
      await createLessonMaterial(lesson1.id, { title: "Vocab Checklist", type: "TEXT", content: "Advanced vocabulary phrases." });
      
      await createEnrollment({ userId: student1.id, courseId: course1.id, note: "Демо" });
      await createEnrollment({ userId: student2.id, courseId: course2.id, note: "Демо" });
      
      setNotice("Успех! Демонстрационные данные загружены.");
      await loadAdminData({ showSpinner: false });
    } catch (e) {
      setError("Ошибка демо: " + e.message);
    } finally {
      setBusyAction("");
    }
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
              <p className={styles.surfaceEyebrow}>Панель управления</p>
              <h1 className={styles.heroTitle}>Единая платформа для курсов английского и подготовки за рубеж.</h1>
              <p className={styles.heroLead}>
                Создавайте курсы (IELTS, Scholarships), добавляйте уроки, генерируйте одноразовые токены для студентов и загружайте видеоматериалы.
              </p>
              <div className={styles.heroActions}>
                <button className={styles.solidButton} onClick={() => loadAdminData()} type="button">
                  Обновить дашборд
                </button>
                <button
                  className={styles.outlineButton}
                  disabled={busyAction === "logout-admin"}
                  onClick={handleAdminLogout}
                  type="button"
                >
                  {busyAction === "logout-admin" ? "Выход..." : "Выйти"}
                </button>
                <Link className={styles.ghostButton} href="/securecourse">
                  Публичная страница
                </Link>
              </div>
            </div>

            <aside className={styles.heroPanel}>
              <p className={styles.panelKicker}>Ваш профиль</p>
              <div className={styles.panelList}>
                <article className={styles.heroCard}>
                  <div>
                    <strong>{adminSession?.user?.fullName || adminSession?.user?.username || "Менеджер платформы"}</strong>
                    <p>{adminSession?.user?.email || "Авторизованная сессия администратора"}</p>
                  </div>
                </article>
                <article className={styles.heroCard}>
                  <div>
                    <strong>Рекомендуемый порядок</strong>
                    <p>Студент → курс → урок → зачисление (enroll) → выдача токена → загрузка видео.</p>
                  </div>
                </article>
                <article className={styles.heroCard}>
                  <div>
                    <strong>Как войти ученику</strong>
                    <p>Отправьте ученику токен. Он активирует его на главной странице и попадает в кабинет.</p>
                  </div>
                </article>
              </div>
            </aside>
          </div>
        </section>

        <section className={styles.metricStrip}>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Студенты</span>
            <strong className={styles.metricValue}>{data.metrics.totalUsers}</strong>
            <span className={styles.statusMeta}>{data.metrics.activeUsers} активных</span>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Токены за сегодня</span>
            <strong className={styles.metricValue}>{data.metrics.issuedTokensToday}</strong>
            <span className={styles.statusMeta}>одноразовых доступов сгенерировано</span>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Активные сессии</span>
            <strong className={styles.metricValue}>{data.metrics.activeSessions}</strong>
            <span className={styles.statusMeta}>студентов онлайн в кабинете</span>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Готовых видео</span>
            <strong className={styles.metricValue}>{data.metrics.readyVideoAssets}</strong>
            <span className={styles.statusMeta}>обработанных материалов</span>
          </article>
        </section>

        {error ? <p className={styles.feedbackError}>{error}</p> : null}
        {notice ? <p className={styles.feedbackSuccess}>{notice}</p> : null}

        <section className={styles.gridTwo} style={{ paddingTop: "2rem" }}>
          <article className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <p className={styles.surfaceEyebrow}>Шаг 1</p>
                <h2 className={styles.surfaceTitle}>Добавить ученика</h2>
              </div>
            </div>
            <div style={{ padding: "2rem" }}>
              <form className={styles.formStack} onSubmit={handleCreateUser}>
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Имя и Фамилия студента</span>
                  <input
                    className={styles.fieldInput}
                    onChange={(event) => updateForm("createUser", "fullName", event.target.value)}
                    placeholder="Аружан Сарсен"
                    required
                    value={forms.createUser.fullName}
                  />
                </label>
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Почта (Email)</span>
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
                  {busyAction === "create-user" ? "Создаем..." : "Создать ученика"}
                </button>
              </form>
            </div>
          </article>

          <article className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <p className={styles.surfaceEyebrow}>Шаг 2</p>
                <h2 className={styles.surfaceTitle}>Создать курс</h2>
              </div>
            </div>
            <div style={{ padding: "2rem" }}>
              <form className={styles.formStack} onSubmit={handleCreateCourse}>
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Название курса</span>
                  <input
                    className={styles.fieldInput}
                    onChange={(event) => updateForm("createCourse", "title", event.target.value)}
                    placeholder="IELTS Writing Sprint"
                    required
                    value={forms.createCourse.title}
                  />
                </label>
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Системное имя (Slug)</span>
                  <input
                    className={styles.fieldInput}
                    onChange={(event) => updateForm("createCourse", "slug", event.target.value)}
                    placeholder="ielts-writing-sprint"
                    value={forms.createCourse.slug}
                  />
                </label>
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Короткое описание</span>
                  <textarea
                    className={styles.fieldTextarea}
                    onChange={(event) => updateForm("createCourse", "shortDescription", event.target.value)}
                    placeholder="Краткое описание курса для кабинета ученика."
                    required
                    value={forms.createCourse.shortDescription}
                  />
                </label>
                <button className={styles.solidButton} disabled={busyAction === "create-course"} type="submit">
                  {busyAction === "create-course" ? "Создаем..." : "Создать курс"}
                </button>
              </form>
            </div>
          </article>
        </section>

        <section className={styles.gridTwo} style={{ paddingTop: "1.25rem" }}>
          <article className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <p className={styles.surfaceEyebrow}>Шаг 3</p>
                <h2 className={styles.surfaceTitle}>Опционально: Создать урок и контент</h2>
              </div>
            </div>
            <div style={{ padding: "2rem" }}>
              <form className={styles.formStack} onSubmit={handleCreateLesson}>
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Выбрать курс</span>
                  <select
                    className={styles.fieldSelect}
                    onChange={(event) => updateForm("lesson", "courseId", event.target.value)}
                    required
                    value={forms.lesson.courseId}
                  >
                    <option value="">Выберите курс из списка...</option>
                    {data.courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Название урока</span>
                  <input
                    className={styles.fieldInput}
                    onChange={(event) => updateForm("lesson", "title", event.target.value)}
                    placeholder="Урок 1. Personal statement strategy"
                    required
                    value={forms.lesson.title}
                  />
                </label>
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Slug урока</span>
                  <input
                    className={styles.fieldInput}
                    onChange={(event) => updateForm("lesson", "slug", event.target.value)}
                    placeholder="lesson-1-personal-statement"
                    value={forms.lesson.slug}
                  />
                </label>
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Описание урока</span>
                  <textarea
                    className={styles.fieldTextarea}
                    onChange={(event) => updateForm("lesson", "content", event.target.value)}
                    placeholder="Краткое саммари для карточки урока."
                    value={forms.lesson.content}
                  />
                </label>
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Доп. материалы (текст/ссылки/cheklist)</span>
                  <textarea
                    className={styles.fieldTextarea}
                    onChange={(event) => updateForm("lesson", "notes", event.target.value)}
                    placeholder="Скиньте сюда словарь, ссылки на ВУЗы или чек-листы."
                    value={forms.lesson.notes}
                  />
                </label>
                <button className={styles.solidButton} disabled={busyAction === "create-lesson"} type="submit">
                  {busyAction === "create-lesson" ? "Сохраняем..." : "Создать урок"}
                </button>
              </form>
            </div>
          </article>

          <article className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <p className={styles.surfaceEyebrow}>Шаг 4</p>
                <h2 className={styles.surfaceTitle}>Зачисление и генерация токена</h2>
              </div>
            </div>
            <div style={{ padding: "2rem", display: "grid", gap: "1.5rem" }}>
              <form className={styles.formStack} onSubmit={handleCreateEnrollment}>
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Ученик</span>
                  <select
                    className={styles.fieldSelect}
                    onChange={(event) => updateForm("enrollment", "userId", event.target.value)}
                    required
                    value={forms.enrollment.userId}
                  >
                    <option value="">Выберите ученика...</option>
                    {data.users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.fullName} ({user.email})
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Доступ к курсу</span>
                  <select
                    className={styles.fieldSelect}
                    onChange={(event) => updateForm("enrollment", "courseId", event.target.value)}
                    required
                    value={forms.enrollment.courseId}
                  >
                    <option value="">Выберите курс...</option>
                    {data.courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </label>
                <button className={styles.outlineButton} disabled={busyAction === "create-enrollment"} type="submit">
                  {busyAction === "create-enrollment" ? "Зачисляем..." : "Зачислить ученика"}
                </button>
              </form>

              <form className={styles.formStack} onSubmit={handleIssueToken}>
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Выбрать активное зачисление</span>
                  <select
                    className={styles.fieldSelect}
                    onChange={(event) => updateForm("token", "enrollmentId", event.target.value)}
                    required
                    value={forms.token.enrollmentId}
                  >
                    <option value="">Выберите зачисление...</option>
                    {activeEnrollments.map((enrollment) => (
                      <option key={enrollment.id} value={enrollment.id}>
                        {enrollment.user.fullName} (Курс: {enrollment.course.title})
                      </option>
                    ))}
                  </select>
                </label>
                <button className={styles.solidButton} disabled={busyAction === "issue-token"} type="submit">
                  {busyAction === "issue-token" ? "Генерация..." : "Сгенерировать супер-токен"}
                </button>
              </form>

              <div className={styles.tokenReveal}>
              {lastIssuedToken ? (
                <>
                  <p className={styles.surfaceEyebrow}>ВАШ НОВЫЙ ТОКЕН ГОТОВ К ОТПРАВКЕ</p>
                  <code className={styles.tokenRevealValue}>{lastIssuedToken.token}</code>
                  <p className={styles.tokenRevealMeta}>
                    Студент: {lastIssuedToken.userEmail} · Курс: {lastIssuedToken.courseTitle} · Сгорит{" "}
                    {formatDateTime(lastIssuedToken.expiresAt)}
                  </p>
                  <div className={styles.heroActions}>
                    <button className={styles.solidButton} onClick={() => handleCopyToken(lastIssuedToken.token)} type="button">
                      {copiedToken === lastIssuedToken.token ? "Скопировано!" : "Копировать код"}
                    </button>
                    <Link className={styles.outlineButton} href="/securecourse#activation">
                      Публичная страница входа
                    </Link>
                  </div>
                </>
              ) : (
                <p className={styles.helperText}>
                  Выберите студента, нажмите "Сгенерировать супер-токен" и он появится тут крупным шрифтом с кнопкой копирования, чтобы вы скинули его ученику.
                </p>
              )}
              </div>
            </div>
          </article>
        </section>

        <section className={styles.surface} style={{ marginTop: "1.25rem" }}>
          <div className={styles.surfaceHeader}>
            <div>
              <p className={styles.surfaceEyebrow}>Шаг 5</p>
              <h2 className={styles.surfaceTitle}>Загрузить видео для урока</h2>
            </div>
          </div>
          <div style={{ padding: "2rem" }} className={styles.gridTwo}>
            <form className={styles.formStack} onSubmit={handleUploadVideo}>
              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Урок</span>
                <select
                  className={styles.fieldSelect}
                  onChange={(event) => updateForm("upload", "lessonId", event.target.value)}
                  required
                  value={forms.upload.lessonId}
                >
                  <option value="">Выберите урок...</option>
                  {lessonOptions.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.courseTitle} / {lesson.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Куда грузим (Провайдер)</span>
                <select
                  className={styles.fieldSelect}
                  onChange={(event) => updateForm("upload", "provider", event.target.value)}
                  value={forms.upload.provider}
                >
                  <option value="RAILWAY_LOCAL">Локально (Railway)</option>
                  <option value="MUX">Mux</option>
                  <option value="CLOUDFLARE_STREAM">Cloudflare Stream</option>
                </select>
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Видео файл (.mp4)</span>
                <input
                  ref={fileInputRef}
                  accept="video/*"
                  className={styles.fieldInput}
                  onChange={(event) => setSelectedUploadFile(event.target.files?.[0] || null)}
                  type="file"
                />
              </label>

              <button className={styles.solidButton} disabled={busyAction === "upload-video"} type="submit">
                {busyAction === "upload-video" ? "Загружаем..." : "Загрузить видео"}
              </button>
            </form>

            <div className={styles.callout}>
              <p className={styles.surfaceEyebrow}>Статус загрузки</p>
              <h3 className={styles.calloutTitle}>
                {uploadState ? `${uploadState.lessonTitle}: ${uploadState.status}` : "Загрузка еще не начиналась"}
              </h3>
              <p className={styles.helperText} style={{ color: "var(--text-soft)" }}>
                Ожидаемый процесс: waiting_upload → uploading → processing → ready. Как только видео станет ready, студенты смогут его смотреть.
              </p>
              {uploadState ? (
                <div className={styles.compactList}>
                  <span>ID: {uploadState.assetId}</span>
                  <span>Файл: {uploadState.fileName}</span>
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
                <p className={styles.surfaceEyebrow}>База данных</p>
                <h2 className={styles.surfaceTitle}>Каталог и ученики</h2>
              </div>
            </div>
            <div style={{ padding: "2rem", display: "grid", gap: "1.5rem" }}>
              <div className={styles.surfaceGrid}>
                <p className={styles.surfaceEyebrow}>Студенты</p>
                {loading && !data.users.length ? (
                  <p className={styles.helperText}>Загружаем студентов...</p>
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
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "flex-start" }}>
                    <p className={styles.helperText}>Пусто. Нет студентов.</p>
                    <button className={styles.solidButton} onClick={handleCreateDemoData} disabled={busyAction === "demo-data"} type="button">
                      {busyAction === "demo-data" ? "Создаем..." : "Заполнить демо-данными (Курсы и Ученики)"}
                    </button>
                  </div>
                )}
              </div>

              <div className={styles.surfaceGrid}>
                <p className={styles.surfaceEyebrow}>Курсы</p>
                {loading && !data.courses.length ? (
                  <p className={styles.helperText}>Загружаем курсы...</p>
                ) : data.courses.length ? (
                  <div className={styles.compactList}>
                    {data.courses.map((course) => (
                      <div className={styles.materialCard} key={course.id}>
                        <strong>{course.title}</strong>
                        <p className={styles.helperText}>{course.shortDescription || "Нет описания."}</p>
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
                  <p className={styles.helperText}>Пока нет добавленных курсов. Можете создать выше или нажать кнопку 'Заполнить демо-данными'.</p>
                )}
              </div>
            </div>
          </article>

          <article className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <p className={styles.surfaceEyebrow}>Сессии и Токены</p>
                <h2 className={styles.surfaceTitle}>Контроль доступов</h2>
              </div>
            </div>
            <div style={{ padding: "2rem", display: "grid", gap: "1.5rem" }}>
              <div className={styles.surfaceGrid}>
                <p className={styles.surfaceEyebrow}>Токены (Приглашения)</p>
                {loading && !data.tokens.length ? (
                  <p className={styles.helperText}>Загружаем токены...</p>
                ) : data.tokens.length ? (
                  <div className={styles.miniTable}>
                    <div className={styles.miniTableHeader}>
                      <span>Студент</span>
                      <span>Статус</span>
                      <span>Истекает</span>
                      <span>Действие</span>
                    </div>
                    {data.tokens.map((token) => (
                      <div className={styles.miniTableRow} key={token.id}>
                        <span>
                          <strong>{token.user?.fullName || token.user?.email || "Студент"}</strong>
                          <small>{token.enrollment?.course?.title || "Курс"}</small>
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
                              Отозвать
                            </button>
                          ) : (
                            <span className={styles.helperText}>-</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.helperText}>Ещё не было выдано токенов.</p>
                )}
              </div>

              <div className={styles.surfaceGrid}>
                <p className={styles.surfaceEyebrow}>Активные сессии веб-плеера</p>
                {loading && !data.sessions.length ? (
                  <p className={styles.helperText}>Загружаем сессии...</p>
                ) : data.sessions.length ? (
                  <div className={styles.miniTable}>
                    <div className={styles.miniTableHeader}>
                      <span>Студент</span>
                      <span>Статус</span>
                      <span>Последний онлайн</span>
                      <span>Действие</span>
                    </div>
                    {data.sessions.map((session) => (
                      <div className={styles.miniTableRow} key={session.id}>
                        <span>
                          <strong>{session.user?.fullName || session.user?.email || "Студент"}</strong>
                          <small>{session.deviceLabel || "С браузера"}</small>
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
                              Отключить (Выкинуть)
                            </button>
                          ) : (
                            <span className={styles.helperText}>-</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.helperText}>Сейчас никто из студентов не смотрит курс.</p>
                )}
              </div>
            </div>
          </article>
        </section>

        <section className={styles.gridTwo} style={{ paddingTop: "1.25rem", paddingBottom: "3rem" }}>
          <article className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <p className={styles.surfaceEyebrow}>Видео материалы</p>
                <h2 className={styles.surfaceTitle}>Транскодинг</h2>
              </div>
            </div>
            <div style={{ padding: "2rem" }}>
              {loading && !data.uploads.length ? (
                <p className={styles.helperText}>Загрузки...</p>
              ) : data.uploads.length ? (
                <div className={styles.miniTable}>
                  <div className={styles.miniTableHeader}>
                    <span>Урок</span>
                    <span>Статус</span>
                    <span>Провайдер</span>
                    <span>Обновлен</span>
                  </div>
                  {data.uploads.map((asset) => (
                    <div className={styles.miniTableRow} key={asset.id}>
                      <span>
                        <strong>{asset.lessonTitle || "Видео урока"}</strong>
                        <small>{asset.courseTitle || "Курс"}</small>
                      </span>
                      <span className={badgeClass(asset.status)}>{asset.status}</span>
                      <span>{asset.provider}</span>
                      <span>{formatDateTime(asset.updatedAt)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.helperText}>Нет загруженных видео.</p>
              )}
            </div>
          </article>

          <article className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <p className={styles.surfaceEyebrow}>Аудит лог</p>
                <h2 className={styles.surfaceTitle}>Последние действия</h2>
              </div>
            </div>
            <div style={{ padding: "2rem" }}>
              {loading && !data.logs.length ? (
                <p className={styles.helperText}>Загружаем логи...</p>
              ) : data.logs.length ? (
                <div className={styles.compactList}>
                  {data.logs.slice(0, 10).map((log) => (
                    <div className={styles.materialCard} key={log.id}>
                      <strong>{log.eventType}</strong>
                      <p className={styles.helperText}>
                        {log.actorType} · {log.entityType || "системно"} · {formatDateTime(log.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.helperText}>События безопасности отсутствуют.</p>
              )}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
