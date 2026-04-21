import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://nutrifitlab.vercel.app"),
  title: "NutriFitLab — Eat smart. Train hard.",
  description: "AI-powered meal plans and workout plans personalised to your goals. Chat with a nutrition and fitness AI, save recipes, and track your progress.",
  openGraph: {
    title: "NutriFitLab — Eat smart. Train hard.",
    description: "AI-powered meal plans and workout plans personalised to your goals. Chat with a nutrition and fitness AI, save recipes, and track your progress.",
    url: "https://nutrifitlab.vercel.app",
    siteName: "NutriFitLab",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NutriFitLab — Eat smart. Train hard.",
    description: "AI-powered meal plans and workout plans personalised to your goals.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
