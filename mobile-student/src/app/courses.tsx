import { Redirect, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getStudentCourses, type EnrollmentView } from "@/lib/api";
import { useStudentSession } from "@/providers/student-session-provider";

function formatTimeLeft(idleExpiresAt?: string) {
  if (!idleExpiresAt) {
    return "без таймера";
  }

  const distance = new Date(idleExpiresAt).getTime() - Date.now();

  if (distance <= 0) {
    return "сессия истекла";
  }

  const totalSeconds = Math.floor(distance / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function CoursesScreen() {
  const { session, logout, heartbeat, refreshSession } = useStudentSession();
  const [enrollments, setEnrollments] = useState<EnrollmentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clockTick, setClockTick] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setClockTick(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    const load = async () => {
      try {
        setError(null);
        const payload = await getStudentCourses(session);
        setEnrollments(payload);
      } catch (loadError) {
        const message =
          loadError instanceof Error ? loadError.message : "Не удалось загрузить ваши курсы.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [session]);

  if (!session) {
    return <Redirect href="/" />;
  }

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await heartbeat();
      await refreshSession();
      const payload = await getStudentCourses(session);
      setEnrollments(payload);
      setError(null);
    } catch (refreshError) {
      const message =
        refreshError instanceof Error ? refreshError.message : "Не удалось обновить кабинет.";
      setError(message);
    } finally {
      setRefreshing(false);
    }
  };

  const timeLeft = useMemo(() => formatTimeLeft(session.idleExpiresAt), [clockTick, session.idleExpiresAt]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopline}>
            <Text style={styles.badge}>Student Cabinet</Text>
            <Pressable onPress={logout} style={({ pressed }) => [styles.logoutChip, pressed && styles.pressed]}>
              <Text style={styles.logoutChipText}>Выйти</Text>
            </Pressable>
          </View>
          <Text style={styles.heroTitle}>{session.user.fullName}</Text>
          <Text style={styles.heroSubtitle}>{session.user.email}</Text>

          <View style={styles.sessionRow}>
            <View style={styles.sessionPill}>
              <Text style={styles.sessionLabel}>Сессия активна</Text>
              <Text style={styles.sessionValue}>{timeLeft}</Text>
            </View>
            <View style={styles.sessionPill}>
              <Text style={styles.sessionLabel}>Защита экрана</Text>
              <Text style={styles.sessionValue}>включена</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Назначенные курсы</Text>
          <Text style={styles.sectionCopy}>
            Здесь видны только курсы, которые менеджер назначил именно вам. Старые токены повторно
            не работают, а сессия не живет бесконечно.
          </Text>
        </View>

        {loading ? <Text style={styles.stateText}>Загружаем курсы...</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!loading && !error && enrollments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Пока нет назначенных курсов</Text>
            <Text style={styles.emptyCopy}>
              Попросите менеджера выдать новый токен или назначить курс в админке.
            </Text>
          </View>
        ) : null}

        {enrollments.map((enrollment) => (
          <View key={enrollment.id} style={styles.courseCard}>
            <View style={styles.courseHeader}>
              <View style={styles.courseMeta}>
                <Text style={styles.courseTitle}>{enrollment.course?.title || "Курс без названия"}</Text>
                <Text style={styles.courseDescription}>
                  {enrollment.course?.shortDescription || "Курс готов к просмотру в мобильном приложении."}
                </Text>
              </View>
              <Text style={styles.progressPill}>{Math.round(enrollment.progressPercent || 0)}%</Text>
            </View>

            {enrollment.note ? <Text style={styles.noteText}>Комментарий: {enrollment.note}</Text> : null}

            <View style={styles.lessonList}>
              {enrollment.course?.lessons?.map((lesson, index) => (
                <Pressable
                  key={lesson.id}
                  onPress={() => router.push(`/lesson/${lesson.id}`)}
                  style={({ pressed }) => [styles.lessonCard, pressed && styles.pressed]}
                >
                  <View style={styles.lessonIndex}>
                    <Text style={styles.lessonIndexText}>{index + 1}</Text>
                  </View>
                  <View style={styles.lessonBody}>
                    <Text style={styles.lessonTitle}>{lesson.title}</Text>
                    <Text style={styles.lessonMeta}>
                      {lesson.durationSeconds ? `${Math.ceil(lesson.durationSeconds / 60)} мин` : "Видео и конспект"}
                    </Text>
                  </View>
                  <Text style={styles.lessonAction}>Открыть</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#07111e"
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 36,
    gap: 16
  },
  heroCard: {
    backgroundColor: "#0b172a",
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(125, 211, 252, 0.18)",
    gap: 12
  },
  heroTopline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  badge: {
    backgroundColor: "rgba(34, 197, 94, 0.14)",
    color: "#86efac",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "800"
  },
  logoutChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(248, 250, 252, 0.06)"
  },
  logoutChipText: {
    color: "#e2e8f0",
    fontWeight: "700"
  },
  heroTitle: {
    color: "#f8fafc",
    fontSize: 26,
    fontWeight: "800"
  },
  heroSubtitle: {
    color: "#94a3b8",
    fontSize: 14
  },
  sessionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  sessionPill: {
    backgroundColor: "#08111f",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: 132
  },
  sessionLabel: {
    color: "#7dd3fc",
    fontSize: 12,
    marginBottom: 3
  },
  sessionValue: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "800"
  },
  infoCard: {
    backgroundColor: "#0f1d35",
    borderRadius: 24,
    padding: 18,
    gap: 8
  },
  sectionTitle: {
    color: "#f8fafc",
    fontSize: 19,
    fontWeight: "800"
  },
  sectionCopy: {
    color: "#aebdd0",
    fontSize: 14,
    lineHeight: 21
  },
  stateText: {
    color: "#cbd5e1",
    fontSize: 14
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 14,
    lineHeight: 20
  },
  emptyCard: {
    backgroundColor: "#091425",
    borderRadius: 22,
    padding: 20,
    gap: 8
  },
  emptyTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "800"
  },
  emptyCopy: {
    color: "#94a3b8",
    fontSize: 14,
    lineHeight: 21
  },
  courseCard: {
    backgroundColor: "#0b172a",
    borderRadius: 26,
    padding: 18,
    gap: 14
  },
  courseHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start"
  },
  courseMeta: {
    flex: 1,
    gap: 6
  },
  courseTitle: {
    color: "#f8fafc",
    fontSize: 19,
    fontWeight: "800"
  },
  courseDescription: {
    color: "#94a3b8",
    fontSize: 14,
    lineHeight: 20
  },
  progressPill: {
    color: "#bef264",
    backgroundColor: "rgba(190, 242, 100, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    overflow: "hidden",
    fontWeight: "800"
  },
  noteText: {
    color: "#cbd5e1",
    fontSize: 13,
    lineHeight: 20
  },
  lessonList: {
    gap: 10
  },
  lessonCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#08111f",
    borderRadius: 20,
    padding: 14
  },
  lessonIndex: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(125, 211, 252, 0.12)",
    alignItems: "center",
    justifyContent: "center"
  },
  lessonIndexText: {
    color: "#7dd3fc",
    fontWeight: "800"
  },
  lessonBody: {
    flex: 1,
    gap: 4
  },
  lessonTitle: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "700"
  },
  lessonMeta: {
    color: "#94a3b8",
    fontSize: 13
  },
  lessonAction: {
    color: "#7dd3fc",
    fontSize: 13,
    fontWeight: "800"
  },
  pressed: {
    opacity: 0.84
  }
});
