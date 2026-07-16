import { cn } from '@/core/lib/utils';

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('arena-empty-state', className)}>
      {Icon && (
        <div className="arena-empty-state-icon">
          <Icon className="w-7 h-7" />
        </div>
      )}
      {title && <h3 className="arena-empty-state-title">{title}</h3>}
      {description && <p className="arena-empty-state-description">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
