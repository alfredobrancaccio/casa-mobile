import { existsSync } from 'node:fs';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import preact from '@preact/preset-vite';

// Icone per l'installazione dalla schermata Home, referenziate da index.html e public/manifest.json.
// Stanno in public/: Vite le copia cosi come sono nella radice di dist.
const PWA_ICONS = ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-512-maskable.png'];

/** Avvisa durante la build se manca un'icona: la build resta valida ma l'installazione sarebbe senza icona. */
const checkPwaIcons = (): Plugin => ({
  name: 'casa-mobile:check-pwa-icons',
  apply: 'build',
  buildStart() {
    const missing = PWA_ICONS.filter((f) => !existsSync(`public/${f}`));
    if (missing.length) this.warn(`Icone mancanti in public/: ${missing.join(', ')}`);
  },
});

// In sviluppo l'app gira su localhost e Home Assistant e raggiunto tramite proxy:
// login, token e WebSocket risultano sulla stessa origine, come accadra sotto /local.
// Il proxy non aggiunge X-Forwarded-For: HA rifiuterebbe un proxy non fidato.
const HA_PATHS = ['/auth', '/api', '/frontend_latest', '/frontend_es5', '/static', '/manifest.json'];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const target = env.HA_URL || 'http://172.16.137.20:8123';
  return {
    base: './',
    plugins: [preact(), checkPwaIcons()],
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
