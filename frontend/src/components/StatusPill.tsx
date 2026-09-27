type StatusTone = 'neutral' | 'success' | 'warning' | 'danger';

export function StatusPill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: StatusTone }) {
  return (
    <span className={`status-pill status-${tone}`}>
      <span className="status-dot" />
      {children}
    </span>
  );
}
