"use client";
import { SWRConfig } from 'swr';

const fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error('Error en la respuesta del servidor');
    err.status = res.status;
    try { err.info = await res.json(); } catch {}
    throw err;
  }
  return res.json();
};

export default function Providers({ children }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 5000,
        keepPreviousData: true,
        provider: () => new Map(),
      }}
    >
      {children}
    </SWRConfig>
  );
}
