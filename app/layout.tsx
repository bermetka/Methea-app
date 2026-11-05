import type { Metadata } from "next";
import localFont from "next/font/local";
import { GoogleTagManager } from "@next/third-parties/google";
import "./globals.css";
import { CONSENT_DEFAULT_SCRIPT } from "@/lib/consent";
import CookieBanner from "@/components/consent/CookieBanner";
import SignupEvent from "@/components/analytics/SignupEvent";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.methea.app"),
  title: "Methea — Your research, methodically.",
  description:
    "Methea guides Masters and PhD students from assignment brief to structured research findings: research question, theory, framework, methodology, interview guide and analysis.",
  applicationName: "Methea",
  openGraph: { siteName: "Methea", type: "website", locale: "en_GB" },
};

const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {gtmId && (
        <head>
          {/* Consent Mode v2 default (all denied) must reach the dataLayer before GTM. */}
          <script id="consent-default" dangerouslySetInnerHTML={{ __html: CONSENT_DEFAULT_SCRIPT }} />
        </head>
      )}
      {gtmId && <GoogleTagManager gtmId={gtmId} />}
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
        {gtmId && <CookieBanner />}
        {gtmId && <SignupEvent />}
      </body>
    </html>
  );
}
