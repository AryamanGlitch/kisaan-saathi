# Putting your crop dataset (1.1 GB) on the website

The big file never goes to GitHub. You convert it once on your computer into small per-state files (a few KB each), and upload only those.

## 1. Check your file's columns

The converter needs at least **state**, **district** and **crop** columns. It also uses **year**, **season** and **area** if present. Column names are matched loosely, so all of these work:
- the government layout `State_Name, District_Name, Crop_Year, Season, Crop, Area, Production` (DES / data.gov.in)
- variations like `State`, `District`, `Year`, `Crop`, `Area (ha)`

The file must be **CSV**. If it's Excel, open it and use Save As → CSV.

## 2. Convert it (about a minute for 1.1 GB)

You need Node.js 22.18+ installed. In the project folder:

```bash
npm run crops:build -- "C:\path\to\your-dataset.csv" --source "Crop statistics, <website>, downloaded <month year>" --out data/crops
```

- **`--source`** is shown to farmers under the crop list, so write where the data came from and when you downloaded it.
- **The output** is `data/crops/<state>.json` for each state (e.g. `uttarakhand.json`) plus `index.json`.
- **Speed:** a 17.7 MB / 300,000-row test file converted in about 1 second. 1.1 GB should take about a minute and little memory, because the file is streamed.

## 3. Upload

- **GitHub Pages (single file):** put the `data` folder **next to `index.html`** in your repository, so the paths are `index.html` and `data/crops/uttarakhand.json`. Upload the folder in the browser or with GitHub Desktop; every file is far below 25 MB.
- **Server version:** put the files in `public/data/crops/`.

## 4. What farmers see

On What to Grow and the dashboard, **"Crops grown in <district>"** lists the district's crops, largest area first, with your `--source` text and the latest year.

Crop menus (What to Grow, Crop Care, My Farm) then show only crops grown in that district. When the district isn't in the file (or the farmer hasn't set one), they show the crops grown anywhere in the **state** ("Grown in <state>"). **"Other crop"** reveals the full list, so a missing minor crop never blocks anyone.

The crop names in the DES statistics (Jowar, Bajra, Arhar/Tur, Cotton(lint), Coconut, …) are all in the app's crop list (`lib/crops/catalog.ts`). Only the "Other …" totals are left out.

Where no data exists for a district, the app says so and offers all crops. It doesn't guess.

## Notes

- **Production statistics show what farmers in the district grow, not a guarantee that a crop will succeed.** The app labels it that way.
- **Opened from disk, the app can't read `data/`,** because browsers block local file access. It works once the site is on GitHub Pages or any web server.
- **District names in your file are matched to the app's district list,** ignoring case and spelling variants. If a district doesn't show up, send me how your file spells it.
