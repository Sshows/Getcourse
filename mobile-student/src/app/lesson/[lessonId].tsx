import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { VideoView, useVideoPlayer } from "expo-video";

import {
  getStudentLesson,
  requestPlaybackAccess,
  updateLessonProgress,
  type StudentLessonResponse
} from "@/lib/api";
import { useStudentSession } from "@/providers/student-session-provider";

export default function LessonScreen() {
  const params = useLocalSearchParams<{ lessonId: string }>();
  const lessonId = Array.isArray(params.lessonId) ? params.lessonId[0] : params.lessonId;
  const { session } = useStudentSession();
  const [payload, setPayload] = useState<StudentLessonResponse | null>(null);
  const [manifestUrl, setManifestUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [progressBusy, setProgressBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const player = useVideoPlayer(manifestUrl || null, (instance) => {
    instance.loop = false;
    if (manifestUrl) {
      instance.play();
    }
  });

  useEffect(() => {
    if (manifestUrl) {
      player.play();
    }
  }, [manifestUrl, player]);

  useEffect(() => {
    if (!session || !lessonId) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const lessonPayload = await getStudentLesson(session, lessonId);

        if (cancelled) {
          return;
        }

        setPayload(lessonPayload);

        if (lessonPayload.lesson.videoAsset?.status === "ready") {
          const playbackPayload = await requestPlaybackAccess(session, lessonId);

          if (!cancelled) {
            setManifestUrl(playbackPayload.playback.manifestUrl);
          }
        } else {
          setManifestUrl(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          const message =
            loadError instanceof Error ? loadError.message : "Не удалось открыть урок.";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [lessonId, session]);

  const progressLabel = useMemo(() => {
    if (!payload?.progress?.progressPercent) {
      return "0%";
    }

    return `${Math.round(payload.progress.progressPercent)}%`;
  }, [payload?.progress?.progressPercent]);

  if (!session) {
    return <Redirect href="/" />;
  }

  if (!lessonId) {
    return <Redirect href="/courses" />;
  }

  const handleMarkComplete = async () => {
    if (!session || !lessonId) {
      return;
    }

    try {
      setProgressBusy(true);
      const nextProgress = await updateLessonProgress(session, lessonId, {
        progressPercent: 100,
        completed: true,
        lastPositionSeconds: payload?.progress?.lastPositionSeconds || 0
      });

      setPayload((current) =>
        current
          ? {
              ...current,
              progress: nextProgress
            }
          : current
      );
    } catch (progressError) {
      const message =
        progressError instanceof Error ? progressError.message : "Не удалось обновить прогресс.";
      setError(message);
    } finally {
      setProgressBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.replace("/courses")} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Text style={styles.backButtonText}>Назад к курсам</Text>
          </Pressable>
          <Text style={styles.progressBadge}>Прогресс {progressLabel}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#7dd3fc" />
            <Text style={styles.loadingText}>Загружаем урок и защищенное видео...</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {payload ? (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.courseLabel}>{payload.lesson.course?.title || "Курс"}</Text>
              <Text style={styles.lessonTitle}>{payload.lesson.title}</Text>
              <Text style={styles.lessonCopy}>
                {payload.lesson.content ||
                  "Видео, материалы и заметки доступны внутри защищенной student-сессии."}
              </Text>
            </View>

            <View style={styles.videoCard}>
              <Text style={styles.sectionTitle}>Видео урока</Text>
              {manifestUrl ? (
                <VideoView
                  style={styles.video}
                  player={player}
                  allowsPictureInPicture={false}
                  contentFit="contain"
                />
              ) : (
                <View style={styles.videoFallback}>
                  <Text style={styles.videoFallbackTitle}>Видео еще не готово</Text>
                  <Text style={styles.videoFallbackCopy}>
                    Менеджер может загрузить его через сайт, после чего в приложении откроется
                    защищенный просмотр.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.notesCard}>
              <Text style={styles.sectionTitle}>Конспект урока</Text>
              <Text style={styles.notesText}>
                {payload.lesson.notes || "Конспект появится здесь, как только менеджер добавит материалы."}
              </Text>
            </View>

            <View style={styles.materialsCard}>
              <Text style={styles.sectionTitle}>Материалы</Text>
              {payload.lesson.materials.length === 0 ? (
                <Text style={styles.materialEmpty}>Пока нет дополнительных файлов или ссылок.</Text>
              ) : (
                payload.lesson.materials.map((material, index) => (
                  <View key={material.id} style={styles.materialRow}>
                    <Text style={styles.materialIndex}>{index + 1}</Text>
                    <View style={styles.materialBody}>
                      <Text style={styles.materialTitle}>{material.title}</Text>
                      <Text style={styles.materialMeta}>{material.type}</Text>
                      {material.content ? (
                        <Text style={styles.materialContent}>{material.content}</Text>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </View>

            <Pressable
              disabled={progressBusy}
              onPress={handleMarkComplete}
              style={({ pressed }) => [
                styles.completeButton,
                progressBusy && styles.completeButtonDisabled,
                pressed && !progressBusy ? styles.pressed : null
              ]}
            >
              <Text style={styles.completeButtonText}>
                {progressBusy ? "Сохраняем..." : "Отметить урок пройденным"}
              </Text>
            </Pressable>
          </>
        ) : null}
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
    paddingBottom: 34,
    gap: 16
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  backButton: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: "#0b172a"
  },
  backButtonText: {
    color: "#e2e8f0",
    fontWeight: "700"
  },
  progressBadge: {
    color: "#86efac",
    backgroundColor: "rgba(34, 197, 94, 0.14)",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    overflow: "hidden",
    fontWeight: "800"
  },
  loadingCard: {
    backgroundColor: "#0b172a",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    gap: 12
  },
  loadingText: {
    color: "#cbd5e1",
    fontSize: 14,
    textAlign: "center"
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 14,
    lineHeight: 20
  },
  heroCard: {
    backgroundColor: "#0f1d35",
    borderRadius: 28,
    padding: 22,
    gap: 10
  },
  courseLabel: {
    color: "#7dd3fc",
    fontSize: 13,
    fontWeight: "700"
  },
  lessonTitle: {
    color: "#f8fafc",
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 32
  },
  lessonCopy: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 22
  },
  videoCard: {
    backgroundColor: "#0b172a",
    borderRadius: 26,
    padding: 18,
    gap: 12
  },
  sectionTitle: {
    color: "#f8fafc",
    fontSize: 19,
    fontWeight: "800"
  },
  video: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#020617"
  },
  videoFallback: {
    minHeight: 220,
    borderRadius: 18,
    backgroundColor: "#08111f",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 8
  },
  videoFallbackTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center"
  },
  videoFallbackCopy: {
    color: "#94a3b8",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center"
  },
  notesCard: {
    backgroundColor: "#091425",
    borderRadius: 24,
    padding: 18,
    gap: 10
  },
  notesText: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 21
  },
  materialsCard: {
    backgroundColor: "#0b172a",
    borderRadius: 24,
    padding: 18,
    gap: 12
  },
  materialEmpty: {
    color: "#94a3b8",
    fontSize: 14
  },
  materialRow: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#08111f",
    borderRadius: 18,
    padding: 14
  },
  materialIndex: {
    width: 28,
    color: "#7dd3fc",
    fontWeight: "800",
    fontSize: 15
  },
  materialBody: {
    flex: 1,
    gap: 4
  },
  materialTitle: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "700"
  },
  materialMeta: {
    color: "#7dd3fc",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  materialContent: {
    color: "#cbd5e1",
    fontSize: 13,
    lineHeight: 20
  },
  completeButton: {
    backgroundColor: "#22c55e",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center"
  },
  completeButtonDisabled: {
    opacity: 0.6
  },
  completeButtonText: {
    color: "#04110a",
    fontSize: 15,
    fontWeight: "800"
  },
  pressed: {
    opacity: 0.84
  }
});
