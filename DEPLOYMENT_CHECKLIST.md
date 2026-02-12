# ✅ Deployment Checklist

Use this checklist to ensure everything is set up correctly for deployment.

## 📋 Pre-Deployment

- [ ] MongoDB Atlas cluster created
- [ ] MongoDB database user created (username & password saved)
- [ ] MongoDB network access configured (allow `0.0.0.0/0`)
- [ ] MongoDB connection string copied and ready
- [ ] Razorpay account created (if using payments)
- [ ] Razorpay API keys obtained
- [ ] GitHub repository is up to date
- [ ] All code is committed and pushed

## 🗄️ MongoDB Atlas Setup

- [ ] Cluster created (Free M0 tier)
- [ ] Database user created with password
- [ ] Network access allows all IPs (`0.0.0.0/0`)
- [ ] Connection string formatted correctly:
  ```
  mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/spice_route?retryWrites=true&w=majority
  ```

## 🖥️ Render Backend Deployment

- [ ] Render account created
- [ ] GitHub repository connected to Render
- [ ] Web service created with:
  - [ ] Name: `healthy-bowl-backend`
  - [ ] Root Directory: `server`
  - [ ] Build Command: `npm install`
  - [ ] Start Command: `npm start`
- [ ] Environment variables set:
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=10000`
  - [ ] `MONGODB_URI` (your Atlas connection string)
  - [ ] `JWT_SECRET` (strong secret, 32+ chars)
  - [ ] `JWT_EXPIRES_IN=7d`
  - [ ] `RAZORPAY_KEY_ID`
  - [ ] `RAZORPAY_KEY_SECRET`
  - [ ] `ALLOWED_ORIGINS` (will update after frontend deploy)
  - [ ] `SOCKET_URL` (your Render backend URL)
- [ ] Backend deployed successfully
- [ ] Backend URL tested (shows API message)
- [ ] Backend URL saved: `https://________________.onrender.com`

## 🎨 Vercel Frontend Deployment

- [ ] Vercel account created
- [ ] GitHub repository connected to Vercel
- [ ] Project created with:
  - [ ] Root Directory: Leave empty (or `client` if needed)
  - [ ] Build Command: `cd client && npm run build`
  - [ ] Output Directory: `client/dist`
- [ ] Environment variables set:
  - [ ] `VITE_API_URL` (your Render backend URL)
  - [ ] `VITE_SOCKET_URL` (your Render backend URL)
- [ ] Frontend deployed successfully
- [ ] Frontend URL tested
- [ ] Frontend URL saved: `https://________________.vercel.app`

## 🔄 Post-Deployment Configuration

- [ ] Updated Render `ALLOWED_ORIGINS` with Vercel frontend URL
- [ ] Triggered Render redeploy (or wait for auto-redeploy)
- [ ] Tested frontend → backend connection
- [ ] Tested user registration
- [ ] Tested user login
- [ ] Tested menu loading
- [ ] Tested order creation
- [ ] Tested payment flow (if applicable)
- [ ] Verified data in MongoDB Atlas

## 🧪 Testing Checklist

### Frontend Tests
- [ ] Homepage loads correctly
- [ ] Menu page displays items
- [ ] Product detail pages work
- [ ] Cart functionality works
- [ ] Checkout page loads
- [ ] Login/Register forms work
- [ ] No console errors

### Backend Tests
- [ ] Health endpoint: `/api/health`
- [ ] Menu endpoint: `/api/menu`
- [ ] Categories endpoint: `/api/categories`
- [ ] Registration endpoint: `/api/auth/register`
- [ ] Login endpoint: `/api/auth/login`
- [ ] Order creation works

### Integration Tests
- [ ] Frontend can fetch menu from backend
- [ ] User can register and login
- [ ] Orders are saved to MongoDB
- [ ] Real-time updates work (Socket.IO)
- [ ] Images load correctly

## 📝 URLs to Save

**Frontend URL:**
```
https://________________.vercel.app
```

**Backend URL:**
```
https://________________.onrender.com
```

**MongoDB Connection String:**
```
mongodb+srv://...
```

## 🎉 Success!

If all items are checked, your application is successfully deployed! 🚀

---

## 🆘 Need Help?

- Check the main [DEPLOYMENT.md](./DEPLOYMENT.md) guide
- Review Render logs: Dashboard → Your Service → Logs
- Review Vercel logs: Dashboard → Your Project → Deployments → View Logs
- Check MongoDB Atlas logs: Database → Metrics
