import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'warning';
export type ButtonSize = 'sm' | 'md';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-app-mint hover:bg-app-mint-600 text-white shadow-sm',
  secondary:
    'bg-white border border-app-gray-200 text-app-text-primary hover:bg-app-gray-50 hover:border-app-gray-300',
  danger:
    'bg-white border border-app-pink-250 text-app-pink hover:bg-app-pink-50',
  warning:
    'bg-app-peach hover:bg-app-peach-600 text-white shadow-sm',
  ghost:
    'text-app-text-secondary hover:bg-app-gray-100 hover:text-app-text-primary',
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-xs rounded-xl gap-1.5',
  md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...props
}) => {
  return (
    <button
      className={`inline-flex items-center justify-center font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_STYLES[variant]} ${SIZE_STYLES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
      ) : (
        icon && <span className="flex-shrink-0 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>
      )}
      {children}
    </button>
  );
};
