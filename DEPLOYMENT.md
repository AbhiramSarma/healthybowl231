# 🚀 Deployment Guide

This guide will help you deploy your Healthy Bowl application:
- **Frontend** → Vercel
- **Backend** → Render
- **Database** → MongoDB Atlas

---

## 📋 Prerequisites

1. **GitHub Account** (for connecting repositories)
2. **Vercel Account** (sign up at [vercel.com](https://vercel.com))
3. **Render Account** (sign up at [render.com](https://render.com))
4. **MongoDB Atlas Account** (sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas))

---

## 🗄️ Step 1: Set Up MongoDB Atlas

### 1.1 Create MongoDB Atlas Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up or log in
3. Click **"Create"** → **"Build a Database"**
4. Choose **FREE** tier (M0)
5. Select your preferred cloud provider and region
6. Click **"Create"**

### 1.2 Configure Database Access

1. Go to **"Database Access"** in the left sidebar
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication
4. Create a username and strong password (save these!)
5. Set user privileges to **"Atlas Admin"** (or read/write to any database)
6. Click **"Add User"**

### 1.3 Configure Network Access

1. Go to **"Network Access"** in the left sidebar
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (or add specific IPs)
   - For Render: `0.0.0.0/0` (allows all IPs)
4. Click **"Confirm"**

### 1.4 Get Connection String

1. Go to **"Database"** → Click **"Connect"** on your cluster
2. Choose **"Connect your application"**
3. Copy the connection string (looks like):
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<username>` and `<password>` with your database user credentials
5. Add your database name at the end:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/spice_route?retryWrites=true&w=majority
   ```
6. **Save this connection string** - you'll need it for Render!

---

## 🖥️ Step 2: Deploy Backend to Render

### 2.1 Connect Repository to Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account if not already connected
4. Select your repository (`healthybowl231`)
5. Click **"Connect"**

### 2.2 Configure Web Service

1. **Name**: `healthy-bowl-backend` (or your preferred name)
2. **Environment**: `Node`
3. **Region**: Choose closest to your users
4. **Branch**: `main` (or your default branch)
5. **Root Directory**: `server` (important!)
6. **Build Command**: `npm install` (or leave empty - Render will auto-detect)
7. **Start Command**: `npm start`
8. **Plan**: Choose **Free** (or paid if needed)

### 2.3 Set Environment Variables

Click **"Environment"** and add these variables:

```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/spice_route?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long-change-this
JWT_EXPIRES_IN=7d
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app
SOCKET_URL=https://your-backend-name.onrender.com
```

**Important Notes:**
- Replace `MONGODB_URI` with your actual MongoDB Atlas connection string
- Generate a strong `JWT_SECRET` (minimum 32 characters)
- Add your Razorpay credentials (get from [Razorpay Dashboard](https://dashboard.razorpay.com))
- For `ALLOWED_ORIGINS`, you'll update this after deploying frontend
- For `SOCKET_URL`, use your Render service URL (e.g., `https://healthy-bowl-backend.onrender.com`)

### 2.4 Deploy

1. Click **"Create Web Service"**
2. Render will start building and deploying
3. Wait for deployment to complete (usually 2-5 minutes)
4. Copy your service URL (e.g., `https://healthy-bowl-backend.onrender.com`)

### 2.5 Test Backend

Visit your backend URL:
```
https://your-backend-name.onrender.com
```

You should see:
```json
{
  "message": "Healthy Bowl API is Running 🔥",
  "version": "1.0.0",
  "environment": "production"
}
```

---

## 🎨 Step 3: Deploy Frontend to Vercel

### 3.1 Connect Repository to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository (`healthybowl231`)
4. Click **"Import"**

### 3.2 Configure Project Settings

1. **Framework Preset**: Vercel should auto-detect Vite
2. **Root Directory**: Leave empty (or set to `client` if needed)
3. **Build Command**: `cd client && npm run build`
4. **Output Directory**: `client/dist`
5. **Install Command**: `cd client && npm install`

**Note**: The `vercel.json` file should handle this automatically, but verify these settings.

### 3.3 Set Environment Variables

Click **"Environment Variables"** and add:

```
VITE_API_URL=https://your-backend-name.onrender.com
VITE_SOCKET_URL=https://your-backend-name.onrender.com
```

**Important:**
- Replace `your-backend-name.onrender.com` with your actual Render backend URL
- Do NOT include trailing slashes

### 3.4 Deploy

1. Click **"Deploy"**
2. Vercel will build and deploy your frontend
3. Wait for deployment to complete (usually 1-3 minutes)
4. Copy your frontend URL (e.g., `https://healthy-bowl-231.vercel.app`)

### 3.5 Update Backend CORS Settings

Go back to Render and update the `ALLOWED_ORIGINS` environment variable:

```
ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app
```

Then trigger a new deployment in Render (or it will auto-redeploy).

---

## ✅ Step 4: Verify Deployment

### 4.1 Test Frontend

1. Visit your Vercel URL
2. Check browser console for any errors
3. Try logging in/registering
4. Test menu loading
5. Test checkout flow

### 4.2 Test Backend API

Test these endpoints:
- `GET https://your-backend.onrender.com/api/health`
- `GET https://your-backend.onrender.com/api/menu`
- `GET https://your-backend.onrender.com/api/categories`

### 4.3 Test Database Connection

1. Make a test order or registration
2. Check MongoDB Atlas → **"Collections"** to see if data is being saved

---

## 🔧 Troubleshooting

### Backend Issues

**Problem**: Backend won't start
- **Solution**: Check Render logs for errors
- Verify all environment variables are set correctly
- Ensure MongoDB connection string is correct

**Problem**: CORS errors
- **Solution**: Update `ALLOWED_ORIGINS` in Render to include your Vercel URL
- Ensure no trailing slashes in URLs

**Problem**: MongoDB connection fails
- **Solution**: 
  - Verify Network Access allows `0.0.0.0/0`
  - Check username/password in connection string
  - Ensure database name is included in URI

### Frontend Issues

**Problem**: API calls fail
- **Solution**: 
  - Verify `VITE_API_URL` is set correctly in Vercel
  - Check browser console for CORS errors
  - Ensure backend is running

**Problem**: Build fails
- **Solution**: 
  - Check Vercel build logs
  - Ensure all dependencies are in `package.json`
  - Verify Node.js version compatibility

**Problem**: Images not loading
- **Solution**: 
  - Check if images are in the `public` folder
  - Verify image paths in code
  - For menu images, ensure backend static file serving is working

---

## 🔄 Updating Your Deployment

### Automatic Deployments

Both Vercel and Render automatically deploy when you push to your main branch:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

### Manual Redeploy

- **Vercel**: Go to project → Deployments → Click "..." → Redeploy
- **Render**: Go to service → Manual Deploy → Deploy latest commit

---

## 📝 Environment Variables Summary

### Backend (Render)
```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN=7d
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
ALLOWED_ORIGINS=https://your-frontend.vercel.app
SOCKET_URL=https://your-backend.onrender.com
```

### Frontend (Vercel)
```
VITE_API_URL=https://your-backend.onrender.com
VITE_SOCKET_URL=https://your-backend.onrender.com
```

---

## 🎉 You're Done!

Your application should now be live:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-backend.onrender.com`
- **Database**: MongoDB Atlas

Share your frontend URL with users and start taking orders! 🚀

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com)
- [Razorpay Integration Guide](https://razorpay.com/docs/payments/server-integration/nodejs/payment-gateway/build-integration/)
