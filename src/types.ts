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
  photoUrl?: string;
  dataSources?: string[];
}

export interface Alert {
  id: string;
  title: string;
  province: string;
  time: string;
  type: 'Bajo' | 'Medio' | 'Alto';
  description: string;
}

export interface ResearchLine {
  id: string;
  title: string;
  description: string;
  details: string;
  icon: string;
}

export interface EmergentTheme {
  name: string;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}
