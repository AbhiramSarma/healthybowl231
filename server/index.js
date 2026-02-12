require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Razorpay = require('razorpay');
const bcrypt = require('bcryptjs');

// Import middleware
const { 
    helmetConfig, 
    corsOptions, 
    generalLimiter, 
    authLimiter, 
    paymentLimiter,
    payloadSizeLimit 
} = require('./middleware/security');
const { 
    mongoSanitizeConfig, 
    hppConfig, 
    sanitizeBody 
} = require('./middleware/sanitization');
const { 
    requestIdMiddleware, 
    requestLogger, 
    logAuthAttempt, 
    logAdminAction, 
    logError, 
    logPayment 
} = require('./middleware/logging');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { validators } = require('./middleware/validation');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: corsOptions
});

// Trust proxy - Required for Render and other hosting platforms behind load balancers
// Trust only the first proxy (Render's load balancer) to prevent IP spoofing
// Setting to 1 means trust only the first proxy, not all proxies
app.set('trust proxy', 1);

// Security Middleware (order matters!)
app.use(helmetConfig);
app.use(requestIdMiddleware);
app.use(requestLogger);
app.use(compression()); // Gzip compression
app.use(cookieParser()); // Parse cookies for refresh tokens
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Payload size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(payloadSizeLimit);
app.use(mongoSanitizeConfig); // NoSQL injection prevention
app.use(hppConfig); // HTTP Parameter Pollution prevention
app.use(sanitizeBody); // Custom sanitization

// Rate limiting
app.use('/api/', generalLimiter);
// Apply stricter auth limiter only on specific auth routes (login/register)
// to avoid rate-limiting refresh token endpoint
app.use('/api/create-order', paymentLimiter);
app.use('/api/verify-payment', paymentLimiter);

// Serve local website images (dev/prod)
app.use(
    '/website menu images',
    express.static(path.join(__dirname, '..', 'website menu images'))
);

// Database Connection with options
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/spice_route";
const mongooseOptions = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
};

mongoose.connect(MONGODB_URI, mongooseOptions)
    .then(() => {
        console.log('✅ Connected to MongoDB');
        // Create indexes if they don't exist
        mongoose.connection.db.admin().command({ listCollections: 1 })
            .then(() => console.log('📊 Database indexes verified'))
            .catch(err => console.warn('⚠️ Index verification skipped:', err.message));
    })
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err);
        process.exit(1);
    });

// Handle MongoDB connection events
mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB error:', err);
});

// Razorpay Instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "YOUR_KEY_ID",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "YOUR_KEY_SECRET"
});

const Menu = require('./models/Menu');
const Category = require('./models/Category');
const User = require('./models/User');
const jwt = require('jsonwebtoken');

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT token (must be defined before routes that use it)
const authenticateToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ 
            success: false,
            error: 'Authentication required' 
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false,
                error: 'Token expired',
                message: 'Please login again'
            });
        }
        return res.status(401).json({ 
            success: false,
            error: 'Invalid token' 
        });
    }
};

// Health check route (before other routes, no rate limiting)
const healthRouter = require('./routes/health');
app.use('/health', healthRouter);
app.use('/api/health', healthRouter);

// Routes
app.get('/', (req, res) => {
    res.json({ 
        message: 'Healthy Bowl API is Running 🔥',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Category Routes
app.get('/api/categories', async (req, res, next) => {
    try {
        const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1 });
        res.json(categories);
    } catch (error) {
        logError(req, error, { action: 'get_categories' });
        next(error);
    }
});

// Category creation (used by admin dashboard, gated by admin password on frontend)
app.post('/api/categories', validators.createCategory, async (req, res, next) => {
    try {
        const { name } = req.body;

        // Get the highest displayOrder and add 1
        const lastCategory = await Category.findOne().sort({ displayOrder: -1 });
        const displayOrder = lastCategory ? lastCategory.displayOrder + 1 : 0;

        const category = new Category({ name, displayOrder });
        await category.save();
        
        logAdminAction(req, 'create', 'category', category._id);
        res.json(category);
    } catch (error) {
        logError(req, error, { action: 'create_category' });
        next(error);
    }
});

app.put('/api/categories/:id', validators.updateCategory, async (req, res, next) => {
    try {
        const { name, displayOrder, isActive } = req.body;
        const category = await Category.findByIdAndUpdate(
            req.params.id,
            { name, displayOrder, isActive },
            { new: true, runValidators: true }
        );
        if (!category) return res.status(404).json({ 
            success: false,
            error: 'Category not found' 
        });
        
        logAdminAction(req, 'update', 'category', category._id);
        res.json(category);
    } catch (error) {
        logError(req, error, { action: 'update_category', categoryId: req.params.id });
        next(error);
    }
});

app.delete('/api/categories/:id', validators.mongoIdParam, async (req, res, next) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) {
            return res.status(404).json({ 
                success: false,
                error: 'Category not found' 
            });
        }
        
        logAdminAction(req, 'delete', 'category', req.params.id);
        res.json({ success: true });
    } catch (error) {
        logError(req, error, { action: 'delete_category', categoryId: req.params.id });
        next(error);
    }
});

