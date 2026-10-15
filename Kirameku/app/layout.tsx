import type { Metadata } from "next";
import localFont from "next/font/local";
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

// 字体自托管：原先 next/font/google 会在**构建期**向 fonts.googleapis.com 拉字体，
// 国内服务器访问不到会直接构建失败（报错指向 internal/font/google）。
// 现在只保留真正被使用的 Geist Mono（两个工具页的 CodeMirror 编辑器引用了
// --font-geist-mono），字体文件放在 public/fonts 下，构建和访客加载都不再依赖外网。
//
// 另外两个变量（--font-geist-sans / --font-noto-serif-sc）原先就没有任何地方引用，
// 已从 Tailwind 默认字体栈渲染，移除后视觉无变化。
const geistMono = localFont({
  src: "../public/fonts/GeistMono.woff2",
  variable: "--font-geist-mono",
  display: "swap",
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
      className={`${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans">
        {/*
          防盗链：第三方音乐 CDN 会校验 Referer，不带或带错 Referer 时
          直接返回 403，导致音频加载失败。no-referrer 让浏览器请求这些
          跨域资源时不发送 Referer 头，绕开校验。
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
