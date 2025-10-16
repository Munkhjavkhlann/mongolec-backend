# Deployment Guide

## CI/CD Pipeline

This project uses GitHub Actions for automatic deployment to your server.

### How it works:

```
Push to main → Build & Test → Build Docker Image → Deploy to Server
```

## Setup Steps

### 1. Set up Cloud Database (One-time)

**Neon (PostgreSQL):**
1. Go to [neon.tech](https://neon.tech) and sign up
2. Create a new project
3. Copy the connection string (looks like `postgresql://user:pass@....neon.tech/db`)

**Upstash (Redis):**
1. Go to [upstash.com](https://upstash.com) and sign up
2. Create a new Redis database
3. Copy the Redis URL (looks like `redis://...upstash.io:6379`)

### 2. Set up GitHub Secrets

Go to your repository → Settings → Secrets and variables → Actions

Add these secrets:

```
SERVER_HOST=your.server.ip.address
SERVER_USER=root (or your SSH user)
SERVER_SSH_KEY=<paste your private SSH key>
SERVER_PORT=22 (if different)
```

### 3. Set up Server (One-time)

SSH into your server:

```bash
ssh root@your-server-ip
```

Install Docker:
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

Create project directory:
```bash
mkdir -p /opt/mongolec
cd /opt/mongolec
```

Create `.env` file:
```bash
nano .env
```

Add your environment variables:
```env
NODE_ENV=production
PORT=4000
HOST=0.0.0.0

# Cloud Database URLs (from Neon)
DATABASE_URL="postgresql://user:pass@...neon.tech/mongolec_db?schema=public"

# Cloud Redis URL (from Upstash)
REDIS_URL="redis://...upstash.io:6379"
REDIS_PASSWORD="your-upstash-password"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-this"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"

# Encryption
ENCRYPTION_KEY="your-32-character-encryption-key"

# CORS - your frontend URL
CORS_ORIGIN="https://your-admin-domain.vercel.app,https://your-site.com"
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE_ENABLED=true
LOG_FILE_PATH="./logs"
```

Copy docker-compose file:
```bash
nano docker-compose.prod.yml
```

Paste the docker-compose.prod.yml content from your repo.

### 4. Open Firewall Ports

```bash
# Allow port 4000 (backend API)
ufw allow 4000/tcp

# Or if using nginx reverse proxy
ufw allow 80/tcp
ufw allow 443/tcp
```

### 5. Deploy!

**Option A: Automatic (Recommended)**

Just push to GitHub:
```bash
git add .
git commit -m "Add CI/CD setup"
git push origin main
```

GitHub Actions will automatically:
1. Run tests
2. Build Docker image
3. Deploy to your server

**Option B: Manual Deploy**

SSH into server:
```bash
cd /opt/mongolec
docker-compose -f docker-compose.prod.yml up -d
```

## How Database Migrations Work

The Docker container automatically runs migrations on startup:
```
bunx prisma migrate deploy
```

This means:
1. Push schema changes to GitHub
2. CI/CD builds new image
3. Container starts
4. Migrations run automatically
5. App starts

## Monitoring

Check logs:
```bash
cd /opt/mongolec
docker-compose -f docker-compose.prod.yml logs -f
```

Check status:
```bash
docker-compose -f docker-compose.prod.yml ps
```

Restart:
```bash
docker-compose -f docker-compose.prod.yml restart
```

## Updating

Just push to GitHub main branch and CI/CD handles everything!

## Architecture

```
┌─────────────────┐
│   GitHub Repo   │
└────────┬────────┘
         │ push
         ▼
┌─────────────────┐
│ GitHub Actions  │  (Build & Test)
└────────┬────────┘
         │ build
         ▼
┌─────────────────┐
│  Docker Image   │  (GHCR)
└────────┬────────┘
         │ deploy
         ▼
┌─────────────────┐      ┌──────────────┐
│  Your Server    │─────▶│ Neon (DB)    │
│  (Docker)       │      │ Upstash      │
└─────────────────┘      └──────────────┘
         │
         ▼
┌─────────────────┐
│  Users/Admin    │
└─────────────────┘
```

## Troubleshooting

**Container won't start:**
```bash
docker-compose -f docker-compose.prod.yml logs backend
```

**Database connection issues:**
- Check `.env` DATABASE_URL is correct
- Check Neon database is running
- Check server can reach neon.tech (firewall)

**Redis connection issues:**
- Check `.env` REDIS_URL is correct
- Check Upstash Redis is running

**Migrations failing:**
- SSH into server
- Run manually: `docker exec mongolec-backend bunx prisma migrate deploy`
