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

      setError(requestError.message || "Не удалось загрузить админку.");
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
        role: "STUDENT",
        status: "ACTIVE"
      });

      setForms((current) => ({
        ...current,
        createUser: {
          fullName: "",
          email: ""
        },
        enrollment: {
          ...current.enrollment,
          userId: created.id
        }
      }));
      setNotice("Ученик создан. Следующий шаг - зачислить его на курс.");
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
      setNotice("Курс создан. Теперь добавьте первый урок.");
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
      setNotice("Зачисление создано. Теперь можно выдать токен.");
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
        activationExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        note: "Выдан из админки SecureCourse"
      });

      setLastIssuedToken({
        id: issued.id,
        token: issued.token,
        studentName: enrollment.user.fullName,
        studentEmail: enrollment.user.email,
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
      setError("Не удалось скопировать токен. Скопируйте его вручную.");
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
      setNotice("Сессия ученика завершена.");
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

    try {
      if (!forms.upload.lessonId) {
        throw new Error("Сначала выберите урок.");
      }

      if (!selectedUploadFile) {
        throw new Error("Выберите видеофайл для загрузки.");
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
        lessonTitle: selectedUploadLesson?.title || "Урок",
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
        lessonTitle: selectedUploadLesson?.title || "Урок",
        fileName: selectedUploadFile.name
      });

      setNotice("Файл получен. Идет обработка видео...");

      for (let attempt = 0; attempt < 12; attempt += 1) {
        await wait(700);
        const uploads = await getUploads();
        const currentAsset = uploads.find((item) => item.id === intent.assetId);

        if (currentAsset) {
          setUploadState({
            assetId: currentAsset.id,
            status: currentAsset.status,
            lessonTitle: currentAsset.lessonTitle || selectedUploadLesson?.title || "Урок",
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
              <h1 className={styles.heroTitle}>Управление курсами по IELTS, английскому и поступлению за рубеж.</h1>
              <p className={styles.heroLead}>
                Здесь менеджер создает ученика, курс и урок, зачисляет студента, выдает одноразовый токен и загружает
                видео. Flow должен быть прямым: ученик - курс - урок - зачисление - токен - активация - просмотр.
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
                    <strong>{adminSession?.user?.fullName || adminSession?.user?.username || "Команда SecureCourse"}</strong>
                    <p>{adminSession?.user?.email || "Серверная сессия администратора активна."}</p>
                  </div>
                </article>
                <article className={styles.heroCard}>
                  <div>
                    <strong>Базовые программы уже загружены</strong>
                    <p>IELTS Writing, Speaking, scholarships, personal statement, documents и admission timeline.</p>
                  </div>
                </article>
                <article className={styles.heroCard}>
                  <div>
                    <strong>Как дать доступ ученику</strong>
                    <p>Зачислите на курс, выпустите токен, скопируйте код и отправьте его ученику на публичную страницу.</p>
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
            <span className={styles.statusMeta}>{data.metrics.activeUsers} активных</span>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Токены сегодня</span>
            <strong className={styles.metricValue}>{data.metrics.issuedTokensToday}</strong>
            <span className={styles.statusMeta}>Выдано за текущий день</span>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Активные сессии</span>
            <strong className={styles.metricValue}>{data.metrics.activeSessions}</strong>
            <span className={styles.statusMeta}>Одновременно у ученика только 1 сессия</span>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Готовые видео</span>
            <strong className={styles.metricValue}>{data.metrics.readyVideoAssets}</strong>
            <span className={styles.statusMeta}>Video assets в статусе ready</span>
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
                  placeholder="Сюда можно сразу добавить текстовый материал к уроку"
                  rows={5}
                  value={forms.lesson.notes}
                />
              </label>

              <button
                className={styles.solidButton}
                disabled={busyAction === "create-lesson" || !forms.lesson.courseId}
                type="submit"
              >
                {busyAction === "create-lesson" ? "Создаем..." : "Создать урок"}
              </button>
            </form>
          </section>

          <section className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <p className={styles.surfaceEyebrow}>Шаг 4 и 5</p>
                <h2 className={styles.surfaceTitle}>Зачислить и выдать токен</h2>
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
                      {student.fullName} — {student.email}
                    </option>
                  ))}
                </select>
              </label>

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

              {!students.length || !courses.length ? (
                <p className={styles.helperText}>Для зачисления нужен хотя бы один ученик и один курс.</p>
              ) : null}

              <button
                className={styles.solidButton}
                disabled={busyAction === "create-enrollment" || !forms.enrollment.userId || !forms.enrollment.courseId}
                type="submit"
              >
                {busyAction === "create-enrollment" ? "Зачисляем..." : "Зачислить на курс"}
              </button>
            </form>

            <form className={`${styles.formStack} ${styles.panelBody}`} onSubmit={handleIssueToken} style={{ paddingTop: 0 }}>
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
        </section>

        <section className={styles.surface} style={{ marginTop: "2rem" }}>
          <div className={styles.surfaceHeader}>
            <div>
              <p className={styles.surfaceEyebrow}>Результат токена</p>
              <h2 className={styles.surfaceTitle}>После генерации код сразу виден и готов к копированию.</h2>
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
                  <Link className={styles.outlineButton} href="/securecourse">
                    Открыть страницу активации
                  </Link>
                </div>
              </div>
            ) : (
              <p className={styles.helperText}>
                Здесь появится последний сгенерированный токен: код, студент, курс, статус и время истечения.
              </p>
            )}
          </div>
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
              <p className={styles.surfaceEyebrow}>Текущее состояние загрузки</p>
              <h3 className={styles.calloutTitle}>
                {uploadState ? `${uploadState.lessonTitle}: ${uploadState.status}` : "Загрузка еще не запускалась"}
              </h3>
              <p className={styles.helperText} style={{ color: "var(--text-soft)" }}>
                Ожидаемый процесс: waiting_upload, затем uploading, processing и ready. Как только статус дойдет до
                ready, урок можно будет открыть в кабинете ученика.
              </p>

              {uploadState ? (
                <div className={styles.compactList}>
                  <span>ID: {uploadState.assetId}</span>
                  <span>Файл: {uploadState.fileName}</span>
                  <span className={badgeClass(uploadState.status)}>{uploadState.status}</span>
                </div>
              ) : (
                <p className={styles.helperText}>Выберите урок, выберите файл и запустите upload flow.</p>
              )}
            </div>
          </form>
        </section>

        <section className={`${styles.gridTwo} ${styles.sectionSpacingTop}`}>
          <section className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <p className={styles.surfaceEyebrow}>Students</p>
                <h2 className={styles.surfaceTitle}>Ученики и их зачисления</h2>
              </div>
            </div>

            <div className={styles.miniTable}>
              <div className={styles.miniTableHeader}>
                <span>Ученик</span>
                <span>Email</span>
                <span>Курсы</span>
              </div>

              {students.length ? (
                students.map((student) => (
                  <div className={styles.miniTableRow} key={student.id}>
                    <strong>{student.fullName}</strong>
                    <small>{student.email}</small>
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
                <p className={styles.surfaceEyebrow}>Courses</p>
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
                <p className={styles.surfaceEyebrow}>Tokens</p>
                <h2 className={styles.surfaceTitle}>Одноразовые токены</h2>
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
                        revoke
                      </button>
                    </small>
                  </div>
                ))
              ) : (
                <p className={styles.helperText} style={{ padding: "1.25rem 1.5rem" }}>
                  Токенов пока нет. После генерации они появятся здесь со статусами `ISSUED`, `USED`, `REVOKED` или
                  `EXPIRED`.
                </p>
              )}
            </div>
          </section>

          <section className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <p className={styles.surfaceEyebrow}>Sessions</p>
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
                    <small>{formatDateTime(session.startedAt || session.createdAt)}</small>
                    <small>
                      <span className={badgeClass(session.status)}>{session.status}</span>{" "}
                      <button
                        className={styles.inlineLinkButton}
                        disabled={busyAction === `revoke-session-${session.id}` || session.status !== "ACTIVE"}
                        onClick={() => handleRevokeSession(session.id)}
                        type="button"
                      >
                        revoke
                      </button>
                    </small>
                  </div>
                ))
              ) : (
                <p className={styles.helperText} style={{ padding: "1.25rem 1.5rem" }}>
                  Пока нет ученических сессий. Они появятся после активации токена на публичной странице.
                </p>
              )}
            </div>
          </section>
        </section>

        <section className={`${styles.gridTwo} ${styles.sectionSpacingTop}`}>
          <section className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <p className={styles.surfaceEyebrow}>Video pipeline</p>
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
                <p className={styles.surfaceEyebrow}>Recent activity</p>
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
                  Логи появятся после действий в админке и после активации токенов учениками.
                </p>
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
