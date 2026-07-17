
import React, { useState } from 'react';
import { Task, User } from '../../types';
import { USERS } from '../../constants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../common/Card';
import { Icons } from '../icons';

interface TasksViewProps {
    tasks: Task[];
}

const getStatusBadgeClass = (status: Task['status']) => {
    switch (status) {
        case 'Completada': return 'bg-green-100 text-green-800';
        case 'En progreso': return 'bg-blue-100 text-blue-800';
        case 'En espera': return 'bg-gray-100 text-gray-800';
        case 'Pendiente': return 'bg-yellow-100 text-yellow-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

const getPriorityChipClass = (priority: Task['priority']) => {
    switch (priority) {
        case 'Urgente': return 'border-red-500 text-red-500';
        case 'Alta': return 'border-orange-500 text-orange-500';
        case 'Media': return 'border-yellow-500 text-yellow-500';
        case 'Baja': return 'border-blue-500 text-blue-500';
        default: return 'border-gray-500 text-gray-500';
    }
};

export const TasksView: React.FC<TasksViewProps> = ({ tasks }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [currentDate, setCurrentDate] = useState(new Date());

    const findUser = (userId: string): User | undefined => USERS.find(u => u.id === userId);

    const filteredTasks = tasks.filter(task =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calendar Helpers
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        return { days, firstDay };
    };

    const { days, firstDay } = getDaysInMonth(currentDate);
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const renderCalendar = () => {
        const daysArray = Array.from({ length: days }, (_, i) => i + 1);
        const blanks = Array.from({ length: firstDay }, (_, i) => i);

        return (
            <div className="bg-exec-card border border-exec-border rounded-lg shadow p-4">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={prevMonth} className="p-2 hover:bg-exec-dark rounded-full"><Icons.ChevronLeft className="w-5 h-5" /></button>
                    <h3 className="text-lg font-bold">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                    <button onClick={nextMonth} className="p-2 hover:bg-exec-dark rounded-full"><Icons.ChevronRight className="w-5 h-5" /></button>
                </div>
                <div className="grid grid-cols-7 gap-2 mb-2 text-center font-bold text-muted-foreground">
                    <div>Dom</div><div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div>
                </div>
                <div className="grid grid-cols-7 gap-2">
                    {blanks.map(i => <div key={`blank-${i}`} className="h-24 bg-exec-dark/50 rounded-lg"></div>)}
                    {daysArray.map(day => {
                        const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
                        const dayTasks = filteredTasks.filter(t => new Date(t.dueDate).toDateString() === dateStr);

                        return (
                            <div key={day} className="h-24 bg-exec-card border border-exec-border rounded-lg p-2 overflow-y-auto hover:shadow-md transition-shadow relative">
                                <span className={`text-sm font-semibold ${new Date().toDateString() === dateStr ? 'bg-exec-blue text-white w-6 h-6 flex items-center justify-center rounded-full' : ''}`}>{day}</span>
                                <div className="mt-1 space-y-1">
                                    {dayTasks.map(t => (
                                        <div key={t.id} className={`text-[10px] p-1 rounded truncate cursor-pointer ${getStatusBadgeClass(t.status)}`} title={t.title}>
                                            {t.title}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="p-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <CardTitle>Gestión de Tareas</CardTitle>
                            <CardDescription>Visualiza, filtra y gestiona todas las tareas del equipo.</CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex bg-exec-dark p-1 rounded-lg">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-exec-card shadow text-exec-blue' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <Icons.List className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('calendar')}
                                    className={`p-2 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-exec-card shadow text-exec-blue' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <Icons.Calendar className="w-4 h-4" />
                                </button>
                            </div>
                            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-opacity-90 transition-colors">
                                <Icons.PlusCircle className="w-5 h-5" />
                                <span>Nueva Tarea</span>
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4 pt-4">
                        <div className="relative w-full max-w-sm">
                            <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Buscar por título..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-exec-card border border-exec-border rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-exec-blue text-foreground"
                            />
                        </div>
                        {/* More filters can be added here */}
                    </div>
                </CardHeader>
                <CardContent>
                    {viewMode === 'list' ? (
                        <div className="border border-exec-border rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-exec-border">
                                <thead className="bg-exec-dark">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-gray-400 uppercase tracking-wider">Tarea</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-gray-400 uppercase tracking-wider">Asignado a</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-gray-400 uppercase tracking-wider">Estado</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-gray-400 uppercase tracking-wider">Prioridad</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-gray-400 uppercase tracking-wider">Vencimiento</th>
                                        <th scope="col" className="relative px-6 py-3"><span className="sr-only">Edit</span></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-exec-card divide-y divide-exec-border">
                                    {filteredTasks.map(task => {
                                        const user = findUser(task.assignedTo);
                                        return (
                                            <tr key={task.id} className="hover:bg-exec-dark/50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-foreground">{task.title}</div>
                                                    <div className="text-sm text-muted-foreground truncate max-w-xs">{task.description}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-8 w-8">
                                                            <img className="h-8 w-8 rounded-full" src={user?.avatarUrl} alt={user?.fullName} />
                                                        </div>
                                                        <div className="ml-3">
                                                            <div className="text-sm font-medium text-foreground">{user?.fullName}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(task.status)}`}>
                                                        {task.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getPriorityChipClass(task.priority)}`}>
                                                        {task.priority}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                                    {task.dueDate.toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button className="text-muted-foreground hover:text-foreground">
                                                        <Icons.MoreVertical className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        renderCalendar()
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
