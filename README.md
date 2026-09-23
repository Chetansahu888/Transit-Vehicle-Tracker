# Vendor Material & Vehicle Tracking Dashboard

A multi-firm, real-time Material Inward & Vehicle Transit MIS web application built with **React (Vite)**, **Tailwind CSS**, and **Google Sheets / Drive** backend via **Google Apps Script**.

Supports firms: **PMMPL**, **RKL**, and **PURAB**.

---

## Features

- **Multi-Firm Management**: Seamless switching between `ALL`, `PMMPL`, `RKL`, and `PURAB` records.
- **Google Sheets Database**: Auto-creates tabs per firm with headers, locks concurrent writes, and auto-highlights rows whose status is "Has reached" or "Material has reached" with yellow (`#FFFF00`).
- **Google Drive Storage**: Files (PDFs, JPGs, PNGs up to 10MB) uploaded via base64, saved to `Vendor Invoices/<FIRM>`, renamed to `<InvoiceNo>_<VendorName>`, and shared with public view links.
- **Analytics Dashboard**: Real-time KPI counters, status breakdown bar charts, material share pie charts, top vendor rankings (powered by Recharts), and recent entries feed.
- **Indian Vehicle Number Validation**: Real-time uppercase formatting, space removal, and regex format check with non-blocking guidance.
- **Duplicate Invoice Prevention**: Warns if the same invoice number already exists for the selected firm.
- **Firm-wise Report & Exports**:
  - Filter by firm, status, vendor, material, and date range.
  - Global search by invoice, vendor, material, vehicle no, and remark.
  - **Export to Excel (`.xlsx`)** with formatted columns.
  - **Export to PDF (`.pdf`)** with branded header, timestamps, and page numbers.
- **Cross-Firm Invoice Lookup**: Direct invoice search with embedded PDF / Image viewer modal and Google Drive integration.
- **Live Sync & Zero-Setup Demo Mode**: 60-second auto-refresh countdown, manual refresh button, and a built-in localStorage fallback allowing instant interactive testing before connecting the Google backend.

---

## Step-by-Step Setup Guide

