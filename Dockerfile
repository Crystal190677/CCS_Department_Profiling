# Stage 1: Build Frontend
FROM node:20 AS frontend-builder

WORKDIR /app
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

# Copy frontend source code
COPY frontend/ ./frontend/
# We need backend folder present for Vite to output to ../backend/public/build
# Create a dummy backend structure to satisfy Vite output directory requirements
RUN mkdir -p /app/backend/public
# Build the frontend assets
RUN cd frontend && npm run build

# Stage 2: Build Backend
FROM composer:2.7 AS backend-builder

WORKDIR /app/backend
COPY backend/composer.json backend/composer.lock ./
# Install dependencies without executing scripts
RUN composer install --no-interaction --no-scripts --no-dev --prefer-dist

# Copy the rest of the backend files
COPY backend/ ./
# Generate optimized autoload files
RUN composer dump-autoload --optimize

# Stage 3: Production Image
FROM php:8.2-apache

# Install dependencies and PostgreSQL PHP extensions
RUN apt-get update && apt-get install -y \
    libpq-dev \
    unzip \
    git \
    && docker-php-ext-install pdo pdo_pgsql pgsql \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Enable Apache mod_rewrite for Laravel routing
RUN a2enmod rewrite

# Update Apache document root to point to Laravel's public directory
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# Set working directory
WORKDIR /var/www/html

# Copy backend application from backend-builder stage
COPY --from=backend-builder /app/backend ./

# Copy compiled frontend build from frontend-builder stage into backend public directory
COPY --from=frontend-builder /app/backend/public/build ./public/build

# Copy the startup script
COPY start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# Fix permissions for Laravel storage and cache directories
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Render automatically maps the PORT environment variable
EXPOSE 80

# Run the startup script
CMD ["/usr/local/bin/start.sh"]
