"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  createCourse,
  createEnrollment,
  createUser,
  getDashboardSnapshot,
  issueToken,
  revokeSession,
  revokeToken
} from "@/lib/securecourse-api";
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
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
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
  const [lastIssuedToken, setLastIssuedToken] = useState(null);
  
  const [data, setData] = useState({
    metrics: { activeSessions: 0, issuedTokensToday: 0, readyVideoAssets: 0, totalUsers: 0 },
    users: [], courses: [], tokens: [], sessions: [], uploads: [], logs: []
  });

  const [forms, setForms] = useState({
    createUser: { fullName: "", email: "" },
    createCourse: { title: "", slug: "", shortDescription: "" },
    enrollment: { userId: "", courseId: "" },
    token: { enrollmentId: "" }
  });

  async function loadAdminData() {
    setLoading(true);
    setError("");
    try {
      const snapshot = await getDashboardSnapshot();
      setData(snapshot);
    } catch (requestError) {
      setError(requestError.message || "Ошибка загрузки данных админ-панели.");
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

  // Pre-fill selects safely
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
  }, [activeEnrollments, data.courses, data.users]);

  function updateForm(section, field, value) {
    setForms((current) => ({
      ...current,
      [section]: { ...current[section], [field]: value }
    }));
  }

  // --- ACTIONS ---

  async function handleCreateUser(event) {
    event.preventDefault();
    setBusyAction("create-user");
    setError(""); setNotice("");
    try {
      await createUser({
        email: forms.createUser.email,
        fullName: forms.createUser.fullName,
        role: "STUDENT",
        status: "ACTIVE"
      });
      setForms((current) => ({ ...current, createUser: { fullName: "", email: "" } }));
      setNotice("Ученик успешно создан. Теперь зачислите его на курс.");
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.message || "Ошибка создания ученика.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleCreateCourse(event) {
    event.preventDefault();
    setBusyAction("create-course");
    setError(""); setNotice("");
    try {
      const slug = forms.createCourse.slug || slugify(forms.createCourse.title);
      await createCourse({
        title: forms.createCourse.title,
        slug,
        shortDescription: forms.createCourse.shortDescription,
        description: forms.createCourse.shortDescription,
        status: "PUBLISHED"
      });
      setForms((current) => ({ ...current, createCourse: { title: "", slug: "", shortDescription: "" } }));
      setNotice("Новый курс успешно опубликован.");
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.message || "Ошибка создания курса.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleCreateEnrollment(event) {
    event.preventDefault();
    setBusyAction("create-enrollment");
    setError(""); setNotice("");
    try {
      await createEnrollment({
        userId: forms.enrollment.userId,
        courseId: forms.enrollment.courseId,
        note: "Назначено менеджером"
      });
      setNotice("Ученик зачислен на курс. Теперь можно выдать ему токен доступа.");
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.message || "Ошибка зачисления ученика.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleIssueToken(event) {
    event.preventDefault();
    setBusyAction("issue-token");
    setError(""); setNotice("");
    try {
      const enrollment = activeEnrollments.find((item) => item.id === forms.token.enrollmentId);
      if (!enrollment) throw new Error("Выберите активное зачисление.");

      const issued = await issueToken({
        userId: enrollment.userId,
        enrollmentId: enrollment.id,
        activationExpiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
        note: "Выдано менеджером"
      });

      setLastIssuedToken({
        token: issued.token,
        userEmail: enrollment.user.email,
        courseTitle: enrollment.course.title,
        expiresAt: issued.activationExpiresAt
      });
      setNotice("Одноразовый токен успешно сгенерирован.");
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.message || "Ошибка генерации токена.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleRevokeToken(tokenId) {
    setBusyAction(`revoke-token-${tokenId}`);
    setError(""); setNotice("");
    try {
      await revokeToken(tokenId, "Отозван менеджером");
      setNotice("Токен успешно отозван.");
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.message || "Ошибка отзыва токена.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleRevokeSession(sessionId) {
    setBusyAction(`revoke-${sessionId}`);
    setError(""); setNotice("");
    try {
      await revokeSession(sessionId, "Отозвана менеджером");
      setNotice("Сессия успешно закрыта.");
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.message || "Ошибка закрытия сессии.");
    } finally {
      setBusyAction("");
    }
  }

  const usersById = Object.fromEntries(data.users.map((user) => [user.id, user]));

  if (loading) {
    return <main className={styles.page}>Загрузка панели управления...</main>;
  }

  return (
    <main className={`${styles.page} ${styles.workspacePage}`}>
      <div className={styles.workspaceShell}>
        
        {/* Панель навигации (слева) */}
        <aside className={styles.sidebar}>
          <Link className={styles.brand} href="/securecourse">
            <span className={styles.brandMark}>SC</span>
            <span>
              <strong>SecureCourse</strong>
              <small>Управление доступом</small>
            </span>
          </Link>

          <div className={styles.sidebarSection}>
            <p className={styles.sidebarLabel}>Разделы</p>
            <div className={`${styles.sidebarLink} ${styles.sidebarLinkActive}`}>
              <span>Дашборд</span>
              <span className={styles.sidebarDot} aria-hidden="true" />
            </div>
            <a className={styles.sidebarLink} href="#tokens">Токены</a>
            <a className={styles.sidebarLink} href="#users">Пользователи</a>
            <a className={styles.sidebarLink} href="#courses">Курсы</a>
            <a className={styles.sidebarLink} href="#sessions">Сессии</a>
          </div>
        </aside>

        {/* Главная рабочая область */}
        <div className={styles.adminMain}>
          <header className={styles.workspaceTopbar} data-reveal>
            <div>
              <p className={styles.sectionKicker}>Панель администратора</p>
              <h1 className={styles.workspaceTitle}>Дашборд</h1>
              <p className={styles.workspaceText}>Управление базой учеников, безопасными токенами и сессиями.</p>
            </div>
            <div className={styles.workspaceActions}>
              <button className={styles.outlineButton} onClick={loadAdminData} type="button">
                Обновить данные
              </button>
              <button
                className={styles.ghostButton}
                onClick={async () => {
                  await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
                  window.location.href = "/securecourse/admin/login";
                }}
                type="button"
              >
                Выйти
              </button>
            </div>
          </header>

          {error ? <div className={styles.feedbackError}>{error}</div> : null}
          {notice ? <div className={styles.feedbackSuccess}>{notice}</div> : null}

          {lastIssuedToken ? (
            <section className={styles.feedbackCard} style={{ backgroundColor: 'rgba(56, 194, 178, 0.05)' }} data-reveal>
              <p className={styles.surfaceEyebrow}>Успешно сгенерировано</p>
              <h2 className={styles.surfaceTitle}>Вручите этот токен ученику</h2>
              <div className={styles.tokenCard} style={{ marginTop: '0.5rem' }}>
                <span className={styles.tokenLabel}>Токен доступа (одноразовый)</span>
                <code>{lastIssuedToken.token}</code>
              </div>
              <p className={styles.helperText} style={{ marginTop: '0.8rem' }}>
                Пользователь: <strong>{lastIssuedToken.userEmail}</strong> | Курс: <strong>{lastIssuedToken.courseTitle}</strong>
              </p>
              <p className={styles.helperText} style={{ opacity: 0.7 }}>
                Сгорит после первой активации. Активен до: {formatDateTime(lastIssuedToken.expiresAt)}
              </p>
            </section>
          ) : null}

          <section className={styles.metricGrid}>
            {[
              { label: "Активных сессий", value: String(data.metrics.activeSessions), tone: "green" },
              { label: "Токенов выдано", value: String(data.metrics.issuedTokensToday), tone: "blue" },
              { label: "Видео загружено", value: String(data.metrics.readyVideoAssets), tone: "gold" },
              { label: "Всего учеников", value: String(data.metrics.totalUsers), tone: "gold" }
            ].map((metric) => (
              <article className={styles.statCard} key={metric.label} data-reveal>
                <span className={styles.statLabel}>{metric.label}</span>
                <strong className={`${styles.statValue} ${toneClass(metric.tone)}`}>{metric.value}</strong>
              </article>
            ))}
          </section>

          {/* Рабочий процесс (формы слева, списки справа или в колонках) */}
          <div className={styles.adminColumns} style={{ gridTemplateColumns: "320px minmax(0, 1fr)" }}>
            
            {/* Формы быстрого действия */}
            <aside className={styles.adminRail}>
              <section className={styles.callout} data-reveal>
                <p className={styles.surfaceEyebrow}>Шаг 1</p>
                <h2 className={styles.calloutTitle}>Создать ученика</h2>
                <form className={styles.formStack} onSubmit={handleCreateUser} style={{ marginTop: '1rem' }}>
                  <label className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>ФИО</span>
                    <input className={styles.fieldInput} required type="text"
                      value={forms.createUser.fullName} onChange={(e) => updateForm("createUser", "fullName", e.target.value)} />
                  </label>
                  <label className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Email</span>
                    <input className={styles.fieldInput} required type="email"
                      value={forms.createUser.email} onChange={(e) => updateForm("createUser", "email", e.target.value)} />
                  </label>
                  <button className={styles.outlineButton} type="submit" disabled={busyAction === "create-user"}>Создать пользователя</button>
                </form>
              </section>

              <section className={styles.callout} data-reveal>
                <p className={styles.surfaceEyebrow}>Шаг 2</p>
                <h2 className={styles.calloutTitle}>Зачислить (Enroll)</h2>
                <form className={styles.formStack} onSubmit={handleCreateEnrollment} style={{ marginTop: '1rem' }}>
                  <label className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Ученик</span>
                    <select className={styles.fieldInput} required value={forms.enrollment.userId} onChange={(e) => updateForm("enrollment", "userId", e.target.value)}>
                      {data.users.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
                    </select>
                  </label>
                  <label className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Курс</span>
                    <select className={styles.fieldInput} required value={forms.enrollment.courseId} onChange={(e) => updateForm("enrollment", "courseId", e.target.value)}>
                      {data.courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </label>
                  <button className={styles.outlineButton} type="submit" disabled={!data.users.length || !data.courses.length}>Открыть доступ</button>
                </form>
              </section>

              <section className={styles.callout} data-reveal>
                <p className={styles.surfaceEyebrow}>Шаг 3</p>
                <h2 className={styles.calloutTitle}>Сгенерировать токен</h2>
                <p className={styles.helperText} style={{ marginBottom: "1rem" }}>Для ученика, уже добавленного на курс.</p>
                <form className={styles.formStack} onSubmit={handleIssueToken}>
                  <label className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Активное зачисление</span>
                    <select className={styles.fieldInput} required value={forms.token.enrollmentId} onChange={(e) => updateForm("token", "enrollmentId", e.target.value)}>
                      {activeEnrollments.map((enr) => (
                        <option key={enr.id} value={enr.id}>{enr.user.email} → {enr.course.title}</option>
                      ))}
                    </select>
                  </label>
                  <button className={styles.solidButton} type="submit" disabled={!activeEnrollments.length}>Сгенерировать</button>
                 </form>
              </section>

              <section className={styles.callout} data-reveal>
                 <p className={styles.surfaceEyebrow}>Дополнительно</p>
                 <h2 className={styles.calloutTitle}>Загрузить видео</h2>
                 <form className={styles.formStack} onSubmit={async (e) => {
                    e.preventDefault();
                    const lessonId = forms.video?.lessonId;
                    const file = document.getElementById("videoFileInput").files[0];
                    if (!lessonId || !file) return;
                    setBusyAction("upload-video");
                    setError(""); setNotice("");
                    try {
                       const intent = await import("@/lib/securecourse-api").then(m => m.createUploadIntent({
                          lessonId: lessonId,
                          fileName: file.name,
                          mimeType: file.type,
                          sizeBytes: file.size
                       }));
                       if (intent.uploadUrl) {
                          await fetch(intent.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
                       } else {
                          setError("Ошибка: отсутвует uploadUrl. Заглушка бэкенда?");
                       }
                       setNotice("Видео успешно залито.");
                       document.getElementById("videoFileInput").value = "";
                       await loadAdminData();
                    } catch (e) {
                       setError(e.message || "Ошибка загрузки видео");
                    } finally {
                       setBusyAction("");
                    }
                 }} style={{ marginTop: '1rem' }}>
                    <label className={styles.fieldGroup}>
                       <span className={styles.fieldLabel}>Урок</span>
                       <select className={styles.fieldInput} required value={forms.video?.lessonId || ""} onChange={(e) => updateForm("video", "lessonId", e.target.value)}>
                          <option value="">Выберите урок...</option>
                          {data.courses.flatMap(c => c.lessons || []).map(l => (
                             <option key={l.id} value={l.id}>{l.title}</option>
                          ))}
                       </select>
                    </label>
                    <label className={styles.fieldGroup}>
                       <span className={styles.fieldLabel}>Файл видео</span>
                       <input id="videoFileInput" className={styles.fieldInput} required type="file" accept="video/mp4,video/x-m4v,video/*" />
                    </label>
                    <button className={styles.outlineButton} type="submit" disabled={busyAction === "upload-video"}>
                       {busyAction === "upload-video" ? "Загрузка..." : "Загрузить"}
                    </button>
                 </form>
              </section>
            </aside>

            {/* Таблицы данных */}
            <div className={styles.workspaceBody}>
              
              <section id="tokens" className={styles.surface} data-reveal>
                <div className={styles.surfaceHeader}>
                  <div>
                    <p className={styles.surfaceEyebrow}>Контроль доступа</p>
                    <h2 className={styles.surfaceTitle}>Одноразовые токены</h2>
                  </div>
                </div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Токен</th>
                        <th>Кому выдан</th>
                        <th>Создан</th>
                        <th>Статус</th>
                        <th>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.tokens.length === 0 ? (
                        <tr><td className={styles.emptyState} colSpan={5}>Нет выданных токенов.</td></tr>
                      ) : (
                        data.tokens.map((token) => (
                          <tr key={token.id}>
                            <td><code className={styles.codePill}>{token.id}</code></td>
                            <td>{token.user?.email || "-"}</td>
                            <td>{formatDateTime(token.createdAt)}</td>
                            <td><span className={`${styles.badge} ${badgeClass(token.status)}`}>{token.status}</span></td>
                            <td>
                              {token.status === "ISSUED" && (
                                <button className={styles.tableActionButton} onClick={() => handleRevokeToken(token.id)} type="button">Отзыв</button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section id="sessions" className={styles.surface} data-reveal>
                <div className={styles.surfaceHeader}>
                  <div>
                    <p className={styles.surfaceEyebrow}>Безопасность</p>
                    <h2 className={styles.surfaceTitle}>Активные сессии</h2>
                  </div>
                </div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Ученик</th>
                        <th>Устройство/IP</th>
                        <th>Последняя активность</th>
                        <th>Статус</th>
                        <th>Удалить</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.sessions.length === 0 ? (
                        <tr><td className={styles.emptyState} colSpan={5}>Не найдено сессий.</td></tr>
                      ) : (
                        data.sessions.map((session) => (
                          <tr key={session.id}>
                            <td>{session.user?.email || "-"}</td>
                            <td>{session.deviceLabel || "Неизвестное"}<br/><span className={styles.helperText}>{session.ipAddress}</span></td>
                            <td>{formatDateTime(session.lastSeenAt)}</td>
                            <td><span className={`${styles.badge} ${badgeClass(session.status)}`}>{session.status}</span></td>
                            <td>
                               {session.status === "ACTIVE" && (
                                  <button className={styles.tableActionButton} onClick={() => handleRevokeSession(session.id)} type="button">Закрыть</button>
                               )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section id="users" className={styles.surface} data-reveal>
                <div className={styles.surfaceHeader}>
                  <div>
                    <h2 className={styles.surfaceTitle}>Пользователи в системе</h2>
                  </div>
                </div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>ФИО и Email</th>
                        <th>Курсы</th>
                        <th>Текущая сессия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.users.length === 0 ? (
                        <tr><td className={styles.emptyState} colSpan={3}>Нет учеников.</td></tr>
                      ) : (
                        data.users.map((user) => {
                          const session = data.sessions.find((item) => item.userId === user.id && item.status === "ACTIVE");
                          return (
                            <tr key={user.id}>
                              <td><strong>{user.fullName}</strong><div className={styles.helperText}>{user.email}</div></td>
                              <td>{user.enrollments?.map((enr) => enr.course.title).join(", ") || "-"}</td>
                              <td>{session ? <span style={{ color: 'var(--teal)' }}>Онлайн</span> : <span>Офлайн</span>}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section id="courses" className={styles.surface} data-reveal>
                <div className={styles.surfaceHeader}>
                  <div>
                    <h2 className={styles.surfaceTitle}>Курсы</h2>
                  </div>
                </div>
                <form className={styles.formStack} onSubmit={handleCreateCourse} style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                    <input className={styles.fieldInput} placeholder="Название нового курса..." required value={forms.createCourse.title} onChange={(e) => updateForm("createCourse", "title", e.target.value)} />
                    <button className={styles.outlineButton} type="submit" disabled={busyAction === "create-course"} style={{ whiteSpace: "nowrap" }}>+ Добавить</button>
                </form>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr><th>Курс</th><th>Уроков</th><th>Учеников</th></tr>
                    </thead>
                    <tbody>
                      {data.courses.length === 0 ? (
                        <tr><td className={styles.emptyState} colSpan={3}>Нет курсов.</td></tr>
                      ) : (
                        data.courses.map((course) => (
                          <tr key={course.id}>
                            <td><strong>{course.title}</strong></td>
                            <td>{course.lessons?.length || 0}</td>
                            <td>{course.enrollments?.length || 0}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
