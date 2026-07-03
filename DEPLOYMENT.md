# Deploy Applymatic to applymatic.ca (Hostinger VPS)

Applymatic is a **Next.js 16** app. It needs **Node.js 20+** on a VPS — standard Hostinger shared/WordPress hosting will **not** run it.

---

## Part 1 — Update OUTSIDE the codebase (do these first)

### 1. Domain DNS (Hostinger / your registrar)

Point the domain to your VPS public IP:

| Type | Name | Value        | TTL |
|------|------|--------------|-----|
| A    | @    | YOUR_VPS_IP  | 3600 |
| A    | www  | YOUR_VPS_IP  | 3600 |

Wait until DNS propagates (often 5–30 minutes, up to 24h).

---

### 2. Supabase — Authentication → URL Configuration

Project: `cyeyiztiyigrmgohedyx` (or your project)

- **Site URL:** `https://applymatic.ca`
- **Redirect URLs** (add all):
  - `https://applymatic.ca/api/auth/callback`
  - `https://www.applymatic.ca/api/auth/callback`
  - `http://localhost:3000/api/auth/callback` (keep for local dev)

---

### 3. Supabase — Authentication → Providers

Enable and configure (if not done):

- **Google** — OAuth client redirect URI in Google Cloud:
  `https://cyeyiztiyigrmgohedyx.supabase.co/auth/v1/callback`
- **GitHub** — OAuth app callback URL:
  `https://cyeyiztiyigrmgohedyx.supabase.co/auth/v1/callback`

---

### 4. Supabase — SQL (run once if not done)

In **SQL Editor**:

```sql
alter table profiles
  add column if not exists is_pro boolean default false,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists pro_current_period_end timestamptz,
  add column if not exists pro_cancel_at_period_end boolean default false,
  add column if not exists pro_since timestamptz;
```

Ensure `profiles`, `applications`, `user_usage` tables exist with RLS policies for authenticated users.

---

### 5. Stripe — switch to LIVE mode for production

