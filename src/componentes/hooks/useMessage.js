"use client";
import { useState, useCallback } from 'react';

export function useMessage(autoClearMs = 4000) {
  const [message, setMessage] = useState(null);

  const show = useCallback((type, text) => {
    setMessage({ type, text });
    if (autoClearMs > 0) {
      setTimeout(() => setMessage(null), autoClearMs);
    }
  }, [autoClearMs]);

  const showSuccess = useCallback((text) => show('success', text), [show]);
  const showError   = useCallback((text) => show('error', text),   [show]);
  const showWarning = useCallback((text) => show('warning', text), [show]);
  const clear       = useCallback(() => setMessage(null), []);

  const Alert = message
    ? <div role="alert" className={`alert alert-${message.type} mb-4`}>{message.text}</div>
    : null;

  return { message, showSuccess, showError, showWarning, clear, Alert };
}
