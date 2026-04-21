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

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatCountdown(value) {
  if (!value) {
    return "";
  }

  const diff = Math.max(0, Math.floor((new Date(value).getTime() - Date.now()) / 1000));
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
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

function SessionCountdown({ expiresAt, status }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    if (status !== "ACTIVE") {
      setRemaining("");
      return;
    }

    const update = () => setRemaining(formatCountdown(expiresAt));
    update();
    const timer = setInterval(update, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, status]);

  if (status !== "ACTIVE" || !remaining) {
    return null;
  }

  return (
    <span
      style={{
        marginLeft: "8px",
        marginRight: "4px",
        fontVariantNumeric: "tabular-nums",
        opacity: 0.72,
        fontSize: "0.85em",
        whiteSpace: "nowrap"
      }}
    >
      до авто-выхода {remaining}
    </span>
  );
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
      email: "",
      phone: ""
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

  const students = useMemo(
    () => [...data.users].sort((left, right) => left.fullName.localeCompare(right.fullName, "ru")),
    [data.users]
  );

  const courses = useMemo(
    () => [...data.courses].sort((left, right) => left.title.localeCompare(right.title, "en")),
    [data.courses]
  );

  const lessonOptions = useMemo(
    () =>
      courses.flatMap((course) =>
        (course.lessons || []).map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          status: lesson.status,
          courseId: course.id,
          courseTitle: course.title
        }))
      ),
    [courses]
  );

  const activeEnrollments = useMemo(
    () =>
      students.flatMap((user) =>
        (user.enrollments || [])
          .filter((enrollment) => enrollment.status === "ACTIVE")
          .map((enrollment) => ({
            ...enrollment,
            user
          }))
      ),
    [students]
  );

  const selectedUploadLesson = useMemo(
    () => lessonOptions.find((lesson) => lesson.id === forms.upload.lessonId) || null,
    [forms.upload.lessonId, lessonOptions]
  );

  const verifiedStudentsCount = useMemo(
    () => students.filter((student) => student.studentAccount?.fullyVerified).length,
    [students]
  );

  const pendingVerificationCount = useMemo(
    () =>
      students.filter(
        (student) =>
          student.studentAccount &&
          !student.studentAccount.fullyVerified &&
          student.studentAccount.status !== "BLOCKED"
      ).length,
    [students]
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

      setError(requestError.message || "Не удалось загрузить данные админки.");
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
    if (!forms.lesson.courseId && courses[0]?.id) {
      updateForm("lesson", "courseId", courses[0].id);
    }

    if (!forms.enrollment.userId && students[0]?.id) {
      updateForm("enrollment", "userId", students[0].id);
    }

    if (!forms.enrollment.courseId && courses[0]?.id) {
      updateForm("enrollment", "courseId", courses[0].id);
    }

    if (!forms.token.enrollmentId && activeEnrollments[0]?.id) {
      updateForm("token", "enrollmentId", activeEnrollments[0].id);
    }

    if (!forms.upload.lessonId && lessonOptions[0]?.id) {
      updateForm("upload", "lessonId", lessonOptions[0].id);
    }
  }, [
    activeEnrollments,
    courses,
    students,
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
      const created = await createUser({
        email: forms.createUser.email,
        fullName: forms.createUser.fullName,
        phone: forms.createUser.phone,
        role: "STUDENT",
        status: "ACTIVE"
      });

      setForms((current) => ({
        ...current,
        createUser: {
          fullName: "",
          email: "",
          phone: ""
        },
        enrollment: {
          ...current.enrollment,
          userId: created.id
        }
      }));

      setNotice("Ученик создан. Теперь назначьте ему курс и выпустите токен.");
      await loadAdminData({ showSpinner: false });
    } catch (requestError) {
      setError(requestError.message || "Не удалось создать ученика.");
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
      const course = await createCourse({
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
        },
        lesson: {
          ...current.lesson,
          courseId: course.id
        },
        enrollment: {
          ...current.enrollment,
          courseId: course.id
        }
      }));

      setNotice("Курс создан. Следующий шаг — добавить урок и материалы.");
      await loadAdminData({ showSpinner: false });
    } catch (requestError) {
      setError(requestError.message || "Не удалось создать курс.");
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
          title: `${forms.lesson.title} — конспект`,
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

      setNotice("Урок создан. Теперь можно загрузить видео.");
      await loadAdminData({ showSpinner: false });
    } catch (requestError) {
      setError(requestError.message || "Не удалось создать урок.");
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
      const enrollment = await createEnrollment({
        userId: forms.enrollment.userId,
        courseId: forms.enrollment.courseId,
        note: "Назначено менеджером через админку"
      });

      setForms((current) => ({
        ...current,
        token: {
          enrollmentId: enrollment.id
        }
      }));

      setNotice("Зачисление создано. Теперь можно сгенерировать токен доступа.");
      await loadAdminData({ showSpinner: false });
    } catch (requestError) {
      setError(requestError.message || "Не удалось зачислить ученика.");
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
        throw new Error("Сначала выберите активное зачисление.");
      }

      const issued = await issueToken({
        userId: enrollment.userId,
        enrollmentId: enrollment.id,
        activationExpiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        note: "Выдан из админки SecureCourse"
      });

      setLastIssuedToken({
        id: issued.id,
        token: issued.token,
        studentName: enrollment.user.fullName,
        studentEmail: enrollment.user.email,
        studentPhone: enrollment.user.phone || enrollment.user.studentAccount?.phone || "",
        courseTitle: enrollment.course.title,
        status: issued.status,
        expiresAt: issued.activationExpiresAt
      });
      setCopiedToken("");
      setNotice("Токен выпущен. Скопируйте его и отправьте ученику.");
      await loadAdminData({ showSpinner: false });
    } catch (requestError) {
      setError(requestError.message || "Не удалось выпустить токен.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleCopyToken(rawToken) {
    try {
      await navigator.clipboard.writeText(rawToken);
      setCopiedToken(rawToken);
      setNotice("Токен скопирован. Теперь его можно отправить ученику.");
    } catch {
      setError("Не удалось скопировать токен автоматически. Скопируйте его вручную.");
    }
  }

  async function handleRevokeToken(tokenId) {
    setBusyAction(`revoke-token-${tokenId}`);
    setError("");
    setNotice("");

    try {
      await revokeToken(tokenId, "revoked_by_manager");
      setNotice("Токен отозван.");
      await loadAdminData({ showSpinner: false });
    } catch (requestError) {
      setError(requestError.message || "Не удалось отозвать токен.");
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
      setNotice("Сессия завершена менеджером.");
      await loadAdminData({ showSpinner: false });
    } catch (requestError) {
      setError(requestError.message || "Не удалось завершить сессию.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleUploadVideo(event) {
    event.preventDefault();
    setBusyAction("upload-video");
    setError("");
    setNotice("");

    if (!selectedUploadLesson) {
      setBusyAction("");
      setError("Сначала выберите урок для загрузки видео.");
      return;
    }

    if (!selectedUploadFile) {
      setBusyAction("");
      setError("Выберите видеофайл.");
      return;
    }

    try {
      const intent = await createUploadIntent({
        lessonId: forms.upload.lessonId,
        provider: forms.upload.provider
      });

      setUploadState({
        assetId: intent.assetId,
        status: intent.status,
        lessonTitle: selectedUploadLesson.title,
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
        throw new Error(uploadPayload?.message || "Загрузка завершилась с ошибкой.");
      }

      setUploadState({
        assetId: intent.assetId,
        status: uploadPayload?.asset?.status || "processing",
        lessonTitle: selectedUploadLesson.title,
        fileName: selectedUploadFile.name
      });
      setNotice("Файл загружен. Идет обработка видео...");

      for (let attempt = 0; attempt < 12; attempt += 1) {
        await wait(700);
        const uploads = await getUploads();
        const currentAsset = uploads.find((item) => item.id === intent.assetId);

        if (currentAsset) {
          setUploadState({
            assetId: currentAsset.id,
            status: currentAsset.status,
            lessonTitle: currentAsset.lessonTitle || selectedUploadLesson.title,
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

      setNotice("Upload flow завершен. Видео привязано к уроку и готово к просмотру.");
    } catch (requestError) {
      setError(requestError.message || "Не удалось загрузить видео.");
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
      setError(requestError.message || "Не удалось выйти из админки.");
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
              <p className={styles.surfaceEyebrow}>Админка продукта</p>
              <h1 className={styles.heroTitle}>
                Управление курсами по IELTS, английскому и поступлению за рубеж.
              </h1>
              <p className={styles.heroLead}>
                Здесь менеджер создает ученика, курс и урок, зачисляет ученика, выдает одноразовый токен,
                контролирует сессии и загружает видео. Весь flow должен проходиться без пустых шагов и тупиков.
              </p>
              <div className={styles.heroActions}>
                <button className={styles.solidButton} onClick={() => loadAdminData()} type="button">
                  Обновить данные
                </button>
                <button
                  className={styles.outlineButton}
                  disabled={busyAction === "logout-admin"}
                  onClick={handleAdminLogout}
                  type="button"
                >
                  {busyAction === "logout-admin" ? "Выходим..." : "Выйти"}
                </button>
                <Link className={styles.ghostButton} href="/securecourse">
                  Публичная страница
                </Link>
              </div>
            </div>

            <aside className={styles.heroPanel}>
              <p className={styles.panelKicker}>Сейчас в работе</p>
              <div className={styles.panelList}>
                <article className={styles.heroCard}>
                  <div>
                    <strong>
                      {adminSession?.user?.fullName || adminSession?.user?.username || "Команда SecureCourse"}
                    </strong>
                    <p>
                      {adminSession?.user?.email || "Активная серверная сессия админки"}
                      {adminSession?.user?.role ? ` • ${adminSession.user.role}` : ""}
                    </p>
                  </div>
                </article>
                <article className={styles.heroCard}>
                  <div>
                    <strong>Сессия админки активна</strong>
                    <p>
                      Последняя активность: {formatDateTime(adminSession?.session?.lastSeenAt)} • истекает:{" "}
                      {formatDateTime(adminSession?.session?.expiresAt)}
                    </p>
                  </div>
                </article>
                <article className={styles.heroCard}>
                  <div>
                    <strong>Базовые программы уже загружены</strong>
                    <p>
                      IELTS Writing, Speaking, scholarships, personal statement, admission documents и timeline.
                    </p>
                  </div>
                </article>
                <article className={styles.heroCard}>
                  <div>
                    <strong>Как дать доступ ученику</strong>
                    <p>Создайте ученика, назначьте курс, выпустите токен, скопируйте его и отправьте на активацию.</p>
                  </div>
                </article>
              </div>
            </aside>
          </div>
        </section>

        <section className={styles.metricStrip}>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Ученики</span>
            <strong className={styles.metricValue}>{data.metrics.totalUsers}</strong>
            <span className={styles.statusMeta}>
              {verifiedStudentsCount} verified • {pendingVerificationCount} ждут подтверждение
            </span>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Токены сегодня</span>
            <strong className={styles.metricValue}>{data.metrics.issuedTokensToday}</strong>
            <span className={styles.statusMeta}>Выдано за текущий день</span>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Активные сессии</span>
            <strong className={styles.metricValue}>{data.metrics.activeSessions}</strong>
            <span className={styles.statusMeta}>У ученика одновременно только одна активная сессия</span>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Готовые видео</span>
            <strong className={styles.metricValue}>{data.metrics.readyVideoAssets}</strong>
            <span className={styles.statusMeta}>Видео доступны к просмотру</span>
          </article>
        </section>

        {loading ? <p className={styles.helperText}>Обновляем данные админки...</p> : null}
        {error ? <p className={styles.feedbackError}>{error}</p> : null}
        {notice ? <p className={styles.feedbackSuccess}>{notice}</p> : null}

        <section className={`${styles.gridTwo} ${styles.sectionSpacingTop}`}>
          <section className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <p className={styles.surfaceEyebrow}>Шаг 1</p>
                <h2 className={styles.surfaceTitle}>Создать ученика</h2>
              </div>
            </div>

            <form className={`${styles.formStack} ${styles.panelBody}`} onSubmit={handleCreateUser}>
              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Имя и фамилия</span>
                <input
                  className={styles.fieldInput}
                  onChange={(event) => updateForm("createUser", "fullName", event.target.value)}
                  placeholder="Например, Айгерим Нурбекова"
                  required
                  type="text"
                  value={forms.createUser.fullName}
                />
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Email ученика</span>
                <input
                  className={styles.fieldInput}
                  onChange={(event) => updateForm("createUser", "email", event.target.value)}
                  placeholder="student@example.com"
                  required
                  type="email"
                  value={forms.createUser.email}
                />
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Телефон</span>
                <input
                  className={styles.fieldInput}
                  onChange={(event) => updateForm("createUser", "phone", event.target.value)}
                  placeholder="+7 777 123 45 67"
                  type="tel"
                  value={forms.createUser.phone}
                />
              </label>

              <button className={styles.solidButton} disabled={busyAction === "create-user"} type="submit">
                {busyAction === "create-user" ? "Создаем..." : "Создать ученика"}
              </button>
            </form>
          </section>

          <section className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <p className={styles.surfaceEyebrow}>Шаг 2</p>
                <h2 className={styles.surfaceTitle}>Создать курс</h2>
              </div>
            </div>

            <form className={`${styles.formStack} ${styles.panelBody}`} onSubmit={handleCreateCourse}>
              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Название курса</span>
                <input
                  className={styles.fieldInput}
                  onChange={(event) => updateForm("createCourse", "title", event.target.value)}
                  placeholder="IELTS Writing Bootcamp"
                  required
                  type="text"
                  value={forms.createCourse.title}
                />
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Slug</span>
                <input
                  className={styles.fieldInput}
                  onChange={(event) => updateForm("createCourse", "slug", slugify(event.target.value))}
                  placeholder="ielts-writing-bootcamp"
                  type="text"
                  value={forms.createCourse.slug}
                />
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Короткое описание</span>
                <textarea
                  className={styles.fieldTextarea}
                  onChange={(event) => updateForm("createCourse", "shortDescription", event.target.value)}
                  placeholder="Что ученик получит в этом курсе"
                  rows={3}
                  value={forms.createCourse.shortDescription}
                />
              </label>

              <button className={styles.solidButton} disabled={busyAction === "create-course"} type="submit">
                {busyAction === "create-course" ? "Создаем..." : "Создать курс"}
              </button>
            </form>
          </section>
        </section>

        <section className={`${styles.gridTwo} ${styles.sectionSpacingTop}`}>
          <section className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <p className={styles.surfaceEyebrow}>Шаг 3</p>
                <h2 className={styles.surfaceTitle}>Создать урок и материалы</h2>
              </div>
            </div>

            <form className={`${styles.formStack} ${styles.panelBody}`} onSubmit={handleCreateLesson}>
              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Курс</span>
                <select
                  className={styles.fieldSelect}
                  onChange={(event) => updateForm("lesson", "courseId", event.target.value)}
                  value={forms.lesson.courseId}
                >
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </label>

              {!courses.length ? (
                <p className={styles.helperText}>Пока нет курсов. Сначала создайте курс или используйте стартовые данные.</p>
              ) : null}

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Название урока</span>
                <input
                  className={styles.fieldInput}
                  onChange={(event) => updateForm("lesson", "title", event.target.value)}
                  placeholder="Например, Structure of IELTS Task 2"
                  required
                  type="text"
                  value={forms.lesson.title}
                />
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Slug урока</span>
                <input
                  className={styles.fieldInput}
                  onChange={(event) => updateForm("lesson", "slug", slugify(event.target.value))}
                  placeholder="task-2-essay-structure"
                  type="text"
                  value={forms.lesson.slug}
                />
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Описание урока</span>
                <textarea
                  className={styles.fieldTextarea}
                  onChange={(event) => updateForm("lesson", "content", event.target.value)}
                  placeholder="Кратко опишите, что внутри урока"
                  rows={4}
                  value={forms.lesson.content}
                />
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Конспект / заметки</span>
                <textarea
                  className={styles.fieldTextarea}
                  onChange={(event) => updateForm("lesson", "notes", event.target.value)}
                  placeholder="Ключевые тезисы, шаблоны, checklist, полезные ссылки"
                  rows={4}
                  value={forms.lesson.notes}
                />
              </label>

              <button className={styles.solidButton} disabled={busyAction === "create-lesson"} type="submit">
                {busyAction === "create-lesson" ? "Создаем..." : "Создать урок"}
              </button>
            </form>
          </section>

          <section className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <p className={styles.surfaceEyebrow}>Шаг 4</p>
                <h2 className={styles.surfaceTitle}>Зачислить ученика на курс</h2>
              </div>
            </div>

            <form className={`${styles.formStack} ${styles.panelBody}`} onSubmit={handleCreateEnrollment}>
              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Ученик</span>
                <select
                  className={styles.fieldSelect}
                  onChange={(event) => updateForm("enrollment", "userId", event.target.value)}
                  value={forms.enrollment.userId}
                >
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.fullName}
                    </option>
                  ))}
                </select>
              </label>

              {!students.length ? (
                <p className={styles.helperText}>Пока нет учеников. Создайте первого ученика в шаге 1.</p>
              ) : null}

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Курс</span>
                <select
                  className={styles.fieldSelect}
                  onChange={(event) => updateForm("enrollment", "courseId", event.target.value)}
                  value={forms.enrollment.courseId}
                >
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </label>

              {!courses.length ? (
                <p className={styles.helperText}>Пока нет курсов. Создайте курс в шаге 2.</p>
              ) : null}

              <button
                className={styles.solidButton}
                disabled={busyAction === "create-enrollment" || !forms.enrollment.userId || !forms.enrollment.courseId}
                type="submit"
              >
                {busyAction === "create-enrollment" ? "Назначаем..." : "Назначить курс"}
              </button>
            </form>
          </section>
        </section>

        <section className={`${styles.gridTwo} ${styles.sectionSpacingTop}`}>
          <section className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <p className={styles.surfaceEyebrow}>Шаг 5</p>
                <h2 className={styles.surfaceTitle}>Сгенерировать токен</h2>
              </div>
            </div>

            <form className={`${styles.formStack} ${styles.panelBody}`} onSubmit={handleIssueToken}>
              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Активное зачисление</span>
                <select
                  className={styles.fieldSelect}
                  onChange={(event) => updateForm("token", "enrollmentId", event.target.value)}
                  value={forms.token.enrollmentId}
                >
                  {activeEnrollments.map((enrollment) => (
                    <option key={enrollment.id} value={enrollment.id}>
                      {enrollment.user.fullName} → {enrollment.course.title}
                    </option>
                  ))}
                </select>
              </label>

              {!activeEnrollments.length ? (
                <p className={styles.helperText}>Пока нет активных зачислений. Сначала назначьте ученика на курс.</p>
              ) : null}

              <button
                className={styles.solidButton}
                disabled={busyAction === "issue-token" || !forms.token.enrollmentId}
                type="submit"
              >
                {busyAction === "issue-token" ? "Выпускаем..." : "Сгенерировать токен"}
              </button>
            </form>
          </section>

          <section className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <p className={styles.surfaceEyebrow}>Результат токена</p>
                <h2 className={styles.surfaceTitle}>Код сразу виден, копируется и ведет на активацию.</h2>
              </div>
            </div>

            <div className={styles.panelBody}>
              {lastIssuedToken ? (
                <div className={styles.tokenReveal}>
                  <p className={styles.surfaceEyebrow}>Одноразовый код доступа</p>
                  <code className={styles.tokenRevealValue}>{lastIssuedToken.token}</code>
                  <div className={styles.tokenRevealMeta}>
                    <span>
                      <strong>Студент:</strong> {lastIssuedToken.studentName}
                    </span>
                    <span>
                      <strong>Email:</strong> {lastIssuedToken.studentEmail}
                    </span>
                    {lastIssuedToken.studentPhone ? (
                      <span>
                        <strong>Телефон:</strong> {lastIssuedToken.studentPhone}
                      </span>
                    ) : null}
                    <span>
                      <strong>Курс:</strong> {lastIssuedToken.courseTitle}
                    </span>
                    <span>
                      <strong>Статус:</strong> {lastIssuedToken.status}
                    </span>
                    <span>
                      <strong>Сгорит:</strong> {formatDateTime(lastIssuedToken.expiresAt)}
                    </span>
                  </div>
                  <div className={styles.heroActions}>
                    <button className={styles.solidButton} onClick={() => handleCopyToken(lastIssuedToken.token)} type="button">
                      {copiedToken === lastIssuedToken.token ? "Скопировано" : "Скопировать токен"}
                    </button>
                    <Link
                      className={styles.outlineButton}
                      href={`/securecourse?token=${encodeURIComponent(lastIssuedToken.token)}#activation`}
                    >
                      Перейти к активации
                    </Link>
                  </div>
                </div>
              ) : (
                <p className={styles.helperText}>
                  После генерации здесь появится код токена, ученик, курс, статус и дата истечения.
                </p>
              )}
            </div>
          </section>
        </section>

        <section className={styles.surface} style={{ marginTop: "2rem" }}>
          <div className={styles.surfaceHeader}>
            <div>
              <p className={styles.surfaceEyebrow}>Шаг 6</p>
              <h2 className={styles.surfaceTitle}>Upload video для выбранного урока</h2>
            </div>
          </div>

          <form className={`${styles.gridTwo} ${styles.panelBody}`} onSubmit={handleUploadVideo}>
            <div className={styles.formStack}>
              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Урок</span>
                <select
                  className={styles.fieldSelect}
                  onChange={(event) => updateForm("upload", "lessonId", event.target.value)}
                  value={forms.upload.lessonId}
                >
                  {lessonOptions.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.courseTitle} → {lesson.title}
                    </option>
                  ))}
                </select>
              </label>

              {!lessonOptions.length ? (
                <p className={styles.helperText}>Пока нет уроков. Сначала создайте урок, и он появится здесь автоматически.</p>
              ) : null}

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Провайдер</span>
                <select
                  className={styles.fieldSelect}
                  onChange={(event) => updateForm("upload", "provider", event.target.value)}
                  value={forms.upload.provider}
                >
                  <option value="RAILWAY_LOCAL">Railway local storage</option>
                </select>
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Видео файл</span>
                <input
                  accept="video/*"
                  className={styles.fieldInput}
                  onChange={(event) => setSelectedUploadFile(event.target.files?.[0] || null)}
                  ref={fileInputRef}
                  type="file"
                />
              </label>

              <button
                className={styles.solidButton}
                disabled={busyAction === "upload-video" || !forms.upload.lessonId || !selectedUploadFile}
                type="submit"
              >
                {busyAction === "upload-video" ? "Загружаем..." : "Upload video"}
              </button>
            </div>

            <div className={styles.callout}>
              <p className={styles.surfaceEyebrow}>Статус upload flow</p>
              <h3 className={styles.calloutTitle}>
                {uploadState?.lessonTitle || selectedUploadLesson?.title || "Выберите урок и видеофайл"}
              </h3>
              <div className={styles.compactList}>
                <span>
                  <strong>Статус:</strong>{" "}
                  <span className={badgeClass(uploadState?.status || "waiting_upload")}>
                    {uploadState?.status || "waiting_upload"}
                  </span>
                </span>
                <span>
                  <strong>Файл:</strong> {uploadState?.fileName || selectedUploadFile?.name || "Еще не выбран"}
                </span>
                <span>
                  <strong>Урок:</strong> {uploadState?.lessonTitle || selectedUploadLesson?.title || "-"}
                </span>
              </div>
              <p className={styles.helperText}>
                Flow: создается upload intent, файл уходит напрямую в upload route, затем UI обновляет статусы
                waiting_upload → uploading → processing → ready.
              </p>
            </div>
          </form>
        </section>

        <section className={`${styles.gridTwo} ${styles.sectionSpacingTop}`}>
          <section className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <p className={styles.surfaceEyebrow}>Ученики</p>
                <h2 className={styles.surfaceTitle}>Ученики и их доступ</h2>
              </div>
            </div>

            <div className={styles.miniTable}>
              <div className={styles.miniTableHeader}>
                <span>Ученик</span>
                <span>Контакты</span>
                <span>Аккаунт</span>
                <span>Курсы</span>
              </div>

              {students.length ? (
                students.map((student) => (
                  <div className={styles.miniTableRow} key={student.id}>
                    <strong>
                      {student.fullName}
                      {student.status !== "ACTIVE" ? ` (${student.status})` : ""}
                    </strong>
                    <small>
                      {student.email}
                      {student.phone ? <><br />{student.phone}</> : null}
                    </small>
                    <small>
                      {student.studentAccount ? (
                        <>
                          <span className={badgeClass(student.studentAccount.status)}>{student.studentAccount.status}</span>
                          <br />
                          {student.studentAccount.fullyVerified ? "email и телефон подтверждены" : "ждет email/SMS verification"}
                          {student.studentAccount.lastLoginAt ? (
                            <>
                              <br />
                              последний вход: {formatDateTime(student.studentAccount.lastLoginAt)}
                            </>
                          ) : null}
                        </>
                      ) : (
                        "Профиль создан администратором, самостоятельный вход не настроен"
                      )}
                    </small>
                    <small>{(student.enrollments || []).length || 0}</small>
                  </div>
                ))
              ) : (
                <p className={styles.helperText} style={{ padding: "1.25rem 1.5rem" }}>
                  Пока нет учеников. Создайте первого ученика в форме выше.
                </p>
              )}
            </div>
          </section>

          <section className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <p className={styles.surfaceEyebrow}>Курсы</p>
                <h2 className={styles.surfaceTitle}>Курсы и уроки</h2>
              </div>
            </div>

            <div className={styles.miniTable}>
              <div className={styles.miniTableHeader}>
                <span>Курс</span>
                <span>Уроки</span>
                <span>Статус</span>
              </div>

              {courses.length ? (
                courses.map((course) => (
                  <div className={styles.miniTableRow} key={course.id}>
                    <strong>{course.title}</strong>
                    <small>{(course.lessons || []).length || 0}</small>
                    <small>
                      <span className={badgeClass(course.status)}>{course.status}</span>
                    </small>
                  </div>
                ))
              ) : (
                <p className={styles.helperText} style={{ padding: "1.25rem 1.5rem" }}>
                  Пока нет курсов. Создайте курс или используйте стартовые программы.
                </p>
              )}
            </div>
          </section>
        </section>

        <section className={`${styles.gridTwo} ${styles.sectionSpacingTop}`}>
          <section className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <p className={styles.surfaceEyebrow}>Токены</p>
                <h2 className={styles.surfaceTitle}>Одноразовые токены доступа</h2>
              </div>
            </div>

            <div className={styles.miniTable}>
              <div className={styles.miniTableHeader}>
                <span>Preview</span>
                <span>Студент / курс</span>
                <span>Статус</span>
              </div>

              {data.tokens.length ? (
                data.tokens.map((token) => (
                  <div className={styles.miniTableRow} key={token.id}>
                    <strong>{token.preview}</strong>
                    <small>
                      {token.user?.fullName || "Ученик"} — {token.enrollment?.course?.title || "Курс"}
                    </small>
                    <small>
                      <span className={badgeClass(token.status)}>{token.status}</span>{" "}
                      <button
                        className={styles.inlineLinkButton}
                        disabled={busyAction === `revoke-token-${token.id}` || token.status !== "ISSUED"}
                        onClick={() => handleRevokeToken(token.id)}
                        type="button"
                      >
                        отозвать
                      </button>
                    </small>
                  </div>
                ))
              ) : (
                <p className={styles.helperText} style={{ padding: "1.25rem 1.5rem" }}>
                  Токенов пока нет. После генерации они появятся здесь со статусами ISSUED, USED, REVOKED или EXPIRED.
                </p>
              )}
            </div>
          </section>

          <section className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <p className={styles.surfaceEyebrow}>Сессии</p>
                <h2 className={styles.surfaceTitle}>Активные и завершенные сессии учеников</h2>
              </div>
            </div>

            <div className={styles.miniTable}>
              <div className={styles.miniTableHeader}>
                <span>Ученик</span>
                <span>Сессия</span>
                <span>Статус</span>
              </div>

              {data.sessions.length ? (
                data.sessions.map((session) => (
                  <div className={styles.miniTableRow} key={session.id}>
                    <strong>{session.user?.fullName || session.userId}</strong>
                    <small>
                      старт: {formatDateTime(session.startedAt || session.createdAt)}
                      <br />
                      idle до: {formatDateTime(session.idleExpiresAt)}
                    </small>
                    <small style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                      <span className={badgeClass(session.status)}>{session.status}</span>
                      <SessionCountdown expiresAt={session.idleExpiresAt || session.expiresAt} status={session.status} />
                      <button
                        className={styles.inlineLinkButton}
                        disabled={busyAction === `revoke-session-${session.id}` || session.status !== "ACTIVE"}
                        onClick={() => handleRevokeSession(session.id)}
                        type="button"
                      >
                        завершить
                      </button>
                    </small>
                  </div>
                ))
              ) : (
                <p className={styles.helperText} style={{ padding: "1.25rem 1.5rem" }}>
                  Пока нет ученических сессий. Они появятся после активации токена или входа ученика на сайте.
                </p>
              )}
            </div>
          </section>
        </section>

        <section className={`${styles.gridTwo} ${styles.sectionSpacingTop}`}>
          <section className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <p className={styles.surfaceEyebrow}>Видео</p>
                <h2 className={styles.surfaceTitle}>Статусы загрузок</h2>
              </div>
            </div>

            <div className={styles.miniTable}>
              <div className={styles.miniTableHeader}>
                <span>Урок</span>
                <span>Файл</span>
                <span>Статус</span>
              </div>

              {data.uploads.length ? (
                data.uploads.map((asset) => (
                  <div className={styles.miniTableRow} key={asset.id}>
                    <strong>{asset.lessonTitle || "Урок"}</strong>
                    <small>{asset.fileName || asset.provider}</small>
                    <small>
                      <span className={badgeClass(asset.status)}>{asset.status}</span>
                    </small>
                  </div>
                ))
              ) : (
                <p className={styles.helperText} style={{ padding: "1.25rem 1.5rem" }}>
                  Пока нет video assets. Они появятся после первого upload flow.
                </p>
              )}
            </div>
          </section>

          <section className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <p className={styles.surfaceEyebrow}>Логи</p>
                <h2 className={styles.surfaceTitle}>Последние действия системы</h2>
              </div>
            </div>

            <div className={styles.miniTable}>
              <div className={styles.miniTableHeader}>
                <span>Событие</span>
                <span>Тип</span>
                <span>Время</span>
              </div>

              {data.logs.length ? (
                data.logs.slice(0, 10).map((log) => (
                  <div className={styles.miniTableRow} key={log.id}>
                    <strong>{log.eventType}</strong>
                    <small>{log.entityType || "system"}</small>
                    <small>{formatDateTime(log.createdAt)}</small>
                  </div>
                ))
              ) : (
                <p className={styles.helperText} style={{ padding: "1.25rem 1.5rem" }}>
                  Логи появятся после действий в админке, регистрации учеников, активации токенов и входов на сайт.
                </p>
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
