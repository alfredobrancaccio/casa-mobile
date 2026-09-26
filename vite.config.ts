import { defineConfig, loadEnv } from 'vite';
import preact from '@preact/preset-vite';

// In sviluppo l'app gira su localhost e Home Assistant e raggiunto tramite proxy:
// login, token e WebSocket risultano sulla stessa origine, come accadra sotto /local.
// Il proxy non aggiunge X-Forwarded-For: HA rifiuterebbe un proxy non fidato.
const HA_PATHS = ['/auth', '/api', '/frontend_latest', '/frontend_es5', '/static', '/manifest.json'];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const target = env.HA_URL || 'http://172.16.137.20:8123';
  return {
    base: './',
    plugins: [preact()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: Object.fromEntries(
        HA_PATHS.map((p) => [p, { target, changeOrigin: true, ws: p === '/api' }]),
      ),
    },
    build: { outDir: 'dist', assetsDir: 'assets', sourcemap: false },
  };
});
