import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  BrainCircuit,
  ChevronDown,
  CircleDot,
  CloudRain,
  FileText,
  Gauge,
  Image as ImageIcon,
  LocateFixed,
  MapPin,
  LayoutDashboard,
  LifeBuoy,
  Map,
  Menu,
  RefreshCw,
  RotateCcw,
  Settings,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import 'leaflet/dist/leaflet.css';
import { DashboardMap } from './components/DashboardMap';
import { EmptyState } from './components/EmptyState';
import { StatusPill } from './components/StatusPill';
import { DashboardPage } from './pages/DashboardPage';
import { PredictionPage } from './pages/PredictionPage';
import type { Alert, EnvironmentData, Incident, LocationState, Resource, Severity, Summary, ViewKey } from './types';
import { safeFetchJson } from './lib/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const navGroups = [
  {
    label: 'Operations',
    items: [
      { key: 'dashboard', label: 'Command dashboard', icon: LayoutDashboard },
      { key: 'map', label: 'Disaster map', icon: Map },
      { key: 'incidents', label: 'Incidents', icon: AlertTriangle },
      { key: 'resources', label: 'Resource allocation', icon: Truck },
      { key: 'alerts', label: 'Alert center', icon: Bell },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { key: 'prediction', label: 'Flood prediction', icon: BrainCircuit },
      { key: 'image', label: 'Image analysis', icon: ImageIcon },
      { key: 'reports', label: 'Emergency reports', icon: FileText },
      { key: 'performance', label: 'Model performance', icon: Gauge },
    ],
  },
  { label: 'System', items: [{ key: 'settings', label: 'Settings', icon: Settings }] },
] as const;

const navItems: Array<{ key: ViewKey; label: string; icon: typeof Activity }> = navGroups.flatMap((group) =>
  group.items as unknown as Array<{ key: ViewKey; label: string; icon: typeof Activity }>,
);

const severityColors: Record<Severity, string> = {
  low: '#43c59e',
  medium: '#e7b85c',
  high: '#ef8f5b',
  critical: '#ef6b73',
};

