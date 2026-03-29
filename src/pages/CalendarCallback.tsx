import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { format } from 'date-fns';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function CalendarCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get('code');
  const today = format(new Date(), 'yyyy-MM-dd');
  const { handleCallback } = useGoogleCalendar(today);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!code) {
      setStatus('error');
      return;
    }

    handleCallback(code).then((result) => {
      if (result?.success) {
        setStatus('success');
        setTimeout(() => navigate('/'), 1500);
      } else {
        setStatus('error');
        setTimeout(() => navigate('/'), 3000);
      }
    });
  }, [code]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {status === 'loading' && (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground text-sm">Conectando Google Calendar...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
            <p className="text-foreground text-sm font-medium">¡Google Calendar conectado!</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-10 h-10 text-destructive mx-auto" />
            <p className="text-foreground text-sm">Error al conectar. Redirigiendo...</p>
          </>
        )}
      </div>
    </div>
  );
}
