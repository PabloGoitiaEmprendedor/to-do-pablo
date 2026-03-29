import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location: string | null;
  hangoutLink: string | null;
  htmlLink: string | null;
  isAllDay: boolean;
}

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar`;

export function useGoogleCalendar(date: string) {
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const timeMin = new Date(date + 'T00:00:00').toISOString();
      const timeMax = new Date(date + 'T23:59:59').toISOString();

      const res = await fetch(
        `${FUNCTION_URL}?action=events&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`,
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      const data = await res.json();
      if (data.error === 'not_connected' || data.error === 'token_expired') {
        setConnected(false);
        setEvents([]);
      } else {
        setConnected(true);
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error('Error fetching calendar events:', err);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const startAuth = async () => {
    const redirectUri = window.location.origin + '/calendar-callback';
    try {
      const res = await fetch(
        `${FUNCTION_URL}?action=auth-url&redirect_uri=${encodeURIComponent(redirectUri)}`,
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Error starting Google auth:', err);
    }
  };

  const handleCallback = async (code: string) => {
    const redirectUri = window.location.origin + '/calendar-callback';
    try {
      const res = await fetch(`${FUNCTION_URL}?action=callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ code, redirect_uri: redirectUri }),
      });
      const data = await res.json();
      if (data.success) {
        setConnected(true);
        await fetchEvents();
      }
      return data;
    } catch (err) {
      console.error('Error handling callback:', err);
      return { error: 'callback_failed' };
    }
  };

  const syncEvents = useCallback(async (syncDate: string) => {
    try {
      const res = await fetch(`${FUNCTION_URL}?action=sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ date: syncDate }),
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('Error syncing calendar events:', err);
      return { error: 'sync_failed' };
    }
  }, []);

  return { events, loading, connected, startAuth, handleCallback, syncEvents, refetch: fetchEvents };
}
