export default function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Allow', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  return res.status(410).json({
    error: 'El almacenamiento local de conversaciones está retirado. Usa /api/hub/inbox, que muestra la proyección sincronizada del Hub.',
    code: 'LEGACY_MESSAGES_RETIRED',
  });
}
