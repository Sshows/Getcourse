export const securecourseContent = {
  brand: {
    name: "SecureCourse",
    tagline: "Closed learning platform with one-time access and protected playback"
  },
  publicSite: {
    nav: [
      { href: "#interfaces", label: "Interfaces" },
      { href: "#access-flow", label: "Access flow" },
      { href: "#video-flow", label: "Video flow" },
      { href: "#protection", label: "Protection" }
    ],
    hero: {
      eyebrow: "Site + Admin + Mobile App",
      title: "A protected course platform where the student learns inside the app",
      lead:
        "This prototype separates public marketing, operational administration, and protected consumption into three dedicated interfaces. The public website handles discovery and activation, the admin panel controls access and content, and the mobile app becomes the primary place where the student watches lessons.",
      actions: [
        { href: "/securecourse/admin", label: "Open admin demo", kind: "solid" },
        { href: "/securecourse/mobile", label: "Open student app demo", kind: "outline" }
      ],
      notes: [
        "One-time token activation",
        "Single active session per student",
        "Protected streaming via Mux or Cloudflare Stream",
        "Audit logs + watermark + session invalidation"
      ]
    },
    siteFeatures: [
      "Landing page and product positioning",
      "Course catalogue and open program descriptions",
      "Lead forms, callbacks, and consultation requests",
      "Login and token activation entry point",
      "Deep links into the mobile app",
      "Installation instructions and FAQ"
    ],
    logicMatrix: [
      {
        title: "Public site",
        copy:
          "Introduces the product, receives applications, checks token status, and routes the student into the app. It is not the primary learning environment."
      },
      {
        title: "Admin panel",
        copy:
          "Creates courses, uploads lessons, issues access, monitors sessions, reviews logs, and revokes tokens or active devices."
      },
      {
        title: "Mobile app",
        copy:
          "Handles lesson viewing, progress tracking, watermark rendering, inactivity logout, and OS-level privacy reactions."
      },
      {
        title: "Backend + Redis",
        copy:
          "Owns the truth about tokens, device binding, one active session, access expiration, webhook processing, and every protected API decision."
      },
      {
        title: "Video provider",
        copy:
          "Stores and transcodes videos, serves secure streams, supports direct uploads and DRM-capable playback, but does not replace access logic."
      }
    ],
    accessFlow: [
      {
        title: "Issue access",
        copy:
          "Manager creates a student record and generates a one-time token or magic link with a short activation TTL."
      },
      {
        title: "Activate once",
        copy:
          "Student activates access from the public site or directly in the app. After the first successful login the token becomes used."
      },
      {
        title: "Bind session",
        copy:
          "Backend registers one active session in Redis, stores device context, and rejects reuse or old session recovery."
      },
      {
        title: "Invalidate on exit",
        copy:
          "Logout, forced device switch, or inactivity immediately revokes the active session. Re-entry requires a new issued access token."
      }
    ],
    uploadFlow: [
      {
        title: "Create course and lesson",
        copy: "Admin defines metadata, sequence, materials, and playback requirements in the panel."
      },
      {
        title: "Request upload URL",
        copy:
          "Backend requests a one-time direct upload URL from Mux or Cloudflare Stream and attaches upload constraints."
      },
      {
        title: "Direct upload",
        copy:
          "Large files go straight from the admin browser to the video provider instead of passing through your server or Git repository."
      },
      {
        title: "Transcode and inspect",
        copy:
          "Video provider processes the asset, prepares adaptive playback, and reports readiness through a webhook."
      },
      {
        title: "Save video ID",
        copy:
          "Backend stores the `video_asset_id` or `video_uid` inside the lesson and marks playback availability."
      },
      {
        title: "Serve protected playback",
        copy:
          "Student app requests permission to watch. Backend verifies session rights and returns short-lived playback credentials only for the active user."
      }
    ],
    securityLayers: [
      {
        title: "One-time activation",
        copy: "Tokens expire before use and burn after the first successful activation."
      },
      {
        title: "Single active session",
        copy: "Redis-backed session registry invalidates previous devices or blocks concurrent access."
      },
      {
        title: "Protected streaming",
        copy: "No permanent raw file URLs; playback happens through signed, short-lived streaming access."
      },
      {
        title: "Dynamic watermark",
        copy:
          "Email, session ID, and timestamp are rendered in the app/player layer so leaks can be traced back."
      },
      {
        title: "Privacy handling",
        copy:
          "Backgrounding, app switcher snapshots, and screen-capture events trigger content hiding where the OS allows it."
      },
      {
        title: "Full audit trail",
        copy:
          "Login attempts, token reuse, playback events, revocations, and admin actions are stored for review."
      }
    ],
    roadmap: [
      {
        meta: "MVP phase 1",
        title: "Launch the three-interface foundation",
        items: [
          "Public website with activation entry point",
          "Admin panel with courses, lessons, users, tokens, sessions, logs",
          "Mobile app with login, course list, lesson playback",
          "Direct video upload pipeline and webhook binding"
        ]
      },
      {
        meta: "Phase 2",
        title: "Harden the protected playback layer",
        items: [
          "Device reputation rules",
          "Suspicious activity flags",
          "Better playback analytics",
          "Expanded watermark placement and forensic overlays"
        ]
      },
      {
        meta: "Phase 3",
        title: "Add growth and operations tools",
        items: [
          "Lead pipelines from the site",
          "Manager automation",
          "Extended support workflows",
          "Reporting for cohorts and completion"
        ]
      }
    ]
  },
  admin: {
    metrics: [
      { label: "Active sessions", value: "12", tone: "green" },
      { label: "Issued tokens today", value: "27", tone: "blue" },
      { label: "Ready video assets", value: "41", tone: "gold" },
      { label: "Reuse attempts blocked", value: "4", tone: "red" }
    ],
    nav: [
      "Dashboard",
      "Users",
      "Access",
      "Courses",
      "Uploads",
      "Sessions",
      "Logs"
    ],
    uploadQueue: [
      {
        lesson: "Module 1 / Intro lesson",
        course: "Python for analysts",
        assetId: "mux_01HZX8M9QX",
        status: "Ready"
      },
      {
        lesson: "Module 2 / Forecasting models",
        course: "Finance mastertrack",
        assetId: "cf_7f85b24a0",
        status: "Processing"
      },
      {
        lesson: "Module 4 / Sprint rituals",
        course: "Product operations",
        assetId: "pending",
        status: "Waiting for upload"
      }
    ],
    tokens: [
      {
        token: "TKN-8F2A-X9QW",
        user: "ivanov@mail.ru",
        course: "Python for analysts",
        issued: "Today 14:20",
        status: "Active"
      },
      {
        token: "TKN-6L9P-M2AZ",
        user: "petrova@corp.ru",
        course: "Finance mastertrack",
        issued: "Today 13:52",
        status: "Used"
      },
      {
        token: "TKN-5G7C-K1TR",
        user: "sokolova@corp.ru",
        course: "Product operations",
        issued: "Today 12:11",
        status: "Revoked"
      }
    ],
    users: [
      {
        email: "ivanov@mail.ru",
        role: "Student",
        course: "Python for analysts",
        state: "Learning",
        session: "Pixel 7 / active"
      },
      {
        email: "petrova@corp.ru",
        role: "Student",
        course: "Finance mastertrack",
        state: "Learning",
        session: "iPhone 14 / active"
      },
      {
        email: "manager@securecourse.app",
        role: "Manager",
        course: "—",
        state: "Operational",
        session: "Chrome / panel"
      },
      {
        email: "kozlov@mail.ru",
        role: "Student",
        course: "—",
        state: "Blocked",
        session: "No active session"
      }
    ],
    sessions: [
      {
        user: "ivanov@mail.ru",
        device: "Android / Pixel 7",
        ip: "91.240.12.44",
        started: "14:32",
        activity: "Watching lesson 3",
        status: "Active"
      },
      {
        user: "petrova@corp.ru",
        device: "iOS / iPhone 14",
        ip: "185.71.33.201",
        started: "13:15",
        activity: "Reading PDF material",
        status: "Active"
      },
      {
        user: "sokolova@corp.ru",
        device: "Android / Galaxy S23",
        ip: "77.109.54.12",
        started: "16:01",
        activity: "Idle for 8 minutes",
        status: "Expiring"
      }
    ],
    logs: [
      {
        time: "16:04:22",
        event: "LOGIN",
        actor: "sokolova@corp.ru",
        details: "Device bound to Android / Galaxy S23",
        result: "OK"
      },
      {
        time: "15:55:10",
        event: "LOGIN_ATTEMPT",
        actor: "kozlov@mail.ru",
        details: "Blocked user tried token activation",
        result: "Blocked"
      },
      {
        time: "15:42:03",
        event: "TOKEN_REUSE",
        actor: "unknown",
        details: "Token TKN-6L9P-M2AZ reused after burn",
        result: "Rejected"
      },
      {
        time: "14:42:19",
        event: "VIDEO_READY",
        actor: "system",
        details: "Cloudflare Stream asset cf_7f85b24a0 moved to ready state",
        result: "Webhook handled"
      },
      {
        time: "14:32:17",
        event: "LOGIN",
        actor: "ivanov@mail.ru",
        details: "Session SID-8F2A created, previous session none",
        result: "OK"
      }
    ],
    rules: [
      "At most one active student session at a time",
      "Logout and inactivity revoke server-side session immediately",
      "Every protected request checks Redis session state",
      "Video uploads bypass the app server and go direct to provider",
      "Logs store access issuance, activation, playback, revocation, and admin actions"
    ],
    integrations: [
      "Next.js admin UI",
      "NestJS API for auth, courses, and sessions",
      "PostgreSQL for users, lessons, and audit trail",
      "Redis for tokens, TTL, and active device lock",
      "Mux or Cloudflare Stream for video delivery"
    ]
  },
  studentApp: {
    student: {
      name: "Ivan Ivanov",
      email: "ivanov@mail.ru",
      sessionId: "SID-8F2A",
      device: "Pixel 7",
      token: "TKN-8F2A-X9QW"
    },
    lessonsLocation:
      "Students watch protected lessons inside the mobile app. The public site only activates or redirects access.",
    protectionChecklist: [
      "Secure playback view for Android",
      "Privacy snapshot handling for iOS app switcher",
      "Watermark with email, session ID, and time",
      "Background transition hides sensitive content",
      "Manual logout destroys the active session"
    ],
    courses: [
      { title: "Python for analysts", progress: 38, lessons: 24, completed: 9 },
      { title: "Finance mastertrack", progress: 12, lessons: 18, completed: 2 },
      { title: "Product operations", progress: 64, lessons: 16, completed: 10 }
    ],
    lesson: {
      title: "Lesson 3. Data cleaning and feature prep",
      duration: "24:18",
      module: "Python for analysts",
      summary:
        "The player renders protected HLS playback with a dynamic watermark. Server checks continue while the lesson is open.",
      materials: [
        "Checklist PDF",
        "Lesson notes",
        "Quiz preview",
        "Session-safe glossary"
      ],
      lessonList: [
        { label: "Lesson 1. Intro and setup", done: true },
        { label: "Lesson 2. Reading tabular data", done: true },
        { label: "Lesson 3. Data cleaning and feature prep", done: false },
        { label: "Lesson 4. Visual checks", done: false }
      ]
    },
    reactions: [
      {
        title: "Screen capture detected",
        copy: "The lesson view darkens and shows a protection warning instead of leaving the content exposed."
      },
      {
        title: "App moved to background",
        copy: "Sensitive content is replaced with a privacy screen so app switcher snapshots do not reveal materials."
      },
      {
        title: "Session replaced elsewhere",
        copy: "App receives invalid session status from backend and returns the user to protected login."
      }
    ]
  }
};
