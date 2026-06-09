import './globals.css';
import Encabezado from '@/componentes/layout/Encabezado';
import Toaster from '@/componentes/ui/Toaster';
import Providers from './providers';

export const metadata = {
  title: { default: 'CRM Taller', template: '%s — CRM Taller' },
  description: 'Gestión de pedidos, stock y taller',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CRM Taller',
  },
  themeColor: '#1d1d1d',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" data-theme="corporate" suppressHydrationWarning={true}>
      <head>
        <link rel="apple-touch-icon" href="/logo-crm.png" />
      </head>
      <body className="antialiased min-h-screen bg-base-100">
        <Providers>
          <div className="flex flex-col min-h-screen">
            <Encabezado />
            <main className="flex-1 p-4 lg:p-6">
              {children}
            </main>
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
