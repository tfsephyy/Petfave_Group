#!/bin/sh
set -eu

: "${APP_KEY:?Set a persistent APP_KEY in Railway service variables}"
: "${PORT:=8080}"

case "$PORT" in
    ''|*[!0-9]*) echo 'PORT must be a number.' >&2; exit 1 ;;
esac

if [ -z "${APP_URL:-}" ] && [ -n "${RAILWAY_PUBLIC_DOMAIN:-}" ]; then
    export APP_URL="https://${RAILWAY_PUBLIC_DOMAIN}"
fi
export FRONTEND_URL="${FRONTEND_URL:-${APP_URL:-http://localhost}}"

mkdir -p storage/app/private storage/app/public storage/framework/cache/data \
    storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

sed -i "s/^Listen 80$/Listen ${PORT}/" /etc/apache2/ports.conf
sed -i "s/<VirtualHost \*:80>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf

a2dismod -f mpm_event mpm_worker
a2enmod mpm_prefork
apache2ctl configtest

php artisan config:cache --no-interaction
php artisan migrate --force --no-interaction
php artisan db:seed --force --no-interaction
php artisan route:cache --no-interaction
php artisan view:cache --no-interaction

exec apache2-foreground
