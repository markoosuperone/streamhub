import type { Metadata } from "next";
import "./globals.css";



export const metadata: Metadata = {
  title: "Next.js",
  description: "Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={` h-full antialiased`}
    >
      <body >{children}</body>
    </html>
  );
}
