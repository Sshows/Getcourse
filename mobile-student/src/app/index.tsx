import { Redirect, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getSecureCourseWebUrl } from "@/lib/api";
import { useStudentSession } from "@/providers/student-session-provider";

export default function IndexScreen() {
  const { session, authBusy, authError, activateWithToken, clearError } = useStudentSession();
  const { token: urlToken } = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState(urlToken || "");

  const normalizedToken = useMemo(() => token.trim(), [token]);

  useEffect(() => {
    if (urlToken && !session) {
      setToken(urlToken);
    }
  }, [urlToken, session]);

  if (session) {
    return <Redirect href="/courses" />;
  }

  const handleActivate = async (tokenToUse?: string) => {
    clearError();
    const t = typeof tokenToUse === "string" ? tokenToUse.trim() : normalizedToken;

    if (!t) return;

    try {
      await activateWithToken(t);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось активировать одноразовый токен.";
      Alert.alert("Токен не принят", message);
    }
  };

  // Optional auto-activate if token came from deep link
  useEffect(() => {
    if (urlToken && !session && !authBusy) {
      handleActivate(urlToken);
    }
    // We only want to run this once when urlToken changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlToken]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.heroCard}>
            <Text style={styles.badge}>Student App</Text>
            <Text style={styles.title}>SecureCourse для ученика</Text>
            <Text style={styles.subtitle}>
              В приложении нет обычного логина и пароля. Доступ выдает менеджер, а вход происходит
              только по одноразовому токену.
            </Text>
          </View>

          <View style={styles.activationCard}>
            <Text style={styles.sectionTitle}>Активировать доступ</Text>
            <Text style={styles.sectionCopy}>
              Введите токен из админки. После активации откроются только ваши назначенные курсы и
              уроки.
            </Text>

            <Text style={styles.inputLabel}>Одноразовый токен</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Например: U4h7x2q..."
              placeholderTextColor="#64748b"
              selectionColor="#7dd3fc"
              style={styles.input}
              value={token}
              onChangeText={setToken}
            />

            {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

            <Pressable
              disabled={!normalizedToken || authBusy}
              onPress={() => handleActivate()}
              style={({ pressed }) => [
                styles.primaryButton,
                (!normalizedToken || authBusy) && styles.primaryButtonDisabled,
                pressed && normalizedToken && !authBusy ? styles.primaryButtonPressed : null
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {authBusy ? "Активируем..." : "Активировать и открыть кабинет"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => Linking.openURL(`${getSecureCourseWebUrl()}/securecourse`)}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryPressed]}
            >
              <Text style={styles.secondaryButtonText}>Открыть веб-сайт SecureCourse</Text>
            </Pressable>
          </View>

          <View style={styles.securityCard}>
            <Text style={styles.sectionTitle}>Защита контента</Text>
            <Text style={styles.securityPoint}>
              На Android и iOS приложение включает best-effort защиту от скриншотов, screen
              recording и скрывает контент в app switcher.
            </Text>
            <Text style={styles.securityPoint}>
              Абсолютной защиты не существует, но мобильное приложение делает утечку заметно
              сложнее, чем обычный браузер.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#07111e"
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 32,
    gap: 18
  },
  heroCard: {
    backgroundColor: "#0b172a",
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(125, 211, 252, 0.18)"
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(125, 211, 252, 0.12)",
    color: "#7dd3fc",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 16
  },
  title: {
    color: "#f8fafc",
    fontSize: 31,
    lineHeight: 37,
    fontWeight: "800",
    marginBottom: 10
  },
  subtitle: {
    color: "#cbd5e1",
    fontSize: 15,
    lineHeight: 23
  },
  activationCard: {
    backgroundColor: "#0f1d35",
    borderRadius: 28,
    padding: 22,
    gap: 12
  },
  sectionTitle: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "800"
  },
  sectionCopy: {
    color: "#94a3b8",
    fontSize: 14,
    lineHeight: 21
  },
  inputLabel: {
    marginTop: 6,
    color: "#cbd5e1",
    fontSize: 13,
    fontWeight: "700"
  },
  input: {
    backgroundColor: "#07111e",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: "#f8fafc",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.24)",
    fontSize: 16
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 13,
    lineHeight: 18
  },
  primaryButton: {
    backgroundColor: "#22c55e",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4
  },
  primaryButtonDisabled: {
    opacity: 0.5
  },
  primaryButtonPressed: {
    opacity: 0.88
  },
  primaryButtonText: {
    color: "#04110a",
    fontSize: 15,
    fontWeight: "800"
  },
  secondaryButton: {
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(125, 211, 252, 0.2)"
  },
  secondaryPressed: {
    opacity: 0.84
  },
  secondaryButtonText: {
    color: "#cbe9ff",
    fontSize: 14,
    fontWeight: "700"
  },
  securityCard: {
    backgroundColor: "#091425",
    borderRadius: 28,
    padding: 22,
    gap: 10
  },
  securityPoint: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 21
  }
});
