import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";

const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const body = DM_Sans({ variable: "--font-dm", subsets: ["latin"] });
const display = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Jobcraft", template: "%s · Jobcraft" },
  description: "Your AI job search copilot — tailored resumes, outreach, interview and salary practice.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mono.variable} ${body.variable} ${display.variable} h-full`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
