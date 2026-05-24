# Hello Macy — Deployment Guide
## Convex (database + real-time sync) + Cloudflare Pages (hosting)

---

## Before you start

Install these on your computer if you don't have them:
- **Node.js 18+** → https://nodejs.org
- **Git** → https://git-scm.com
- A **GitHub** account → https://github.com

---

## Step 1 — Set up the project locally

Open your terminal and run:

```bash
# 1. Move into the project folder you downloaded
cd hello-macy

# 2. Install dependencies
npm install

# 3. Confirm it works
npm run dev
```

Open http://localhost:5173 — you should see the app, but it will fail to
load data because Convex isn't connected yet. That's expected.

---

## Step 2 — Create a Convex account

1. Go to https://convex.dev and sign up (free)
2. You don't need to create a project manually — the CLI does it for you

---

## Step 3 — Connect Convex to your project

In your terminal (inside the hello-macy folder):

```bash
npx convex dev
```

- It will open your browser and ask you to log in to Convex
- Then it will ask: **"Create a new project"** → type a name like `hello-macy`
- It automatically:
  - Creates the project on Convex
  - Generates `convex/_generated/` files
  - Creates a `.env.local` file with your `VITE_CONVEX_URL`
  - Deploys your schema and functions

Leave this terminal running while you develop — it syncs changes live.

Now go back to http://localhost:5173 and the app should be fully working,
with real-time sync across any browser tabs you open.

---

## Step 4 — Push the project to GitHub

```bash
# Inside the hello-macy folder:
git init
git add .
git commit -m "Initial commit"
```

Then:
1. Go to https://github.com/new
2. Create a new repository (name it `hello-macy` or anything you like)
3. Copy the commands GitHub shows you under "push an existing repository"
   — they look like:

```bash
git remote add origin https://github.com/YOUR_USERNAME/hello-macy.git
git branch -M main
git push -u origin main
```

---

## Step 5 — Deploy the Convex backend (production)

```bash
npx convex deploy
```

This pushes your schema and functions to Convex's production environment.
It will print a **production URL** — copy it, you'll need it in Step 7.

The URL looks like: `https://happy-animal-123.convex.cloud`

---

## Step 6 — Create a Cloudflare Pages project

1. Go to https://pages.cloudflare.com and sign up (free)
2. Click **"Create a project"** → **"Connect to Git"**
3. Connect your GitHub account and select the `hello-macy` repository
4. Set these build settings:
   - **Framework preset**: None (or Vite)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Node.js version**: 18 (under "Environment variables" → "NODE_VERSION" = `18`)

---

## Step 7 — Add your Convex URL as an environment variable

Still in the Cloudflare Pages setup (or go to Settings → Environment Variables):

| Variable name      | Value                                      |
|--------------------|--------------------------------------------|
| VITE_CONVEX_URL    | https://happy-animal-123.convex.cloud      |

Use the **production URL** from Step 5, not the development one.

Make sure to add it under **"Production"** environment.

---

## Step 8 — Deploy

Click **"Save and Deploy"** in Cloudflare Pages.

Cloudflare will build and deploy your app. After 1–2 minutes you'll get
a live URL like: `https://hello-macy.pages.dev`

---

## You're live!

- **Your app URL**: `https://hello-macy.pages.dev` (or a custom domain)
- **Real-time sync**: any change one user makes appears instantly for everyone
- **Database**: Convex dashboard at https://dashboard.convex.dev
- **Future updates**: just `git push` and Cloudflare redeploys automatically

---

## Optional — Custom domain

In Cloudflare Pages → your project → **"Custom domains"**:
- Add your domain (e.g. `sop.yourbusiness.com`)
- Cloudflare handles the SSL certificate automatically

---

## Troubleshooting

**App loads but shows spinner forever**
→ Check that `VITE_CONVEX_URL` is set correctly in Cloudflare environment variables
→ Make sure you used the production URL (from `npx convex deploy`), not the dev URL

**Build fails on Cloudflare**
→ Make sure Node.js version is set to 18 in environment variables (NODE_VERSION=18)

**Changes not showing for other users**
→ Confirm `npx convex deploy` ran successfully after your last schema/function changes