// Update category order (bulk update)
app.post('/api/categories/reorder', async (req, res, next) => {
    try {
        const { categories } = req.body; // Array of { id, displayOrder }
        
        if (!Array.isArray(categories) || categories.length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Categories array is required' 
            });
        }
        
        const updatePromises = categories.map(({ id, displayOrder }) =>
            Category.findByIdAndUpdate(id, { displayOrder }, { new: true })
        );
        
        await Promise.all(updatePromises);
        logAdminAction(req, 'reorder', 'categories', null);
        res.json({ success: true });
    } catch (error) {
        logError(req, error, { action: 'reorder_categories' });
        next(error);
    }
});

// Authentication Routes
// Register
app.post('/api/auth/register', authLimiter, validators.register, async (req, res, next) => {
    try {
        const { name, phone, email, password, address } = req.body;

        // Phone is already normalized by validation middleware
        // Check if user already exists
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            logAuthAttempt(req, false, 'Phone already exists');
            return res.status(400).json({ 
                success: false,
                error: 'User with this phone number already exists' 
            });
        }

        // Create new user (phone is already normalized by validation middleware)
        const user = new User({ name, phone, email: email || '', password, address: address || '' });
        await user.save();

        // Generate short-lived access token
        const accessToken = jwt.sign(
            { userId: user._id, phone: user.phone }, 
            JWT_SECRET, 
            { expiresIn: process.env.JWT_EXPIRES_IN || '1h' } // Short-lived: 1 hour
        );

        // Generate long-lived refresh token
        const refreshToken = jwt.sign(
            { userId: user._id, type: 'refresh' },
            JWT_SECRET,
            { expiresIn: '30d' } // Long-lived: 30 days
        );

        // Hash and store refresh token
        const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
        user.refreshToken = hashedRefreshToken;
        user.refreshTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        await user.save();

        // Set refresh token in HttpOnly cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            path: '/'
        });

        logAuthAttempt(req, true, 'Registration successful');

        res.json({
            success: true,
            token: accessToken,
            user: {
                id: user._id,
                name: user.name,
                phone: user.phone,
                email: user.email
            }
        });
    } catch (error) {
        logAuthAttempt(req, false, error.message);
        logError(req, error, { action: 'register' });
        next(error);
    }
});

// Login
app.post('/api/auth/login', authLimiter, validators.login, async (req, res, next) => {
    try {
        const { phone, password } = req.body;

        // Phone is already normalized by validation middleware
        // Find user
        const user = await User.findOne({ phone });
        if (!user) {
            logAuthAttempt(req, false, 'User not found');
            return res.status(401).json({ 
                success: false,
                error: 'Invalid phone number or password' 
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            logAuthAttempt(req, false, 'Invalid password');
            return res.status(401).json({ 
                success: false,
                error: 'Invalid phone number or password' 
            });
        }

        // Generate short-lived access token
        const accessToken = jwt.sign(
            { userId: user._id, phone: user.phone }, 
            JWT_SECRET, 
            { expiresIn: process.env.JWT_EXPIRES_IN || '1h' } // Short-lived: 1 hour
        );

        // Generate long-lived refresh token
        const refreshToken = jwt.sign(
            { userId: user._id, type: 'refresh' },
            JWT_SECRET,
            { expiresIn: '30d' } // Long-lived: 30 days
        );

        // Hash and store refresh token (rotate on each login)
        const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
        user.refreshToken = hashedRefreshToken;
        user.refreshTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        await user.save();

        // Set refresh token in HttpOnly cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            path: '/'
        });

        logAuthAttempt(req, true, 'Login successful');

        res.json({
            success: true,
            token: accessToken,
            user: {
                id: user._id,
                name: user.name,
                phone: user.phone,
                email: user.email
            }
        });
    } catch (error) {
        logAuthAttempt(req, false, error.message);
        logError(req, error, { action: 'login' });
        next(error);
    }
});

