import "./globals.css";

export const metadata = {
  title: "Global Admissions Academy — IELTS и поступление за рубеж",
  description:
    "Веб-платформа для курсов по IELTS, английскому, scholarship essays, personal statement и поступлению за рубеж с доступом по токену или через аккаунт ученика."
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru" className="dark">
      <body>{children}</body>
    </html>
  );
}
