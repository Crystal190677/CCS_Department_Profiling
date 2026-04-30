#!/bin/bash

# Ensure PORT is set, default to 80 if not provided by Render
PORT=${PORT:-80}

# Update Apache to listen on the correct PORT
sed -i "s/Listen 80/Listen ${PORT}/g" /etc/apache2/ports.conf
sed -i "s/:80/:${PORT}/g" /etc/apache2/sites-available/000-default.conf

# Run Laravel optimizations
echo "Running configuration and route caches..."

# Force DB_CONNECTION to pgsql for the Render environment
echo "Configuring database connection for Render (PostgreSQL)..."
export DB_CONNECTION=pgsql

# If Render provides a DATABASE_URL, export it as DB_URL so Laravel can use it
if [ -n "$DATABASE_URL" ]; then
    export DB_URL="$DATABASE_URL"
else
    echo "Warning: DATABASE_URL is not set. Make sure you connected the PostgreSQL database to this Web Service in Render!"
fi

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
echo "Fixing permissions..."
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

echo "Starting Apache server..."
apache2-foreground
