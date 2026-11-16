# PetFave frontend

The React 19 frontend for PetFave, paired with the Laravel backend in `../Group-System`. It uses React Router, Vite, Lucide icons, native accessible dialogs, and CSS with light/dark themes. API calls use same-origin server sessions; no bearer tokens or account data are persisted in local storage.

## Development

Run the Laravel backend on port 8000 first:

```powershell
cd ../Group-System
php artisan serve --host=127.0.0.1 --port=8000
```

In a second terminal from this folder:

```powershell
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Vite proxies `/api` to Laravel. Set the backend `FRONTEND_URL` to the Vite URL if testing password-reset links in development. The default `FRONTEND_URL` points to the compiled application on port 8000.

## Production assets

```powershell
npm run build
```

Vite writes to `../Group-System/public/app-assets`. Laravel serves the built application at `/` and handles client-side route fallbacks. You can then run only Laravel and visit http://127.0.0.1:8000. Rebuild after changing the frontend. The plain Vite `preview` command only previews static assets and does not proxy the authenticated API.

## Checks

```powershell
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser tests provision an isolated SQLite database under the ignored `test-results` folder, create a random test administrator, start Laravel on port 8001, and exercise desktop/mobile pages, owner registration/pet/booking/login flows, and staff contact/clinical/inventory workflows. The configured clinic MySQL database is not used by these tests. Screenshots and failure traces are written to `test-results`.

The source is organized into `pages`, shared `components`, and `lib` for the API/session/data hooks. Staff navigation and owner navigation differ, while access is independently enforced by the Laravel policies. Dates display in Asia/Manila and booking timestamps are sent to the backend with an explicit UTC offset.

See `../Group-System/README.md` for installation, staff provisioning, schema names, security behavior, and mail/deployment requirements.