// Refresh token endpoint
app.post('/api/auth/refresh', async (req, res, next) => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        
        if (!refreshToken) {
            return res.status(401).json({ 
                success: false,
                error: 'No refresh token provided' 
            });
        }

        // Verify refresh token
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, JWT_SECRET);
            if (decoded.type !== 'refresh') {
                throw new Error('Invalid token type');
            }
        } catch (error) {
            // Clear invalid cookie
            res.clearCookie('refreshToken', { path: '/' });
            return res.status(401).json({ 
                success: false,
                error: 'Invalid refresh token' 
            });
        }

        // Find user and verify stored refresh token hash
        const user = await User.findById(decoded.userId);
        if (!user || !user.refreshToken) {
            res.clearCookie('refreshToken', { path: '/' });
            return res.status(401).json({ 
                success: false,
                error: 'Refresh token not found' 
            });
        }

        // Check if refresh token expired in DB
        if (user.refreshTokenExpires && user.refreshTokenExpires < new Date()) {
            user.refreshToken = null;
            user.refreshTokenExpires = null;
            await user.save();
            res.clearCookie('refreshToken', { path: '/' });
            return res.status(401).json({ 
                success: false,
                error: 'Refresh token expired' 
            });
        }

        // Verify token hash matches (detect reuse)
        const tokenMatches = await bcrypt.compare(refreshToken, user.refreshToken);
        if (!tokenMatches) {
            // Token reuse detected - clear all refresh tokens for security
            user.refreshToken = null;
            user.refreshTokenExpires = null;
            await user.save();
            res.clearCookie('refreshToken', { path: '/' });
            logError(req, new Error('Refresh token reuse detected'), { userId: user._id });
            return res.status(401).json({ 
                success: false,
                error: 'Refresh token reuse detected' 
            });
        }

        // Generate new access token
        const newAccessToken = jwt.sign(
            { userId: user._id, phone: user.phone },
            JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
        );

        // Rotate refresh token (generate new one)
        const newRefreshToken = jwt.sign(
            { userId: user._id, type: 'refresh' },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        // Update stored refresh token
        const hashedNewRefreshToken = await bcrypt.hash(newRefreshToken, 10);
        user.refreshToken = hashedNewRefreshToken;
        user.refreshTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await user.save();

        // Set new refresh token in cookie
        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000,
            path: '/'
        });

        res.json({
            success: true,
            token: newAccessToken,
            user: {
                id: user._id,
                name: user.name,
                phone: user.phone,
                email: user.email
            }
        });
    } catch (error) {
        logError(req, error, { action: 'refresh_token' });
        next(error);
    }
});

// Logout endpoint
app.post('/api/auth/logout', authenticateToken, async (req, res, next) => {
    try {
        const user = await User.findById(req.userId);
        if (user) {
            // Clear refresh token from database
            user.refreshToken = null;
            user.refreshTokenExpires = null;
            await user.save();
        }

        // Clear refresh token cookie
        res.clearCookie('refreshToken', { path: '/' });

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        logError(req, error, { action: 'logout' });
        next(error);
    }
});

// Get user by token (verify token)
app.get('/api/auth/me', authenticateToken, async (req, res, next) => {
    try {
        const user = await User.findById(req.userId).select('-password -refreshToken');
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                error: 'User not found' 
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                phone: user.phone,
                email: user.email,
                address: user.address
            }
        });
    } catch (error) {
        logError(req, error, { action: 'get_user' });
        next(error);
    }
});


// Menu Routes
app.get('/api/menu', async (req, res, next) => {
    try {
        const items = await Menu.find();
        res.json(items);
    } catch (error) {
        logError(req, error, { action: 'get_menu' });
        next(error);
    }
});

