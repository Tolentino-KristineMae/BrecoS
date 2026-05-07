# Brecos System Deployment Guide

## Architecture
- **Frontend**: Vercel (React + Vite)
- **Backend**: Render (Laravel + Docker)
- **Database**: Supabase (PostgreSQL)

## Backend Deployment (Render)

### 1. Environment Variables Required

Add these in Render Dashboard → Environment:

```env
# App Configuration
APP_NAME=BrecoSystem
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:YOUR_GENERATED_KEY_HERE
APP_URL=https://brecos.onrender.com

# Database (Supabase)
DB_CONNECTION=pgsql
DB_HOST=aws-1-ap-southeast-1.pooler.supabase.com
DB_PORT=6543
DB_DATABASE=postgres
DB_USERNAME=postgres.gapknsavnikhabhixdhz
DB_PASSWORD=YOUR_SUPABASE_PASSWORD_HERE
DB_SSLMODE=require

# Session & Cache
SESSION_DRIVER=database
SESSION_LIFETIME=120
CACHE_STORE=database
QUEUE_CONNECTION=database

# Filesystem
FILESYSTEM_DISK=local

# Logging
LOG_CHANNEL=stack
LOG_LEVEL=error
```

### 2. Test Endpoints After Deployment

```bash
# Root health check
curl https://brecos.onrender.com/

# API health check
curl https://brecos.onrender.com/api/health

# Laravel health check
curl https://brecos.onrender.com/up

# Test login endpoint (should return 422 for missing data, not 404)
curl -X POST https://brecos.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### 3. Common Issues & Solutions

#### 500 Internal Server Error
- **Cause**: Missing `APP_KEY` or database connection failure
- **Fix**: 
  1. Generate APP_KEY: `php artisan key:generate --show`
  2. Add it to Render environment variables
  3. Check database credentials

#### 404 Not Found on API Routes
- **Cause**: Apache not routing to Laravel properly
- **Fix**: Verify `.htaccess` exists in `backend/public/`

#### CORS Errors
- **Cause**: Frontend domain not in allowed origins
- **Fix**: Update `backend/config/cors.php` with your Vercel URL

## Frontend Deployment (Vercel)

### 1. Environment Variables Required

Add in Vercel Dashboard → Settings → Environment Variables:

```env
VITE_API_URL=https://brecos.onrender.com/api/v1
```

### 2. Build Settings

- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### 3. Redeploy After Changes

After adding environment variables, trigger a new deployment:
- Go to Deployments tab
- Click "..." on latest deployment
- Click "Redeploy"

## Database Setup (Supabase)

### 1. Connection Pooler

Use the **Transaction Mode** pooler for Laravel:
- Host: `aws-1-ap-southeast-1.pooler.supabase.com`
- Port: `6543` (pooler port, not direct 5432)
- SSL Mode: `require`

### 2. Run Migrations

Migrations run automatically on Render deployment via the Dockerfile startup script.

To run manually:
```bash
php artisan migrate --force
```

## Troubleshooting

### Check Render Logs
1. Go to Render Dashboard
2. Select `breco-backend` service
3. Click "Logs" tab
4. Look for PHP errors or Laravel exceptions

### Check Vercel Logs
1. Go to Vercel Dashboard
2. Select your project
3. Click "Deployments"
4. Click on latest deployment
5. Check build and function logs

### Test Database Connection
```bash
# SSH into Render container (if available)
php artisan tinker
DB::connection()->getPdo();
```

### Clear All Caches
```bash
php artisan config:clear
php artisan route:clear
php artisan cache:clear
php artisan view:clear
```

## Post-Deployment Checklist

- [ ] Backend health check returns 200 OK
- [ ] API health check returns JSON
- [ ] Login endpoint returns 422 (validation error) not 404
- [ ] Frontend loads without console errors
- [ ] Login form submits to correct API URL
- [ ] CORS headers present in API responses
- [ ] Database migrations completed successfully

## Quick Fixes

### If login returns 404:
1. Check `VITE_API_URL` is set in Vercel
2. Verify it points to `https://brecos.onrender.com/api/v1`
3. Redeploy frontend

### If login returns CORS error:
1. Check `backend/config/cors.php` includes your Vercel URL
2. Redeploy backend
3. Clear browser cache

### If backend returns 500:
1. Check Render logs for specific error
2. Verify all environment variables are set
3. Ensure `APP_KEY` is generated
4. Test database connection from Render
