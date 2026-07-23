import React from 'react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children, footer }) => {
  return (
    <div className="min-h-screen flex bg-[#faf9f7]">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[460px] bg-gradient-to-br from-app-mint to-app-mint-700 relative overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 bg-[url('/brand-icon.svg')] bg-no-repeat bg-center opacity-10" style={{ backgroundSize: '300px' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-app-mint-900/40 to-transparent" />
        <div className="relative flex flex-col justify-between p-10 text-white">
          <div>
            <Link to="/" className="inline-flex items-center gap-3 text-white/80 hover:text-white transition-colors">
              <img src="/brand-icon.svg" alt="" className="w-10 h-10 rounded-xl" />
              <span className="text-sm font-bold tracking-wide">Estudio de Belleza</span>
            </Link>
          </div>

          <div>
            <h2 className="text-2xl font-extrabold leading-tight">
              Administra tu estudio de belleza, todo en un solo lugar.
            </h2>
            <p className="mt-4 text-app-mint-100 text-sm font-medium leading-relaxed">
              Agenda de citas, punto de venta, CRM de clientes, control de equipo y finanzas claras — diseñado para salones, spas, centros de uñas, pestañas y más.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {['Peluquería', 'Spa', 'Pestañas', 'Cejas', 'Labios', 'Uñas', 'Depilación'].map((n) => (
              <span key={n} className="px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-bold border border-white/10">
                {n}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex flex-col justify-center px-6 lg:px-14 py-10">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile logo */}
          <Link to="/" className="lg:hidden inline-flex items-center gap-3 mb-8">
            <img src="/brand-icon.svg" alt="" className="w-10 h-10 rounded-xl" />
            <span className="text-sm font-bold text-app-text-primary">Estudio de Belleza</span>
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-app-text-primary tracking-tight">{title}</h1>
            {subtitle && (
              <p className="mt-2 text-sm text-app-text-secondary font-medium">{subtitle}</p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-app-gray-200 shadow-sm p-6">
            {children}
          </div>

          {footer && (
            <div className="mt-6 text-center text-sm text-app-text-secondary font-medium">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
