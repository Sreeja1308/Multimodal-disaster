import {
  BrainCircuit,
  CloudRain,
  FileText,
  LocateFixed,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { DashboardMap } from '../components/DashboardMap';
import { StatusPill } from '../components/StatusPill';
import type { EnvironmentData, Incident, LocationState } from '../types';

export function PredictionPage({
  connection,
  prediction,
  incidents,
  location,
  environment,
  environmentLoading,
  environmentError,
  locationError,
  manualInputs,
  predictionLoading,
  livePrediction,
  reportLoading,
  reportData,
  onCheckModelStatus,
  onUseCurrentLocation,
  onSetLocation,
  onRefreshEnvironment,
  onManualInputChange,
  onRunLivePrediction,
  onGenerateReport,
  onDownloadWordReport,
  onDownloadReport,
  modelStatusLoading,
}: {
  connection: 'connected' | 'offline' | 'loading';
  prediction: any;
  incidents: Incident[];
  location: LocationState | null;
  environment: EnvironmentData | null;
  environmentLoading: boolean;
  environmentError: string;
  locationError: string;
  manualInputs: Record<string, string>;
  predictionLoading: boolean;
  livePrediction: any;
  reportLoading: boolean;
  reportData: any;
  onCheckModelStatus: () => Promise<void>;
  onUseCurrentLocation: () => void;
  onSetLocation: React.Dispatch<React.SetStateAction<LocationState | null>>;
  onRefreshEnvironment: () => Promise<void>;
  onManualInputChange: (key: string, value: string) => void;
  onRunLivePrediction: () => Promise<void>;
  onGenerateReport: () => Promise<void>;
  onDownloadWordReport: () => Promise<void>;
  onDownloadReport: () => void;
  modelStatusLoading: boolean;
}) {
  const environmentReady = Boolean(
    environment &&
      ['rainfall_mm', 'temperature_c', 'humidity_pct', 'elevation_m'].every((key) => environment.values[key] !== null && environment.values[key] !== undefined),
  );

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Workspace</div>
          <h1>Flood prediction</h1>
          <p>Transparent model status and forecast guidance for this local workspace.</p>
        </div>
        <StatusPill tone={connection === 'connected' ? 'success' : 'danger'}>
          {connection === 'connected' ? 'API connected' : 'Offline'}
        </StatusPill>
      </div>
      <section className="panel detail-panel live-prediction-workspace">
        <div className="detail-grid">
          <div>
            <span>Status</span>
            <strong>{prediction?.status === 'trained' && prediction?.compatible ? 'Trained artifact validated' : 'Model unavailable'}</strong>
          </div>
          <div>
            <span>Artifact</span>
            <strong>{prediction?.model_path || 'Not available'}</strong>
          </div>
        </div>
        <p className="panel-note">
          {prediction?.message || 'No trained model artifact is available in this workspace. The UI does not invent a probability.'}
        </p>
        <div className="prediction-actions">
          <button type="button" className="button button-secondary" onClick={() => void onCheckModelStatus()} disabled={modelStatusLoading}>
            <RefreshCw size={15} /> {modelStatusLoading ? 'Checking...' : 'Check model status'}
          </button>
          <button type="button" className="button button-primary" onClick={onUseCurrentLocation}>
            <LocateFixed size={15} /> Use my current location
          </button>
        </div>
        {locationError && <div className="inline-error">{locationError}</div>}
        <div className="location-entry">
          <label>
            Latitude
            <input type="number" step="any" value={location?.latitude ?? ''} onChange={(event) => onSetLocation((current) => ({ latitude: Number(event.target.value), longitude: current?.longitude ?? 78.9629 }))} />
          </label>
          <label>
            Longitude
            <input type="number" step="any" value={location?.longitude ?? ''} onChange={(event) => onSetLocation((current) => ({ latitude: current?.latitude ?? 20.5937, longitude: Number(event.target.value) }))} />
          </label>
          {location && <small>{location.accuracy ? `Accuracy ±${Math.round(location.accuracy)} m` : 'Manual location'} · {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</small>}
        </div>
        <DashboardMap incidents={incidents} userLocation={location} onMapLocation={(latitude, longitude) => onSetLocation({ latitude, longitude })} />
        <div className="prediction-actions">
          <button type="button" className="button button-secondary" onClick={() => void onRefreshEnvironment()} disabled={environmentLoading || !location}>
            <CloudRain size={15} /> {environmentLoading ? 'Fetching data...' : 'Refresh environmental data'}
          </button>
          {environment && <span className="muted-label">{environment.provider} · observed {environment.observed_at}</span>}
        </div>
        {environmentError && <div className="inline-error">{environmentError}</div>}
        {environment && (
          <div className="environment-grid">
            {Object.entries(environment.values).map(([key, value]) => (
              <div className="detail-card" key={key}>
                <span>{key.replace(/_/g, ' ')}</span>
                <strong>{value === null ? 'Unavailable' : value}</strong>
              </div>
            ))}
          </div>
        )}
        {environment?.daily_forecast?.length ? (
          <div className="forecast-grid">
            {environment.daily_forecast.map((day) => (
              <div className="detail-card" key={day.date}>
                <span>{day.date}</span>
                <strong>{day.temperature_min_c ?? 'Unavailable'}° to {day.temperature_max_c ?? 'Unavailable'}°C</strong>
                <small>{day.precipitation_mm ?? 'Unavailable'} mm · {day.precipitation_probability_pct ?? 'Unavailable'}% rain</small>
              </div>
            ))}
          </div>
        ) : environment ? (
          <div className="inline-warning">7-day forecast unavailable from the provider response.</div>
        ) : null}
        <div className="manual-input-grid">
          {(['river_discharge', 'water_level_m', 'population_density', 'infrastructure', 'historical_floods'] as const).map((key) => (
            <label key={key}>
              {key.replace(/_/g, ' ')}
              <input
                type="number"
                step="any"
                value={manualInputs[key]}
                onChange={(event) => onManualInputChange(key, event.target.value)}
              />
            </label>
          ))}
        </div>
        {!environmentReady && environment && (
          <div className="inline-warning">
            Prediction requires valid rainfall, temperature, humidity, and elevation values. The provider did not return all required measurements.
          </div>
        )}
        <button
          type="button"
          className="button button-primary"
          onClick={() => void onRunLivePrediction()}
          disabled={!environmentReady || !location || predictionLoading || Object.values(manualInputs).some((value) => value === '')}
        >
          <BrainCircuit size={15} /> {predictionLoading ? 'Running prediction...' : 'Run prediction'}
        </button>
        {livePrediction && (
          <div className={`prediction-result ${livePrediction.status === 'ok' ? '' : 'inline-error'}`}>
            <strong>
              {livePrediction.status === 'ok'
                ? `${livePrediction.label} · ${livePrediction.probability === null ? 'probability unavailable' : `${(livePrediction.probability * 100).toFixed(1)}%`}`
                : 'Prediction unavailable'}
            </strong>
            <span>{livePrediction.message || livePrediction.warnings?.join(' ')}</span>
          </div>
        )}
        <div className="prediction-actions">
          <button type="button" className="button button-secondary" onClick={() => void onGenerateReport()} disabled={reportLoading}>
            <FileText size={15} /> {reportLoading ? 'Generating report...' : 'Generate disaster report'}
          </button>
          {reportData && (
            <>
              <button type="button" className="button button-primary" onClick={() => void onDownloadWordReport()}>
                Download Word document
              </button>
              <button type="button" className="button button-secondary" onClick={onDownloadReport}>
                Download JSON
              </button>
            </>
          )}
        </div>
      </section>
    </>
  );
}
