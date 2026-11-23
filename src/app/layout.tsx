import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Jobcraft", template: "%s · Jobcraft" },
  description: "Your AI job search copilot — tailored resumes, outreach, interview and salary practice.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${mono.variable} h-full`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
