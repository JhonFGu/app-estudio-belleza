import React from 'react';
import { Pencil, Trash2, Eye, type LucideIcon } from 'lucide-react';

export type IconButtonVariant = 'edit' | 'delete' | 'view' | 'neutral';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  icon?: LucideIcon;
  label: string; // Tooltip + accesibilidad (obligatorio)
}

const VARIANT_STYLES: Record<IconButtonVariant, string> = {
  edit: 'text-app-mint border-app-gray-200 hover:bg-app-mint-50 hover:border-app-mint-200',
  delete: 'text-app-pink border-app-gray-200 hover:bg-app-pink-50 hover:border-app-pink-250',
  view: 'text-app-sky border-app-gray-200 hover:bg-app-sky-50 hover:border-app-sky-100',
  neutral: 'text-app-text-secondary border-app-gray-200 hover:bg-app-gray-50 hover:border-app-gray-300',
};

const DEFAULT_ICONS: Record<IconButtonVariant, LucideIcon | null> = {
  edit: Pencil,
  delete: Trash2,
  view: Eye,
  neutral: null, // Requiere icon explícito
};

export const IconButton: React.FC<IconButtonProps> = ({
  variant = 'neutral',
  icon,
  label,
  className = '',
  ...props
}) => {
  const Icon = icon || DEFAULT_ICONS[variant];

  if (!Icon) return null;

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`w-8 h-8 inline-flex items-center justify-center rounded-lg border bg-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_STYLES[variant]} ${className}`}
      {...props}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
};
