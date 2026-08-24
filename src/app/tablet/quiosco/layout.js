export const metadata = { title: 'Quiosco — Taller' };

// Layout sin header ni nav — pantalla completa para quiosco de pared
export default function QuioscoLayout({ children }) {
  return (
    <div className="min-h-screen h-screen overflow-hidden" data-theme="dim">
      {children}
    </div>
  );
}
