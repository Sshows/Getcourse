"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  getSecureCourseSession,
  loginStudentAccount,
  registerStudent,
  resendStudentVerification,
  verifyStudentRegistration
} from "@/lib/securecourse-api";
import styles from "@/app/securecourse/securecourse.module.css";

function previewLines(verification) {
  const lines = [];

  if (verification?.email?.previewCode) {
    lines.push(`Код из email: ${verification.email.previewCode}`);
  }

  if (verification?.sms?.previewCode) {
    lines.push(`Код из SMS: ${verification.sms.previewCode}`);
  }

  return lines;
}

export default function SecureCourseStudentRegistrationPanel() {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState(null);
  const [session, setSession] = useState({
    authenticated: false,
    user: null
  });
  const [registerForm, setRegisterForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: ""
  });
  const [verifyForm, setVerifyForm] = useState({
    login: "",
    emailCode: "",
    smsCode: ""
  });
  const [loginForm, setLoginForm] = useState({
    login: "",
    password: ""
  });

  useEffect(() => {
    getSecureCourseSession()
      .then((payload) => {
        setSession({
          authenticated: payload.authenticated,
          user: payload.user || null
        });
      })
      .catch(() => {
        setSession({
          authenticated: false,
          user: null
        });
      });
  }, []);

  async function handleRegister(event) {
    event.preventDefault();
    setLoadingAction("register");
    setError("");
    setNotice("");
    setPreview(null);

    try {
      const payload = await registerStudent(registerForm);
      setVerifyForm((current) => ({
        ...current,
        login: registerForm.email,
        emailCode: "",
        smsCode: ""
      }));
      setLoginForm((current) => ({
        ...current,
        login: registerForm.email
      }));
      setPreview(payload.verification);
      setNotice(
        "Аккаунт ученика создан. Теперь подтвердите email и телефон. Если провайдеры еще не настроены, ниже появятся preview-коды."
      );
    } catch (requestError) {
      setError(requestError.message || "Не удалось создать аккаунт ученика.");
    } finally {
      setLoadingAction("");
    }
  }

  async function handleVerify(event) {
    event.preventDefault();
    setLoadingAction("verify");
    setError("");
    setNotice("");

    try {
      await verifyStudentRegistration(verifyForm);
      setNotice("Email и телефон подтверждены. Открываем кабинет ученика.");
      router.push("/securecourse/student");
    } catch (requestError) {
      setError(requestError.message || "Не удалось завершить верификацию.");
    } finally {
      setLoadingAction("");
    }
  }

  async function handleResend() {
    const login = verifyForm.login || registerForm.email || registerForm.phone;

    if (!login) {
      setError("Сначала укажите email или телефон, чтобы отправить новые коды.");
      return;
    }

    setLoadingAction("resend");
    setError("");
    setNotice("");

    try {
      const payload = await resendStudentVerification({ login });
      setPreview(payload.verification);
      setNotice("Новые коды отправлены. Используйте их для подтверждения email и телефона.");
    } catch (requestError) {
      setError(requestError.message || "Не удалось отправить коды заново.");
    } finally {
      setLoadingAction("");
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoadingAction("login");
    setError("");
    setNotice("");

    try {
      await loginStudentAccount(loginForm);
      setNotice("Вход выполнен. Открываем кабинет ученика.");
      router.push("/securecourse/student");
    } catch (requestError) {
      setError(requestError.message || "Не удалось войти в кабинет.");
    } finally {
      setLoadingAction("");
    }
  }

  const previewCodes = previewLines(preview);

  return (
    <section className={styles.surface}>
      <div className={styles.surfaceHeader}>
        <div>
          <p className={styles.surfaceEyebrow}>Регистрация ученика</p>
          <h2 className={styles.surfaceTitle}>
            Создайте аккаунт, подтвердите email и телефон и входите на сайт уже без менеджера.
          </h2>
        </div>
        <p className={styles.helperText} style={{ maxWidth: "34rem", color: "var(--text-soft)" }}>
          Для курсов по IELTS, английскому и поступлению за рубеж доступны два сценария: быстрый вход по токену или
          обычный аккаунт ученика с email, телефоном и паролем.
        </p>
      </div>

      <div className={`${styles.gridTwo} ${styles.panelBody}`}>
        <div className={styles.formStack}>
          <form className={styles.formStack} onSubmit={handleRegister}>
            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Имя и фамилия</span>
              <input
                className={styles.fieldInput}
                onChange={(event) =>
                  setRegisterForm((current) => ({ ...current, fullName: event.target.value }))
                }
                placeholder="Например: Асем Нурлан"
                required
                type="text"
                value={registerForm.fullName}
              />
            </label>

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Email</span>
              <input
                className={styles.fieldInput}
                onChange={(event) =>
                  setRegisterForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="student@example.com"
                required
                type="email"
                value={registerForm.email}
              />
            </label>

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Телефон</span>
              <input
                className={styles.fieldInput}
                onChange={(event) =>
                  setRegisterForm((current) => ({ ...current, phone: event.target.value }))
                }
                placeholder="+7 777 123 45 67"
                required
                type="tel"
                value={registerForm.phone}
              />
            </label>

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Пароль</span>
              <input
                className={styles.fieldInput}
                minLength={8}
                onChange={(event) =>
                  setRegisterForm((current) => ({ ...current, password: event.target.value }))
                }
                placeholder="Минимум 8 символов"
                required
                type="password"
                value={registerForm.password}
              />
            </label>

            <div className={styles.heroActions}>
              <button className={styles.solidButton} disabled={loadingAction === "register"} type="submit">
                {loadingAction === "register" ? "Создаем..." : "Зарегистрировать ученика"}
              </button>
            </div>
          </form>

          <div className={styles.materialCard}>
            <p className={styles.surfaceEyebrow}>Как это работает</p>
            <div className={styles.compactList}>
              <span>1. Аккаунт создается по email и телефону.</span>
              <span>2. На email и SMS отправляются отдельные коды подтверждения.</span>
              <span>3. После двойной верификации открывается обычный кабинет ученика.</span>
            </div>
          </div>
        </div>

        <div className={styles.formStack}>
          <form className={styles.formStack} onSubmit={handleVerify}>
            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Email или телефон ученика</span>
              <input
                className={styles.fieldInput}
                onChange={(event) =>
                  setVerifyForm((current) => ({ ...current, login: event.target.value }))
                }
                placeholder="student@example.com или +7777..."
                required
                type="text"
                value={verifyForm.login}
              />
            </label>

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Код из email</span>
              <input
                className={styles.fieldInput}
                onChange={(event) =>
                  setVerifyForm((current) => ({ ...current, emailCode: event.target.value }))
                }
                placeholder="6 цифр"
                required
                type="text"
                value={verifyForm.emailCode}
              />
            </label>

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Код из SMS</span>
              <input
                className={styles.fieldInput}
                onChange={(event) =>
                  setVerifyForm((current) => ({ ...current, smsCode: event.target.value }))
                }
                placeholder="6 цифр"
                required
                type="text"
                value={verifyForm.smsCode}
              />
            </label>

            <div className={styles.heroActions}>
              <button className={styles.solidButton} disabled={loadingAction === "verify"} type="submit">
                {loadingAction === "verify" ? "Проверяем..." : "Подтвердить email и телефон"}
              </button>
              <button
                className={styles.outlineButton}
                disabled={loadingAction === "resend"}
                onClick={handleResend}
                type="button"
              >
                {loadingAction === "resend" ? "Отправляем..." : "Отправить коды заново"}
              </button>
            </div>
          </form>

          <form className={styles.formStack} onSubmit={handleLogin}>
            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Email или телефон</span>
              <input
                className={styles.fieldInput}
                onChange={(event) =>
                  setLoginForm((current) => ({ ...current, login: event.target.value }))
                }
                placeholder="student@example.com"
                required
                type="text"
                value={loginForm.login}
              />
            </label>

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Пароль</span>
              <input
                className={styles.fieldInput}
                onChange={(event) =>
                  setLoginForm((current) => ({ ...current, password: event.target.value }))
                }
                placeholder="Ваш пароль"
                required
                type="password"
                value={loginForm.password}
              />
            </label>

            <button className={styles.ghostButton} disabled={loadingAction === "login"} type="submit">
              {loadingAction === "login" ? "Входим..." : "Войти по email/телефону"}
            </button>
          </form>

          {previewCodes.length ? (
            <div className={styles.callout}>
              <p className={styles.surfaceEyebrow}>Preview-коды</p>
              <div className={styles.compactList}>
                {previewCodes.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </div>
              <p className={styles.helperText}>
                Это тестовый режим. Когда подключите реальный email/SMS-провайдер, коды перестанут показываться в UI.
              </p>
            </div>
          ) : null}

          {session.authenticated ? (
            <div className={styles.materialCard}>
              <p className={styles.surfaceEyebrow}>Сессия уже активна</p>
              <strong>{session.user?.fullName || "Ученик"}</strong>
              <p className={styles.helperText}>{session.user?.email}</p>
              <div className={styles.heroActions}>
                <Link className={styles.solidButton} href="/securecourse/student">
                  Открыть кабинет
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {error ? <p className={styles.feedbackError}>{error}</p> : null}
      {notice ? <p className={styles.feedbackSuccess}>{notice}</p> : null}
    </section>
  );
}
