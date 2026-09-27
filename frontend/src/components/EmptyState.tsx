import { Activity } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Activity;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon size={20} />
      </div>
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </div>
  );
}
