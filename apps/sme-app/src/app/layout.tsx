import type { Metadata } from "next";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";

config.autoAddCss = false;

export function generateMetadata(): Metadata {
  if (process.env.SITE_EXPERIENCE === "student-hub")
    return {
      title: "NUM | Thesis Deployment Flow",
      description:
        "Explore the manual deployment and GitLab CI/CD study flow, live pipelines and interactive deployment simulation.",
    };
  return {
    title: "Sokha Cafe",
    description: "Fresh coffee in Phnom Penh",
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Root layout shares this font stylesheet across every application page. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&amp;family=Noto+Sans+Khmer:wght@400;600;700&amp;display=swap" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </head>
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          margin: 0,
          background: "#f3f5f7",
          color: "#16202a",
        }}
      >
        {children}
      </body>
    </html>
  );
}
