// Sistema de colores únicos por usuario para el calendario
// Palette updated for Stitch Ultra Modern (Neon/Dark Mode)

const colorPalette = [
  '#00FFFF', // Cyan Neon
  '#FF00FF', // Magenta Neon
  '#9D00FF', // Electric Purple
  '#00FF9D', // Spring Green Neon
  '#FFD700', // Gold Neon
  '#00BFFF', // Deep Sky Blue
  '#FF5F5F', // Neon Red
  '#7B61FF', // Royal Blue Neon
  '#14F195', // Mint Neon
  '#FF9F43', // Orange Neon
  '#54A0FF', // Cornflower Neon
  '#A3CB38', // Android Green
  '#F368E0', // Lavender Rose
  '#0ABDE3', // Cyan Blue
  '#10AC84', // Dark Emerald Neon
  '#FF4757', // Coral Dark
  '#2ED573', // Ufo Green
  '#70A1FF', // Clear Chill
  '#FFA502', // Orange
  '#BA68C8', // Purple Lighter
  '#4DD0E1', // Cyan Lighter
  '#FFF176', // Yellow Lighter
  '#81C784', // Green Lighter
  '#FF8A65', // Deep Orange Lighter
  '#E57373', // Red Lighter
  '#A1887F', // Brown Lighter
  '#90A4AE', // Blue Grey Lighter
  '#CFD8DC', // Blue Grey Very Light
  '#FFD54F', // Amber Lighter
  '#DCE775', // Lime Lighter
  '#AED581', // Light Green Lighter
  '#4DB6AC', // Teal Lighter
  '#F06292', // Pink Lighter
  '#64FFDA', // Aquamarine Neon
  '#FF4081', // Pink Accent
  '#7C4DFF', // Deep Purple Accent
  '#69F0AE', // Green Accent
  '#FFAB40', // Orange Accent
  '#448AFF', // Blue Accent
  '#FF5252', // Red Accent
  '#E040FB', // Purple Accent
  '#18FFFF', // Cyan Accent
  '#FF6E40', // Deep Orange Accent
  '#FFD740', // Amber Accent
  '#00E676', // Light Green Accent
  '#00B0FF', // Sky Blue Accent
  '#D500F9', // Purple Neon Max
  '#C6FF00', // Lime Neon Max
  '#FF3D00', // Deep Orange Max
  '#3D5AFE', // Indigo Accent
  '#00E5FF', // Cyan Max
  '#F50057', // Rose Max
  '#1DE9B6', // Teal Max
  '#FFEA00', // Yellow Max
  '#76FF03', // Light Green Max
  '#0091EA', // Light Blue Max
];

// Cache de colores por usuario
const userColorCache: Map<string, string> = new Map();

/**
 * Obtiene un color único y consistente para un usuario
 * @param userId - ID del usuario
 * @returns Color hexadecimal
 */
export function getUserColor(userId: string): string {
  // Si ya tiene color asignado en esta sesión, devolverlo
  if (userColorCache.has(userId)) {
    return userColorCache.get(userId)!;
  }

  if (!userId) return colorPalette[0];

  // Generar índice basado en un hash más robusto
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) + hash) + userId.charCodeAt(i);
    hash = hash & hash;
  }
  
  const jitter = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = Math.abs(hash + jitter) % colorPalette.length;

  const color = colorPalette[index];
  userColorCache.set(userId, color);

  return color;
}

/**
 * Obtiene todos los colores de usuario del caché
 * @returns Map de userId -> color
 */
export function getAllUserColors(): Map<string, string> {
  return new Map(userColorCache);
}

/**
 * Limpia el caché de colores (útil para testing o reset)
 */
export function clearUserColors(): void {
  userColorCache.clear();
}

/**
 * Obtiene un color con transparencia
 * @param userId - ID del usuario
 * @param opacity - Opacidad (0-1)
 * @returns Color rgba
 */
export function getUserColorWithOpacity(userId: string, opacity: number = 0.2): string {
  const hexColor = getUserColor(userId);
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Obtiene el estilo de sombra (glow) para un usuario
 */
export function getUserGlow(userId: string, intensity: 'low' | 'medium' | 'high' = 'medium'): string {
  const color = getUserColor(userId);
  const alpha = intensity === 'low' ? 0.3 : intensity === 'medium' ? 0.5 : 0.8;
  const spread = intensity === 'low' ? '5px' : intensity === 'medium' ? '10px' : '15px';
  return `0 0 ${spread} ${getUserColorWithOpacity(userId, alpha)}`;
}
