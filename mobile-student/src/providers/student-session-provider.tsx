import * as Device from "expo-device";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { AppState, Platform, type AppStateStatus } from "react-native";

import {
  activateStudentToken,
  getSecureCourseWebUrl,
  getStudentSession,
  heartbeatStudentSession,
  logoutStudentSession,
  type StudentSessionRecord
} from "@/lib/api";
import {
  clearStoredStudentSession,
  loadStoredStudentSession,
  persistStudentSession
} from "@/lib/session";

type StudentSessionContextValue = {
  hydrating: boolean;
  session: StudentSessionRecord | null;
  authBusy: boolean;
  authError: string | null;
  activateWithToken: (token: string) => Promise<StudentSessionRecord>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  heartbeat: () => Promise<void>;
  clearError: () => void;
};

const StudentSessionContext = createContext<StudentSessionContextValue | null>(null);

function buildDevicePayload() {
  const modelName = Device.modelName || "student-device";
  const osName = Device.osName || Platform.OS;
  const osVersion = Device.osVersion || "unknown";
  const buildId = Device.osBuildId || Device.modelId || "no-build-id";

  return {
    deviceId: `${Platform.OS}-${buildId}`,
    deviceFingerprint: `${Platform.OS}:${modelName}:${buildId}`,
    deviceLabel: `${modelName} · ${osName} ${osVersion}`,
    userAgent: `SecureCourse Student/${Platform.OS}/${osVersion}`
  };
}

export function StudentSessionProvider({ children }: { children: ReactNode }) {
  const [hydrating, setHydrating] = useState(true);
  const [session, setSession] = useState<StudentSessionRecord | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", setAppState);
    return () => {
      subscription.remove();
    };
  }, []);

  const clearError = useCallback(() => {
    setAuthError(null);
  }, []);

  const invalidateSession = useCallback(async () => {
    setSession(null);
    await clearStoredStudentSession();
  }, []);

  const refreshSession = useCallback(async () => {
    const stored = session || (await loadStoredStudentSession());

    if (!stored) {
      setSession(null);
      return;
    }

    const payload = await getStudentSession(stored);

    if (!payload.authenticated || !payload.userId || !payload.sessionId || !payload.user) {
      await invalidateSession();
      return;
    }

    const mergedSession: StudentSessionRecord = {
      ...stored,
      user: payload.user,
      userId: payload.userId,
      sessionId: payload.sessionId,
      webUrl: stored.webUrl || getSecureCourseWebUrl()
    };

    setSession(mergedSession);
    await persistStudentSession(mergedSession);
  }, [invalidateSession, session]);

  const heartbeat = useCallback(async () => {
    if (!session) {
      return;
    }

    const payload = await heartbeatStudentSession(session);

    if (!payload.ok) {
      return;
    }

    const nextSession: StudentSessionRecord = {
      ...session,
      idleExpiresAt: payload.session?.idleExpiresAt || session.idleExpiresAt
    };

    setSession(nextSession);
    await persistStudentSession(nextSession);
  }, [session]);

  const activateWithToken = useCallback(async (token: string) => {
    const normalizedToken = token.trim();

    if (!normalizedToken) {
      throw new Error("Введите одноразовый токен.");
    }

    setAuthBusy(true);
    setAuthError(null);

    try {
      const payload = await activateStudentToken({
        token: normalizedToken,
        ...buildDevicePayload()
      });

      const nextSession: StudentSessionRecord = {
        userId: payload.user.id,
        sessionId: payload.session.id,
        user: payload.user,
        startedAt: payload.session.startedAt,
        idleExpiresAt: payload.session.idleExpiresAt,
        enrollment: payload.enrollment,
        webUrl: getSecureCourseWebUrl()
      };

      await persistStudentSession(nextSession);
      setSession(nextSession);
      return nextSession;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось активировать токен.";
      setAuthError(message);
      throw error;
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const logout = useCallback(async () => {
    if (session) {
      try {
        await logoutStudentSession(session);
      } catch {
      }
    }

    await invalidateSession();
  }, [invalidateSession, session]);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const stored = await loadStoredStudentSession();

        if (!stored) {
          if (isMounted) {
            setSession(null);
          }
          return;
        }

        if (isMounted) {
          setSession(stored);
        }

        try {
          const payload = await getStudentSession(stored);

          if (!payload.authenticated || !payload.user || !payload.userId || !payload.sessionId) {
            await clearStoredStudentSession();
            if (isMounted) {
              setSession(null);
            }
            return;
          }

          const nextSession = {
            ...stored,
            user: payload.user,
            userId: payload.userId,
            sessionId: payload.sessionId,
            webUrl: stored.webUrl || getSecureCourseWebUrl()
          };

          await persistStudentSession(nextSession);

          if (isMounted) {
            setSession(nextSession);
          }
        } catch {
          if (isMounted) {
            setSession(stored);
          }
        }
      } finally {
        if (isMounted) {
          setHydrating(false);
        }
      }
    };

    hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!session || appState !== "active") {
      return;
    }

    heartbeat().catch(() => {});
    const timer = setInterval(() => {
      heartbeat().catch(() => {});
    }, 60_000);

    return () => {
      clearInterval(timer);
    };
  }, [appState, heartbeat, session]);

  const value = useMemo<StudentSessionContextValue>(
    () => ({
      hydrating,
      session,
      authBusy,
      authError,
      activateWithToken,
      logout,
      refreshSession,
      heartbeat,
      clearError
    }),
    [activateWithToken, authBusy, authError, clearError, heartbeat, hydrating, logout, refreshSession, session]
  );

  return <StudentSessionContext.Provider value={value}>{children}</StudentSessionContext.Provider>;
}

export function useStudentSession() {
  const context = useContext(StudentSessionContext);

  if (!context) {
    throw new Error("useStudentSession must be used inside StudentSessionProvider.");
  }

  return context;
}
