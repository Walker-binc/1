# Sales Digital Business Card System

English-facing prototype for an Australian sales team. It includes:

- A homepage for 20-50 sales representatives
- Product-category filtering on the homepage
- Dedicated sales profile pages such as `/amelia-clarke`
- Click-to-call and click-to-email actions
- A lightweight admin page for editing profile details, product categories, and page modules
- Printable QR business cards in `business-cards/`

## Run Locally

```bash
npm install
npm run build
npm run serve
```

Open [http://localhost:4173](http://localhost:4173).

## GitHub + Render Deployment

This project is ready to deploy on Render as a Node web service.

### Option A: Use `render.yaml`

After pushing this folder to GitHub, create a new Render Blueprint or Web Service from the repository.

Render configuration:

- Environment: `Node`
- Build command: `npm install && npm run build`
- Start command: `npm run serve`

### Option B: Manual Render Setup

If you create the service manually in Render, use:

```text
Build Command: npm install && npm run build
Start Command: npm run serve
```

Render will assign a public domain like:

```text
https://your-service-name.onrender.com
```

## Deployment Notes

- The admin page writes shared sales data to `data/people.json` through `/api/people`.
- For short-term demos and testing, this is fine.
- For a long-term production system, data should move to a database instead of local JSON storage.

QR codes stay fixed to each clean URL, for example:

```text
https://your-service-name.onrender.com/amelia-clarke
```

If a phone number, email, title, or portrait changes later, update the profile in the admin page. The printed QR code remains valid because the URL does not change.

## Regenerate QR Business Cards

Set the public base URL and run:

```bash
CARD_BASE_URL="https://your-service-name.onrender.com" npm run cards
```

On Windows PowerShell:

```powershell
$env:CARD_BASE_URL="https://your-service-name.onrender.com"
npm run cards
```

The generated SVG cards are saved in `business-cards/`.
