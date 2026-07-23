import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { promises as fs } from 'fs'
import url from 'url'

// Custom Vite plugin to emulate Vercel Serverless Functions locally in Node.js
function vercelDevPlugin() {
  return {
    name: 'vercel-dev-emulator',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const parsedUrl = url.parse(req.url || '');
        const pathname = parsedUrl.pathname || '';

        // Intercept all /api/ requests
        if (pathname.startsWith('/api/')) {
          const routeName = pathname.replace('/api/', '').split('?')[0];
          const apiFilePath = path.resolve(__dirname, `./api/${routeName}.ts`);

          try {
            // Verify if api handler file exists
            await fs.access(apiFilePath);

            // Dynamically load the TypeScript API module using Vite's SSR module loader
            const module = await server.ssrLoadModule(`./api/${routeName}.ts`);
            const handler = module.default;

            if (typeof handler === 'function') {
              // Read request body stream for POST/PUT requests
              let body = {};
              if (req.method === 'POST' || req.method === 'PUT') {
                body = await new Promise((resolve) => {
                  let data = '';
                  req.on('data', (chunk: any) => data += chunk);
                  req.on('end', () => {
                    try {
                      resolve(JSON.stringify(data) ? JSON.parse(data) : {});
                    } catch (e) {
                      resolve({});
                    }
                  });
                });
              }

              // Parse query parameters
              const query: Record<string, string> = {};
              const queryParams = new URLSearchParams(parsedUrl.query || '');
              queryParams.forEach((value, key) => {
                query[key] = value;
              });

              // Mock VercelRequest
              const mockReq = {
                method: req.method,
                headers: req.headers,
                query,
                body,
              };

              // Mock VercelResponse
              const mockRes = {
                statusCode: 200,
                headers: {} as Record<string, string>,
                setHeader(name: string, value: string) {
                  this.headers[name] = value;
                  res.setHeader(name, value);
                },
                status(code: number) {
                  this.statusCode = code;
                  res.statusCode = code;
                  return this;
                },
                json(data: any) {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(data));
                  return this;
                },
                end(data?: any) {
                  res.end(data);
                  return this;
                }
              };

              // Execute the actual serverless function which queries Neon
              await handler(mockReq, mockRes);
              return;
            }
          } catch (err: any) {
            console.error(`Error executing local serverless function for ${pathname}:`, err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
            return;
          }
        }
        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    vercelDevPlugin(), // Run serverless API routes locally in the dev server
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Gestión de Estudio de Belleza',
        short_name: 'Mi Estudio',
        description: 'Administra tu estudio de belleza digitalmente: agenda, citas, clientes, POS y finanzas.',
        theme_color: '#db2777',
        background_color: '#faf9f7',
        display: 'standalone',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
