import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { UiProvider } from "../providers/ui-provider";
import { TargetProvider } from "../providers/target-provider";
import { Sidebar } from "../components/layout/sidebar";
import { Navbar } from "../components/layout/navbar";
import { CommandPalette } from "../components/ui/command-palette";
import { ToastProvider } from "../components/ui/toast";

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: 'swap',
});

const plus = Plus_Jakarta_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Aegis ReID — Surveillance Command Center",
  description: "AI Person Tracking & Re-Identification — enterprise operations console",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${plus.variable} h-full antialiased dark`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Plus+Jakarta+Sans:wght@300;400;600;700&display=swap" />
      </head>
      <body className="min-h-full flex font-sans text-zinc-100 aegis-shell">
        <UiProvider>
          <TargetProvider>
            <ToastProvider>
              <div className="flex w-full h-screen overflow-hidden">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                  <Navbar />
                  <main className="flex-1 overflow-y-auto">
                    <div className="min-h-full p-6 md:p-8">{children}</div>
                  </main>
                </div>
              </div>
              <CommandPalette />
            </ToastProvider>
          </TargetProvider>
        </UiProvider>
      </body>
    </html>
  );
}
