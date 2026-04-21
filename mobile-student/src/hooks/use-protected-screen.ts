import * as ScreenCapture from "expo-screen-capture";
import { useEffect, useState } from "react";
import { AppState, type AppStateStatus, Platform } from "react-native";

export function useProtectedScreen() {
  ScreenCapture.usePreventScreenCapture("securecourse-student");

  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [captureDetectedAt, setCaptureDetectedAt] = useState<string | null>(null);

  useEffect(() => {
    ScreenCapture.enableAppSwitcherProtectionAsync(0.65).catch(() => {});

    return () => {
      ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", setAppState);
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === "android" && Number(Platform.Version) < 34) {
      return;
    }

    const subscription = ScreenCapture.addScreenshotListener(() => {
      setCaptureDetectedAt(new Date().toISOString());
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return {
    appIsObscured: appState !== "active",
    captureDetectedAt
  };
}
