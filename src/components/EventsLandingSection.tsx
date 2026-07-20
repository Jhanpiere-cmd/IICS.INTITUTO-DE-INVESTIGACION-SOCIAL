import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { CalendarDays, Clock, ExternalLink, Loader2, MapPin, Radio, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LandingEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string | null;
  scheduled_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  is_online: boolean | null;
  status: 'planificado' | 'en_curso' | 'completado' | 'cancelado' | string;
  cover_image_url: string | null;
  registration_slug: string | null;
  registration_enabled: boolean | null;
  instructor_name: string | null;
  instructor_role: string | null;
}

const statusLabel: Record<string, string> = {
  planificado: 'Programado',
  en_curso: 'En vivo',
  completado: 'Finalizado',
  cancelado: 'Cancelado',
};

const formatEventDate = (value: string | null) => {
  if (!value) return 'Fecha por confirmar';
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  return new Intl.DateTimeFormat('es-PE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const formatTimeRange = (start: string | null, end: string | null) => {
  if (!start && !end) return 'Horario por confirmar';
  const trim = (time: string) => time.slice(0, 5);
  if (start && end) return `${trim(start)} - ${trim(end)}`;
  return trim(start || end || '');
};

export default function EventsLandingSection() {
  const [events, setEvents] = useState<LandingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const { data, error } = await supabase
          .from('events')
          .select('id,title,description,event_type,scheduled_date,start_time,end_time,location,is_online,status,cover_image_url,registration_slug,registration_enabled,instructor_name,instructor_role')
          .in('status', ['planificado', 'en_curso'])
          .gte('scheduled_date', today)
          .order('scheduled_date', { ascending: true })
          .order('start_time', { ascending: true })
          .limit(6);

        if (error) throw error;
        setEvents((data || []) as LandingEvent[]);
      } catch (error) {
        console.warn('No se pudieron cargar eventos publicos:', error);
        setErrorMessage('La agenda no esta disponible en este momento.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [today]);

  return (
    <section
      id="eventos-publicos"
      className="relative z-10 w-full bg-black px-4 py-24 sm:px-6 lg:px-8 border-t border-zinc-950 overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,rgba(0,153,255,0.045),transparent_28%,rgba(10,10,12,0.7)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent" />

      <div className="relative mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl text-left">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-px w-8 bg-cyan-500" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-[#0099ff]">
                Eventos desde el sistema interno
              </span>
            </div>
            <h2 className="font-sans text-3xl font-black uppercase leading-[1.08] tracking-tight text-white sm:text-4xl">
              Agenda institucional
            </h2>
            <p className="mt-4 max-w-2xl font-sans text-sm font-medium leading-relaxed text-zinc-300 sm:text-base">
              Actividades programadas por el IICS. Cuando el formulario esta activo, el registro aparece disponible de forma publica.
            </p>
          </div>

          <div className="flex items-center gap-2 border border-cyan-500/20 bg-cyan-950/10 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-300">
            <Radio className="h-3.5 w-3.5" />
            <span>Sincronizado con eventos</span>
          </div>
        </div>

        {isLoading && (
          <div className="flex min-h-[220px] items-center justify-center border border-zinc-900 bg-zinc-950/20">
            <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-wider text-cyan-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Cargando agenda institucional</span>
            </div>
          </div>
        )}

        {!isLoading && errorMessage && (
          <div className="border border-amber-500/20 bg-amber-950/10 p-6 text-sm text-amber-200">
            {errorMessage}
          </div>
        )}

        {!isLoading && !errorMessage && events.length === 0 && (
          <div className="border border-dashed border-zinc-800 bg-zinc-950/20 p-10 text-center">
            <CalendarDays className="mx-auto mb-4 h-8 w-8 text-zinc-600" />
            <p className="font-mono text-sm uppercase tracking-wider text-zinc-400">
              Aun no hay eventos publicos programados.
            </p>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">
              Cuando el equipo registre una actividad planificada en el modulo interno, aparecera aqui automaticamente.
            </p>
          </div>
        )}

        {!isLoading && !errorMessage && events.length > 0 && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {events.map((event, index) => {
              const canRegister = Boolean(event.registration_enabled && event.registration_slug);
              const registrationHref = canRegister ? `/admin/registro/${event.registration_slug}` : undefined;
              const locationLabel = event.is_online ? 'Evento virtual' : event.location || 'Lugar por confirmar';

              return (
                <motion.article
                  key={event.id}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.45, delay: index * 0.05 }}
                  className="group flex min-h-[460px] flex-col overflow-hidden border border-zinc-850 bg-[#050506]/90 transition-all duration-300 hover:border-cyan-500/35"
                >
                  <div className="relative h-44 overflow-hidden border-b border-zinc-900 bg-zinc-950">
                    {event.cover_image_url ? (
                      <img
                        src={event.cover_image_url}
                        alt={event.title}
                        className="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#07111d,#050506_55%,#06131a)]">
                        <div className="grid h-20 w-20 place-items-center border border-cyan-500/20 bg-black/30">
                          <CalendarDays className="h-8 w-8 text-cyan-400/80" />
                        </div>
                      </div>
                    )}
                    <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                      <span className="border border-cyan-500/25 bg-black/75 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-cyan-300 backdrop-blur">
                        {statusLabel[event.status] || event.status || 'Evento'}
                      </span>
                      {event.event_type && (
                        <span className="border border-zinc-700 bg-black/70 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-300 backdrop-blur">
                          {event.event_type}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-4 grid grid-cols-1 gap-2 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                      <span className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5 text-cyan-400" />
                        {formatEventDate(event.scheduled_date)}
                      </span>
                      <span className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-cyan-400" />
                        {formatTimeRange(event.start_time, event.end_time)}
                      </span>
                      <span className="flex min-w-0 items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                        <span className="truncate">{locationLabel}</span>
                      </span>
                    </div>

                    <h3 className="text-lg font-extrabold uppercase leading-snug tracking-tight text-white transition-colors group-hover:text-cyan-300">
                      {event.title}
                    </h3>

                    {event.description && (
                      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-zinc-300">
                        {event.description}
                      </p>
                    )}

                    {(event.instructor_name || event.instructor_role) && (
                      <div className="mt-4 flex items-start gap-2 border-t border-zinc-900 pt-3 text-xs text-zinc-400">
                        <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-500" />
                        <span>
                          {event.instructor_name || 'Equipo IICS'}
                          {event.instructor_role ? ` - ${event.instructor_role}` : ''}
                        </span>
                      </div>
                    )}

                    <div className="mt-auto pt-6">
                      {canRegister ? (
                        <a
                          href={registrationHref}
                          className="inline-flex h-10 w-full items-center justify-center gap-2 bg-cyan-500 px-4 font-mono text-xs font-black uppercase tracking-wider text-slate-950 transition-all hover:bg-cyan-400"
                        >
                          <span>Inscribirme</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <span className="inline-flex h-10 w-full items-center justify-center border border-zinc-800 bg-zinc-950/50 px-4 font-mono text-xs font-bold uppercase tracking-wider text-zinc-500">
                          Registro no disponible
                        </span>
                      )}
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
