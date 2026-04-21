import * as SecureStore from "expo-secure-store";

import type { StudentSessionRecord } from "@/lib/api";

const SESSION_KEY = "securecourse.student.session";

export async function loadStoredStudentSession() {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);

  if (!raw) {
    return null;
  }

  return JSON.parse(raw) as StudentSessionRecord;
}

export async function persistStudentSession(session: StudentSessionRecord) {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  });
}

export async function clearStoredStudentSession() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
