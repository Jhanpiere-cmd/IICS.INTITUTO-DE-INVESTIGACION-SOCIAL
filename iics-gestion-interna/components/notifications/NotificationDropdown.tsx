
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Bell } from 'lucide-react';
import { useToast } from '../ui/ToastContext';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    created_at: string;
    data?: any;
}

export const NotificationDropdown: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!user) return;

        fetchNotifications();

        // Suscripción en tiempo real
        const channel = supabase
            .channel('public:notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    const newNotif = payload.new as Notification;
                    setNotifications((prev) => [newNotif, ...prev]);
                    setUnreadCount((prev) => prev + 1);

                    setUnreadCount((prev) => prev + 1);

                    // Show Toast
                    showToast({
                        type: 'info',
                        title: newNotif.title,
                        message: newNotif.message,
                        duration: 5000
                    });

                    // Reproducir sonido suave
                    const audio = new Audio('/notification.mp3');
                    audio.volume = 0.5;
                    audio.play().catch(() => { }); // Ignorar error si no hay interacción previa
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    // Cerrar al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('Error fetching notifications:', error);
            return;
        }

        if (data) {
            setNotifications(data);
            setUnreadCount(data.filter((n) => !n.read).length);
        }
    };

    const markAsRead = async () => {
        if (!user || unreadCount === 0) return;

        const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
        if (unreadIds.length === 0) return;

        await supabase
            .from('notifications')
            .update({ read: true })
            .in('id', unreadIds);

        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    };

    const handleToggle = () => {
        if (!isOpen) {
            markAsRead();
        }
        setIsOpen(!isOpen);
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        // Si es hoy
        if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        // Si fue ayer o antes
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'task_assigned': return 'task_alt';
            case 'meeting_scheduled': return 'event';
            case 'file_uploaded': return 'upload_file';
            case 'system': return 'info';
            default: return 'notifications';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={handleToggle}
                className="text-gray-400 hover:text-white relative transition-colors p-1"
            >
                <span className="material-symbols-outlined text-[24px]">notifications</span>
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-exec-red text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-[#000000]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-[#111] border border-exec-border rounded-sm shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-exec-border flex justify-between items-center bg-[#0A0A0A]">
                        <h3 className="text-sm font-semibold text-white">Notificaciones</h3>
                        {notifications.length > 0 && (
                            <button onClick={fetchNotifications} className="text-xs text-exec-blue hover:underline">
                                Actualizar
                            </button>
                        )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <span className="material-symbols-outlined text-4xl mb-2 opacity-30">notifications_off</span>
                                <p className="text-xs">No tienes notificaciones recientes.</p>
                            </div>
                        ) : (
                            <ul>
                                {notifications.map((notif) => (
                                    <li key={notif.id} className={`border-b border-exec-border/50 last:border-0 hover:bg-[#1a1a1a] transition-colors ${!notif.read ? 'bg-exec-blue/5' : ''}`}>
                                        <div className="px-4 py-3 flex gap-3">
                                            <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${!notif.read ? 'bg-exec-blue/20 text-exec-blue' : 'bg-[#222] text-gray-500'}`}>
                                                <span className="material-symbols-outlined text-[18px]">
                                                    {getIcon(notif.type)}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-200 truncate">{notif.title}</p>
                                                <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{notif.message}</p>
                                                <p className="text-[10px] text-gray-600 mt-1.5 text-right">{formatTime(notif.created_at)}</p>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="px-4 py-2 border-t border-exec-border bg-[#0A0A0A] text-center">
                        <button className="text-xs text-gray-500 hover:text-white transition-colors w-full">
                            Ver todas
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
