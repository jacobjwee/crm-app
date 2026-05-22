import { useState, useEffect } from 'react';
import { toast } from '../lib/toast';

export default function Toaster() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => toast._subscribe(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div className="toaster">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">{t.type === 'error' ? '✕' : '✓'}</span>
          <span className="toast-message">{t.message}</span>
          <button className="toast-close" onClick={() => toast.dismiss(t.id)}>×</button>
        </div>
      ))}
    </div>
  );
}
