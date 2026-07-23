import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', padding = true }) => {
  return (
    <div
      className={`bg-white rounded-2xl border border-app-gray-200 shadow-sm overflow-hidden ${padding ? 'p-5 sm:p-6' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  icon,
  title,
  subtitle,
  actions,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-app-gray-100 ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-app-mint-100 text-app-mint flex items-center justify-center flex-shrink-0 [&>svg]:w-5 [&>svg]:h-5">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-base font-extrabold text-app-text-primary tracking-tight truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-app-text-secondary font-medium mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
};