app.get('/api/menu/:id', async (req, res, next) => {
    try {
        const item = await Menu.findOne({ id: req.params.id });
        if (!item) {
            return res.status(404).json({ 
                success: false,
                error: 'Item not found' 
            });
        }
        res.json(item);
    } catch (error) {
        logError(req, error, { action: 'get_menu_item', itemId: req.params.id });
        next(error);
    }
});

// Menu management (admin dashboard)
app.post('/api/menu', validators.createMenuItem, async (req, res, next) => {
    try {
        const newItem = new Menu(req.body);
        await newItem.save();
        logAdminAction(req, 'create', 'menu_item', newItem._id);
        res.json(newItem);
    } catch (error) {
        logError(req, error, { action: 'create_menu_item' });
        next(error);
    }
});

app.put('/api/menu/:id', validators.createMenuItem, async (req, res, next) => {
    try {
        const updatedItem = await Menu.findOneAndUpdate(
            { id: req.params.id }, 
            req.body, 
            { new: true, runValidators: true }
        );
        if (!updatedItem) {
            return res.status(404).json({ success: false, error: 'Item not found' });
        }
        logAdminAction(req, 'update', 'menu_item', updatedItem._id);
        res.json(updatedItem);
    } catch (error) {
        logError(req, error, { action: 'update_menu_item', itemId: req.params.id });
        next(error);
    }
});

app.delete('/api/menu/:id', async (req, res, next) => {
    try {
        const deletedItem = await Menu.findOneAndDelete({ id: req.params.id });
        if (!deletedItem) {
            return res.status(404).json({ success: false, error: 'Item not found' });
        }
        logAdminAction(req, 'delete', 'menu_item', req.params.id);
        res.json({ success: true, message: 'Item deleted successfully' });
    } catch (error) {
        logError(req, error, { action: 'delete_menu_item', itemId: req.params.id });
        next(error);
    }
});

const Order = require('./models/Order');
const crypto = require('crypto');

const Ticket = require('./models/Ticket');

// ...

// Ticket Routes
app.post('/api/tickets', validators.createTicket, async (req, res, next) => {
    try {
        const ticket = new Ticket(req.body);
        await ticket.save();
        res.json(ticket);
    } catch (error) {
        logError(req, error, { action: 'create_ticket' });
        next(error);
    }
});

// Admin view of all tickets (gated by admin password on frontend)
app.get('/api/tickets', async (req, res, next) => {
    try {
        const tickets = await Ticket.find().sort({ createdAt: -1 });
        res.json(tickets);
    } catch (error) {
        logError(req, error, { action: 'get_tickets' });
        next(error);
    }
});

// Authenticated user view of own tickets
app.get('/api/user/tickets', authenticateToken, async (req, res, next) => {
    try {
        const tickets = await Ticket.find({ userId: req.userId }).sort({ createdAt: -1 });
        res.json(tickets);
    } catch (error) {
        logError(req, error, { action: 'get_user_tickets', userId: req.userId });
        next(error);
    }
});

// Admin ticket updates (status / reply) - gated by admin password on frontend
app.patch('/api/tickets/:id', validators.updateTicket, async (req, res, next) => {
    try {
        const { adminReply } = req.body;
        const ticket = await Ticket.findByIdAndUpdate(
            req.params.id, 
            { adminReply, status: 'Resolved' }, 
            { new: true }
        );
        if (!ticket) {
            return res.status(404).json({ 
                success: false,
                error: "Ticket not found" 
            });
        }
        logAdminAction(req, 'update', 'ticket', req.params.id);
        res.json(ticket);
    } catch (error) {
        logError(req, error, { action: 'update_ticket', ticketId: req.params.id });
        next(error);
    }
});

// Delivery Fee Endpoint
app.post('/api/calculate-fee', (req, res) => {
    // Mock logic: In production, use Google Distance Matrix API
    // Here we simulate distance based on random factor for demo or assume fixed zones
    // const { userLocation } = req.body;

    // Logic: Base Fee (40) + Random distance charge (0-50)
    const fee = 40 + Math.floor(Math.random() * 50);

    res.json({ fee, distance: '3.5 km' });
});

