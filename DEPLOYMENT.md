# Deployment Guide — AI Cloud Load Management

## Architecture Overview
```
┌─────────────────────────┐        ┌──────────────────────────────┐
│   React Frontend (Vite) │──HTTPS─▶   Flask Backend (gunicorn)   │
│   Vercel / Netlify      │        │   Render / AWS EC2            │
└─────────────────────────┘        └──────────────┬───────────────┘
                                                  │
                            ┌─────────────────────▼──────────────┐
                            │   MongoDB Atlas (managed cloud DB)  │
                            └────────────────────────────────────┘
```

---

## Prerequisites
1. **MongoDB Atlas** free cluster — [cloud.mongodb.com](https://cloud.mongodb.com)
   - Create a cluster → get the connection string for `MONGO_URI`
   - Whitelist `0.0.0.0/0` in Network Access (or specific IP for production)
2. **Git** repository pushed to GitHub (required for Render/Vercel auto-deploy)

---

## Option A — Render (Recommended for Backend, Easiest)

### Backend on Render
1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect your GitHub repo, set **Root Directory** to `backend/`
3. Set these fields:
   | Field | Value |
   |---|---|
   | **Environment** | Python 3 |
   | **Build Command** | `pip install -r requirements.txt` |
   | **Start Command** | `gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 2 --threads 4` |
4. Add all environment variables from `backend/.env.example` under **Environment Variables**
5. Deploy — Render gives you a URL like `https://your-app.onrender.com`

### Frontend on Vercel (paired with Render backend)
1. Go to [vercel.com](https://vercel.com) → **New Project** → Import GitHub repo
2. Set **Root Directory** to `frontend/react-app`
3. Add environment variable:
   ```
   VITE_API_URL = https://your-app.onrender.com
   ```
4. Vercel auto-detects Vite. Click **Deploy**.

---

## Option B — Vercel (Frontend Only)

> Vercel is a frontend platform. Use it for the React app; host the backend elsewhere.

1. Install Vercel CLI: `npm i -g vercel`
2. From `frontend/react-app/`:
   ```bash
   npm run build
   vercel --prod
   ```
3. Set `VITE_API_URL` to your backend URL in Vercel dashboard → Settings → Environment Variables.

Add `frontend/react-app/vercel.json` to handle SPA routing:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## Option C — AWS (EC2 + S3 / Elastic Beanstalk)

### Backend on EC2
```bash
# 1. SSH into your EC2 instance (Ubuntu 22.04 recommended)
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>

# 2. Install dependencies
sudo apt update && sudo apt install -y python3-pip python3-venv nginx

# 3. Clone your project
git clone https://github.com/your-username/AI-cloud-load-management.git
cd AI-cloud-load-management/backend

# 4. Set up virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 5. Create .env from template
cp .env.example .env
nano .env  # fill in all values

# 6. Test with gunicorn
gunicorn wsgi:app --bind 0.0.0.0:5000 --workers 2

# 7. Set up systemd service (runs on boot)
sudo nano /etc/systemd/system/cloudscale.service
```

Paste this into the systemd file:
```ini
[Unit]
Description=CloudScale AI Flask App
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/AI-cloud-load-management/backend
Environment="PATH=/home/ubuntu/AI-cloud-load-management/backend/venv/bin"
ExecStart=/home/ubuntu/AI-cloud-load-management/backend/venv/bin/gunicorn wsgi:app --workers 2 --bind 0.0.0.0:5000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable cloudscale
sudo systemctl start cloudscale

# 8. Configure Nginx reverse proxy
sudo nano /etc/nginx/sites-available/cloudscale
```

Nginx config:
```nginx
server {
    listen 80;
    server_name your-ec2-public-ip;

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        root /var/www/cloudscale;
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/cloudscale /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Frontend on AWS S3 + CloudFront
```bash
# In frontend/react-app:
echo "VITE_API_URL=http://your-ec2-ip" > .env.local
npm run build

# Upload dist/ to S3 bucket (public static hosting)
aws s3 sync dist/ s3://your-bucket-name --delete

# Enable static website hosting in S3 bucket settings
# Add a CloudFront distribution pointing at the S3 bucket for HTTPS + CDN
```

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | ✅ | Flask session secret (generate with `secrets.token_hex(32)`) |
| `JWT_SECRET_KEY` | ✅ | JWT signing key (different from SECRET_KEY) |
| `MONGO_URI` | ✅ | MongoDB Atlas connection string |
| `FLASK_ENV` | ✅ | Set to `production` |
| `MAIL_USERNAME` | Optional | Gmail address for email alerts |
| `MAIL_PASSWORD` | Optional | Gmail App Password (not account password) |
| `RATELIMIT_STORAGE_URL` | Optional | Redis URL — falls back to in-memory if absent |
| `SCALE_UP_THRESHOLD` | Optional | CPU % that triggers scale-up (default: 75) |
| `SCALE_DOWN_THRESHOLD` | Optional | CPU % that triggers scale-down (default: 40) |

---

## Statelessness Confirmation

The backend is fully **stateless** across requests:
- ✅ **Auth**: JWT tokens (no server-side sessions)
- ✅ **Database**: All persistent state in MongoDB Atlas
- ✅ **ML Model**: Loaded once at startup into memory (safe for multi-worker gunicorn)
- ✅ **Rate limiting**: Falls back to in-memory (use Redis URL for multi-instance deployments)
- ✅ **Email**: Thread-based, no blocking state

> For multi-instance scaling on AWS ECS or Render, set `RATELIMIT_STORAGE_URL` to a shared Redis (e.g., [Upstash](https://upstash.com) free tier).

---

## Quick Local Dev Start

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env  # then fill in your values
python app.py

# Frontend (new terminal)
cd frontend/react-app
npm install
npm run dev
```
