FROM node:24-alpine AS frontend
WORKDIR /workspace/Front
COPY Front/package.json Front/package-lock.json ./
RUN npm ci
COPY Front/ ./
RUN npm run build

FROM php:8.3-apache AS production
WORKDIR /var/www/html

RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip libicu-dev libzip-dev \
    && docker-php-ext-install -j"$(nproc)" pdo_mysql intl zip opcache \
    && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer/composer:2-bin /composer /usr/local/bin/composer
COPY Group-System/ ./
RUN mkdir -p storage/app/private storage/app/public storage/framework/cache/data \
        storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader \
    && composer check-platform-reqs --no-dev

COPY --from=frontend /workspace/Group-System/public/app-assets ./public/app-assets
COPY Group-System/petfave-apache.conf /etc/apache2/sites-available/000-default.conf
COPY Group-System/petfave-php.ini /usr/local/etc/php/conf.d/petfave.ini

RUN cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
    && sed -i 's/\r$//' railway-start.sh \
    && chmod +x railway-start.sh \
    && chown -R www-data:www-data storage bootstrap/cache

ENV APP_NAME=PetFave \
    APP_ENV=production \
    APP_DEBUG=false \
    APP_SERVE_FRONTEND=true \
    TRUSTED_PROXIES=* \
    LOG_CHANNEL=stderr \
    LOG_LEVEL=info \
    DB_CONNECTION=mysql \
    SESSION_DRIVER=database \
    SESSION_ENCRYPT=true \
    SESSION_SECURE_COOKIE=true \
    CACHE_STORE=database \
    QUEUE_CONNECTION=sync \
    FILESYSTEM_DISK=local \
    PORT=8080

EXPOSE 8080
CMD ["/var/www/html/railway-start.sh"]
