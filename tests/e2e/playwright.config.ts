import { defineConfig } from '@playwright/test'

/**
 * End-to-end tests of the workbench in Chromium against a Vite dev server on its own port
 * (5191, so it never collides with a dev server someone already runs on 5173 or 5180).
 * Run: pnpm e2e. E2E_PORT picks another port when two runs share a machine.
 */
const PORT = Number(process.env.E2E_PORT ?? 5191)

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  fullyParallel: true,
  reporter: 'list',
  outputDir: '../../test-results',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    browserName: 'chromium',
    locale: 'en-US',
    reducedMotion: 'reduce',
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: `node --no-turbo-fast-api-calls ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${PORT} --strictPort`,
    cwd: '../..',
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
