
import { User, Task, Meeting, News } from './types';

export const USERS: User[] = [
  { id: 'u1', email: 'director@revista.com', fullName: 'Dr. Ana Torres', role: 'Director', status: 'Aprobado', avatarUrl: 'https://picsum.photos/id/1005/100/100', createdAt: new Date('2023-01-10') },
  { id: 'u2', email: 'subdirector@revista.com', fullName: 'Carlos Rivas', role: 'Subdirector', status: 'Aprobado', avatarUrl: 'https://picsum.photos/id/1011/100/100', createdAt: new Date('2023-01-12') },
  { id: 'u3', email: 'secretario@revista.com', fullName: 'Lucía Fernández', role: 'Secretario', status: 'Aprobado', avatarUrl: 'https://picsum.photos/id/1027/100/100', createdAt: new Date('2023-01-15') },
  { id: 'u4', email: 'editor@revista.com', fullName: 'Miguel Castro', role: 'Editor', status: 'Aprobado', avatarUrl: 'https://picsum.photos/id/1012/100/100', createdAt: new Date('2023-02-01') },
  { id: 'u5', email: 'diseno@revista.com', fullName: 'Elena Morales', role: 'Diseñador', status: 'Aprobado', avatarUrl: 'https://picsum.photos/id/1013/100/100', createdAt: new Date('2023-02-05') },
];

export const TASKS: Task[] = [
  { id: 't1', title: 'Revisar artículo de IA', description: 'Revisión final del artículo sobre inteligencia artificial para la próxima edición.', assignedTo: 'u4', createdBy: 'u1', status: 'En progreso', priority: 'Alta', dueDate: new Date(new Date().setDate(new Date().getDate() + 5)), createdAt: new Date(new Date().setDate(new Date().getDate() - 2)) },
  { id: 't2', title: 'Diseñar portada de la edición #25', description: 'Crear 3 propuestas de diseño para la portada.', assignedTo: 'u5', createdBy: 'u2', status: 'Pendiente', priority: 'Urgente', dueDate: new Date(new Date().setDate(new Date().getDate() + 3)), createdAt: new Date(new Date().setDate(new Date().getDate() - 1)) },
  { id: 't3', title: 'Agendar reunión de comité editorial', description: 'Coordinar con todos los miembros para la reunión mensual.', assignedTo: 'u3', createdBy: 'u1', status: 'Completada', priority: 'Media', dueDate: new Date(new Date().setDate(new Date().getDate() - 10)), createdAt: new Date(new Date().setDate(new Date().getDate() - 15)) },
  { id: 't4', title: 'Preparar informe de gastos', description: 'Recopilar todas las facturas y preparar el informe financiero del trimestre.', assignedTo: 'u1', createdBy: 'u1', status: 'En espera', priority: 'Media', dueDate: new Date(new Date().setDate(new Date().getDate() + 15)), createdAt: new Date(new Date().setDate(new Date().getDate() - 5)) },
  { id: 't5', title: 'Actualizar redes sociales con "Call for Papers"', description: 'Publicar el llamado a artículos en todas las redes sociales.', assignedTo: 'u2', createdBy: 'u2', status: 'Pendiente', priority: 'Baja', dueDate: new Date(new Date().setDate(new Date().getDate() + 7)), createdAt: new Date() },
];

export const MEETINGS: Meeting[] = [
    { id: 'm1', title: 'Reunión Comité Editorial', description: 'Planificación de la edición #26.', scheduledAt: new Date(new Date().setDate(new Date().getDate() + 7)), duration: 60, location: 'Sala de Juntas Virtual', createdBy: 'u3', participants: [{userId: 'u1', status: 'Confirmado'}, {userId: 'u2', status: 'Confirmado'}, {userId: 'u4', status: 'Pendiente' }], createdAt: new Date() },
    { id: 'm2', title: 'Revisión de Presupuesto Q3', description: 'Análisis de gastos y proyecciones.', scheduledAt: new Date(new Date().setDate(new Date().getDate() + 14)), duration: 45, location: 'Enlace Google Meet', createdBy: 'u1', participants: [{userId: 'u1', status: 'Confirmado'}, {userId: 'u2', status: 'Pendiente'}], createdAt: new Date() }
];

export const NEWS: News[] = [
    { id: 'n1', title: 'Abierta la Convocatoria para la Edición #26', summary: 'Se invita a la comunidad académica a enviar sus manuscritos...', content: 'Contenido completo del anuncio.', publishedBy: 'u2', status: 'Publicado', category: 'Anuncio', views: 152, createdAt: new Date(new Date().setDate(new Date().getDate() - 3)), publishedAt: new Date(new Date().setDate(new Date().getDate() - 3)) },
    { id: 'n2', title: 'Nuevo Miembro del Comité', summary: 'Damos la bienvenida a la Dra. Isabel Rojas como nueva editora asociada.', content: 'Contenido completo de la bienvenida.', publishedBy: 'u1', status: 'Publicado', category: 'Logro', views: 89, createdAt: new Date(new Date().setDate(new Date().getDate() - 10)), publishedAt: new Date(new Date().setDate(new Date().getDate() - 10)) },
];
