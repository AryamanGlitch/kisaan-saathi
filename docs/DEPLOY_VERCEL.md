# Put Kisaan Saathi online for farmers (Vercel, free, about 20 minutes)

This publishes the **server version**. Farmers open one link. They never see an API key: your Gemini key is stored once in Vercel's settings and stays on the server.

Everything in the code is ready. These steps need your accounts, so only you can do them.

## What you need

- A GitHub account (github.com) and a Vercel account (vercel.com, "Continue with GitHub"). Both are free.
- Your Gemini API key from https://aistudio.google.com/apikey.
- An email address to put in the map service's User-Agent (OpenStreetMap's usage policy requires a contact).

## 1. Put the code on GitHub

In the project folder:

```bash
git init
git add .
git commit -m "Kisaan Saathi"
```

**Check before pushing.** `git status` should not list `soil-dataset.csv`, `node_modules`, `.next` or `.env.local`; they are in `.gitignore`. The upload is about 960 files and 27 MB, and every file is under 300 KB.

**Create the repository and push.**
1. On github.com, click **New repository**, name it `kisaan-saathi`, and leave it empty: no README.
2. Run the two commands GitHub shows under "…or push an existing repository". They start with `git remote add origin`.

**Private or public** both work with Vercel.

## 2. Import it into Vercel

1. Go to vercel.com → **Add New… → Project**.
2. Pick the `kisaan-saathi` repository and click **Import**.
3. The defaults are right:
   - **Framework:** Next.js.
   - **Build command:** `next build`.
   - **Node.js version:** 22.x or newer.
4. **Before clicking Deploy,** open **Environment Variables** and add the variables below.

| Name | Value | Needed for |
| --- | --- | --- |
| `GEMINI_API_KEY` | your key | The assistant (Ask, and Crop Care help) |
| `NOMINATIM_USER_AGENT` | `KisaanSaathi/1.0 (contact: you@example.com)` with your real email | Village search and GPS place names. Districts work without it. |

Optional, for the daily check of government scheme pages:

| Name | Value |
| --- | --- |
| `DATABASE_URL` | A PostgreSQL connection string. Vercel → Storage → Postgres (e.g. Neon) creates one. Then run `npm run db:migrate` once from your computer with the same value in `.env.local`. |
| `CRON_SECRET` | 16 or more random characters |

Without the optional two, schemes still show. They just say "automatic checking is not active" instead of a check date.

**Never** put the key in any file in the repository, and never give a variable a name starting with `NEXT_PUBLIC_`: that would send it to every visitor's browser.

5. Click **Deploy**. After about a minute you get a link like `https://kisaan-saathi.vercel.app`.

## 3. Check it (on your phone)

1. Open the link and choose a language.
2. **Use my current location:** the browser asks for permission. GPS only works on `https://`, which Vercel provides.
3. Type a location instead: choose any state and district (for example Goa → North Goa) and save. The location bar should update.
4. **Weather** shows today's forecast.
5. **My Soil → Soil tests in your area** shows your district's soil test results.
6. **Ask Kisaan Saathi:** ask a question. If it says the assistant is not switched on, check `GEMINI_API_KEY` in Vercel → Settings → Environment Variables. Then go to **Deployments → ⋯ → Redeploy**: variables only apply to new deployments.

## Updating the website

Change the code, then `git add .`, `git commit -m "…"`, `git push`. Vercel rebuilds and publishes automatically in about a minute.

## Limits to know

- **Gemini:** the free tier has daily limits. The app already limits each person to 6 questions a minute and the whole server to 60 a minute.
- **Map search (public Nominatim):** about 1 request per second for the whole app. Fine for a pilot; use your own instance for heavy traffic.
- **Weather (Open-Meteo):** free for non-commercial use only.
- **The single-file `index.html`** (GitHub Pages) is now an offline demo. Its assistant is off for farmers; a developer can switch it on in their own browser from the footer's "Check the app" page.
