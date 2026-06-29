import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'task' | 'meeting' | 'event';
  color: string;
  user_name: string;
  time?: string;
  duration_minutes?: number;
  collaborators?: { id: string, name: string, avatar: string | null }[];
}

interface WeeklyCalendarViewProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  viewDate: Date;
}

export const WeeklyCalendarView: React.FC<WeeklyCalendarViewProps> = ({ events, onEventClick, viewDate }) => {
  const currentWeekStart = getWeekStart(viewDate);

  const horas = Array.from({ length: 18 }, (_, i) => i + 6); // 6 AM - 11 PM
  const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // Ajustar para que Domingo sea el inicio
    return new Date(d.setDate(diff));
  }

  const semanaActual = Array.from({ length: 7 }, (_, i) => {
    const dia = new Date(currentWeekStart);
    dia.setDate(currentWeekStart.getDate() + i);
    return dia;
  });

  const getEventsForDayAndHour = (dia: Date, hora: number) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      const esMismoDia = eventDate.getDate() === dia.getDate() &&
        eventDate.getMonth() === dia.getMonth() &&
        eventDate.getFullYear() === dia.getFullYear();

      if (!esMismoDia) return false;

      // Si tiene hora específica
      if (event.time) {
        const [eventHour] = event.time.split(':').map(Number);
        return eventHour === hora;
      }

      // Si es tarea sin hora, mostrar a las 9 AM
      if (event.type === 'task') {
        return hora === 9;
      }

      return false;
    });
  };

  const esMismaFecha = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear();
  };

  const hoy = new Date();
  const mesInicio = semanaActual[0].toLocaleDateString('es', { month: 'long' });
  const mesFin = semanaActual[6].toLocaleDateString('es', { month: 'long' });
  const anio = semanaActual[0].getFullYear();
  const rangoMes = mesInicio === mesFin ? `${mesInicio} ${anio}` : `${mesInicio} - ${mesFin} ${anio}`;

  return (
    <div className="bg-[#0A0A0A] rounded-none shadow-card border border-exec-border p-3 md:p-6 overflow-hidden flex flex-col h-[calc(100vh-140px)]">

      {/* Calendario Semanal */}
      <div className="overflow-x-auto flex-1 relative custom-scrollbar">
        <div className="min-w-[600px] md:min-w-[800px] h-full flex flex-col">
          {/* Encabezados de días */}
          <div className="grid grid-cols-8 border-b border-exec-border bg-[#111] sticky top-0 z-20">
            <div className="p-2 md:p-3 text-xs md:text-sm font-bold text-gray-400 uppercase tracking-widest text-center">Hora</div>
            {semanaActual.map((dia, idx) => {
              const esHoy = esMismaFecha(dia, hoy);
              return (
                <div
                  key={idx}
                  className={`p-1.5 md:p-3 text-center border-l border-exec-border ${esHoy ? 'bg-[#1a1a1a]' : ''}`}
                >
                  <div className={`text-[10px] md:text-xs font-bold uppercase tracking-widest ${esHoy ? 'text-exec-blue' : 'text-gray-500'}`}>
                    {diasSemana[dia.getDay()]}
                  </div>
                  <div className={`
                    text-lg md:text-xl font-bold mt-0.5 md:mt-1
                    ${esHoy ? 'text-white bg-exec-blue rounded-none w-6 h-6 md:w-8 md:h-8 flex items-center justify-center mx-auto text-sm md:text-base shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'text-gray-300'}
                  `}>
                    {dia.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rejilla de horas */}
          <div className="relative flex-1 bg-[#0A0A0A]">
            {horas.map(hora => (
              <div key={hora} className="grid grid-cols-8 border-b border-exec-border/30 min-h-[60px]">
                {/* Columna de hora */}
                <div className="p-1 md:p-2 text-[10px] md:text-xs font-medium text-gray-500 border-r border-exec-border flex items-start justify-center">
                  {hora === 0 ? '12a' : hora < 12 ? `${hora}a` : hora === 12 ? '12p' : `${hora - 12}p`}
                </div>

                {/* Columnas de días */}
                {semanaActual.map((dia, diaIdx) => {
                  const eventosHora = getEventsForDayAndHour(dia, hora);
                  const esHoy = esMismaFecha(dia, hoy);

                  return (
                    <div
                      key={diaIdx}
                      className={`
                        relative p-0.5 border-l border-exec-border/30 first:border-l-0
                        ${esHoy ? 'bg-[#111]/30' : 'hover:bg-[#111]'}
                        transition-colors
                      `}
                    >
                      {/* Eventos en esta hora */}
                      {eventosHora.map(evento => {
                        // Calcular altura basada en duración (asumiendo 60px por hora)
                        const duracion = evento.duration_minutes || 60;
                        // Ajustar visualmente para que no se vea cortado si es muy corto
                        const alturaPixeles = Math.max((duracion / 60) * 60, 20);

                        return (
                          <div
                            key={evento.id}
                            onClick={() => onEventClick(evento)}
                            className="absolute left-1 right-1 rounded-none shadow-sm cursor-pointer hover:shadow-[0_0_10px_rgba(0,0,0,0.5)] hover:z-30 transition-all border-l-2 overflow-hidden group"
                            style={{
                              backgroundColor: evento.color + '20', // 20% opacity
                              borderLeftColor: evento.color,
                              height: `${alturaPixeles}px`,
                              top: '0',
                              zIndex: 10,
                              boxShadow: `0 0 5px ${evento.color}10`
                            }}
                            title={`${evento.title} - ${evento.user_name}`}
                          >
                            <div className="p-1 text-white text-[10px] leading-tight h-full relative flex flex-col justify-between">
                              <div className="min-w-0">
                                <div className="font-bold truncate pr-1 text-[9px] uppercase tracking-tighter">
                                  {evento.title}
                                </div>
                                <div className="text-[8px] text-gray-300 mt-0.5 truncate opacity-70 italic">
                                  {evento.user_name}
                                </div>
                              </div>
                              
                              {/* Avatares en vista semanal */}
                              {evento.type === 'task' && evento.collaborators && evento.collaborators.length > 0 && (
                                <div className="flex -space-x-1 overflow-hidden mt-1 mb-0.5">
                                  <div 
                                    className="h-3 w-3 rounded-full ring-1 ring-black flex items-center justify-center text-[5px] font-black border border-white/10"
                                    style={{ backgroundColor: evento.color }}
                                  >
                                    {evento.user_name.charAt(0)}
                                  </div>
                                  {evento.collaborators.slice(0, 2).map((collab) => (
                                    <div 
                                      key={collab.id}
                                      className="h-3 w-3 rounded-full ring-1 ring-black bg-zinc-800 flex items-center justify-center text-[5px] font-black border border-white/10"
                                    >
                                      {collab.avatar ? (
                                        <img src={collab.avatar} alt="" className="h-full w-full rounded-full object-cover" />
                                      ) : (
                                        <span>{collab.name.charAt(0)}</span>
                                      )}
                                    </div>
                                  ))}
                                  {evento.collaborators.length > 2 && (
                                    <div className="h-3 w-3 rounded-full ring-1 ring-black bg-zinc-700 flex items-center justify-center text-[4px] text-white border border-white/10">
                                      +{evento.collaborators.length - 2}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}


              </div>
            ))}

            {/* Línea de hora actual */}
            <div
              className="absolute left-0 right-0 border-t border-red-500 z-20 pointer-events-none opacity-50"
              style={{
                top: `${((new Date().getHours() - 6) * 60 + new Date().getMinutes()) / (18 * 60) * 100}%`,
                display: new Date().getHours() >= 6 && new Date().getHours() < 24 ? 'block' : 'none'
              }}
            >
              <div className="absolute left-0 -top-1 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_red]"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Leyenda */}
      <div className="p-4 border-t border-exec-border flex flex-wrap items-center gap-4 text-sm text-gray-400 bg-[#0A0A0A]">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider">📋 Tarea</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider">🎯 Reunión</span>
        </div>
        <div className="text-xs text-gray-600 ml-auto">
          * Horario de 6:00 AM a 11:00 PM
        </div>
      </div>
    </div>
  );
};
