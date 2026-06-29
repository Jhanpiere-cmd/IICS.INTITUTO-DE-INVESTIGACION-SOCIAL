export interface Profile {
    id: string;
    role: 'Director' | 'Subdirector' | 'Docente' | 'Estudiante' | 'Secretaria' | 'Gestor de Redes' | 'Coordinador de Eventos' | 'Auxiliar Técnico';
    fullName: string;
    avatarUrl?: string;
}

export interface Course {
    id: string;
    title: string;
    description: string;
    cover_url: string;
    created_by: string;
    created_at: string;
    instructor?: string;

    // Fase 2 Fields
    type: 'online' | 'presencial';
    default_deadline?: string; // Date string (YYYY-MM-DD)
    is_open_enrollment?: boolean;
    schedule?: string;
}

export interface Enrollment {
    id: string;
    user_id: string;
    course_id: string;
    status: 'active' | 'completed' | 'failed_attendance' | 'failed_grades' | 'recovering';
    final_grade: number;
    attendance_percentage: number;
    deadline_override?: string;
    completed_at?: string;
}

export interface Module {
    id: string;
    course_id: string;
    title: string;
    order_index: number;
    is_final_module?: boolean;
    lessons?: Lesson[];
}

export interface Lesson {
    id: string;
    module_id: string;
    title: string;
    type: 'video' | 'text' | 'quiz' | 'assignment';
    content_url?: string;
    content_text?: string;
    video_url?: string; // New: Dedicated Video URL
    pdf_url?: string;   // New: PDF File URL
    order_index: number;
    duration_minutes?: number;

    // Fase 2: Evaluation & Scheduling
    is_recovery_exam?: boolean;
    requires_manual_grade?: boolean;

    // Calendario Presencial
    scheduled_date?: string; // YYYY-MM-DD
    start_time?: string; // HH:mm:ss
    end_time?: string; // HH:mm:ss

    completed?: boolean; // Front-end aid
    questions?: Question[];
}

export interface Question {
    question: string;
    options: string[];
    correct_answer: number;
}

export interface UserProgress {
    lesson_id: string;
    completed: boolean;
    score?: number;
}
