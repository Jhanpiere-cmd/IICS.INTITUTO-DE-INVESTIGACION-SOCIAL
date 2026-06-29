import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'task' | 'meeting' | 'event';
  color: string;
  user_name: string;
  user_id: string;
  time?: string;
  collaborators?: { id: string, name: string, avatar: string | null }[];
}

interface MonthlyCalendarViewProps {
  events: CalendarEvent[];
  onDayClick: (date: Date) => void;
  viewDate: Date;
  selectedDate: Date;
}

export const MonthlyCalendarView: React.FC<MonthlyCalendarViewProps> = ({ events, onDayClick, viewDate, selectedDate }) => {
  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const diasSemana = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  const hoy = new Date();
  const mesActual = viewDate.getMonth();
  const anioActual = viewDate.getFullYear();

  const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();
  const primerDiaSemana = new Date(anioActual, mesActual, 1).getDay();
  const diasPrevios = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;

  const getEventsForDay = (day: number) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getDate() === day &&
        eventDate.getMonth() === mesActual &&
        eventDate.getFullYear() === anioActual;
    });
  };

  const esMismaFecha = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear();
  };

  return (
    <div className="bg-[#0A0A0A] rounded-none shadow-card border border-exec-border p-3 md:p-6 h-full">

      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-0.5 md:gap-1 mb-2 bg-[#111] p-1 rounded-none border border-exec-border">
        {diasSemana.map(dia => (
          <div key={dia} className="text-center text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest py-2">
            {dia}
          </div>
        ))}
      </div>

      {/* Días del mes */}
      <div className="grid grid-cols-7 gap-0.5 md:gap-1 bg-[#111] border border-exec-border p-1 rounded-none">
        {/* Celdas vacías del mes anterior */}
        {Array.from({ length: diasPrevios }).map((_, idx) => (
          <div key={`empty-${idx}`} className="bg-[#0A0A0A] min-h-[70px] md:min-h-[100px] p-1 md:p-2 opacity-50"></div>
        ))}

        {/* Días del mes actual */}
        {Array.from({ length: diasEnMes }).map((_, idx) => {
          const dia = idx + 1;
          const fechaActual = new Date(anioActual, mesActual, dia);
          const esHoy = esMismaFecha(fechaActual, hoy);
          const esSeleccionado = selectedDate && esMismaFecha(fechaActual, selectedDate);
          const eventosDelDia = getEventsForDay(dia);
          const diaDeLaSemana = fechaActual.getDay();
          const esFinDeSemana = diaDeLaSemana === 0 || diaDeLaSemana === 6;

          return (
            <div
              key={dia}
              onClick={() => onDayClick(fechaActual)}
              className={`
                min-h-[70px] md:min-h-[100px] p-1 md:p-2 cursor-pointer transition-all relative group
                ${esHoy ? 'bg-[#111] ring-1 ring-exec-blue' : 'bg-[#0A0A0A] hover:bg-[#151515]'}
                ${esSeleccionado ? 'bg-[#1a1a1a]' : ''}
              `}
            >
              <div className={`
                text-xs md:text-sm font-bold mb-1 flex justify-between items-center
                ${esHoy ? 'text-exec-blue' : esFinDeSemana ? 'text-gray-500' : 'text-gray-300'}
              `}>
                <span className={esHoy ? 'bg-exec-blue/10 px-1.5 py-0.5 rounded-none' : ''}>{dia}</span>
                {eventosDelDia.length > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white opacity-50 group-hover:opacity-100 transition-opacity"></span>
                )}
              </div>

              {/* Eventos del día */}
              <div className="space-y-1">
                {eventosDelDia.slice(0, 3).map(evento => (
                  <div
                    key={evento.id}
                    className="text-[10px] p-1 rounded-none cursor-pointer hover:brightness-110 transition-all border-l-2 truncate opacity-90 hover:opacity-100"
                    style={{
                      backgroundColor: evento.color + '15', // 15% opacity
                      borderLeftColor: evento.color,
                      color: 'white' // Text always white for contrast
                    }}
                    title={`${evento.title} - ${evento.user_name}${evento.collaborators && evento.collaborators.length > 0 ? ` + ${evento.collaborators.map(c => c.name).join(', ')}` : ''}`}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="font-bold truncate text-[9px] uppercase tracking-tight">
                        {evento.title}
                      </div>
                      
                      {/* Avatares de colaboradores */}
                      {evento.type === 'task' && (evento.collaborators && evento.collaborators.length > 0) && (
                        <div className="flex -space-x-1.5 overflow-hidden py-0.5">
                          {/* Dueño principal */}
                          <div 
                            className="inline-block h-3.5 w-3.5 rounded-full ring-1 ring-black bg-gray-800 flex items-center justify-center text-[6px] font-black border border-white/10"
                            style={{ backgroundColor: evento.color }}
                            title={evento.user_name}
                          >
                            {evento.user_name.charAt(0)}
                          </div>
                          {/* Colaboradores */}
                          {evento.collaborators.slice(0, 3).map((collab, i) => (
                            <div 
                              key={collab.id}
                              className="inline-block h-3.5 w-3.5 rounded-full ring-1 ring-black bg-zinc-800 flex items-center justify-center text-[6px] font-black border border-white/10"
                              title={collab.name}
                            >
                              {collab.avatar ? (
                                <img src={collab.avatar} alt="" className="h-full w-full rounded-full object-cover" />
                              ) : (
                                <span>{collab.name.charAt(0)}</span>
                              )}
                            </div>
                          ))}
                          {evento.collaborators.length > 3 && (
                            <div className="inline-block h-3.5 w-3.5 rounded-full ring-1 ring-black bg-zinc-700 flex items-center justify-center text-[5px] text-white border border-white/10">
                              +{evento.collaborators.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {eventosDelDia.length > 3 && (
                  <div className="text-[10px] text-gray-500 font-medium pl-1">
                    +{eventosDelDia.length - 3} más
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="mt-4 pt-4 border-t border-exec-border flex items-center gap-4 text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-exec-blue"></div>
          <span className="text-xs uppercase tracking-wider">Hoy</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider">📋 Tarea</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider">🎯 Reunión</span>
        </div>
      </div>
    </div >
  );
};
