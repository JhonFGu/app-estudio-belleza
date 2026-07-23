import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { formatCOP } from '../utils/format';
import {
  TrendingUp,
  Users,
  DollarSign,
  Activity
} from 'lucide-react';
import { Badge, PageHeader, Tabs } from '../components/ui';
import type { TabItem } from '../components/ui';

export const DashboardPage: React.FC = () => {
  const { currentTenant, refreshTrigger } = useAppStore();
  const [period, setPeriod] = useState<'day' | 'month' | 'year' | 'all'>('month');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentTenant) return;
      setLoading(true);
      try {
        const response = await fetch(`/api/dashboard?period=${period}`, {
          headers: {
            'x-tenant-id': currentTenant.id
          }
        });
        if (response.ok) {
          const resJson = await response.json();
          setData(resJson);
        }
      } catch (error) {
        console.error('Error al cargar métricas del Dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentTenant, refreshTrigger, period]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-4 border-app-mint-100 border-t-app-mint animate-spin" />
      </div>
    );
  }

  const metrics = data?.metrics || {
    totalSales: 0,
    totalExpenses: 0,
    totalCommissions: 0,
    netProfit: 0,
    countClients: 0,
    countAppointments: 0
  };

  const monthlyFlow: any[] = data?.monthlyFlow || [];
  const topSoldItems: any[] = data?.topSoldItems || [];
  const paymentMethods: any[] = data?.paymentMethods || [];
  const recentAppointments: any[] = data?.recentAppointments || [];

  // Calculate max monthly sales for chart scaling
  const maxMonthlySales = Math.max(1, ...monthlyFlow.map((m: any) => Math.max(m.sales || 0, m.expenses || 0)));

  const periodTabs: TabItem[] = [
    { id: 'day', label: 'Hoy' },
    { id: 'month', label: 'Mes Actual' },
    { id: 'year', label: 'Año Actual' },
    { id: 'all', label: 'Todos' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Activity />}
        title="Métricas del Negocio"
        subtitle="Monitoreo en tiempo real de ingresos, ventas POS y rendimiento."
        actions={
          <Tabs
            tabs={periodTabs}
            activeTab={period}
            onChange={(id) => setPeriod(id as 'day' | 'month' | 'year' | 'all')}
          />
        }
      />
      {/* FILA 1: 4 TARJETAS MÉTRICAS SUPERIORES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Ingresos Facturados */}
        <div className="bg-gradient-to-tr from-[#fef2f2] to-[#fee2e2] p-5 rounded-[22px] border border-app-pink-250/20 shadow-sm relative overflow-hidden flex flex-col justify-between h-[120px]">
          <div className="flex justify-between items-start z-10">
            <span className="text-[11px] font-bold text-app-pink uppercase tracking-wider">Ingresos Facturados</span>
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-app-pink shadow-sm">
              <DollarSign className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="z-10">
            <h4 className="text-2xl font-black text-app-text-primary tracking-tight font-sans">
              {formatCOP(metrics.totalSales)}
            </h4>
            <span className="text-[9px] text-app-pink/80 font-bold block uppercase mt-0.5">Ventas Totales POS</span>
          </div>
          <div className="absolute right-3 bottom-2 text-app-pink/15 opacity-60">
            <SparklesIcon className="w-16 h-16 fill-current" />
          </div>
        </div>

        {/* Card 2: Gastos Operativos */}
        <div className="bg-gradient-to-tr from-[#fff3e6] to-[#ffe5cc] p-5 rounded-[22px] border border-amber-200/40 shadow-sm relative overflow-hidden flex flex-col justify-between h-[120px]">
          <div className="flex justify-between items-start z-10">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Gastos Operativos</span>
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-amber-700 shadow-sm">
              <Activity className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="z-10">
            <h4 className="text-2xl font-black text-app-text-primary tracking-tight font-sans">
              {formatCOP(metrics.totalExpenses)}
            </h4>
            <span className="text-[9px] text-amber-800/80 font-bold block uppercase mt-0.5">Egresos Totales</span>
          </div>
        </div>

        {/* Card 3: Utilidad Neta */}
        <div className="bg-gradient-to-tr from-[#fdf2f8] to-[#fce7f3] p-5 rounded-[22px] border border-app-mint-100/25 shadow-sm relative overflow-hidden flex flex-col justify-between h-[120px]">
          <div className="flex justify-between items-start z-10">
            <span className="text-[11px] font-bold text-app-mint uppercase tracking-wider">Utilidad Neta</span>
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-app-mint shadow-sm">
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="z-10">
            <h4 className="text-2xl font-black text-app-text-primary tracking-tight font-sans">
              {formatCOP(metrics.netProfit)}
            </h4>
            <span className="text-[9px] text-app-mint/80 font-bold block uppercase mt-0.5">Ganancia Real</span>
          </div>
          <div className="absolute right-3 bottom-2 text-app-mint/15 opacity-60">
            <SparklesIcon className="w-16 h-16 fill-current" />
          </div>
        </div>

        {/* Card 4: Clientes CRM (Nuevos en la fecha seleccionada) */}
        <div className="bg-gradient-to-tr from-[#fdf2f8] to-[#fce7f3] p-5 rounded-[22px] border border-app-mint-100/25 shadow-sm relative overflow-hidden flex flex-col justify-between h-[120px]">
          <div className="flex justify-between items-start z-10">
            <span className="text-[11px] font-bold text-app-mint uppercase tracking-wider">Clientes CRM</span>
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-app-mint shadow-sm">
              <Users className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="z-10">
            <h4 className="text-2xl font-black text-app-text-primary tracking-tight font-sans">
              {metrics.countClients}
            </h4>
            <span className="text-[9px] text-app-mint/80 font-bold block uppercase mt-0.5">Nuevos Registros (Período)</span>
          </div>
          <div className="absolute right-3 bottom-2 text-app-mint/15 opacity-60">
            <SparklesIcon className="w-16 h-16 fill-current" />
          </div>
        </div>
      </div>

      {/* FILA 2: GRÁFICOS Y TABLAS */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* COLUMNA IZQUIERDA (COL SPAN 3) */}
        <div className="xl:col-span-3 space-y-6">
          
          {/* Flujo Financiero (Line Chart SVG) */}
          <div className="bg-white p-6 rounded-[24px] border border-app-gray-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-extrabold text-app-text-primary font-sans">Flujo Financiero</h4>
                <p className="text-[11px] text-app-text-secondary mt-0.5">
                  Comparativa de Ingresos, Gastos y Utilidad Neta en el tiempo ({period === 'day' ? 'Horas del Día' : period === 'month' ? 'Días del Mes' : 'Meses del Año'})
                </p>
              </div>

              {/* Legend matching reference image */}
              <div className="flex items-center gap-4 text-xs font-bold text-app-text-secondary">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#db2777] rounded-full" />
                  Ingresos
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#f87171] rounded-full" />
                  Gastos
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 border-t-2 border-dashed border-[#64748b]" />
                  Utilidad Neta
                </span>
              </div>
            </div>

            {/* Interactive SVG Curved Line Chart */}
            {(() => {
              const flowData: Array<{ label: string; sales: number; expenses: number; netProfit: number }> =
                data?.chartFlow || data?.monthlyFlow || [];

              if (flowData.length === 0) {
                return (
                  <div className="h-[220px] flex items-center justify-center text-app-gray-400 text-xs italic">
                    Sin datos financieros para la escala de tiempo seleccionada.
                  </div>
                );
              }

              const maxVal = Math.max(1000, ...flowData.flatMap((d) => [d.sales, d.expenses, Math.max(0, d.netProfit)]));
              const width = 750;
              const height = 200;
              const paddingLeft = 65;
              const paddingRight = 25;
              const paddingTop = 20;
              const paddingBottom = 30;

              const getX = (idx: number) => {
                if (flowData.length === 1) return (width + paddingLeft - paddingRight) / 2;
                return paddingLeft + (idx / (flowData.length - 1)) * (width - paddingLeft - paddingRight);
              };

              const getY = (val: number) => {
                const normalized = Math.max(0, val) / maxVal;
                return height - paddingBottom - normalized * (height - paddingTop - paddingBottom);
              };

              const formatYLabel = (val: number) => {
                if (val >= 1_000_000) return `$ ${(val / 1_000_000).toFixed(1)}M`;
                if (val >= 1_000) return `$ ${(val / 1_000).toFixed(0)}K`;
                return `$ ${Math.round(val)}`;
              };

              // Helper for smooth Bezier curve path
              const buildSmoothPath = (points: Array<{ x: number; y: number }>) => {
                if (points.length === 0) return '';
                if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
                let path = `M ${points[0].x},${points[0].y}`;
                for (let i = 0; i < points.length - 1; i++) {
                  const p0 = points[i];
                  const p1 = points[i + 1];
                  const cx = (p0.x + p1.x) / 2;
                  path += ` C ${cx},${p0.y} ${cx},${p1.y} ${p1.x},${p1.y}`;
                }
                return path;
              };

              const salesPoints = flowData.map((d, i) => ({ x: getX(i), y: getY(d.sales), val: d.sales, label: d.label }));
              const expensesPoints = flowData.map((d, i) => ({ x: getX(i), y: getY(d.expenses), val: d.expenses, label: d.label }));
              const profitPoints = flowData.map((d, i) => ({ x: getX(i), y: getY(d.netProfit), val: d.netProfit, label: d.label }));

              const yGridRatios = [1, 0.75, 0.5, 0.25, 0];

              return (
                <div className="relative w-full overflow-hidden">
                  <div className="h-[240px] w-full relative">
                    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full">
                      {/* Horizontal Grid lines & Y-Axis Labels */}
                      {yGridRatios.map((ratio, i) => {
                        const val = maxVal * ratio;
                        const y = getY(val);
                        return (
                          <g key={`y-grid-${i}`}>
                            {/* Y-Axis Label */}
                            <text
                              x={paddingLeft - 10}
                              y={y + 4}
                              textAnchor="end"
                              className="fill-app-gray-500 font-mono text-[9px] font-bold"
                            >
                              {formatYLabel(val)}
                            </text>
                            {/* Horizontal Line */}
                            <line
                              x1={paddingLeft}
                              y1={y}
                              x2={width - paddingRight}
                              y2={y}
                              stroke="#f1f5f9"
                              strokeWidth="1"
                              strokeDasharray="2,2"
                            />
                          </g>
                        );
                      })}

                      {/* Gastos Line (Soft Pink) */}
                      <path
                        d={buildSmoothPath(expensesPoints)}
                        fill="none"
                        stroke="#f87171"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />

                      {/* Utilidad Neta Line (Dashed Slate) */}
                      <path
                        d={buildSmoothPath(profitPoints)}
                        fill="none"
                        stroke="#64748b"
                        strokeWidth="2.5"
                        strokeDasharray="4,4"
                        strokeLinecap="round"
                      />

                      {/* Ingresos Line (Mint Green) */}
                      <path
                        d={buildSmoothPath(salesPoints)}
                        fill="none"
                        stroke="#db2777"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />

                      {/* Data Point Circles for Utilidad Neta */}
                      {profitPoints.map((pt, i) => (
                        <g key={`profit-pt-${i}`} className="group/pt cursor-pointer">
                          <circle cx={pt.x} cy={pt.y} r="3.5" fill="#64748b" stroke="#ffffff" strokeWidth="1.5" />
                        </g>
                      ))}

                      {/* Data Point Circles for Gastos */}
                      {expensesPoints.map((pt, i) => (
                        <g key={`exp-pt-${i}`} className="group/pt cursor-pointer">
                          <circle cx={pt.x} cy={pt.y} r="4" fill="#f87171" stroke="#ffffff" strokeWidth="2" />
                        </g>
                      ))}

                      {/* Data Point Circles for Ingresos */}
                      {salesPoints.map((pt, i) => (
                        <g key={`sales-pt-${i}`} className="group/pt cursor-pointer">
                          <circle cx={pt.x} cy={pt.y} r="4.5" fill="#db2777" stroke="#ffffff" strokeWidth="2" />
                        </g>
                      ))}
                    </svg>
                  </div>

                  {/* X-Axis Timeline Labels with Detailed Hover Card */}
                  <div className="flex justify-between items-center pl-[65px] pr-[25px] pt-1 border-t border-app-gray-150 text-[10px] font-bold text-app-text-secondary">
                    {flowData.map((d, i) => (
                      <div key={i} className="text-center group relative cursor-pointer py-1">
                        {/* Hover Tooltip showing all 3 values */}
                        <div className="absolute bottom-7 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col bg-slate-900 text-white text-[10px] p-3 rounded-2xl shadow-2xl z-30 whitespace-nowrap border border-slate-700 space-y-1">
                          <span className="font-extrabold text-app-mint-100 border-b border-slate-700 pb-1 block text-center">
                            {d.label}
                          </span>
                          <div className="flex justify-between items-center gap-4 text-xs">
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-[#db2777]" /> Ingresos:
                            </span>
                            <span className="font-mono font-black">{formatCOP(d.sales)}</span>
                          </div>
                          <div className="flex justify-between items-center gap-4 text-xs">
                            <span className="text-rose-300 font-bold flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-[#f87171]" /> Gastos:
                            </span>
                            <span className="font-mono font-black">{formatCOP(d.expenses)}</span>
                          </div>
                          <div className="flex justify-between items-center gap-4 text-xs border-t border-slate-800 pt-1">
                            <span className="text-slate-300 font-bold flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-[#64748b]" /> Utilidad Neta:
                            </span>
                            <span className="font-mono font-black text-amber-300">{formatCOP(d.netProfit)}</span>
                          </div>
                        </div>
                        <span>{d.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Row Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Métodos de Pago */}
            <div className="bg-white p-5 rounded-[24px] border border-app-gray-200 shadow-sm flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between border-b border-app-gray-100 pb-2">
                <h4 className="text-xs font-bold text-app-text-primary uppercase tracking-wider">Ventas por Método de Pago</h4>
                <span className="text-[10px] text-app-gray-500 font-bold">POS Real</span>
              </div>

              <div className="space-y-2 flex-1">
                {paymentMethods.length === 0 ? (
                  <p className="text-xs text-app-gray-400 italic py-6 text-center">Sin transacciones registradas.</p>
                ) : (
                  paymentMethods.map((pm: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center py-1.5 border-b border-app-gray-50 text-xs">
                      <span className="font-bold text-app-text-primary capitalize">
                        {pm.method === 'cash' || pm.method === 'efectivo' ? '💵 Efectivo' :
                         pm.method === 'card' || pm.method === 'tarjeta' ? '💳 Tarjeta' :
                         pm.method === 'transfer' || pm.method === 'transferencia' ? '📱 Transferencia' :
                         pm.method === 'credit' ? '📋 Crédito / Abono' :
                         pm.method === 'split' ? '🔀 Pago Mixto' : pm.method}
                      </span>
                      <div className="text-right">
                        <span className="font-black text-app-text-primary block font-mono">{formatCOP(pm.total)}</span>
                        <span className="text-[9px] text-app-gray-500 block font-semibold">{pm.count} ventas</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recientes / Citas */}
            <div className="bg-white p-5 rounded-[24px] border border-app-gray-200 shadow-sm flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between border-b border-app-gray-100 pb-2">
                <h4 className="text-xs font-bold text-app-text-primary uppercase tracking-wider">Estado de Citas Recientes</h4>
                <span className="text-[10px] text-app-mint font-bold">Agenda</span>
              </div>

              <div className="space-y-2 flex-1">
                {recentAppointments.length === 0 ? (
                  <p className="text-xs text-app-gray-400 italic py-6 text-center">No hay citas registradas recientemente.</p>
                ) : (
                  recentAppointments.map((app: any) => (
                    <div key={app.id} className="flex justify-between items-center py-1.5 border-b border-app-gray-50 text-xs">
                      <div>
                        <h6 className="font-bold text-app-text-primary">{app.clientName || 'Cliente'}</h6>
                        <span className="text-[9px] text-app-gray-500 block">{app.serviceName}</span>
                      </div>
                      <Badge
                        variant={app.status === 'completed' ? 'success' : app.status === 'cancelled' ? 'danger' : 'warning'}
                      >
                        {app.status === 'completed' ? 'Completado' : app.status === 'cancelled' ? 'Cancelado' : 'Programado'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA (COL SPAN 1) */}
        <div className="xl:col-span-1 space-y-6">
          
          {/* Servicios y Productos Más Vendidos */}
          <div className="bg-white p-5 rounded-[24px] border border-app-gray-200 shadow-sm space-y-3">
            <div>
              <h4 className="text-xs font-extrabold text-app-text-primary uppercase tracking-wider">Servicios y Productos Más Vendidos</h4>
              <p className="text-[10px] text-app-text-secondary mt-0.5">Ranking real por volumen de unidades vendidas</p>
            </div>

            <div className="space-y-3 pt-2">
              {topSoldItems.length === 0 ? (
                <p className="text-xs text-app-gray-400 italic py-6 text-center">No hay ventas de servicios o productos registradas aún.</p>
              ) : (
                topSoldItems.map((item: any, idx: number) => (
                  <div key={idx} className="p-3 bg-app-gray-50/50 rounded-2xl border border-app-gray-150 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-app-mint text-white text-[10px] font-black flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-app-text-primary truncate max-w-[130px]">{item.name}</span>
                      </div>
                      <span className="font-black text-app-text-primary font-mono text-xs">
                        {item.quantity} uds
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] text-app-gray-500 font-semibold border-t border-app-gray-100 pt-1 mt-1">
                      <Badge variant={item.type === 'product' ? 'info' : 'success'}>
                        {item.type === 'product' ? 'Producto' : 'Tratamiento'}
                      </Badge>
                      <span className="font-bold text-app-text-secondary">Facturado: {formatCOP(item.totalAmount)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const SparklesIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 3v16" />
    <path d="M5 10h14" />
    <path d="M15 4l-3-3-3 3" />
    <path d="M9 19l3 3 3-3" />
  </svg>
);
