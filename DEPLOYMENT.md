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

### 3b. OAuth branding — show “Applymatic” instead of `*.supabase.co`

Google and GitHub sign-in go **through Supabase’s auth server**, so the provider screen may say “continue to `cyeyiztiyigrmgohedyx.supabase.co`”. That is normal with the default Supabase URL. Fix it in the **provider dashboards** (not in Next.js code).

#### Google (recommended — free)

1. Open [Google Cloud Console](https://console.cloud.google.com/) → project linked to your Supabase Google provider.
2. **APIs & Services → OAuth consent screen**
   - **App name:** `Applymatic`
   - **User support email:** your email
   - **App logo:** upload Applymatic logo (120×120)
   - **Application home page:** `https://applymatic.ca`
   - **Authorized domains:** add `applymatic.ca` (verify ownership in [Google Search Console](https://search.google.com/search-console) first)
   - Also keep `supabase.co` authorized — required for the Supabase callback URL
3. **Publish app** (move out of “Testing”) after domain verification. Until Google verifies your brand, many users only see the domain line, not your app name/logo.
4. **APIs & Services → Credentials** → your OAuth client:
   - Redirect URI must stay: `https://cyeyiztiyigrmgohedyx.supabase.co/auth/v1/callback`
   - Paste the same Client ID + Secret into Supabase → Authentication → Google.

5. **Privacy policy URL** in OAuth consent screen must match the live site:
   - `https://applymatic.ca/privacy`
   - The homepage footer must link to the same URL (already on `/` footer after deploy).

After verification, Google shows **Applymatic** with your logo. The “continue to …” line may still show `supabase.co` until you add a Supabase custom auth domain (below).

#### GitHub

1. [GitHub → Settings → Developer settings → OAuth Apps](https://github.com/settings/developers) → your Applymatic app (or create one).
2. Set **Application name** to `Applymatic`.
3. **Homepage URL:** `https://applymatic.ca`
4. **Authorization callback URL:** `https://cyeyiztiyigrmgohedyx.supabase.co/auth/v1/callback`
5. Copy Client ID + Secret into Supabase → Authentication → GitHub.

GitHub’s authorize screen uses the **Application name** you set here (“Applymatic”), not the Supabase project ref.

#### Optional — custom auth domain (best “continue to applymatic.ca” on Google)

Supabase **Custom Domains** (paid add-on) lets auth run on e.g. `auth.applymatic.ca` instead of `*.supabase.co`. Then Google shows “continue to auth.applymatic.ca”.

1. Supabase Dashboard → **Project Settings → Custom Domains** → add `auth.applymatic.ca`.
2. Add the DNS records Supabase gives you at Hostinger.
3. Update Google + GitHub callback URLs to `https://auth.applymatic.ca/auth/v1/callback`.
4. Rebuild/redeploy after any env changes.

This cannot be changed from application code alone — it requires Supabase + Google/GitHub configuration.

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

Add thank-you email storage on applications (run once in Supabase SQL editor):

```sql
alter table applications
  add column if not exists thank_you_email text;
```

The dashboard uses `tailored_resume`, `cover_letter`, and `thank_you_email` to show green “saved” buttons per application.

---

### 5. Stripe — switch to LIVE mode for production

In [Stripe Dashboard](https://dashboard.stripe.com):

1. Toggle **Test mode → Live mode**
2. Create a **live** recurring price: **CAD $9.99/month**
3. Copy **Live** secret key → `STRIPE_SECRET_KEY`
4. Copy **Live** price ID → `STRIPE_PRICE_ID`

**Customer Portal** (Settings → Billing → Customer portal): enable so “Manage billing” works.

**Checkout branding** (if checkout shows the wrong business name, e.g. a sandbox account name):

1. **Stripe Dashboard → Settings → Business → Business details** — set **Public business name** to `Applymatic`.
2. **Settings → Branding** — upload logo/icon and set brand colors (applies to Checkout and Customer Portal).
3. This repo also sets `branding_settings.display_name: "Applymatic"` when creating Checkout Sessions (`app/api/stripe/create-checkout-session/route.js`), which overrides the name at the top of Checkout for that session. Receipts, invoices, and portal may still use the account-level business name until you update step 1.

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

### 7. Job search (dual JSearch + Freehire fallback)

| Variable | Required | Notes |
|----------|----------|-------|
| `JSEARCH_API_KEY` | Yes (primary) | RapidAPI JSearch key #1 |
| `JSEARCH_API_KEY_2` | No | RapidAPI JSearch key #2 — used when key #1 quota is exhausted |
| `FREEHIRE_API_BASE` | No | Defaults to `https://freehire.dev/api/v1` backup when both JSearch keys are exhausted |

Applymatic tries **JSearch key #1**, then **JSearch key #2**, then automatically falls back to **Freehire** when both keys are exhausted or missing. Mega/newer RapidAPI plans use the **`/search-v2`** endpoint (legacy `/search` is tried as fallback for older plans). Job IDs are prefixed (`jsearch:…` / `freehire:…`) so details load from the correct provider.

After upgrading JSearch to a paid plan, no code changes are needed — JSearch will be used again automatically.

**Verify keys** (must be from the same RapidAPI account that is subscribed to [JSearch](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch)):

```bash
# On VPS — load env then test both keys
cd /var/www/applymatic
export $(grep -E '^JSEARCH_' .env.production | xargs)
node scripts/test-jsearch-keys.mjs
```

A `403 You are not subscribed to this API` means the key does **not** belong to an account with an active JSearch subscription (wrong account, wrong API, or env not updated).

---

### 8. SMTP (contact & careers forms)

Contact (`/contact`) and careers (`/careers`) forms send email server-side via **nodemailer**. Configure SMTP on your VPS:

| Variable | Example | Notes |
|----------|---------|-------|
| `SMTP_HOST` | `smtp.hostinger.com` | Your mail provider's SMTP host |
| `SMTP_PORT` | `587` | Usually 587 (STARTTLS) or 465 (SSL) |
| `SMTP_SECURE` | `false` | Set `true` for port 465 |
| `SMTP_USER` | `info@applymatic.ca` | SMTP login |
| `SMTP_PASS` | `...` | Mailbox or app password |
| `SMTP_FROM` | `Applymatic <info@applymatic.ca>` | Optional; defaults to `SMTP_USER` |

Contact form submissions go to **info@applymatic.ca**. Careers applications go to **careers@applymatic.ca**. Contact form also sends an auto-reply to the user when SMTP allows.

After adding SMTP vars, rebuild and restart PM2.

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
JSEARCH_API_KEY_2=...
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM="Applymatic <info@applymatic.ca>"
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

    # Never cache app HTML/RSC — Hostinger CDN must not store flight payloads for these paths.
    location ~ ^/(login|profile|dashboard|search|contact|careers|privacy|terms)(/|$)|^/$ {
        client_max_body_size 10M;
        proxy_read_timeout 180s;
        proxy_connect_timeout 180s;
        proxy_send_timeout 180s;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_no_cache 1;
        proxy_cache_bypass 1;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate" always;
        add_header CDN-Cache-Control "no-store" always;
        add_header Pragma "no-cache" always;
    }

    location /api/ {
        client_max_body_size 10M;
        proxy_read_timeout 180s;
        proxy_connect_timeout 180s;
        proxy_send_timeout 180s;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        client_max_body_size 10M;
        proxy_read_timeout 180s;
        proxy_connect_timeout 180s;
        proxy_send_timeout 180s;
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
- [ ] Sign up / login (email + password)
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
| **High traffic on `/api/stripe/pro-status`** | Fixed in app: client reads Pro status from Supabase directly with a 2‑min cache; no per-tab-focus API calls. After deploy, this endpoint should only be hit if called manually. |
| Google shows `*.supabase.co` on sign-in | Configure OAuth consent screen app name “Applymatic”, verify `applymatic.ca`, publish app — see **§3b OAuth branding** |
| GitHub shows wrong app name | Set GitHub OAuth app **Application name** to `Applymatic` — see **§3b** |
| Stripe checkout wrong domain | Set `NEXT_PUBLIC_SITE_URL=https://applymatic.ca` on server, rebuild |
| Stripe checkout shows wrong business name | Set **Public business name** to `Applymatic` in Stripe Dashboard → Settings → Business; see **§5 Checkout branding** |
| Pro not unlocking | Run SQL migration; return from checkout auto-verifies via `verify-session`; check `SUPABASE_SERVICE_ROLE_KEY` and webhook |
| 502 Bad Gateway | Same as 503 — `pm2 logs applymatic` |
| **"Internal error" when tailoring** | Visit `https://applymatic.ca/api/health` — `aiConfigured` must be `true`. If it is and tailoring still fails, run `pm2 logs applymatic` while generating and check nginx timeouts (180s on `/api/`), Anthropic billing, and outbound firewall. |
| **403 / "Forbidden" on tailor** | Hostinger WAF/nginx blocking the POST **before** it reaches Next.js. After deploying the latest code, requests no longer send the full profile in the body (smaller payload). Also: in Hostinger hPanel disable CDN/cache for `/api/*`, add `client_max_body_size 10M;` in nginx, whitelist ModSecurity for `/api/tailor-resume` and `/api/generate-thank-you-email`. Check `https://applymatic.ca/api/health` — `aiConfigured` must be `true`. Run `pm2 logs applymatic` while generating. |
| Build runs out of memory | Add swap: `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile` |
| **Login or homepage shows raw RSC text** (`1:"$Sreact.fragment"`, etc.) | Hostinger CDN/nginx cached a React Server Components flight response and served it as HTML. **Code fixes:** `Cache-Control: no-store` + `Vary: RSC, Accept` on `/`, `/login`, `/dashboard`, `/profile`, `/search`, and other app routes; server-rendered `app/login/page.js` + client `LoginForm.jsx`; full-page redirect to `/dashboard` after login (no client router). **On Hostinger (required):** hPanel → CDN → disable cache for `/`, `/login`, `/dashboard`, `/profile`, `/search`; purge all CDN cache after deploy. **On nginx:** use the dedicated `location ~ ^/(login|profile|...)|^/$` block in §3.5 with `proxy_no_cache 1`. Verify: `curl -I https://applymatic.ca/` and `curl -I https://applymatic.ca/login` must show `Cache-Control: no-store`. Test in a fresh private window after purge. |
| Contact/careers form fails | Set `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` (and optional `SMTP_PORT`, `SMTP_FROM`) on VPS; rebuild; check `pm2 logs applymatic` for `SEND CONTACT ERROR` / `SEND CAREERS ERROR`. API returns a clear message when SMTP is missing. |

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
