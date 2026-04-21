# SecureCourse Student App

Отдельное мобильное приложение для учеников SecureCourse на `Expo + React Native`.

## Что уже реализовано

- вход только по одноразовому токену;
- хранение student-сессии в `expo-secure-store`;
- список назначенных курсов;
- экран урока с видео и материалами;
- heartbeat и logout;
- best-effort защита от скриншотов и записи экрана через `expo-screen-capture`;
- privacy protection для `app switcher` и background-состояния.

## Как запустить

1. Установить зависимости:

```bash
npm install
```

2. Создать локальный env:

```powershell
Copy-Item .env.example .env
```

3. Запустить Expo:

```bash
npx expo start
```

## Env

- `EXPO_PUBLIC_SECURECOURSE_WEB_URL`
  Это адрес существующего SecureCourse web/API сервиса, например:
  `https://securecourse-backend-production.up.railway.app`

Приложение ходит в:

- `/api/securecourse/auth/activate`
- `/api/securecourse/auth/logout`
- `/api/securecourse/auth/session`
- `/api/securecourse/student/courses`
- `/api/securecourse/student/lessons/:lessonId`
- `/api/securecourse/student/lessons/:lessonId/playback-access`
- `/api/securecourse/student/lessons/:lessonId/progress`
- `/api/securecourse/session/heartbeat`

## Что важно по защите

Это не абсолютная защита. Приложение использует системные механизмы мобильных ОС и Expo:

- блокировку screen capture / recording, где это поддерживается;
- скрытие контента в `app switcher`;
- хранение student-сессии в защищенном device storage.

Полностью исключить утечки невозможно, но приложение заметно усложняет простой обход по сравнению с браузером.