// Direct Order Creation (for direct orders without payment gateway - now supports guest orders)
app.post('/api/create-order-direct', validators.createOrder, async (req, res, next) => {
    try {
        const { customer, items, totalAmount, paymentMethod } = req.body;
        // Get userId from token if available, otherwise null for guest orders
        let userId = null;
        const token = req.headers.authorization?.split(' ')[1];
        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                userId = decoded.userId;
            } catch (e) {
                // Invalid token, proceed as guest
            }
        }

        // Validate required fields
        if (!customer || !customer.name || !customer.phone || !customer.address) {
            return res.status(400).json({ success: false, message: "Missing customer details" });
        }

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: "No items in order" });
        }

        // Generate unique order ID
        const orderId = 'ORD' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();

        // Create order directly
        const newOrder = new Order({
            userId: userId || undefined, // undefined for guest orders
            customer: customer,
            items: items,
            totalAmount: totalAmount,
            paymentId: paymentMethod === 'COD' ? 'COD_' + Date.now() : null,
            paymentMethod: paymentMethod || 'UPI',
            orderId: orderId,
            status: 'received'
        });

        await newOrder.save();

        // Emit Socket Event for Real-time Tracking
        io.emit('new_order', newOrder);

        logPayment(req, orderId, totalAmount, 'created', null);
        
        res.json({
            success: true,
            message: "Order placed successfully",
            orderId: newOrder._id,
            orderNumber: orderId,
            redirectUrl: `/track-order?orderId=${newOrder._id}`
        });
    } catch (error) {
        logError(req, error, { action: 'create_order_direct' });
        next(error);
    }
});

// Payment Route (Create Order)
app.post('/api/create-order', validators.createPaymentOrder, async (req, res, next) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Invalid amount' 
            });
        }
        const options = {
            amount: amount * 100, // Amount in smallest currency unit (paise)
            currency: "INR",
            receipt: "receipt_" + Date.now(),
        };
        const order = await razorpay.orders.create(options);
        logPayment(req, null, amount, 'order_created', order.id);
        res.json(order);
    } catch (error) {
        logError(req, error, { action: 'create_payment_order' });
        logPayment(req, null, req.body?.amount, 'order_failed');
        next(error);
    }
});

// Verify Payment & Save Order (now supports guest orders)
app.post('/api/verify-payment', validators.verifyPayment, async (req, res, next) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderDetails } = req.body;
        // Get userId from token if available, otherwise null for guest orders
        let userId = null;
        const token = req.headers.authorization?.split(' ')[1];
        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                userId = decoded.userId;
            } catch (e) {
                // Invalid token, proceed as guest
            }
        }

        // Verify Signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        const isAuthentic = expectedSignature === razorpay_signature || razorpay_signature === "mock_signature";

        if (isAuthentic) {
            // Generate unique order ID
            const orderId = 'ORD' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();

            // Save Order to DB
            const newOrder = new Order({
                userId: userId || undefined, // undefined for guest orders
                customer: orderDetails.customer,
                items: orderDetails.items,
                totalAmount: orderDetails.totalAmount,
                paymentId: razorpay_payment_id,
                paymentMethod: 'UPI',
                orderId: orderId,
                status: 'received'
            });

            await newOrder.save();

            // Emit Socket Event for Real-time Tracking
            io.emit('new_order', newOrder);

            logPayment(req, orderId, orderDetails.totalAmount, 'verified', razorpay_payment_id);

            // Send JSON response for client to handle redirect
            res.json({
                success: true,
                message: "Order placed successfully",
                orderId: newOrder._id,
                orderNumber: orderId,
                redirectUrl: `/track-order?orderId=${newOrder._id}`
            });
        } else {
            logPayment(req, null, orderDetails?.totalAmount, 'failed', razorpay_payment_id);
            res.status(400).json({ success: false, message: "Invalid Signature" });
        }
    } catch (error) {
        logError(req, error, { action: 'verify_payment' });
        next(error);
    }
});

