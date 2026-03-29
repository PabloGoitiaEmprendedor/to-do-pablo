import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useDbTasks } from '@/hooks/useSupabaseTasks';
import { format, addDays } from 'date-fns';

interface ParsedTask {
  name: string;
  date: string;
  start_time: string;
  duration_minutes: number;
  priority: string;
}

// Simple heuristic parser – no LLM needed, works offline
function parseVoiceInput(text: string): ParsedTask {
  const lower = text.toLowerCase();
  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  // Date detection
  let date = today;
  if (lower.includes('mañana') || lower.includes('manana') || lower.includes('tomorrow')) date = tomorrow;
  if (lower.includes('próxima semana') || lower.includes('proxima semana') || lower.includes('next week')) {
    date = format(addDays(new Date(), 7), 'yyyy-MM-dd');
  }

  // Time detection: "a las 3", "a las 15:30", "at 4pm"
  let start_time = '09:00';
  const timeMatch = lower.match(/(?:a las?|at)\s*(\d{1,2})(?::(\d{2}))?\s*(pm|am)?/);
  if (timeMatch) {
    let h = parseInt(timeMatch[1]);
    const m = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    if (timeMatch[3] === 'pm' && h < 12) h += 12;
    start_time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // Priority detection
  let priority = '70';
  if (lower.includes('urgente') || lower.includes('importante') || lower.includes('esencial') || lower.includes('urgent')) priority = '20';
  if (lower.includes('soporte') || lower.includes('reunión') || lower.includes('reunion') || lower.includes('meeting')) priority = '10';
  if (lower.includes('opcional') || lower.includes('si puedo') || lower.includes('backlog')) priority = 'optional';

  // Duration detection
  let duration_minutes = 30;
  const durMatch = lower.match(/(\d+)\s*(hora|horas|hour|hours|minuto|minutos|min)/);
  if (durMatch) {
    const val = parseInt(durMatch[1]);
    duration_minutes = durMatch[2].startsWith('h') ? val * 60 : val;
  }

  // Clean name: remove time/date keywords
  let name = text
    .replace(/mañana|manana|tomorrow|hoy|today|próxima semana|next week/gi, '')
    .replace(/a las? ?\d{1,2}(:\d{2})?\s*(pm|am)?/gi, '')
    .replace(/por \d+ hora(s)?/gi, '')
    .replace(/urgente|importante|esencial|urgent/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!name) name = text.trim();
  name = name.charAt(0).toUpperCase() + name.slice(1);

  return { name, date, start_time, duration_minutes, priority };
}

interface VoiceTaskButtonProps {
  defaultDate?: string;
}

export function VoiceTaskButton({ defaultDate }: VoiceTaskButtonProps) {
  const { addTask } = useDbTasks(defaultDate);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'done' | 'error'>('idle');
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus('error');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => { setIsListening(true); setStatus('listening'); setTranscript(''); };
    recognition.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join('');
      setTranscript(t);
    };
    recognition.onend = async () => {
      setIsListening(false);
      setStatus('processing');
      const finalTranscript = recognitionRef.current?.finalTranscript || transcript;
      if (finalTranscript.trim()) {
        const parsed = parseVoiceInput(finalTranscript);
        await addTask({
          name: parsed.name,
          date: parsed.date,
          start_time: parsed.start_time,
          duration_minutes: parsed.duration_minutes,
          priority: parsed.priority as any,
          status: 'pending',
          recurrence_kind: 'none',
          recurrence_config: {},
          description: '',
          block_id: null,
          parent_task_id: null,
          sort_order: 0,
          color: null,
        });
        setStatus('done');
      } else {
        setStatus('idle');
      }
      setTimeout(() => { setStatus('idle'); setTranscript(''); }, 2500);
    };
    recognition.onerror = () => { setIsListening(false); setStatus('error'); setTimeout(() => setStatus('idle'), 2000); };
    recognitionRef.current = recognition;
    recognition.start();
  }, [addTask, transcript]);

  const stopListening = () => { recognitionRef.current?.stop(); };

  const statusColors: Record<string, string> = {
    idle: 'bg-primary/10 text-primary hover:bg-primary/20',
    listening: 'bg-red-500/20 text-red-500 animate-pulse',
    processing: 'bg-amber-500/20 text-amber-500',
    done: 'bg-green-500/20 text-green-600',
    error: 'bg-red-500/20 text-red-500',
  };

  return (
    <div className="relative flex flex-col items-center gap-1">
      <motion.button
        onClick={isListening ? stopListening : startListening}
        whileTap={{ scale: 0.92 }}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${statusColors[status]}`}
        title="Crear tarea por voz"
      >
        {status === 'processing' ? <Loader2 className="w-4 h-4 animate-spin" /> : isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        {status === 'idle' && 'Voz IA'}
        {status === 'listening' && 'Escuchando...'}
        {status === 'processing' && 'Guardando...'}
        {status === 'done' && '¡Tarea creada!'}
        {status === 'error' && 'No soportado'}
      </motion.button>
      <AnimatePresence>
        {transcript && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-full mb-2 w-56 bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground shadow-lg z-50"
          >
            "{transcript}"
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
