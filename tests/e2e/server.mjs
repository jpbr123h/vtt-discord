import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
const root = fileURLToPath(new URL('../../', import.meta.url)).replace(/\/$/, '');
const server = await createServer({
  root,
  cacheDir: 'node_modules/.vite-e2e',
  server: { host: '127.0.0.1', port: 5190, strictPort: true },
  plugins: [{
    name: 'firebase-e2e-only', enforce: 'pre',
    async transform(code, id) {
      const path = id.split('?')[0];
      if (path === `${root}/src/auth/firebase.js`) return 'export const db = {}; export const auth = null; export const firebaseConfigured = true;';
      if (path === `${root}/src/auth/AuthContext.jsx`) return readFile(new URL('./fixtures/auth.js', import.meta.url), 'utf8');
      if (path.startsWith(`${root}/src/`) && /\.[jt]sx?$/.test(path)) {
        return code.replaceAll("from 'firebase/firestore'", "from '/tests/e2e/fixtures/firestore.js'");
      }
    },
    configureServer(vite) {
      vite.middlewares.use('/__e2e', async (_req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.end(await vite.transformIndexHtml('/__e2e', '<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="data:,"></head><body><div id="root"></div><script type="module" src="/tests/e2e/fixtures/main.jsx"></script></body></html>'));
      });
    },
  }],
});
await server.listen();
console.log('Servidor E2E isolado: http://127.0.0.1:5190/__e2e/mesa/demo');
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await server.close(); process.exit(0); });
