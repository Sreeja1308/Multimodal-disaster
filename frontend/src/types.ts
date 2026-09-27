export type ViewKey = 'dashboard' | 'map' | 'prediction' | 'image' | 'reports' | 'incidents' | 'resources' | 'alerts' | 'performance' | 'settings';
export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type Incident = {
  id?: number;
  name: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  severity: Severity;
  status: string;
  source?: string;
};

export type Resource = {
  id?: number;
  name: string;
  resource_type: string;
  quantity: number;
  availability?: number;
  location?: string;
  status: string;
};

export type Alert = {
  id?: number;
  title: string;
  severity: Severity;
  affected_locations?: string;
  message: string;
  status?: string;
  simulated?: boolean;
};

export type Summary = {
  total_incidents: number;
  active_incidents: number;
  available_resources: number;
  recent_alerts: number;
  risk_distribution: Record<Severity, number>;
  model_status: string;
};

export type LocationState = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
};

export type EnvironmentData = {
  provider: string;
  observed_at: string;
  retrieved_at: string;
  values: Record<string, number | null>;
  unavailable: Record<string, string>;
  daily_forecast?: Array<{
    date: string;
    temperature_max_c: number | null;
    temperature_min_c: number | null;
    precipitation_mm: number | null;
    precipitation_probability_pct: number | null;
    wind_speed_max_kmh: number | null;
  }>;
};