function App() {
  const [activeView, setActiveView] = useState<ViewKey>('dashboard');
  const [mobileNav, setMobileNav] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [scenario, setScenario] = useState('rainfall-rise');
  const [connection, setConnection] = useState<'connected' | 'offline' | 'loading'>('loading');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [location, setLocation] = useState<LocationState | null>(null);
  const [locationError, setLocationError] = useState('');
  const [environment, setEnvironment] = useState<EnvironmentData | null>(null);
  const [environmentLoading, setEnvironmentLoading] = useState(false);
  const [environmentError, setEnvironmentError] = useState('');
  const [modelStatusLoading, setModelStatusLoading] = useState(false);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [livePrediction, setLivePrediction] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [manualInputs, setManualInputs] = useState({
    river_discharge: '', water_level_m: '', land_cover: 'Agricultural', soil_type: 'Loam',
    population_density: '5000', infrastructure: '0', historical_floods: '0',
  });

  const activeNavLabel = navItems.find((item) => item.key === activeView)?.label ?? 'Command dashboard';

  const refreshData = async () => {
    setConnection('loading');
    const results = await Promise.allSettled([
      safeFetchJson<Summary>('/dashboard/summary'),
      safeFetchJson<any>('/prediction/status'),
      safeFetchJson<Incident[]>('/incidents'),
      safeFetchJson<Resource[]>('/resources'),
      safeFetchJson<Alert[]>('/alerts'),
    ]);
    const [dashboard, predictionStatus, incidentsData, resourcesData, alertsData] = results;
    const failures: string[] = [];
    if (dashboard.status === 'fulfilled') setSummary(dashboard.value); else failures.push('dashboard');
    if (predictionStatus.status === 'fulfilled') setPrediction(predictionStatus.value); else failures.push('model status');
    if (incidentsData.status === 'fulfilled') setIncidents(incidentsData.value); else failures.push('incidents');
    if (resourcesData.status === 'fulfilled') setResources(resourcesData.value); else failures.push('resources');
    if (alertsData.status === 'fulfilled') setAlerts(alertsData.value); else failures.push('alerts');
    setConnection(failures.length === results.length ? 'offline' : 'connected');
    setNotice(failures.length ? `Some services are unavailable: ${failures.join(', ')}.` : '');
  };

  const checkModelStatus = async () => {
    setModelStatusLoading(true);
    try {
      setPrediction(await safeFetchJson<any>('/prediction/status'));
      setNotice('Model status refreshed and artifact validation completed.');
    } catch {
      setNotice('Model status could not be loaded from the backend.');
    } finally {
      setModelStatusLoading(false);
    }
  };

  const useCurrentLocation = () => {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('Geolocation is unavailable in this browser. Enter coordinates manually.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, timestamp: position.timestamp }),
      (error) => setLocationError(error.code === error.PERMISSION_DENIED ? 'Location permission was denied. No fallback location was used.' : 'Location could not be determined. Enter coordinates manually.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const refreshEnvironment = async () => {
    if (!location) {
      setEnvironmentError('Choose a location before requesting environmental data.');
      return;
    }
    setEnvironmentLoading(true);
    setEnvironmentError('');
    try {
      setEnvironment(await safeFetchJson<EnvironmentData>(`/environment?latitude=${location.latitude}&longitude=${location.longitude}`));
    } catch {
      setEnvironmentError('Environmental provider unavailable. No measurements were substituted.');
    } finally {
      setEnvironmentLoading(false);
    }
  };

  const runLivePrediction = async () => {
    if (!location || !environment) return;
    setPredictionLoading(true);
    try {
      const values = environment.values;
      setLivePrediction(await safeFetchJson<any>('/prediction/predict', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: location.latitude, longitude: location.longitude,
          rainfall_mm: values.rainfall_mm, temperature_c: values.temperature_c, humidity_pct: values.humidity_pct,
          elevation_m: values.elevation_m, river_discharge: Number(manualInputs.river_discharge), water_level_m: Number(manualInputs.water_level_m),
          land_cover: manualInputs.land_cover, soil_type: manualInputs.soil_type, population_density: Number(manualInputs.population_density),
          infrastructure: Number(manualInputs.infrastructure), historical_floods: Number(manualInputs.historical_floods),
        }),
      }));
    } catch (error) {
      setLivePrediction({ status: 'error', message: error instanceof Error ? error.message : 'Prediction failed.' });
    } finally {
      setPredictionLoading(false);
    }
  };

  const generateReport = async () => {
    setReportLoading(true);
    try {
      const report = await safeFetchJson<any>('/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          environment,
          prediction: livePrediction,
        }),
      });
      setReportData(report);
      setNotice('Disaster report generated from the selected inputs and current incident records.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Disaster report generation failed.');
    } finally {
      setReportLoading(false);
    }
  };

  const downloadReport = () => {
    if (!reportData) return;
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `floodwatch-report-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const downloadWordReport = async () => {
    setReportLoading(true);
    try {
      const response = await fetch(`${API_URL}/reports/generate.docx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: location?.latitude ?? null, longitude: location?.longitude ?? null, environment, prediction: livePrediction }),
      });
      if (!response.ok) throw new Error(`Word report failed: ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'FloodWatch-disaster-report.docx';
      anchor.click();
      URL.revokeObjectURL(url);
      setNotice('Word disaster report downloaded.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Word report download failed.');
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    void refreshData();
  }, []);

  const runDemo = async () => {
    setBusy(true);
    try {
      const result = await safeFetchJson<{ message: string }>('/demo/replay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario }),
      });
      setNotice(result.message);
      await refreshData();
    } catch {
      setNotice('Demo scenario could not be loaded. Confirm the backend is running on port 8000.');
    } finally {
      setBusy(false);
    }
  };

  const resetDemo = async () => {
    setBusy(true);
    try {
      const result = await safeFetchJson<{ message: string }>('/demo/reset', { method: 'POST' });
      setNotice(result.message);
      await refreshData();
    } catch {
      setNotice('Demo reset failed. Confirm the backend is running on port 8000.');
    } finally {
      setBusy(false);
    }
  };

  const pieData = useMemo(
    () =>
      summary
        ? (['low', 'medium', 'high', 'critical'] as Severity[]).map((name) => ({
            name,
            value: summary.risk_distribution?.[name] ?? 0,
          }))
        : [],
    [summary],
  );

  const demoLoaded = incidents.some((item) => item.source === 'demo') || alerts.some((item) => item.simulated);
  const environmentReady = Boolean(environment && ['rainfall_mm', 'temperature_c', 'humidity_pct', 'elevation_m'].every((key) => environment.values[key] !== null && environment.values[key] !== undefined));

  const cards = [
    { label: 'Monitored locations', value: summary?.total_incidents ?? 0, icon: Map, accent: 'teal' },
    { label: 'Active incidents', value: summary?.active_incidents ?? 0, icon: AlertTriangle, accent: 'coral' },
    { label: 'Available resources', value: summary?.available_resources ?? 0, icon: Truck, accent: 'gold' },
    { label: 'Pending alerts', value: summary?.recent_alerts ?? 0, icon: Bell, accent: 'blue' },
  ];

  const renderDashboard = () => (
    <DashboardPage
      summary={summary}
      prediction={prediction}
      incidents={incidents}
      resources={resources}
      alerts={alerts}
      scenario={scenario}
      busy={busy}
      notice={notice}
      demoLoaded={incidents.some((item) => item.source === 'demo') || alerts.some((item) => item.simulated)}
      pieData={pieData}
      onRefresh={refreshData}
      onRunDemo={runDemo}
      onResetDemo={resetDemo}
      onNoticeDismiss={() => setNotice('')}
      onScenarioChange={(value) => setScenario(value)}
      onViewIncidents={() => setActiveView('incidents')}
      onCheckModelStatus={checkModelStatus}
      modelStatusLoading={modelStatusLoading}
    />
  );

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <ShieldCheck size={21} />
          </div>
          <div>
            <strong>FloodWatch</strong>
            <span>Response intelligence</span>
          </div>
          <button className="mobile-close" type="button" onClick={() => setMobileNav(false)} aria-label="Close nav">
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-status">
          <span className="status-dot" />
          {connection === 'connected' ? 'Operational' : connection === 'offline' ? 'API offline' : 'Connecting'}
          <span className="status-time">LOCAL</span>
        </div>

        <nav>
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-label">{group.label}</span>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setActiveView(item.key as ViewKey);
                      setMobileNav(false);
                    }}
                  >
                    <Icon size={17} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="operator-avatar">OC</div>
          <div>
            <strong>Operations cell</strong>
            <span>Local workspace</span>
          </div>
          <ChevronDown size={15} />
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <button className="mobile-menu" type="button" onClick={() => setMobileNav(true)} aria-label="Open nav">
            <Menu size={20} />
          </button>

          <div className="breadcrumbs">
            <span>FloodWatch</span>
            <span>/</span>
            <strong>{activeNavLabel}</strong>
          </div>

          <div className="topbar-actions">
            <StatusPill tone={connection === 'connected' ? 'success' : connection === 'offline' ? 'danger' : 'neutral'}>
              {connection === 'connected' ? 'API connected' : connection === 'offline' ? 'Offline' : 'Connecting'}
            </StatusPill>
            <button className="top-icon" type="button" title="Refresh data" onClick={() => void refreshData()} aria-label="Refresh dashboard">
              <RefreshCw size={17} />
            </button>
            <div className="top-avatar">OC</div>
          </div>
        </header>

        <main>
          {activeView === 'dashboard' && renderDashboard()}

          {activeView === 'map' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">Workspace</div>
                  <h1>Disaster map</h1>
                  <p>Review the latest incident footprint across the configured response region.</p>
                </div>
                <StatusPill tone={connection === 'connected' ? 'success' : 'danger'}>
                  {connection === 'connected' ? 'API connected' : 'Offline'}
                </StatusPill>
              </div>
              <section className="panel standalone-map">
                <div className="panel-heading">
                  <div>
                    <span className="panel-kicker">Spatial view</span>
                    <h2>Mapped incidents</h2>
                  </div>
                  <StatusPill tone={demoLoaded ? 'warning' : 'neutral'}>{demoLoaded ? 'SIMULATED RECORDS' : 'EMPTY'}</StatusPill>
                </div>
                <DashboardMap incidents={incidents} />
              </section>
            </>
          )}

          {activeView === 'prediction' && (
            <PredictionPage
              connection={connection}
              prediction={prediction}
              incidents={incidents}
              location={location}
              environment={environment}
              environmentLoading={environmentLoading}
              environmentError={environmentError}
              locationError={locationError}
              manualInputs={manualInputs}
              predictionLoading={predictionLoading}
              livePrediction={livePrediction}
              reportLoading={reportLoading}
              reportData={reportData}
              onCheckModelStatus={checkModelStatus}
              onUseCurrentLocation={useCurrentLocation}
              onSetLocation={setLocation}
              onRefreshEnvironment={refreshEnvironment}
              onManualInputChange={(key, value) => setManualInputs((current) => ({ ...current, [key]: value }))}
              onRunLivePrediction={runLivePrediction}
              onGenerateReport={generateReport}
              onDownloadWordReport={downloadWordReport}
              onDownloadReport={downloadReport}
              modelStatusLoading={modelStatusLoading}
            />
          )}

          {activeView === 'incidents' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">Workspace</div>
                  <h1>Incidents</h1>
                  <p>Review current incident records and their operational state.</p>
                </div>
                <StatusPill tone={connection === 'connected' ? 'success' : 'danger'}>
                  {connection === 'connected' ? 'API connected' : 'Offline'}
                </StatusPill>
              </div>
              <section className="panel detail-panel">
                <div className="incident-list">
                  {incidents.length ? (
                    incidents.map((incident) => (
                      <div className="incident-row" key={incident.id ?? `${incident.name}-${incident.location}`}>
                        <div>
                          <strong>{incident.name}</strong>
                          <span>{incident.location}</span>
                        </div>
                        <div className="incident-meta">
                          <span className={`severity severity-${incident.severity}`}>{incident.severity}</span>
                          <small>{incident.status}</small>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      icon={AlertTriangle}
                      title="No incidents"
                      description="The incident list is empty until records are loaded or the demo scenario is replayed."
                      action={
                        <button type="button" className="button button-primary" onClick={() => void runDemo()}>
                          Load demo scenario
                        </button>
                      }
                    />
                  )}
                </div>
              </section>
            </>
          )}

          {activeView === 'resources' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">Workspace</div>
                  <h1>Resource allocation</h1>
                  <p>Monitor equipment, teams, and current availability across the response area.</p>
                </div>
                <StatusPill tone={connection === 'connected' ? 'success' : 'danger'}>
                  {connection === 'connected' ? 'API connected' : 'Offline'}
                </StatusPill>
              </div>
              <section className="panel detail-panel">
                {resources.length ? (
                  <div className="resource-grid">
                    {resources.map((resource) => (
                      <div className="detail-card" key={resource.id ?? resource.name}>
                        <span>{resource.resource_type}</span>
                        <strong>{resource.name}</strong>
                        <small>
                          {resource.location || 'Unassigned'} · {resource.availability ?? resource.quantity} available
                        </small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Truck} title="No resources assigned" description="Inventory will appear here after the demo scenario or production feed is connected." />
                )}
              </section>
            </>
          )}

          {activeView === 'alerts' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">Workspace</div>
                  <h1>Alert center</h1>
                  <p>Review warning drafts and current operational communications.</p>
                </div>
                <StatusPill tone={connection === 'connected' ? 'success' : 'danger'}>
                  {connection === 'connected' ? 'API connected' : 'Offline'}
                </StatusPill>
              </div>
              <section className="panel detail-panel">
                {alerts.length ? (
                  <div className="alert-stack">
                    {alerts.map((alert) => (
                      <div key={alert.id ?? alert.title} className="alert-row">
                        <div className="alert-row-head">
                          <strong>{alert.title}</strong>
                          <span className={`severity severity-${alert.severity}`}>{alert.severity}</span>
                        </div>
                        <p>{alert.message}</p>
                        <small>{alert.affected_locations || 'Local area'}</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Bell}
                    title="No alerts"
                    description="No draft alerts were generated yet. Replay the demo scenario to populate the queue."
                    action={
                      <button type="button" className="button button-primary" onClick={() => void runDemo()}>
                        Load demo scenario
                      </button>
                    }
                  />
                )}
              </section>
            </>
          )}

          {activeView === 'image' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">Workspace</div>
                  <h1>Image analysis</h1>
                  <p>Satellite damage review is intentionally staged until the analysis service is connected.</p>
                </div>
                <StatusPill tone="neutral">Not connected</StatusPill>
              </div>
              <section className="panel detail-panel">
                <EmptyState
                  icon={ImageIcon}
                  title="Image analysis not connected"
                  description="No satellite or damage-analysis pipeline is configured in this workspace."
                />
              </section>
            </>
          )}

          {activeView === 'reports' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">Workspace</div>
                  <h1>Emergency reports</h1>
                  <p>Field and public report intake remains placeholder-only until connected to a reporting flow.</p>
                </div>
                <StatusPill tone="neutral">Awaiting intake</StatusPill>
              </div>
              <section className="panel detail-panel">
                <div className="report-actions">
                  <button type="button" className="button button-primary" onClick={() => void generateReport()} disabled={reportLoading}>
                    <FileText size={15} /> {reportLoading ? 'Generating report...' : 'Generate disaster report'}
                  </button>
                  {reportData && <><button type="button" className="button button-primary" onClick={() => void downloadWordReport()}>Download Word document</button><button type="button" className="button button-secondary" onClick={downloadReport}>Download JSON</button></>}
                </div>
                {reportData ? <pre className="report-preview">{JSON.stringify(reportData, null, 2)}</pre> : <EmptyState icon={FileText} title="No report generated" description="Generate a report from the selected location, available weather data, model result, and incident records." />}
              </section>
            </>
          )}

          {activeView === 'performance' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">Workspace</div>
                  <h1>Model performance</h1>
                  <p>Operational readiness metrics are only displayed once a model artifact is available.</p>
                </div>
                <StatusPill tone="neutral">No model artifact</StatusPill>
              </div>
              <section className="panel detail-panel">
                <EmptyState icon={Gauge} title="Performance metrics unavailable" description="No persisted model artifact is available in this local workspace to assess performance." />
              </section>
            </>
          )}

          {activeView === 'settings' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">Workspace</div>
                  <h1>Settings</h1>
                  <p>Review local configuration and the boundaries of the demo environment.</p>
                </div>
                <StatusPill tone="success">Configured</StatusPill>
              </div>
              <section className="panel detail-panel">
                <div className="detail-grid">
                  <div>
                    <span>API base</span>
                    <strong>{API_URL}</strong>
                  </div>
                  <div>
                    <span>Demo mode</span>
                    <strong>Enabled</strong>
                  </div>
                  <div>
                    <span>Map tiles</span>
                    <strong>OpenStreetMap</strong>
                  </div>
                  <div>
                    <span>Database</span>
                    <strong>SQLite</strong>
                  </div>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
