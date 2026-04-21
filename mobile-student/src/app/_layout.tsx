import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useProtectedScreen } from "@/hooks/use-protected-screen";
import { StudentSessionProvider, useStudentSession } from "@/providers/student-session-provider";

function AppFrame() {
  const { hydrating } = useStudentSession();
  const { appIsObscured, captureDetectedAt } = useProtectedScreen();

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: {
            backgroundColor: "#07111e"
          }
        }}
      />
      {appIsObscured ? (
        <View pointerEvents="none" style={styles.privacyOverlay}>
          <Text style={styles.privacyTitle}>SecureCourse</Text>
          <Text style={styles.privacyCopy}>Контент скрыт, пока приложение не активно.</Text>
        </View>
      ) : null}
      {hydrating ? (
        <View pointerEvents="none" style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#7dd3fc" />
          <Text style={styles.loadingText}>Восстанавливаем сессию ученика...</Text>
        </View>
      ) : null}
      {captureDetectedAt ? (
        <View pointerEvents="none" style={styles.captureToast}>
          <Text style={styles.captureTitle}>Попытка захвата экрана</Text>
          <Text style={styles.captureText}>
            Приложение включило защиту и продолжает скрывать контент в фоне.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StudentSessionProvider>
        <AppFrame />
      </StudentSessionProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#07111e"
  },
  privacyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#030712",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 10,
    zIndex: 40
  },
  privacyTitle: {
    color: "#f8fafc",
    fontSize: 26,
    fontWeight: "800"
  },
  privacyCopy: {
    color: "#94a3b8",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 6, 23, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    zIndex: 50
  },
  loadingText: {
    color: "#e2e8f0",
    fontSize: 15
  },
  captureToast: {
    position: "absolute",
    top: 68,
    left: 16,
    right: 16,
    backgroundColor: "rgba(239, 68, 68, 0.9)",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    zIndex: 60
  },
  captureTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4
  },
  captureText: {
    color: "#fee2e2",
    fontSize: 13,
    lineHeight: 18
  }
});
