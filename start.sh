#!/bin/bash

# Ensure PORT is set, default to 80 if not provided by Render
PORT=${PORT:-80}

# Update Apache to listen on the correct PORT
sed -i "s/Listen 80/Listen ${PORT}/g" /etc/apache2/ports.conf
sed -i "s/:80/:${PORT}/g" /etc/apache2/sites-available/000-default.conf

# Run Laravel optimizations
echo "Running configuration and route caches..."
php artisan config:cache
php artisan event:cache
php artisan route:cache
php artisan view:cache

# Run Database Migrations
echo "Running database migrations..."
php artisan migrate --force

# Run Seeders if explicitly requested via environment variable
if [ "$SEED_DB" = "true" ]; then
    echo "Running database seeders..."
    php artisan db:seed --force
fi

# Start Apache in foreground
echo "Starting Apache server..."
apache2-foreground
