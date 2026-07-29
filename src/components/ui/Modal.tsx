import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullscreen?: boolean;
}

const SIZE_STYLES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  size = 'md',
  fullscreen = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className={`relative bg-white rounded-2xl shadow-2xl w-full ${fullscreen ? 'h-full sm:max-h-[90vh] sm:rounded-2xl' : `${SIZE_STYLES[size]} max-h-[90vh] rounded-2xl`} flex flex-col overflow-hidden`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-app-gray-100 flex-shrink-0">
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
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 rounded-lg text-app-gray-500 hover:bg-app-gray-100 hover:text-app-text-primary flex items-center justify-center transition-colors flex-shrink-0"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-app-gray-100 bg-app-gray-50/50 flex items-center justify-end gap-2 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
