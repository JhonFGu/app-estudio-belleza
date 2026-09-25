import hubApiHandler from '../../src/handlers/hub-api.js';

export default async function handler(req: any, res: any) {
  const path = req.query.path;
  req.query.path = Array.isArray(path) ? path.join('/') : path || '';
  return hubApiHandler(req, res);
}
