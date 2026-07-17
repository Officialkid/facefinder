import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FaceFinder AI | AI-Powered Photo Retrieval",
  description:
    "Upload a reference photo and let AI find all your images from large event datasets.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
