# Button and link audit — single-file app (`index.html`)

_Run 26 Oct 2026, in Chromium (Playwright) at 360 px phone width, with the file opened from disk. Weather, place search and Gemini were mocked at the network layer._

**Method:** every button, link and expandable item was opened in a **fresh page** and clicked, both in the page's first state and after its main action (results shown, draft prepared, card saved). The checks:

| Item | Passes when |
| --- | --- |
| Internal link | It must open an existing page (not "Page not found") |
| Phone link | It must be a valid `tel:` number |
| Email link | It must be a valid `mailto:` address |
| External link | It must open in a new tab |
| Button | It must visibly change the page, or the page must report an error |

**Result:** 91 of 91 work. The first run found one problem, now fixed: **Refresh weather** did nothing visible when the forecast was cached. It now fetches fresh data and confirms with "Checked just now (time)".

Not clickable in a test browser, so checked separately: the CSV file picker (tested by loading files), and phone calls and email (only the link format can be checked).

| Page | State | Item | Result |
| --- | --- | --- | --- |
| Home | initial | Kisaan Saathi, Home | opens / |
| Home | initial | Change language to Hindi | works (page responds) |
| Home | initial | Your location: Rampur, Dehradun, Uttarakhand. Tap to change. | opens /my-farm |
| Home | initial | See full weather | opens /weather |
| Home | initial | What to Grow | opens /grow |
| Home | initial | My FarmYour location and farm details | opens /my-farm |
| Home | initial | WeatherToday and the next 7 days | opens /weather |
| Home | initial | What to GrowCrops that may suit your area and season | opens /grow |
| Home | initial | My SoilSoil test results, moisture and where to test | opens /soil |
| Home | initial | Crop CareFertilizer, pests and diseases | opens /crop-care |
| Home | initial | Government SchemesBenefits you may be able to get | opens /schemes |
| Home | initial | Electricity & WaterSupply information and official contacts | opens /utilities |
| Home | initial | Ask Kisaan SaathiAsk your farming question | opens /ask |
| Home | initial | Call 1800-180-1551 | calls 18001801551 |
| Home | initial | Source: mkisan.gov.in, checked 26 October 2026 | opens mkisan.gov.in (new tab) |
| My Farm | initial | Change location | works (page responds) |
| My Farm | initial | Remove location | works (page responds) |
| My Farm | initial | Save farm details | works (page responds) |
| My Farm | initial | Remove key | works (page responds) |
| Weather | initial | See official IMD warnings | opens mausam.imd.gov.in (new tab) |
| Weather | initial | Weather data by Open-Meteo.com (CC BY 4.0) | opens open-meteo.com (new tab) |
| Weather | initial | Refresh weather | works (page responds) |
| What to Grow | initial | Show crops | works (page responds) |
| What to Grow | after action | Show crops | works (page responds) |
| What to Grow | after action | Ask Kisaan Saathi about Wheat | opens /ask |
| What to Grow | after action | ICAR-CRIDA, Agriculture Contingency Plan for District Dehrad | opens www.icar-crida.res.in (new tab) |
| What to Grow | after action | 01360-224378 | calls 01360224378 |
| What to Grow | after action | kvkdehradun@gmail.com | opens email app |
| Crop Care | initial | Get help | works (page responds) |
| Crop Care | initial | Enter your Soil Health Card in My Soil | opens /soil |
| Crop Care | initial | Soil Health Card portal | opens soilhealth.dac.gov.in (new tab) |
| Crop Care | after action | Get help | works (page responds) |
| Crop Care | after action | ICAR-CRIDA, Agriculture Contingency Plan for District Dehrad | opens www.icar-crida.res.in (new tab) |
| Crop Care | after action | Which crop is it? | works (page responds) |
| Crop Care | after action | Ask | works (page responds) |
| Crop Care | after action | Start a new question | works (page responds) |
| Crop Care | after action | Enter your Soil Health Card in My Soil | opens /soil |
| Crop Care | after action | Soil Health Card portal | opens soilhealth.dac.gov.in (new tab) |
| My Soil | initial | Save and show results | works (page responds) |
| My Soil | initial | Open-Meteo, Open-Meteo weather forecast | opens open-meteo.com (new tab) |
| My Soil | initial | Download my Soil Health Card | opens www.soilhealth.dac.gov.in (new tab) |
| My Soil | initial | Department of Agriculture & Farmers Welfare (NIC), Soil Heal | opens www.soilhealth.dac.gov.in (new tab) |
| My Soil | after action | ICAR-Indian Institute of Soil Science, Harit Dhara 4(1), Soi | opens iiss.res.in (new tab) |
| My Soil | after action | Change values | works (page responds) |
| My Soil | after action | Delete my soil card | works (page responds) |
| My Soil | after action | Open-Meteo, Open-Meteo weather forecast | opens open-meteo.com (new tab) |
| My Soil | after action | Download my Soil Health Card | opens www.soilhealth.dac.gov.in (new tab) |
| My Soil | after action | Department of Agriculture & Farmers Welfare (NIC), Soil Heal | opens www.soilhealth.dac.gov.in (new tab) |
| Schemes | initial | PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)Income support p | works (page responds) |
| Schemes | initial | Open official website | opens pmkisan.gov.in (new tab) |
| Schemes | initial | Press Information Bureau, Government of India, PM-KISAN: fre | opens static.pib.gov.in (new tab) |
| Schemes | initial | Ministry of Agriculture & Farmers Welfare, PM-KISAN official | opens pmkisan.gov.in (new tab) |
| Schemes | initial | PMFBY (Pradhan Mantri Fasal Bima Yojana)Crop insurance for n | works (page responds) |
| Schemes | initial | Open official website | opens pmfby.gov.in (new tab) |
| Schemes | initial | Press Information Bureau, Government of India, PMFBY: freque | opens static.pib.gov.in (new tab) |
| Schemes | initial | Ministry of Agriculture & Farmers Welfare, Pradhan Mantri Fa | opens pmfby.gov.in (new tab) |
| Schemes | initial | Kisan Credit Card — interest support (MISS)Short-term crop l | works (page responds) |
| Schemes | initial | Open official website | opens www.pmindia.gov.in (new tab) |
| Schemes | initial | PMIndia (Prime Minister's Office), Cabinet approves continua | opens www.pmindia.gov.in (new tab) |
| Schemes | initial | Soil Health CardYour farm's soil is tested and you get a car | works (page responds) |
| Schemes | initial | Open official website | opens soilhealth.dac.gov.in (new tab) |
| Schemes | initial | Press Information Bureau, Government of India, Soil Health C | opens static.pib.gov.in (new tab) |
| Schemes | initial | Department of Agriculture & Farmers Welfare, Soil Health Car | opens soilhealth.dac.gov.in (new tab) |
| Electricity & Water | initial | Toll-free complaints: 1912 | calls 1912 |
| Electricity & Water | initial | Customer care email: customercare@upcl.org | opens email app |
| Electricity & Water | initial | UPCL website | opens upcl.uk.gov.in (new tab) |
| Electricity & Water | initial | Uttarakhand Power Corporation Ltd, UPCL — Contact us | opens upcl.uk.gov.in (new tab) |
| Electricity & Water | initial | Toll-free: 1800-180-4100 | calls 18001804100 |
| Electricity & Water | initial | Complaints: 1916 | calls 1916 |
| Electricity & Water | initial | Jal Sansthan website | opens ujs.uk.gov.in (new tab) |
| Electricity & Water | initial | Uttarakhand Jal Sansthan, Uttarakhand Jal Sansthan — Custome | opens ujs.uk.gov.in (new tab) |
| Electricity & Water | initial | Prepare complaint | disabled until form is filled (expected) |
| Electricity & Water | after action | Toll-free complaints: 1912 | calls 1912 |
| Electricity & Water | after action | Customer care email: customercare@upcl.org | opens email app |
| Electricity & Water | after action | UPCL website | opens upcl.uk.gov.in (new tab) |
| Electricity & Water | after action | Uttarakhand Power Corporation Ltd, UPCL — Contact us | opens upcl.uk.gov.in (new tab) |
| Electricity & Water | after action | Toll-free: 1800-180-4100 | calls 18001804100 |
| Electricity & Water | after action | Complaints: 1916 | calls 1916 |
| Electricity & Water | after action | Jal Sansthan website | opens ujs.uk.gov.in (new tab) |
| Electricity & Water | after action | Uttarakhand Jal Sansthan, Uttarakhand Jal Sansthan — Custome | opens ujs.uk.gov.in (new tab) |
| Electricity & Water | after action | Prepare complaint | works (page responds) |
| Electricity & Water | after action | Copy text | works (page responds) |
| Electricity & Water | after action | Open in email app | opens email app |
| Electricity & Water | after action | Call 1912 and read this out | calls 1912 |
| Ask | initial | Ask | works (page responds) |
| Ask | initial | My wheat leaves are turning yellow | works (page responds) |
| Ask | initial | Should I irrigate this week? | works (page responds) |
| Ask | initial | How do I apply for PM-KISAN? | works (page responds) |
| Ask | after action | Which crop is it? | works (page responds) |
| Ask | after action | Ask | works (page responds) |
| Ask | after action | Start a new question | works (page responds) |
