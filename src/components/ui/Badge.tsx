import React from 'react';

export type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'admin';

interface BadgeProps {
  variant?: BadgeVariant;
  dot?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  success: 'bg-app-mint-100 text-app-mint',
  danger: 'bg-app-pink-100 text-app-pink',
  warning: 'bg-app-peach-100 text-app-peach',
  info: 'bg-app-sky-100 text-app-sky',
  neutral: 'bg-app-gray-100 text-app-gray-700',
  admin: 'bg-app-lavender-100 text-app-lavender',
};

const DOT_STYLES: Record<BadgeVariant, string> = {
  success: 'bg-app-mint',
  danger: 'bg-app-pink',
  warning: 'bg-app-peach',
  info: 'bg-app-sky',
  neutral: 'bg-app-gray-500',
  admin: 'bg-app-lavender',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  dot = false,
  icon,
  children,
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold uppercase tracking-wide whitespace-nowrap ${VARIANT_STYLES[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT_STYLES[variant]}`} />}
      {icon && <span className="flex-shrink-0 [&>svg]:w-3 [&>svg]:h-3">{icon}</span>}
      {children}
    </span>
  );
};
