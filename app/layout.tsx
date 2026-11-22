import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AccountProvider } from "@/components/account-provider";
import { CartProvider } from "@/components/cart-provider";
import { ChatWidget } from "@/components/chat/chat-widget";
import { Header } from "@/components/header";
import { InlineScript } from "@/components/inline-script";
import { Footer } from "@/components/footer";
import { themeScript } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Nova — Fashion & electronics", template: "%s · Nova" },
  description: "Fashion and electronics from the brands you love.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <InlineScript html={themeScript} />
      </head>
      <body className="flex min-h-full flex-col">
        <AccountProvider>
          <CartProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            <ChatWidget />
          </CartProvider>
        </AccountProvider>
      </body>
    </html>
  );
}
