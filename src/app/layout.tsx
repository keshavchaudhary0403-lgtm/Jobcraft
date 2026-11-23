import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const serif = Fraunces({ variable: "--font-serif-display", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JobPilot — your AI job search system",
  description: "Decode JDs, tailor resumes, rewrite LinkedIn, write outreach, practise interviews and salary negotiation.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
