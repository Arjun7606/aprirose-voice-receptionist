import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';

function apriroseMockCrmBackendPlugin() {
  const dbDir = path.resolve(process.cwd(), 'data');
  const dbFile = path.resolve(dbDir, 'crm-db.json');

  const ensureDb = (seedData?: any) => {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    if (!fs.existsSync(dbFile) && seedData) {
      fs.writeFileSync(dbFile, JSON.stringify(seedData, null, 2), 'utf-8');
    }
    if (fs.existsSync(dbFile)) {
      try {
        return JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
      } catch {
        return null;
      }
    }
    return null;
  };

  return {
    name: 'aprirose-crm-backend',
    configureServer(server: any) {
      server.middlewares.use('/api/crm', (req: any, res: any, next: any) => {
        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'GET' && req.url === '/leads') {
          const data = ensureDb();
          res.statusCode = 200;
          res.end(JSON.stringify({ ok: true, leads: data?.leads || null }));
          return;
        }

        if (req.method === 'POST' && req.url === '/sync') {
          let body = '';
          req.on('data', (chunk: any) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body || '{}');
              if (Array.isArray(parsed.leads)) {
                if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
                fs.writeFileSync(
                  dbFile,
                  JSON.stringify({ updatedAt: new Date().toISOString(), leads: parsed.leads }, null, 2),
                  'utf-8'
                );
              }
              res.statusCode = 200;
              res.end(JSON.stringify({ ok: true, count: parsed.leads?.length || 0 }));
            } catch (e: any) {
              res.statusCode = 400;
              res.end(JSON.stringify({ ok: false, error: e?.message }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apriroseMockCrmBackendPlugin()],
  server: {
    port: 5173,
    host: true,
  },
});
