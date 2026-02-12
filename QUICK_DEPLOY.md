# ⚡ Quick Deploy Guide

**TL;DR**: Follow these steps to deploy in ~15 minutes.

## 1️⃣ MongoDB Atlas (5 min)

1. Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create FREE cluster (M0)
3. Database Access → Add user (save username/password)
4. Network Access → Allow `0.0.0.0/0`
5. Database → Connect → Copy connection string
6. Format: `mongodb+srv://user:pass@cluster.mongodb.net/spice_route?retryWrites=true&w=majority`

## 2️⃣ Render Backend (5 min)

1. Sign up at [render.com](https://render.com)
2. New → Web Service → Connect GitHub → Select repo
3. Settings:
   - **Root Directory**: `server`
   - **Build**: `npm install` (or leave empty)
   - **Start**: `npm start`
4. Environment Variables:
   ```
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=<your-atlas-connection-string>
   JWT_SECRET=<generate-strong-32-char-secret>
   JWT_EXPIRES_IN=7d
   RAZORPAY_KEY_ID=<your-key>
   RAZORPAY_KEY_SECRET=<your-secret>
   ALLOWED_ORIGINS=<will-update-after-frontend>
   SOCKET_URL=<your-render-url>
   ```
5. Deploy → Copy URL: `https://your-backend.onrender.com`

## 3️⃣ Vercel Frontend (5 min)

1. Sign up at [vercel.com](https://vercel.com)
2. Add New Project → Import GitHub repo
3. Settings:
   - **Root Directory**: Leave empty (or `client`)
   - **Build**: `cd client && npm run build`
   - **Output**: `client/dist`
4. Environment Variables:
   ```
   VITE_API_URL=https://your-backend.onrender.com
   VITE_SOCKET_URL=https://your-backend.onrender.com
   ```
5. Deploy → Copy URL: `https://your-app.vercel.app`

## 4️⃣ Final Step

1. Go back to Render
2. Update `ALLOWED_ORIGINS` = `https://your-app.vercel.app`
3. Redeploy Render service

## ✅ Done!

Your app is live:
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-backend.onrender.com`

---

**Need detailed instructions?** See [DEPLOYMENT.md](./DEPLOYMENT.md)
