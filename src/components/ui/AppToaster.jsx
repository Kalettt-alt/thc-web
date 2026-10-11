import { useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';

export default function AppToaster() {
  useEffect(() => {
    const offline = () => toast.error('Sin conexión. Revisa tu red antes de guardar.', { id: 'connection', duration: Infinity });
    const online = () => toast.success('Conexión restablecida. Puedes volver a intentar guardar.', { id: 'connection' });
    if (!navigator.onLine) offline();
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    return () => {
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', online);
    };
  }, []);

  return (
    <Toaster
      position="top-right"
      containerClassName="thc-toast-container"
      containerStyle={{ zIndex: 2147483000 }}
      toastOptions={{
        duration: 4500,
        error: { duration: 6500 },
        style: {
          background: '#151515', color: '#F2F2F2', border: '1px solid #383838',
          borderRadius: '16px', fontSize: '14px', lineHeight: '1.5',
          maxWidth: 'min(380px, calc(100vw - 32px))', padding: '14px 18px',
          boxShadow: '0 12px 40px #0008', overflowWrap: 'anywhere',
        },
      }}
    />
  );
}
