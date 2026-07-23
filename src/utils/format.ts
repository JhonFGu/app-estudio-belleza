export const formatCOP = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

export const formatPaymentMethod = (method?: string | null): string => {
  if (!method) return 'Efectivo';
  const m = method.toLowerCase();
  if (m === 'cash' || m === 'efectivo') return 'Efectivo';
  if (m === 'card' || m === 'tarjeta') return 'Tarjeta';
  if (m === 'transfer' || m === 'transferencia') return 'Transferencia';
  if (m === 'split' || m === 'mixto' || m === 'pago mixto') return 'Pago Mixto';
  return method;
};