### Step 1: Prepare Google Drive & Google Sheet
1. Open your [Google Drive](https://drive.google.com).
2. Create or open your target Google Spreadsheet (e.g., named **Vendor Material & Vehicle Tracking**).
3. *(Optional)* You do not need to manually create the tabs or headers; the Apps Script will automatically generate tabs for `PMMPL`, `RKL`, and `PURAB` with formatted headers when initialized.

---

### Step 2: Deploy Google Apps Script (`Code.gs`)
1. In your Google Spreadsheet, click **Extensions** &rarr; **Apps Script** in the top menu.
2. In the Apps Script code editor, delete any existing code.
3. Open the file [`apps-script/Code.gs`](file:///c:/Antigravity%20apps/Transit%20Vehicle%20Update/apps-script/Code.gs) from this project repository and copy its entire contents.
4. Paste the code into the Apps Script editor.
5. Click the **Save** floppy disk icon (or press `Ctrl + S`).
6. Click the blue **Deploy** button (top-right) &rarr; select **New deployment**.
7. In the modal that appears:
   - Click the gear icon next to "Select type" and choose **Web app**.
   - **Description**: `Vehicle Tracking API v1`
   - **Execute as**: `Me (your google account)`
   - **Who has access**: `Anyone` *(Crucial: enables the frontend to submit data without OAuth popups)*
8. Click **Deploy**.
9. If prompted for permissions:
   - Click **Authorize access**.
   - Choose your Google account.
   - Click **Advanced** &rarr; **Go to Untitled project (unsafe)** &rarr; **Allow**.
10. Copy the generated **Web app URL** (format: `https://script.google.com/macros/s/AKfycb.../exec`).

---

### Step 3: Configure Environment Variables
1. In the project root directory, locate the `.env` file (or copy `.env.example` to `.env`).
2. Paste your Apps Script Web App URL:
   ```env
   VITE_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
   ```
3. Save the `.env` file.

> **Note**: If `VITE_SCRIPT_URL` is left empty or not yet deployed, the web application automatically runs in **Interactive Demo Mode**, storing mock data in your browser's `localStorage` so you can test all features immediately.

---

### Step 4: Run Locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the local development server:
   ```bash
   npm run dev
   ```
3. Open your browser to `http://localhost:5173`.

---

### Step 5: Deploy to Vercel
1. Push this project to your GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Vendor Material & Vehicle Tracking Dashboard"
   git branch -M main
   git remote add origin <YOUR_GITHUB_REPO_URL>
   git push -u origin main
   ```
2. Go to [Vercel Dashboard](https://vercel.com) and click **Add New...** &rarr; **Project**.
3. Import your GitHub repository.
4. Under **Environment Variables**, add:
   - **Key**: `VITE_SCRIPT_URL`
   - **Value**: Your Google Apps Script Web App URL from Step 2.
5. Click **Deploy**. Vercel will build and assign you a global production URL (e.g., `https://transit-vehicle-update.vercel.app`).

---

## Project Structure

```text
├── apps-script/
│   └── Code.gs                  # Google Apps Script backend (GET, POST, Drive & Sheets)
├── src/
│   ├── api/
│   │   └── sheetApi.js          # API service for Sheets & local storage fallback
│   ├── components/
│   │   ├── AttachmentPreviewModal.jsx # PDF & Image viewer modal
│   │   ├── DataTable.jsx        # Data table with pagination, edit, & delete
│   │   ├── EntryForm.jsx        # Material inward form with vehicle validation
│   │   ├── Header.jsx           # App header, connection badge & refresh counter
│   │   ├── KpiCard.jsx          # KPI metric cards
│   │   ├── Sidebar.jsx          # Collapsible responsive sidebar navigation
│   │   ├── StatusBadge.jsx      # Colored status badges
│   │   └── Toast.jsx            # Notification toast system
│   ├── context/
│   │   └── DataContext.jsx      # Central application state & 60s auto-refresh
│   ├── pages/
│   │   ├── AddEntry.jsx         # Inward entry creation page
│   │   ├── Dashboard.jsx        # KPI cards, Recharts visualizations, recent list
│   │   ├── InvoiceSearch.jsx    # Cross-firm invoice search with file preview
│   │   └── Reports.jsx          # Filterable report table with XLSX & PDF export
│   ├── utils/
│   │   └── exportUtils.js       # Excel (.xlsx) and PDF (.pdf) generator
│   ├── constants.js             # Firms, vehicle statuses, and demo dataset
│   ├── App.jsx                  # React Router configuration
│   ├── index.css                # Tailwind directives & styles
│   └── main.jsx                 # React root DOM entry
├── .env                         # Environment variables (VITE_SCRIPT_URL)
├── .env.example                 # Template for environment configuration
├── package.json                 # Project dependencies & scripts
├── tailwind.config.js           # Tailwind theme customization
└── vite.config.js               # Vite configuration
```

---

## Sheet Column Mapping

| Column Index | Column Header | Description |
|:---:|:---|:---|
| A | `Sl.no` | Auto-incremented serial number per firm |
| B | `Invoice No.` | Vendor tax invoice / challan number |
| C | `Vendor Name` | Supplier / Vendor entity name |
| D | `Material` | Material description & specifications |
| E | `Vehicle status` | Gate status (`Has reached` highlights row yellow) |
| F | `Vehicle no.` | Normalized uppercase registration no. (e.g. `GJ25U9491`) |
| G | `Remark` | Notes, gate slip no., driver contact |
| H | `Attachment Link` | Google Drive public view link |
| I | `Attachment Name` | Formatted file name (`<Invoice>_<Vendor>.<ext>`) |
| J | `Firm` | `PMMPL`, `RKL`, or `PURAB` |
| K | `Created At` | Timestamp of initial inward logging |
| L | `Updated At` | Timestamp of last modification |

---

## License
MIT. Internal corporate use for firm logistics and procurement tracking.