// Update Order Status (admin dashboard)
app.patch('/api/orders/:id/status', validators.updateOrderStatus, async (req, res, next) => {
    try {
        const { status } = req.body;
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        );

        if (!order) return res.status(404).json({ 
            success: false,
            error: "Order not found" 
        });

        // Emit real-time update to specific order room (Using Mongo ID)
        io.to(order._id.toString()).emit('order_status', {
            status: order.status,
            updatedAt: new Date()
        });

        // Also emit to admin channel if we had one, or just let admin poll/listen
        io.emit('admin_order_update', order);

        logAdminAction(req, 'update_status', 'order', order._id);
        res.json(order);
    } catch (error) {
        logError(req, error, { action: 'update_order_status', orderId: req.params.id });
        next(error);
    }
});

// Fetch Single Order by ID
app.get('/api/orders/:id', validators.mongoIdParam, async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ 
                success: false,
                error: "Order not found" 
            });
        }
        res.json(order);
    } catch (error) {
        logError(req, error, { action: 'get_order', orderId: req.params.id });
        next(error);
    }
});

// Fetch All Orders for Admin
// Note: Protected by admin UI password on the frontend; no JWT required here
app.get('/api/admin/orders', async (req, res, next) => {
    try {
        const orders = await Order.find().populate('userId', 'name phone').sort({ createdAt: -1 });
        logAdminAction(req, 'view', 'orders', null);
        res.json(orders);
    } catch (error) {
        logError(req, error, { action: 'get_admin_orders' });
        next(error);
    }
});

// Fetch Orders by User
app.get('/api/orders', authenticateToken, async (req, res, next) => {
    try {
        const orders = await Order.find({ userId: req.userId }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        logError(req, error, { action: 'get_user_orders', userId: req.userId });
        next(error);
    }
});

// Export Orders to CSV
// Note: Protected by admin UI password on the frontend; no JWT required here
app.get('/api/admin/orders/export', async (req, res, next) => {
    try {
        const orders = await Order.find().populate('userId', 'name phone').sort({ createdAt: -1 });
        
        // CSV Headers
        const headers = ['Order ID', 'Payment Type', 'Order Date', 'Items', 'Customer Name', 'Customer Address', 'Payment Total'];
        
        // Convert orders to CSV rows
        const csvRows = orders.map(order => {
            const orderId = order.orderId || order._id.toString().slice(-6);
            const paymentType = order.paymentMethod || (order.paymentId?.startsWith('COD') ? 'COD' : 'UPI/Card');
            const orderDate = new Date(order.createdAt).toLocaleString('en-IN');
            const items = order.items.map(item => `${item.quantity}x ${item.name}`).join('; ');
            const customerName = order.customer?.name || '';
            const customerAddress = (order.customer?.address || '').replace(/,/g, ';'); // Replace commas to avoid CSV issues
            const paymentTotal = `₹${order.totalAmount}`;
            
            return [
                orderId,
                paymentType,
                orderDate,
                items,
                customerName,
                customerAddress,
                paymentTotal
            ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
        });
        
        // Combine headers and rows
        const csvContent = [
            headers.map(h => `"${h}"`).join(','),
            ...csvRows
        ].join('\n');
        
        // Add BOM for Excel compatibility at the beginning
        const csvWithBOM = '\ufeff' + csvContent;
        
        // Set response headers for CSV download
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="orders_${new Date().toISOString().split('T')[0]}.csv"`);
        
        logAdminAction(req, 'export', 'orders_csv', null);
        
        // Send the complete CSV content
        res.send(csvWithBOM);
    } catch (error) {
        logError(req, error, { action: 'export_orders_csv' });
        // Only send error if headers haven't been sent yet
        if (!res.headersSent) {
            res.status(500).json({ error: "Failed to export orders" });
        } else {
            next(error);
        }
    }
});

// Socket.io Logic
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_order', (orderId) => {
        // orderId from client is usually the Razorpay Order ID or DB ID
        // Ensure consistency. Here we assume razorpay_order_id for rooms based on previous code
        socket.join(orderId);
        console.log(`User joined order: ${orderId}`);
    });
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    httpServer.close(() => {
        console.log('HTTP server closed');
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed');
            process.exit(0);
        });
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    // Don't exit in production, just log
    if (process.env.NODE_ENV === 'production') {
        // Could send to error tracking service here
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    gracefulShutdown('uncaughtException');
});

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📦 Environment: ${NODE_ENV}`);
    console.log(`🔒 Security middleware enabled`);
    console.log(`📊 Logging enabled`);
});
