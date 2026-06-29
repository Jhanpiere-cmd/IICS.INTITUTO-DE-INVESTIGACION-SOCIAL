// Utilidad centralizada para manejo de temas del sistema
// Soporta 3 modos: Claro, Oscuro Azul, y Oscuro Negro Profesional

export type Theme = 'light' | 'dark' | 'dark-black';

/**
 * Obtiene el siguiente tema en el ciclo
 * Ciclo: light → dark → dark-black → light
 */
export function getNextTheme(current: Theme): Theme {
    const cycle: Theme[] = ['light', 'dark', 'dark-black'];
    const currentIndex = cycle.indexOf(current);
    return cycle[(currentIndex + 1) % cycle.length];
}

/**
 * Aplica el tema al documento HTML
 * - light: sin clase (default)
 * - dark: clase 'dark' (modo oscuro azul)
 * - dark-black: clase 'dark-black' (modo oscuro negro puro)
 */
export function applyTheme(theme: Theme): void {
    const root = document.documentElement;

    // Remover todas las clases de tema previas
    root.classList.remove('dark', 'dark-black');

    // Aplicar clase correspondiente
    if (theme === 'dark') {
        root.classList.add('dark');
    } else if (theme === 'dark-black') {
        // ACTIVAR AMBAS: 'dark' para base Tailwind y 'dark-black' para nuestros overrides premium
        root.classList.add('dark', 'dark-black');
    }
    // 'light' no necesita clase
}

/**
 * Carga el tema guardado en localStorage
 * Default: 'dark-black'
 */
export function loadTheme(): Theme {
    const saved = localStorage.getItem('app-theme') as Theme;
    return saved && ['light', 'dark', 'dark-black'].includes(saved) ? saved : 'dark-black';
}

/**
 * Guarda el tema en localStorage y lo aplica
 */
export function saveTheme(theme: Theme): void {
    localStorage.setItem('app-theme', theme);
    applyTheme(theme);
}

/**
 * Nombres de los temas para mostrar en UI
 */
export const THEME_LABELS: Record<Theme, string> = {
    'light': 'Claro',
    'dark': 'Oscuro',
    'dark-black': 'Negro Profesional'
};

/**
 * Descripciones de los temas
 */
export const THEME_DESCRIPTIONS: Record<Theme, string> = {
    'light': 'Tema brillante y limpio',
    'dark': 'Reduce la fatiga visual',
    'dark-black': 'Máximo contraste profesional'
};
