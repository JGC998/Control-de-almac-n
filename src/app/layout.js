'use client'; // Make it a client component

import { useState } from 'react'; // Import useState
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Start with sidebar closed on mobile

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex`}
      >
        <ThemeProvider>
          <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

          {/* Main content area, shifted by sidebar width when open on md screens and above */}
          <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? 'ml-32' : 'ml-0'} md:ml-0 bg-base-200`}> 
            <Header toggleSidebar={toggleSidebar} />
            <main className="flex-1 p-4">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
