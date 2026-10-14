import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Serif_SC } from "next/font/google";
import "./globals.css";
import "highlight.js/styles/vs2015.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { BackgroundProvider } from "@/components/providers/BackgroundProvider";
import { MusicProvider } from "@/components/providers/MusicProvider";
import { EffectProvider } from "@/components/providers/EffectProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import BackgroundRenderer from "@/components/layout/BackgroundRenderer";
import Navbar from "@/components/layout/Navbar";
import ClientWidgets from "@/components/layout/ClientWidgets";
import ClickEffect from "@/components/ui/ClickEffect";
import RadialMenu from "@/components/ui/RadialMenu";
import MouseTrail from "@/components/ui/MouseTrail";
import SeasonalEffect from "@/components/ui/SeasonalEffect";
import WeatherEffect from "@/components/ui/WeatherEffect";
import KiraSparkle from "@/components/ui/KiraSparkle";
import WelcomeScreen from "@/components/layout/WelcomeScreen";
import VisitorTracker from "@/components/layout/VisitorTracker";
import GuestGate from "@/components/layout/GuestGate";
import EasterEggs from "@/components/layout/EasterEggs";
import { siteConfig } from "@/siteConfig";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSerifSC = Noto_Serif_SC({
  variable: "--font-noto-serif-sc",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.bio,
  alternates: {
    types: {
      "application/rss+xml": "/feed",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSerifSC.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans">
        {/*
          防盗链：QQ 音乐的 CDN（dl.stream.qq.com / c6.y.qq.com 等）会校验 Referer，
          不带或带错 Referer 时直接返回 403，导致音频加载失败。
          no-referrer 让浏览器请求这些跨域资源时不发送 Referer 头，绕开校验。
          影响范围仅限本页发出的子资源请求，不影响接口调用。
        */}
        <meta name="referrer" content="no-referrer" />
        <ThemeProvider>
          <EffectProvider>
            <WelcomeScreen />
            <BackgroundProvider>
              <MusicProvider>
                <AuthProvider>
                  <ToastProvider>
                    <GuestGate />
                    <EasterEggs />
                    <BackgroundRenderer />
                    <VisitorTracker />
                    <ClickEffect />
                    <RadialMenu />
                    <MouseTrail />
                    <SeasonalEffect />
                    <WeatherEffect />
                    <KiraSparkle />
                    <Navbar />
                    <main className="flex-1 pt-16">
                      {children}
                    </main>
                    <ClientWidgets />
                  </ToastProvider>
                </AuthProvider>
              </MusicProvider>
            </BackgroundProvider>
          </EffectProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
