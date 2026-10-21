export const metadata = { title: 'App Móvil — CRM Taller' };

export default function MovilLayout({ children }) {
  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      {children}
    </div>
  );
}
