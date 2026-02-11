## Healthy Bowl – How to Run and Use

### 1. Prerequisites

- **Node.js**: v18+ (recommended) installed on your system  
- **npm**: comes with Node.js  
- **MongoDB**: local instance or a MongoDB Atlas connection string  

---

### 2. Install Dependencies

From the project root (`kal_website`):

```bash
npm run install-all
```

This will install:
- Root dev tools (`concurrently`)
- Frontend dependencies (`client/`)
- Backend dependencies (`server/`)

---

### 3. Configure Environment Variables

#### Backend (`server/.env`)

Copy the example file and adjust values:

```bash
cd server
cp .env.example .env
```

Set at least:
- `MONGODB_URI` – your MongoDB connection string  
- `JWT_SECRET` – a long random secret (32+ chars)  
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` – (real or test keys)  
- `ALLOWED_ORIGINS` – frontend URLs (e.g. `http://localhost:5173`)  

#### Frontend (`client/.env`)

```bash
cd ../client
cp .env.example .env
```

Usually you can leave `VITE_API_URL` empty for local dev (Vite proxy will send `/api` to `http://localhost:5000`).

---

### 4. Start the App in Development

From the **project root**:

```bash
npm run dev
```

You should see output similar to:

```text
> healthy-bowl-monorepo@1.0.0 dev
> concurrently "npm run start --prefix server" "npm run dev --prefix client"

> healthy-bowl-server@1.0.0 start
> node index.js

> healthy-bowl-client@0.0.0 dev
> vite

  VITE v7.x.x  ready in XXX ms
  ➜  Local:   http://localhost:5173/
```

- **Frontend**: `http://localhost:5173/`  
- **Backend API**: `http://localhost:5000/`  
- **Health check**: `http://localhost:5000/health`  

If MongoDB is configured correctly you’ll see:

```text
✅ Connected to MongoDB
🚀 Server running on port 5000
```

---

### 5. Building for Production

From the root:

```bash
npm run build
```

This runs the Vite production build and outputs static assets to `client/dist`.

You can preview the production build with:

```bash
cd client
npm run preview
```

Then open the URL printed in the terminal (usually `http://localhost:4173`).

---

### 6. Admin Dashboard & CSV Export

1. Start the app (`npm run dev`).  
2. Open the site at `http://localhost:5173/`.  
3. Login as an admin (depending on your seed logic / manual user setup).  
4. Visit `/admin/dashboard` from the navbar or manually.  
5. In the **Orders** tab, use the **“Download CSV”** button to download all orders as a CSV file.

The CSV contains:
- Order ID  
- Payment type  
- Order date  
- Items (e.g. `2x Butter Chicken; 1x Naan`)  
- Customer name  
- Customer address  
- Payment total  

---

### 7. Common Issues

- **Server crashes immediately**  
  - Check `server/.env` (valid `MONGODB_URI`, `JWT_SECRET`).  
  - Make sure MongoDB is running / Atlas URI is reachable.

- **Frontend shows “Network error / proxy error”**  
  - Ensure backend is running on port **5000**.  
  - Confirm Vite proxy in `client/vite.config.js` points to `http://localhost:5000`.

- **Cannot download CSV**  
  - Ensure you are on the **Admin Dashboard → Orders** tab.  
  - Make sure backend is running and `/api/admin/orders/export` returns a file (check Network tab in devtools).

---

### 8. Production Notes

- Run **only the production build** in real deployments.  
- Put the backend behind **HTTPS** (reverse proxy or managed platform).  
- Use **MongoDB Atlas** with automated backups and IP whitelisting.  
- Keep all secrets only in environment variables (never commit `.env` files).

