FROM node:24-alpine AS assets
WORKDIR /workspace/Front
COPY Front/package.json Front/package-lock.json ./
RUN npm ci
COPY Front/ ./
RUN npm run build

FROM php:8.3-apache AS backend
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
COPY --from=assets /workspace/Group-System/public/app-assets/ ./public/app-assets/
COPY petfave-apache.conf /etc/apache2/sites-available/000-default.conf
COPY petfave-php.ini /usr/local/etc/php/conf.d/petfave.ini

RUN cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
    && chown -R www-data:www-data storage bootstrap/cache

EXPOSE 80
CMD ["apache2-foreground"]

FROM nginx:stable-alpine AS frontend
COPY --from=assets /workspace/Group-System/public/app-assets/ /usr/share/nginx/html/app-assets/
COPY --from=assets /workspace/Group-System/public/app-assets/index.html /usr/share/nginx/html/index.html
COPY petfave-nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
