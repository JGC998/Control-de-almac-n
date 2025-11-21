"use client";
import { useState } from 'react';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SWRConfig } from 'swr';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function RootLayout({ children }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const toggleDrawer = () => setIsDrawerOpen(prev => !prev);

  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className={`antialiased min-h-screen`}>
        <SWRConfig 
          value={{
            fetcher,
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            refreshInterval: 0,
            provider: () => new Map()
          }}
        >
          <div className="drawer lg:drawer-open">
            <input 
              id="my-drawer" 
              type="checkbox" 
              className="drawer-toggle" 
              checked={isDrawerOpen} 
              onChange={toggleDrawer} 
            />
            
            <div className="drawer-content flex flex-col h-screen">
              <Header toggleDrawer={toggleDrawer} />
              <main className="flex-1 overflow-y-auto p-4 bg-base-100">
                {children}
              </main>
            </div>
            
            <div className="drawer-side z-50">
              <label htmlFor="my-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
              <Sidebar />
            </div>
          </div>
        </SWRConfig>
      </body>
    </html>
  );
}
