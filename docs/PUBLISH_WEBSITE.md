# Put Kisaan Saathi online as a real website (free, about 10 minutes)

> **For farmers, publish the server version instead: `docs/DEPLOY_VERCEL.md`.** It keeps your Gemini key on the server, so the assistant works for everyone without anyone pasting a key. This page is for the single-file `index.html`, which is best used as an offline demo.

`index.html` is a complete website by itself. Hosted on a normal HTTPS website, everything works:

- **GPS location:** browsers only allow it on `https://` sites.
- **Weather and place search:** the app calls Open-Meteo directly.
- **The assistant:** off for farmers, who see the Kisan Call Centre number instead. For a demo, a developer can switch it on in their own browser from the footer's "Check the app" page.
- **Phone, email and map links:** open normally.

**Why not the chat preview?** Previews block location, network calls and links, so buttons appear broken there. The app now shows a warning when it's opened that way.

## Option A — GitHub Pages (free, permanent)

1. Create a free account at https://github.com and click **New repository** (for example `kisaan-saathi`). Make it **Public**.
2. Click **Add file → Upload files**, drag in `index.html`, and click **Commit changes**.
3. Go to **Settings → Pages**. Under "Build and deployment", choose **Deploy from a branch**, branch **main**, folder **/(root)**, then **Save**.
4. After a minute or two the page shows your address, e.g. `https://<your-username>.github.io/kisaan-saathi/`. Open it on your phone.
5. To update: upload the new `index.html` the same way. It goes live in a minute or two.

### Adding crop data

To add crop data, upload the `data/` folder made by `npm run crops:build` next to `index.html`. See `docs/CROP_DATA.md`.

## Option B — any static host

Netlify, Cloudflare Pages, or your college's web server all work: upload the single file as `index.html`. No build step or server settings are needed.

## Option C — full server version (for a public launch)

Use the Next.js project: `docs/DEPLOY_VERCEL.md` has the step-by-step guide. It keeps the Gemini key on the server, so users don't need their own, and it runs the daily scheme check.

## After publishing: a 5-minute test on your phone

**Fastest:** open **Check the app** (link at the bottom of any page), tap **Run checks**, then **Test my location now**. Tap **Copy report** and send it to me. Then try the steps below by hand.


1. Choose a language, tap **Use my current location**, and allow it.
2. Open **Weather** and check the temperature against your phone's weather app.
3. **What to Grow** → choose irrigation → **Show crops**.
4. **Ask Kisaan Saathi**: paste your Gemini key when asked, then ask one question in Hindi.
5. **My Soil**: type a few values from a soil card and check the ratings.

If anything fails, send me what you tapped and what you saw, with a screenshot if possible.

## If "Use my current location" doesn't work

The app names the exact reason on screen. The same check is in **Check the app → Test my location now**.

| Message | What to do |
| --- | --- |
| "only works on a secure website" | Open the `https://…github.io/…` link, not the downloaded file or an `http://` address. |
| "blocked inside this preview" | Open the link directly in Chrome, not inside WhatsApp, a file viewer or a chat app. |
| "Location is blocked for this site" | In Chrome, tap the icon at the left of the web address, open **Permissions**, set **Location** to **Allow**, then reload. (Once you tap "Block", Chrome won't ask again.) |
| "Turn on Location in your phone settings" | Pull down the quick settings and turn on **Location**. Then try near a window or outdoors. |
| "took too long" | The app already retries once with GPS for up to 25 seconds. Go outdoors and try again. |

No module, library or key is needed: phones provide location to websites through the browser.
