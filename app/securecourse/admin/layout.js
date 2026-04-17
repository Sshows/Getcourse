// Auth is handled by middleware.js — this layout only wraps the admin section.
// No server-side auth check needed here; middleware redirects unauthenticated users.
export default function SecureCourseAdminLayout({ children }) {
  return children;
}
