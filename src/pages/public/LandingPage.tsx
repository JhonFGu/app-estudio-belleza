import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';

const niches = [
  { name: 'Peluquería', icon: '💇', desc: 'Gestión de cortes, color y peinados.' },
  { name: 'Spa & Bienestar', icon: '🧖', desc: 'Reservas de masajes y tratamientos corporales.' },
  { name: 'Pestañas', icon: '👁️', desc: 'Extensiones, lifting y laminado.' },
  { name: 'Cejas', icon: '✨', desc: 'Diseño, microblading y depilación facial.' },
  { name: 'Labios', icon: '💋', desc: 'Rellenos, exfoliación y maquillaje semipermanente.' },
  { name: 'Uñas', icon: '💅', desc: 'Manicure, pedicure y nail art profesional.' },
  { name: 'Depilación', icon: '🪷', desc: 'Láser, cera y tratamientos corporales.' },
];

const features = [
  { title: 'Agenda Inteligente', desc: 'Calendario visual con notificaciones automáticas para tus clientes.', icon: '📅' },
  { title: 'POS y Caja', desc: 'Cobra en efectivo, tarjeta o transferencia. Cierre de turno automático.', icon: '💳' },
  { title: 'Clientes CRM', desc: 'Historial completo de cada cliente, sus tratamientos y productos favoritos.', icon: '👥' },
  { title: 'Finanzas Claras', desc: 'Dashboard con ingresos, gastos, comisiones y reportes en tiempo real.', icon: '📊' },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginDemo } = useAppStore();

  const handleDemo = async () => {
    await loginDemo();
    navigate('/app');
  };

  return (
    <div className="min-h-screen bg-[#faf9f7] font-sans">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-app-mint-50 via-white to-app-pink-50 opacity-60" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-app-mint-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-app-peach-100/20 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

        <div className="relative max-w-6xl mx-auto px-6 pt-10 pb-16 lg:pt-16 lg:pb-20">
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-app-mint-100 text-app-mint text-xs font-bold uppercase tracking-wider mb-6">
              Software para independientes, micro y pequeñas empresas
            </span>

            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-black text-app-text-primary tracking-tight leading-tight font-sans">
              <span className="text-app-mint">Miesbe</span>{' '}
              Administra facil tu estudio de belleza, todo en un solo lugar
            </h1>

            <p className="mt-6 text-lg text-app-text-secondary font-medium max-w-2xl mx-auto leading-relaxed">
              Agenda de citas, punto de venta, clientes, equipo y finanzas. Diseñado para salones, spas, centros de pestañas, uñas y depilación.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/register')}
                className="px-8 py-4 bg-app-mint hover:bg-app-mint-600 text-white rounded-2xl text-base font-bold shadow-lg transition-all hover:scale-105 active:scale-95"
              >
                Crear mi cuenta gratis
              </button>
              <Link
                to="/login"
                className="px-8 py-4 bg-white border-2 border-app-gray-200 hover:border-app-mint text-app-text-primary rounded-2xl text-base font-bold transition-all"
              >
                Ya tengo cuenta
              </Link>
              <button
                onClick={handleDemo}
                className="px-8 py-4 bg-white border-2 border-app-mint-200 hover:border-app-mint text-app-mint rounded-2xl text-base font-bold transition-all"
              >
                Explorar demo
              </button>
            </div>

            <p className="mt-6 text-xs text-app-gray-400 font-medium">
              Creado con ❤️ por{' '}
              <a
                href="https://guacheta.digital"
                target="_blank"
                rel="noopener noreferrer"
                className="text-app-mint font-bold hover:underline"
              >
                GUACHETA.CO
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Niches Grid */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-app-text-primary tracking-tight">
            Para cada rincón del cuidado personal
          </h2>
          <p className="mt-3 text-app-text-secondary font-medium">
            Una plataforma que se adapta a tu especialidad, sin importar tu nicho.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {niches.map((niche) => (
            <div
              key={niche.name}
              className="bg-white p-5 rounded-2xl border border-app-gray-200 shadow-sm hover:shadow-md hover:border-app-mint-200 transition-all text-center group cursor-default"
            >
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">
                {niche.icon}
              </div>
              <h3 className="text-sm font-extrabold text-app-text-primary">{niche.name}</h3>
              <p className="text-xs text-app-text-secondary mt-1 leading-relaxed">{niche.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-white border-y border-app-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-app-text-primary tracking-tight">
              Todo lo que necesitas
            </h2>
            <p className="mt-3 text-app-text-secondary font-medium">
              Desde la primera cita hasta el cierre de caja del día.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title} className="p-6 rounded-2xl bg-app-gray-50 border border-app-gray-200 hover:border-app-mint-200 transition-all">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-base font-extrabold text-app-text-primary mb-2">{f.title}</h3>
                <p className="text-sm text-app-text-secondary leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <div className="bg-app-mint rounded-3xl p-10 lg:p-14 shadow-xl text-white">
          <h2 className="text-2xl lg:text-3xl font-black tracking-tight">
            Lleva tu estudio al siguiente nivel
          </h2>
          <p className="mt-4 text-app-mint-100 font-medium text-base max-w-lg mx-auto">
            Sin instalaciones, sin complicaciones. Regístrate hoy y organiza tu negocio en minutos.
          </p>
          <button
            onClick={() => navigate('/register')}
            className="mt-8 px-8 py-4 bg-white text-app-mint rounded-2xl text-base font-bold shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            Comenzar ahora — es gratis
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-app-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center">
          <p className="text-xs text-app-gray-500 font-medium">
            Hecho para estudios de belleza. Agenda, POS, clientes y finanzas en un solo lugar.
          </p>
        </div>
      </footer>
    </div>
  );
};
