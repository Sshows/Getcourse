import "./globals.css";

export const metadata = {
  title: "SecureCourse — Protected Learning Platform",
  description:
    "SecureCourse is a web platform for protected online courses with one-time token access, single-session enforcement, and secure video playback."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body>
        {children}
      </body>
    </html>
  );
}
