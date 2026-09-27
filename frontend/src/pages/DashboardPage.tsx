import {
  Activity,
  AlertTriangle,
  Bell,
  BrainCircuit,
  ChevronDown,
  CircleDot,
  CloudRain,
  LifeBuoy,
  Map,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { DashboardMap } from '../components/DashboardMap';
import { EmptyState } from '../components/EmptyState';
import { StatusPill } from '../components/StatusPill';
import type { Alert, Incident, Resource, Severity, Summary } from '../types';

export function DashboardPage({
  summary,
  prediction,
  incidents,
  resources,
  alerts,
  scenario,
  busy,
  notice,
  demoLoaded,
  pieData,
  onRefresh,
  onRunDemo,
  onResetDemo,
  onNoticeDismiss,
  onScenarioChange,
  onViewIncidents,
  onCheckModelStatus,
  modelStatusLoading,
}: {
  summary: Summary | null;
  prediction: any;
  incidents: Incident[];
  resources: Resource[];
  alerts: Alert[];
  scenario: string;
  busy: boolean;
  notice: string;
  demoLoaded: boolean;
  pieData: Array<{ name: string; value: number }>;
  onRefresh: () => Promise<void>;
  onRunDemo: () => Promise<void>;
  onResetDemo: () => Promise<void>;
  onNoticeDismiss: () => void;
  onScenarioChange: (value: string) => void;
  onViewIncidents: () => void;
  onCheckModelStatus: () => Promise<void>;
  modelStatusLoading: boolean;
}) {
  const severityColors: Record<Severity, string> = {
    low: '#43c59e',
    medium: '#e7b85c',
    high: '#ef8f5b',
    critical: '#ef6b73',
  };

  const cards = [
    { label: 'Monitored locations', value: summary?.total_incidents ?? 0, icon: Map, accent: 'teal' },
    { label: 'Active incidents', value: summary?.active_incidents ?? 0, icon: AlertTriangle, accent: 'coral' },
    { label: 'Available resources', value: summary?.available_resources ?? 0, icon: Truck, accent: 'gold' },
    { label: 'Pending alerts', value: summary?.recent_alerts ?? 0, icon: Bell, accent: 'blue' },
  ];
  const modelLoaded = prediction?.status === 'trained' && prediction?.compatible;
  const modelOperational = modelLoaded && prediction?.usable_for_decisions !== false;

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            Operations overview
            <span className="live-line" />
          </div>
          <h1>Command dashboard</h1>
          <p>Coordinate risk intelligence, field response, and public warning drafts from one operational view.</p>
        </div>
        <div className="heading-actions">
          <button type="button" className="button button-secondary" onClick={() => void onRefresh()}>
            <RefreshCw size={15} />
            Refresh
          </button>
          <button type="button" className="button button-primary" onClick={() => void onRunDemo()} disabled={busy}>
            <LifeBuoy size={15} />
            {busy ? 'Loading...' : 'Load demo scenario'}
          </button>
        </div>
      </div>

      {notice && (
        <div className="notice">
          <CircleDot size={16} />
          <span>{notice}</span>
          <button type="button" onClick={onNoticeDismiss} aria-label="Dismiss notice">
            <X size={15} />
          </button>
        </div>
      )}

      <div className="scenario-bar">
        <div className="scenario-copy">
          <span className="scenario-icon">
            <CloudRain size={18} />
          </span>
          <div>
            <strong>Scenario workspace</strong>
            <span>Synthetic records are labeled and kept separate from live operational data.</span>
          </div>
        </div>

        <div className="scenario-controls">
          <label htmlFor="scenario">Scenario</label>
          <select id="scenario" value={scenario} onChange={(event) => onScenarioChange(event.target.value)}>
            <option value="rainfall-rise">Heavy rainfall rise</option>
            <option value="multiple-reports">Multiple emergency reports</option>
            <option value="limited-resources">Limited resources</option>
          </select>
          <button type="button" className="icon-button" onClick={() => void onResetDemo()} title="Reset synthetic demo data">
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      <div className="metric-grid">
        {cards.map((metric) => {
          const Icon = metric.icon;
          return (
            <div className="metric-card" key={metric.label}>
              <div className={`metric-icon ${metric.accent}`}>
                <Icon size={18} />
              </div>
              <div>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{summary ? (demoLoaded ? 'Synthetic workspace' : 'Connected database') : 'Waiting for API'}</small>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dashboard-grid top-grid">
        <section className="panel map-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Geospatial operations</span>
              <h2>Incident map</h2>
            </div>
            <StatusPill tone={demoLoaded ? 'warning' : 'neutral'}>{demoLoaded ? 'SIMULATED' : 'NO LIVE FEED'}</StatusPill>
          </div>
          <DashboardMap incidents={incidents} />
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Current exposure</span>
              <h2>Risk distribution</h2>
            </div>
            <span className="muted-label">{summary ? `${summary.total_incidents} records` : 'Awaiting records'}</span>
          </div>

          {pieData.some((item) => item.value) ? (
            <div className="chart-wrap pie-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={88} paddingAngle={3}>
                    {pieData.map((item) => (
                      <Cell key={item.name} fill={severityColors[item.name as Severity]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <strong>{summary?.total_incidents ?? 0}</strong>
                <span>incidents</span>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Activity}
              title="No risk records yet"
              description="Risk distribution will populate from connected records or a demo scenario."
              action={
                <button type="button" className="text-button" onClick={() => void onRunDemo()}>
                  Load synthetic records
                  <ChevronDown size={14} />
                </button>
              }
            />
          )}

          <div className="legend-list">
            {(['critical', 'high', 'medium', 'low'] as Severity[]).map((level) => (
              <span key={level}>
                <i style={{ background: severityColors[level] }} />
                {level}
                <b>{summary?.risk_distribution?.[level] ?? 0}</b>
              </span>
            ))}
          </div>
        </section>
      </div>

      <div className="dashboard-grid lower-grid">
        <section className="panel trend-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Historical view</span>
              <h2>Risk trend</h2>
            </div>
            {demoLoaded && <StatusPill tone="warning">SYNTHETIC</StatusPill>}
          </div>

          {demoLoaded ? (
            <div className="chart-wrap trend-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <div style={{ width: '100%', height: '100%' }}>
                  <svg viewBox="0 0 400 220" width="100%" height="100%" aria-label="Synthetic risk trend">
                    <path d="M20 170 C80 150, 110 110, 150 120 S240 70, 280 95 S350 42, 380 60" stroke="#67d2c1" strokeWidth="3" fill="none" />
                    <g fill="#67d2c1">
                      <circle cx="20" cy="170" r="4" />
                      <circle cx="150" cy="120" r="4" />
                      <circle cx="280" cy="95" r="4" />
                      <circle cx="380" cy="60" r="4" />
                    </g>
                  </svg>
                </div>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              icon={Activity}
              title="Trend is unavailable"
              description="The current API has no historical series yet. Load a demo scenario to generate a labeled synthetic trend."
            />
          )}
        </section>

        <section className="panel prediction-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Decision support</span>
              <h2>Flood prediction</h2>
            </div>
            <BrainCircuit size={19} className="panel-icon" />
          </div>

          <div className={`model-state ${modelLoaded ? 'model-ready' : 'model-unready'}`}>
            <div className="model-state-icon">
              {modelLoaded ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
            </div>
            <div>
              <strong>{modelOperational ? 'MODEL READY' : modelLoaded ? 'MODEL LOADED · RESEARCH ONLY' : 'MODEL NOT TRAINED'}</strong>
              <span>{prediction?.message || 'The prediction service status is loading.'}</span>
            </div>
          </div>

          <p className="panel-note">
            {modelOperational
              ? 'Prototype forecast output from the configured model artifact.'
              : modelLoaded
                ? 'The artifact is loaded, but its measured performance is below the operational threshold. No live risk output is presented.'
              : 'No trained model artifact is available, so no probability is shown. This is an honest status and not a fabricated forecast.'}
          </p>

          <button type="button" className="button button-secondary" onClick={() => void onCheckModelStatus()} disabled={modelStatusLoading}>
            {modelStatusLoading ? 'Checking...' : 'Check model status'}
          </button>
        </section>
      </div>

      <div className="dashboard-grid tables-grid">
        <section className="panel table-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Field operations</span>
              <h2>Recent incidents</h2>
            </div>
            <button type="button" className="text-button" onClick={onViewIncidents}>
              View all
              <ChevronDown size={14} />
            </button>
          </div>

          {incidents.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Incident</th>
                    <th>Location</th>
                    <th>Severity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.slice(0, 5).map((item) => (
                    <tr key={item.id ?? `${item.name}-${item.location}`}>
                      <td>
                        <strong>{item.name}</strong>
                        {item.source === 'demo' && <em>SIM</em>}
                      </td>
                      <td>{item.location}</td>
                      <td>
                        <span className={`severity severity-${item.severity}`}>{item.severity}</span>
                      </td>
                      <td>{item.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={AlertTriangle}
              title="No incidents recorded"
              description="The database is empty right now. Load the demo scenario to populate the operations board."
              action={
                <button type="button" className="text-button" onClick={() => void onRunDemo()}>
                  Load demo
                  <ChevronDown size={14} />
                </button>
              }
            />
          )}
        </section>

        <section className="panel compact-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Logistics</span>
              <h2>Resource availability</h2>
            </div>
            <Truck size={19} className="panel-icon" />
          </div>

          {resources.length ? (
            <div className="resource-list">
              {resources.slice(0, 4).map((item) => (
                <div className="resource-row" key={item.id ?? item.name}>
                  <span className="resource-avatar">
                    <Truck size={15} />
                  </span>
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      {item.resource_type} · {item.location}
                    </span>
                  </div>
                  <b>{item.availability ?? item.quantity}</b>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Truck} title="No resources registered" description="Teams and equipment will appear here when the inventory is available." />
          )}
        </section>

        <section className="panel compact-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Communications</span>
              <h2>Alert drafts</h2>
            </div>
            <Bell size={19} className="panel-icon" />
          </div>

          {alerts.length ? (
            <div className="alert-stack">
              {alerts.slice(0, 3).map((item) => (
                <div key={item.id ?? item.title} className="alert-row">
                  <div className="alert-row-head">
                    <strong>{item.title}</strong>
                    <span className={`severity severity-${item.severity}`}>{item.severity}</span>
                  </div>
                  <p>{item.message}</p>
                  <small>{item.affected_locations || 'Local scope'}</small>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Bell} title="No active alerts" description="Generate a demo scenario to populate the alert workflow." />
          )}
        </section>
      </div>
    </>
  );
}
