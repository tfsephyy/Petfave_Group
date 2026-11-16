# PetFave backend

PetFave uses this Laravel 13 application as a session-authenticated JSON backend and serves the production React frontend built from `../Front`. PHP 8.3+, Composer, Node.js, and MySQL 8 or SQLite are required. The local application uses MySQL database `vetms`.

## Start the existing local installation

```powershell
php artisan serve --host=127.0.0.1 --port=8000
```

Open http://127.0.0.1:8000. Frontend assets are already compiled in `public/app-assets`. After changing React code, run `npm run build` from `../Front`.

For live frontend development, run Laravel on port 8000 and `npm run dev` in `../Front`, then open http://127.0.0.1:5173. Vite proxies `/api` to Laravel, keeping sessions and request forgery protection on the same browser origin. Set `FRONTEND_URL=http://127.0.0.1:5173` if password reset links should open the development frontend.

## Fresh installation

1. Run `composer install` and copy `.env.example` to `.env` only if `.env` does not exist.
2. Set the application URL, frontend URL, and database connection. Create the intended MySQL database first; SQLite can use an absolute database file path. Generate a key only for a new installation with `php artisan key:generate`.
3. Run `php artisan migrate` and `php artisan db:seed`. The reference seeder is idempotent and does not create accounts or clinic sample records.
4. From `../Front`, run `npm ci` and `npm run build`.
5. Provision staff with `php artisan petfave:staff admin@example.com --name="Clinic Administrator" --role=admin`. The command prints a newly generated password once. Change it in Account settings after signing in. Supported staff roles are `admin`, `veterinarian`, and `receptionist`.
6. Optionally run `php artisan petfave:demo` for sample patients, contacts, bookings, and stock. It only operates on an empty local clinic after an administrator exists. Sample contacts do not have portal passwords.

## Implemented modules

- Public pages, owner registration, login/logout, password reset, synchronized profile updates, password changes, and owner portal closure.
- Staff pet-parent records; pet profiles with species/breed validation, birth dates, weights, microchips, private photos, and galleries.
- Individual and batch archival/restoration for contacts, pets, and inventory. Clinical and stock history is retained; permanent clinical-data deletion is intentionally unavailable.
- Pet-linked bookings with separate care-team resources, anonymous availability, Manila display times, UTC persistence, conflict prevention, rescheduling, and explicit pending/confirmed/completed/cancelled/rejected/no-show transitions.
- Encounters, medical history, vaccinations with due dates, medications, surgical records, correction reasons, voiding, original authorship, and audit events. Encounters can deduct supplies transactionally.
- Inventory with SKU, unit, price, reorder level, product expiry, issue/restock ledger, stock history, and expired-product issue blocking. Zero-stock products remain visible until explicitly archived.
- Role-scoped dashboard metrics, six-month appointment charts, due-care indicators, and low-stock indicators. Light/dark themes and responsive staff/owner navigation.

## Security and schema

Business tables use `pf_` names: `pf_accounts`, `pf_guardians`, `pf_animals`, `pf_species`, `pf_breeds`, `pf_booking_resources`, `pf_bookings`, `pf_encounters`, `pf_clinical_entries`, `pf_pet_media`, `pf_stock_products`, `pf_stock_movements`, and `pf_audit_events`. Laravel's framework session/cache/job/reset tables keep their conventional names. Account IDs use the framework integer key; business records use ULIDs. An owner account has one database-enforced guardian link.

The backend applies record policies independently of UI controls, derives owner/author fields server-side, scopes clinical child IDs to their animal, validates sort fields, rate limits authentication and application requests, regenerates sessions, and retains request forgery protection. Images are on the private disk and served through authorized endpoints; no public storage link is needed. Stock and booking mutations use transactions and locking. Clinical corrections retain a reason and the original author in the audit history. Portal closure disables sign-in and preserves clinic records and appointments.

The default local mail driver is `log`: password reset links are written to `storage/logs/laravel.log`, not delivered to an inbox. Configure and verify SMTP before using email recovery with real users. No payments, SMS/email reminders, multi-clinic isolation, supplier purchase orders, stock batch tracking, or MFA are implemented. Preventive-care alerts are displayed inside the portal.

For deployment, point the web server at `public`, use HTTPS, `APP_ENV=production`, `APP_DEBUG=false`, `SESSION_SECURE_COOKIE=true`, a strong app key, configured mail, database/file backups, and writable storage. Set both URLs to the deployed origin. These are deployment requirements, not a claim that this local installation has been deployed.

## Verification

```powershell
php artisan test --compact
$env:PETFAVE_TEST_MYSQL='1'
php artisan test --compact tests/Feature/BookingConcurrencyTest.php
Remove-Item Env:PETFAVE_TEST_MYSQL
vendor/bin/pint --format agent
```

Normal tests use isolated in-memory SQLite. The concurrency suite uses a disposable SQLite file, and its optional MySQL case creates and drops only a uniquely named `petfave_test_*` database; that requires MySQL create/drop permissions. It never refreshes the clinic database. Tests cover ownership isolation, privilege injection, private media, clinical corrections, request forgery, booking conflicts and timezone boundaries, ledger consistency, rollback, account settings, password recovery, and concurrent reservations/issues.

Browser tests live in `../Front/tests` and use a separate SQLite database on port 8001. See the frontend README for commands.