In [Stripe Dashboard](https://dashboard.stripe.com):

1. Toggle **Test mode → Live mode**
2. Create a **live** recurring price: **CAD $9.99/month**
3. Copy **Live** secret key → `STRIPE_SECRET_KEY`
4. Copy **Live** price ID → `STRIPE_PRICE_ID`

**Customer Portal** (Settings → Billing → Customer portal): enable so “Manage billing” works.

**Webhook** (Developers → Webhooks → Add endpoint):

- URL: `https://applymatic.ca/api/stripe/webhook`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Copy signing secret → `STRIPE_WEBHOOK_SECRET`

---

### 6. Anthropic (Claude)

Get an API key from [console.anthropic.com](https://console.anthropic.com). Applymatic uses **Claude Sonnet 5** (`claude-sonnet-5`) for resume parsing, tailoring, cover letters, and thank-you emails.

Set on your VPS:
- `ANTHROPIC_API_KEY=sk-ant-...`
- Optional: `ANTHROPIC_MODEL=claude-sonnet-5` (this is the default)

Ensure billing is enabled and you have sufficient quota for production traffic.

---

### 7. RapidAPI (JSearch)

Ensure `JSEARCH_API_KEY` is active on your RapidAPI subscription.

---

## Part 2 — Push code to GitHub (from your PC)

```bash
git add .
git status   # confirm .env.local is NOT listed
git commit -m "Prepare Applymatic for production deployment"
git push origin main
```

`.env.local` is gitignored — secrets stay on your machine and VPS only.

---

## Part 3 — Hostinger VPS setup

You need a **VPS** plan (e.g. Hostinger VPS KVM). SSH in as root or your sudo user.

### 3.1 Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx certbot python3-certbot-nginx
sudo npm install -g pm2
```

### 3.2 Clone the repo

```bash
sudo mkdir -p /var/www/applymatic
sudo chown $USER:$USER /var/www/applymatic
cd /var/www/applymatic
git clone https://github.com/SahilSoni-GenAISpecialization/Resume.git .
```

### 3.3 Production environment file

```bash
nano .env.production
```

Paste all variables from `.env.example` with **production** values. Minimum:

```env
NEXT_PUBLIC_SITE_URL=https://applymatic.ca
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-5
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
JSEARCH_API_KEY=...
```

Next.js loads `.env.production` automatically when `NODE_ENV=production`.

### 3.4 Build and start

```bash
npm ci
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # follow the printed command so PM2 survives reboot
```

### 3.5 Nginx reverse proxy

```bash
sudo nano /etc/nginx/sites-available/applymatic
```

```nginx
server {
    listen 80;
    server_name applymatic.ca www.applymatic.ca;

    location / {
        client_max_body_size 10M;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/applymatic /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3.6 HTTPS (Let's Encrypt)

```bash
sudo certbot --nginx -d applymatic.ca -d www.applymatic.ca
```

Choose redirect HTTP → HTTPS when prompted.

---

## Part 4 — After go-live checklist

- [ ] https://applymatic.ca loads landing page
- [ ] Sign up / login (email + Google/GitHub if enabled)
- [ ] Save profile on `/profile`
- [ ] Job search works
- [ ] Stripe checkout (live) → Pro unlocks
- [ ] Stripe webhook shows 200 in Stripe dashboard
- [ ] “Manage billing” opens Stripe portal

---

## Updating the live site later

SSH into your VPS, then:

```bash
cd /var/www/applymatic   # or your app folder
bash scripts/deploy.sh
```

Or manually:

```bash
cd /var/www/applymatic
git pull origin main
npm ci
npm run build
pm2 restart applymatic
```

**Important:** Uploading files via Hostinger File Manager or FTP is **not enough**. You must run `npm ci`, `npm run build`, and restart PM2 on the server every time you deploy.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| **503 Service Unavailable** | App is not running. SSH in and run the steps below. |
| OAuth redirect error | Add production callback URLs in Supabase |
| Stripe checkout wrong domain | Set `NEXT_PUBLIC_SITE_URL=https://applymatic.ca` on server, rebuild |
| Pro not unlocking | Run SQL migration; click “Sync status”; check `SUPABASE_SERVICE_ROLE_KEY` |
| 502 Bad Gateway | Same as 503 — `pm2 logs applymatic` |
| **"Internal error" when tailoring** | Visit `https://applymatic.ca/api/health` — if `aiConfigured` is `false`, add `ANTHROPIC_API_KEY` to production env and rebuild. If `true`, check `pm2 logs applymatic` while tailoring (timeout or WAF). |
| **403 / "Forbidden" on tailor** | Request blocked before Next.js (Hostinger WAF) or free limit hit. Add `client_max_body_size 10M;` in nginx. Ensure `ANTHROPIC_API_KEY` is set. Check `pm2 logs applymatic` while tailoring. |
| Build runs out of memory | Add swap: `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile` |

### Fix 503 — run these on your VPS (SSH)

```bash
cd /var/www/applymatic          # adjust path if different
pm2 status                      # is applymatic "online"?
pm2 logs applymatic --lines 80  # read the error

# Full redeploy:
git pull origin main
npm ci
npm run build                   # must finish without errors
pm2 restart applymatic
curl -I http://127.0.0.1:3000   # should return HTTP 200 or 307

# If pm2 shows "errored" or build failed:
pm2 delete applymatic
pm2 start ecosystem.config.cjs
pm2 save
```

Check `.env.production` exists in the app folder and includes at least:

```env
NEXT_PUBLIC_SITE_URL=https://applymatic.ca
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ANTHROPIC_API_KEY=sk-ant-...
```

If `npm run build` fails with **JavaScript heap out of memory**, add 2GB swap (see table above) and rebuild.

If you use **Hostinger Business shared hosting** (not VPS), Node.js/PM2 may not be supported — you need a **VPS** plan or Hostinger’s Node.js hosting with SSH access.
