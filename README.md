## ⚽ World Cup Predictor

A free-to-host football prediction game for friends. Built with Next.js, Supabase, and the football-data.org API.

## What You Get

- **Predict scores** for every match before kickoff
- **Automatic scoring** — 3pts exact, 1pt correct result
- **Live leaderboard** that updates after each game
- **Automatic result fetching** via cron job (no manual work needed)
- **100% free** — runs on Vercel + Supabase free tiers

---

## 📋 Prerequisites (what you need before starting)

1. A **GitHub** account — [github.com](https://github.com)
2. A **Vercel** account — [vercel.com](https://vercel.com) (sign in with GitHub)
3. A **Supabase** account — [supabase.com](https://supabase.com)
4. A **football-data.org** account — [football-data.org](https://www.football-data.org/) (free)
5. **Node.js** installed on your computer — [nodejs.org](https://nodejs.org) (LTS version)

---

## 🚀 Step-by-Step Setup

### Step 1 — Get your Football API key

1. Go to [football-data.org](https://www.football-data.org/) and click "Get your API token"
2. Sign up with your email
3. Check your email for the API key
4. Keep this handy — you'll need it in Step 4

### Step 2 — Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create an account
2. Click **"New Project"**
3. Fill in:
   - **Name:** `worldcup-predictor` (or anything you like)
   - **Database Password:** make something strong and save it somewhere
   - **Region:** pick the one closest to you
4. Wait ~2 minutes for the project to be created
5. Once ready, go to **SQL Editor** in the left sidebar
6. Click **"New Query"**
7. Copy the entire contents of `supabase-setup.sql` (in this project) and paste it
8. Click **"Run"** — you should see "Success" messages
9. **Get your API keys:** Go to **Settings → API**
   - Copy the **Project URL** (looks like `https://xxxxx.supabase.co`)
   - Copy the **anon/public** key (long string starting with `eyJ...`)
   - Copy the **service_role** key (another long string — keep this SECRET)

10. **Configure Auth:** Go to **Authentication → Settings (URL Configuration)**
    - Set **Site URL** to `http://localhost:3000` for now (update after deploying)
    - Under **Redirect URLs**, add: `http://localhost:3000/**`

### Step 3 — Set up the project locally

```bash
# Clone or download this project
git clone <your-repo-url>
cd worldcup-predictor

# Install dependencies
npm install

# Copy the example environment file
cp .env.example .env.local
```

Now open `.env.local` in a text editor and fill it in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key...
FOOTBALL_API_KEY=your-football-data-org-api-key
FOOTBALL_COMPETITION_CODE=WC
CRON_SECRET=make-up-any-long-random-string-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> ⚠️ **Never share or commit `.env.local`** — it contains secret keys.

### Step 4 — Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

You should see the login page. Create an account and explore!

> **Note:** Matches won't appear yet until you run the initial sync (see below).

### Step 5 — Initial match sync

Once the app is running, you need to fetch the first batch of matches. Run this command (with the app running in another terminal):

```bash
curl -H "Authorization: Bearer your-cron-secret-here" \
  http://localhost:3000/api/cron/update-results
```

Replace `your-cron-secret-here` with the `CRON_SECRET` value from your `.env.local`.

You should see a JSON response listing the matches that were fetched.

### Step 6 — Push to GitHub

```bash
# Initialise git if you haven't already
git init
git add .
git commit -m "Initial commit"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/worldcup-predictor.git
git push -u origin main
```

### Step 7 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**
2. Import your GitHub repository
3. In the **Environment Variables** section, add all the variables from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `FOOTBALL_API_KEY`
   - `FOOTBALL_COMPETITION_CODE`
   - `CRON_SECRET`
   - `NEXT_PUBLIC_APP_URL` (set this to your Vercel URL, e.g. `https://my-app.vercel.app`)
4. Click **Deploy**
5. Wait for the build to complete (~2 minutes)
6. Visit your Vercel URL — the app should be live!

### Step 8 — Update Supabase Auth settings

Now that you have a Vercel URL:
1. Go back to Supabase → **Authentication → Settings**
2. Update **Site URL** to your Vercel URL (e.g. `https://my-app.vercel.app`)
3. Add to **Redirect URLs**: `https://my-app.vercel.app/**`

### Step 9 — Set up GitHub Actions cron (for automatic updates)

> Vercel's free tier only runs cron jobs once per day. GitHub Actions gives us more frequent updates for free.

1. In your GitHub repo, go to **Settings → Secrets and variables → Actions**
2. Click **"New repository secret"** and add:
   - **Name:** `APP_URL` | **Value:** your Vercel URL (e.g. `https://my-app.vercel.app`)
   - **Name:** `CRON_SECRET` | **Value:** your cron secret (same as in `.env.local`)
3. The workflow in `.github/workflows/update-results.yml` will now run automatically every 30 minutes

---

## 🏗️ Project Structure

```
worldcup-predictor/
├── src/
│   ├── app/                    # Next.js pages (App Router)
│   │   ├── api/                # API endpoints (run on server)
│   │   │   ├── auth/callback/  # Handles login redirect from Supabase
│   │   │   ├── matches/        # GET all matches
│   │   │   ├── predictions/    # GET & POST user predictions
│   │   │   ├── leaderboard/    # GET ranked leaderboard
│   │   │   └── cron/           # Scheduled job to fetch results
│   │   ├── login/              # Login/signup page
│   │   ├── matches/            # Main prediction page
│   │   ├── leaderboard/        # Standings page
│   │   ├── layout.tsx          # Root layout (fonts, metadata)
│   │   ├── page.tsx            # Root page (redirects to matches or login)
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── layout/Nav.tsx      # Navigation bar
│   │   └── ui/MatchCard.tsx    # Match display + prediction form
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts       # Browser Supabase client
│   │   │   └── server.ts       # Server Supabase client + admin client
│   │   ├── scoring.ts          # Points calculation logic
│   │   └── football-api.ts     # Football API wrapper
│   └── types/index.ts          # TypeScript type definitions
├── .github/workflows/          # GitHub Actions cron job
├── supabase-setup.sql          # Run this in Supabase SQL Editor
├── vercel.json                 # Vercel cron config
└── .env.example                # Copy to .env.local and fill in
```

---

## 🎯 Scoring System

| Prediction | Result | Points |
|-----------|--------|--------|
| 2 - 1 | 2 - 1 | ⭐⭐⭐ 3 points (exact!) |
| 1 - 0 | 2 - 1 | ⭐ 1 point (correct winner) |
| 0 - 0 | 2 - 1 | 0 points (wrong) |
| 1 - 1 | 1 - 1 | ⭐⭐⭐ 3 points (exact draw!) |
| 2 - 2 | 1 - 1 | ⭐ 1 point (correct draw) |

---

## 🏆 Competition Codes

Change `FOOTBALL_COMPETITION_CODE` in your `.env.local` to follow different competitions:

| Code | Competition |
|------|-------------|
| `WC` | FIFA World Cup |
| `EC` | UEFA European Championship |
| `PL` | English Premier League |
| `CL` | UEFA Champions League |
| `BL1` | German Bundesliga |
| `SA` | Italian Serie A |
| `PD` | Spanish La Liga |
| `FL1` | French Ligue 1 |

> ⚠️ Free tier of football-data.org only allows certain competitions. Check [their coverage page](https://www.football-data.org/coverage) for the latest.

---

## 🔧 Troubleshooting

**"No matches showing"**
Run the initial match sync manually (see Step 5). Matches only appear after the first cron run.

**"Unauthorized" errors**
Make sure you're logged in. Clear browser cookies and log in again.

**Cron job not running**
Check GitHub Actions → the workflow should show runs every 30 minutes. Make sure secrets are set correctly.

**"Email not confirmed" on signup**
In Supabase → Authentication → Settings, you can disable email confirmation for testing by turning off "Enable email confirmations".

**Predictions not locking before kickoff**
The app uses your local time vs UTC kickoff time. Make sure your server time is correct.

---

## 💡 Extending the App

Some ideas for future improvements:

- **Mini-tournaments:** Add multiple competitions / seasons
- **Admin panel:** A page to manually trigger syncs or add matches
- **Notifications:** Email users when results are in
- **Share:** Let users share their prediction grid
- **Groups:** Sub-groups within the friend circle with their own leaderboard

---

## 📝 License

MIT — use freely for your friend group. Have fun!
