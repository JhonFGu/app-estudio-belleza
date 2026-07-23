import React from 'react';

interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ icon, title, subtitle, actions }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold text-app-text-primary tracking-tight flex items-center gap-2.5">
          <span className="text-app-mint [&>svg]:w-6 [&>svg]:h-6 flex-shrink-0">{icon}</span>
          <span className="truncate">{title}</span>
        </h1>
        {subtitle && (
          <p className="text-sm text-app-text-secondary font-medium mt-1">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
};
