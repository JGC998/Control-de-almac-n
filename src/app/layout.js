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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // State for sidebar visibility

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex`}
      >
        <ThemeProvider>
          {/* Sidebar container with conditional visibility */}
          <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-gray-800 text-white transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`}>
            <Sidebar toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} /> {/* Pass toggleSidebar to Sidebar */}
          </div>

          {/* Main content area, shifted by sidebar width when open */}
          <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}> {/* Adjusted ml-64 for sidebar width */}
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
