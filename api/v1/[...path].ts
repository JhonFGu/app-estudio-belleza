import hubApiHandler from '../../src/handlers/hub-api.js';

export default async function handler(req: any, res: any) {
  const queryPath = req.query?.path;
  let route = Array.isArray(queryPath) ? queryPath.join('/') : String(queryPath || '');

  if (!route && typeof req.url === 'string') {
    const pathname = req.url.split('?')[0];
    route = pathname.split('/api/v1/')[1] || '';
  }

  req.query = req.query || {};
  req.query.path = route.replace(/^\/+|\/+$/g, '');
  return hubApiHandler(req, res);
}
