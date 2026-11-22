import { defineConfig } from '@playwright/test'
import path from 'node:path'
import { mkdirSync } from 'node:fs'

mkdirSync('test-results', { recursive: true })
export const testEnvironment = {
  ...process.env,
  APP_ENV: 'testing',
  APP_DEBUG: 'false',
  APP_URL: 'http://127.0.0.1:8001',
  FRONTEND_URL: 'http://127.0.0.1:8001',
  DB_CONNECTION: 'sqlite',
  DB_DATABASE: path.resolve('test-results/browser.sqlite'),
  DB_URL: '',
  CACHE_STORE: 'array',
  SESSION_DRIVER: 'database',
  MAIL_MAILER: 'array',
}
export default defineConfig({
  testDir: './tests',
  workers: 1,
  fullyParallel: false,
  timeout: 90000,
  expect: { timeout: 12000 },
  reporter: 'list',
  globalSetup: './tests/global-setup.js',
  use: {
    baseURL: 'http://127.0.0.1:8001',
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'php ../Group-System/artisan serve --host=127.0.0.1 --port=8001 --no-reload',
    url: 'http://127.0.0.1:8001/up',
    env: testEnvironment,
    reuseExistingServer: false,
    timeout: 30000,
  },
})
