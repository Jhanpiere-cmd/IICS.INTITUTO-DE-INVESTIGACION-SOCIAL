
export type Role = "Director" | "Subdirector" | "Subdirectora" | "Secretario" | "Secretaria" | "Jefe de Imagen" | "Jefa de Imagen" | "Auxiliar Técnico" | "Auxiliar Técnica" | "Gestor de Redes" | "Gestora de Redes" | "Coordinador de Eventos" | "Coordinadora de Eventos" | "Relaciones Institucionales" | "Asesor" | "Asesora" | "CM- Equipo de comunicación y marketing-acs" | "Editor" | "Diseñador";
export type UserStatus = "Pendiente" | "Aprobado" | "Rechazado";
export type TaskStatus = "Pendiente" | "En progreso" | "Completada" | "En espera";
export type TaskPriority = "Baja" | "Media" | "Alta" | "Urgente";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  status: UserStatus;
  avatarUrl?: string;
  department?: string;
  createdAt: Date;
  lastSeen?: Date;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // userId
  createdBy: string; // userId
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date;
  publicationDate?: Date | string;
  fileUrls?: string[];
  completionLink?: string;
  createdAt: Date;
}

export interface Meeting {
  id: string;
  title: string;
  description: string;
  scheduledAt: Date;
  duration: number; // in minutes
  location: string;
  meetingLink?: string;
  createdBy: string; // userId
  participants: { userId: string; status: 'Pendiente' | 'Confirmado' | 'Declinado' }[];
  createdAt: Date;
}

export interface News {
    id: string;
    title: string;
    summary: string;
    content: string;
    publishedBy: string; // userId
    status: 'Borrador' | 'Publicado' | 'Archivado';
    imageUrl?: string;
    category: 'Anuncio' | 'Actualización' | 'Logro' | 'Evento' | 'Otro';
    views: number;
    publishedAt?: Date;
    createdAt: Date;
}

export interface ContentCalendar {
  id: string;
  platform: string;
  contentType: string;
  publicationDate: Date;
  copyText?: string;
  visualElements?: string[];
  status: 'En curso' | 'Programado' | 'Publicado' | 'Cancelado' | string;
  assetLink?: string;
  postLink?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProvinceData {
  id: string;
  name: string;
  riskScore: number; // 0 to 10
  riskDescription: 'Bajo' | 'Moderado' | 'Alto';
  mencionesRedes: number;
  alertCount: number;
  keyIssues: string[];
  activeAlert: string | null;
  coordinates: { x: number; y: number }; // Relative positions in SVG viewport
  indicators: { label: string; value: string | number }[];
}

export interface Alert {
  id: string;
  title: string;
  province: string;
  time: string;
  type: 'Bajo' | 'Medio' | 'Alto';
  description: string;
}

export interface EmergentTheme {
  name: string;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}
