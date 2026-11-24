# PetFave Docker Activity Guide

Run your PetFave veterinary clinic system in Docker with four services: React 19 frontend, Laravel 13 backend, MySQL 8.4 database, and phpMyAdmin. The Docker project is named **petfave**, and the guide is named **PETFAVE_DOCKER_ACTIVITY.md**.

Your React app lives in `Front/`, and Laravel lives in `Group-System/`. Node builds React, Nginx serves the frontend at **http://localhost:8088**, and its `/api/` proxy forwards requests to the Laravel backend. Direct backend access is **http://localhost:8089**, and phpMyAdmin is **http://localhost:8090**.

## 1 Check Docker Desktop

Open Docker Desktop, use Linux containers, and wait for its engine to start. Run these commands in PowerShell:

```powershell
docker --version
docker compose version
docker info
docker run --rm hello-world
```

`docker info` must show a working Server section. A version number alone only confirms that the CLI is installed. If the engine cannot connect, follow Docker Desktop's startup message and the [Windows installation instructions](https://docs.docker.com/desktop/setup/install/windows-install/).

## 2 Relate the simulator to your system

Use [DockerLab Academy](https://docker-simulator.vercel.app/) beside this activity. Follow the lessons available for Laravel, React, MySQL, phpMyAdmin, and Compose.

For PetFave, Laravel handles the API and sessions in the `backend` container. Nginx serves React in the `frontend` container. The API proxy keeps browser requests on the frontend origin, preserving session cookies and request forgery protection. Node is used during the image build.

Simulator examples teach the commands; the files below package your actual clinic system. Use the real application to verify the activity.

## 3 Locate the Docker files

Open this workspace root in your terminal:

```powershell
Set-Location -LiteralPath 'C:\laragon\www\New folder'
```

| File or folder | Purpose |
| --- | --- |
| `Dockerfile` | Builds separate `backend` and `frontend` images using shared frontend assets |
| `compose.yaml` | Defines `backend`, `frontend`, `database`, and `phpmyadmin` under `petfave` |
| `petfave-apache.conf` | Points Apache at Laravel's `public/` directory and enables its routing rules |
| `petfave-nginx.conf` | Serves React routes and forwards `/api/` and `/up` to Laravel |
| `petfave-php.ini` | Allows the existing 5 MB pet-photo uploads and sends PHP errors to container logs |
| `.dockerignore` | Excludes local dependencies, credentials, databases, uploads, and previous builds from the image |
| `.env.example` | Template for Docker settings in the workspace root |
| `.env` | Local Docker key and database passwords; excluded from Git |
| `Front/` | Existing React application |
| `Group-System/` | Existing Laravel backend |

Docker builds both folders from this root. Keep the existing folder names. The root Docker `.env` is separate from `Group-System/.env`, which continues to configure Laragon.

## 4 Prepare the Docker environment

For a fresh checkout, run the following PowerShell block once. It creates the root `.env` only when that file does not already exist and generates random credentials without printing them:

```powershell
if (-not (Test-Path -LiteralPath '.env')) {
    $dockerRandom = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $dockerKeyBytes = New-Object byte[] 32
        $dockerRandom.GetBytes($dockerKeyBytes)
        $dockerAppKey = 'base64:' + [Convert]::ToBase64String($dockerKeyBytes)
        $dockerRandom.GetBytes($dockerKeyBytes)
        $dockerDbPassword = -join ($dockerKeyBytes | ForEach-Object { $_.ToString('x2') })
        $dockerRandom.GetBytes($dockerKeyBytes)
        $dockerRootPassword = -join ($dockerKeyBytes | ForEach-Object { $_.ToString('x2') })
        $dockerSettings = Get-Content -LiteralPath '.env.example' -Raw
        $dockerSettings = $dockerSettings.Replace('APP_KEY=', "APP_KEY=$dockerAppKey")
        $dockerSettings = $dockerSettings.Replace('DB_PASSWORD=', "DB_PASSWORD=$dockerDbPassword")
        $dockerSettings = $dockerSettings.Replace('MYSQL_ROOT_PASSWORD=', "MYSQL_ROOT_PASSWORD=$dockerRootPassword")
        [IO.File]::WriteAllText((Join-Path (Get-Location) '.env'), $dockerSettings)
    } finally {
        $dockerRandom.Dispose()
    }
}
```

Keep the root `.env` with this installation. The app key protects encrypted sessions and should stay stable across restarts. To use another browser port, change `APP_PORT` in that file; Compose derives both application URLs from it.

## 5 Build and start PetFave

From the workspace root:

```powershell
docker compose config --quiet
docker compose up --build -d
docker compose ps
docker compose logs --tail=50 backend frontend database phpmyadmin
```

The first build downloads images and installs the locked npm and Composer dependencies. Node 24 builds the frontend assets. The backend image runs PHP 8.3 and Apache, and the frontend image runs Nginx. Source changes require rebuilding.

The backend and phpMyAdmin wait for the database health check, and the frontend waits for Laravel. All four services have health checks and restart automatically with Docker unless explicitly stopped. Compose supports readiness conditions through [service health checks](https://docs.docker.com/compose/how-tos/startup-order/).

MySQL runs inside Docker as `database:3306`. It creates database `petfave_clinic_lab` and uses a named volume for its files. It has no published host port. Your Laragon `vetms` database and existing clinic records are separate; Docker starts with a fresh database.

## 6 Create the clinic schema and reference data

After the containers start, run:

```powershell
docker compose exec backend php artisan migrate --force --no-interaction
docker compose exec backend php artisan db:seed --force --no-interaction
docker compose exec backend php artisan migrate:status --no-interaction
```

These commands use the container's MySQL settings. They create the existing `pf_` clinic tables, Laravel's framework tables, species, breeds, and booking resources.

The current `DatabaseSeeder.php` also contains an account with a fixed password. Create your own staff login using the next step and change the seeded account's password through Account settings if you use that account.

Create a staff administrator using your own email:

```powershell
docker compose exec backend php artisan petfave:staff admin@example.com --name="Clinic Administrator" --role=admin --no-interaction
```

Replace `admin@example.com` with the intended email before running it. Save the generated temporary password and change it after signing in. Run this provisioning command once per email; it rejects an existing email.

The stack uses `APP_ENV=production` with debugging disabled. The existing `petfave:demo` command requires a local environment and therefore is not part of these steps. Add your activity records through the interface.

## 7 Verify the interface and API

Open **http://localhost:8088**. Use the same hostname for the whole session so cookies remain consistent.

```powershell
Invoke-WebRequest -Uri 'http://localhost:8088/up' -UseBasicParsing | Select-Object StatusCode
Invoke-RestMethod -Uri 'http://localhost:8088/api/session'
docker compose exec backend php artisan migrate:status --no-interaction
docker compose ps
```

| Check | Expected result |
| --- | --- |
| `/` | PetFave's existing React interface |
| `/up` | HTTP 200 from Laravel's existing health route |
| `/api/session` | JSON containing session information; signing in is not required |
| Migration status | All application migrations show as run |
| Direct backend | `http://localhost:8089/up` returns HTTP 200 |
| phpMyAdmin | `http://localhost:8090` connects to the clinic database |
| Container status | All four services are running and healthy |

The health route checks that Laravel responds. To verify the database and session workflow, sign in and create a test pet parent and patient, book an appointment, and restock a test inventory item. Reload the pages and confirm those records are still present. Use the normal interface for form submissions so its session and request forgery handling are exercised.

phpMyAdmin uses the application database credentials from the root `.env` and opens the clinic database automatically on your computer. It connects to `database:3306`. `APP_PORT`, `BACKEND_PORT`, and `PHPMYADMIN_PORT` configure the frontend, backend, and phpMyAdmin browser ports respectively.

## 8 Verify persistence

Save a test record and upload a test pet photo through the interface. Then run:

```powershell
docker compose down
docker compose up -d
```

Sign in again and check the saved record and photo. The `clinic_database` volume stores MySQL data, while `clinic_storage` stores Laravel uploads and runtime files. Compose prefixes volume names with the project name. Normal `docker compose down` preserves these volumes.

## 9 Operate and troubleshoot the containers

| Need or issue | Command or action |
| --- | --- |
| View status | `docker compose ps` |
| Follow application logs | `docker compose logs -f backend` |
| Follow database logs | `docker compose logs -f database` |
| Apply code changes | `docker compose up --build -d` |
| Stop the stack | `docker compose down` |
| Run an Artisan command | `docker compose exec backend php artisan <command> --no-interaction` |
| Docker cannot connect to its engine | Open Docker Desktop and resolve its startup message |
| Missing key or passwords | Complete step 4 in the workspace root |
| Port 8088 is occupied | Change `APP_PORT` in the root `.env`, recreate the stack, and use the new URL |
| Database tables are missing | Complete step 6 |
| Permission errors in storage | Run `docker compose exec --user root backend chown -R www-data:www-data storage bootstrap/cache` |
| Login or form request returns 419 | Use one hostname consistently, allow cookies, and sign in again |
| Browser still shows an old build | Rebuild the image and refresh the page |
| Password reset email is not received | This local activity logs mail; read `docker compose logs backend` |
| Database rejects a changed password | MySQL initialization settings apply to a fresh volume; editing `.env` alone does not change an existing database user's password |

This activity binds HTTP to your own computer. An internet deployment needs HTTPS, secure cookies, configured mail, and backups. Follow the existing backend README for deployment requirements.

## 10 Capture your activity evidence

Capture Docker Desktop showing all four services in the `petfave` project, `docker compose ps`, the PetFave interface, the `/api/session` JSON response, phpMyAdmin showing the clinic tables, migration status, and a real feature that saves data. Include evidence that a saved record and photo survive stopping and starting the stack if persistence is required by your rubric.

Keep credentials and temporary staff passwords out of screenshots. Submit the Docker files with this guide according to your instructor's required format.

## Official references

- [Docker Laravel guide](https://docs.docker.com/guides/laravel/)
- [Official PHP image and Apache configuration](https://hub.docker.com/_/php)
- [Official MySQL image and initialization variables](https://hub.docker.com/_/mysql)
- [Official phpMyAdmin image](https://hub.docker.com/_/phpmyadmin)
- [Official Nginx image](https://hub.docker.com/_/nginx)
- [Compose service readiness](https://docs.docker.com/compose/how-tos/startup-order/)
- [Compose project naming](https://docs.docker.com/compose/how-tos/environment-variables/envvars/)
