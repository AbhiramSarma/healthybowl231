/**
 * Input Validation Middleware
 * Schema-based validation, required fields, length limits, enum validation
 */

const { body, param, query, validationResult } = require('express-validator');

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const requestId = req.headers['x-request-id'] || 'unknown';
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Invalid input data',
      errors: errors.array(),
      requestId,
    });
  }
  next();
};

// Common validation rules
const commonRules = {
  phone: body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .custom((value) => {
      // Remove common formatting characters
      const cleaned = value.replace(/[\s\-+()]/g, '');
      if (!/^[0-9]{10,15}$/.test(cleaned)) {
        throw new Error('Phone number must be between 10 and 15 digits');
      }
      return true;
    }),
  
  password: body('password')
    .trim()
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  
  name: body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  
  email: body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  address: body('address')
    .trim()
    .notEmpty().withMessage('Address is required')
    .isLength({ min: 10, max: 500 }).withMessage('Address must be between 10 and 500 characters'),
  
  mongoId: param('id')
    .isMongoId().withMessage('Invalid ID format'),
  
  amount: body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  
  category: body('category')
    .trim()
    .notEmpty().withMessage('Category is required')
    .isLength({ min: 1, max: 50 }).withMessage('Category must be between 1 and 50 characters'),
  
  status: body('status')
    .isIn(['received', 'preparing', 'out_for_delivery', 'delivered', 'Open', 'Resolved'])
    .withMessage('Invalid status value'),
};

// Validation chains
const validators = {
  register: [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    commonRules.phone,
    commonRules.password,
    commonRules.email,
    body('address').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 500 }).withMessage('Address cannot exceed 500 characters'),
    // Normalize phone number after validation
    body('phone').customSanitizer((value) => {
      if (!value) return value;
      return value.replace(/[\s\-+()]/g, '');
    }),
    handleValidationErrors,
  ],
  
  login: [
    commonRules.phone,
    commonRules.password,
    // Normalize phone number after validation
    body('phone').customSanitizer((value) => {
      if (!value) return value;
      return value.replace(/[\s\-+()]/g, '');
    }),
    handleValidationErrors,
  ],
  
  createOrder: [
    body('customer.name').trim().notEmpty().withMessage('Customer name is required').isLength({ min: 2, max: 100 }).withMessage('Customer name must be between 2 and 100 characters'),
    body('customer.phone').trim().notEmpty().withMessage('Customer phone is required').isLength({ min: 10, max: 15 }).withMessage('Phone must be between 10 and 15 digits'),
    body('customer.address').trim().notEmpty().withMessage('Customer address is required').isLength({ min: 10, max: 500 }).withMessage('Address must be between 10 and 500 characters'),
    body('items').isArray({ min: 1 }).withMessage('Items array is required and must contain at least one item'),
    body('items.*.id').optional().notEmpty().withMessage('Item ID is required'),
    body('items.*.name').trim().notEmpty().withMessage('Item name is required'),
    body('items.*.price').isFloat({ min: 0 }).withMessage('Item price must be a positive number'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Item quantity must be at least 1'),
    body('totalAmount').isFloat({ min: 0.01 }).withMessage('Total amount must be a positive number'),
    body('paymentMethod').optional().isIn(['UPI', 'COD', 'Card']).withMessage('Invalid payment method'),
    handleValidationErrors,
  ],
  
  createCategory: [
    body('name')
      .trim()
      .notEmpty().withMessage('Category name is required')
      .isLength({ min: 1, max: 50 }).withMessage('Category name must be between 1 and 50 characters'),
    handleValidationErrors,
  ],
  
  updateCategory: [
    commonRules.mongoId,
    body('name').optional().trim().isLength({ min: 1, max: 50 }),
    body('displayOrder').optional().isInt({ min: 0 }),
    body('isActive').optional().isBoolean(),
    handleValidationErrors,
  ],
  
  createMenuItem: [
    body('id').trim().notEmpty().withMessage('Item ID is required'),
    body('name').trim().notEmpty().withMessage('Item name is required').isLength({ min: 1, max: 200 }).withMessage('Name must be between 1 and 200 characters'),
    body('price').custom((value) => {
      if (value === null || value === undefined || value === '') {
        // Price can be empty if priceOptions are provided
        return true;
      }
      const num = Number(value);
      if (isNaN(num) || num < 0) {
        throw new Error('Price must be a positive number');
      }
      return true;
    }),
    body('category').trim().notEmpty().withMessage('Category is required').isLength({ min: 1, max: 50 }).withMessage('Category must be between 1 and 50 characters'),
    body('description').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
    body('image').optional({ nullable: true, checkFalsy: true }).custom((value) => {
      if (!value || value === '') return true; // Empty string is allowed
      if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/'))) {
        return true;
      }
      throw new Error('Image must be a valid URL or path');
    }),
    body('isAvailable').optional().isBoolean().withMessage('isAvailable must be a boolean'),
    body('isVegetarian').optional().isBoolean().withMessage('isVegetarian must be a boolean'),
    body('isFeatured').optional().isBoolean().withMessage('isFeatured must be a boolean'),
    body('salesCount').optional().isInt({ min: 0 }).withMessage('salesCount must be a non-negative integer'),
    body('priceOptions').optional().isArray().withMessage('priceOptions must be an array'),
    body('priceOptions.*.label').optional().trim().notEmpty().withMessage('Price option label is required'),
    body('priceOptions.*.price').optional().isFloat({ min: 0 }).withMessage('Price option price must be a positive number'),
    body('priceOptions.*.isDefault').optional().isBoolean().withMessage('isDefault must be a boolean'),
    body('productInfo').optional().isObject().withMessage('productInfo must be an object'),
    body('productInfo.fullDescription').optional({ nullable: true }).trim().isLength({ max: 2000 }).withMessage('Full description cannot exceed 2000 characters'),
    body('productInfo.ingredients').optional().isArray().withMessage('Ingredients must be an array'),
    body('productInfo.healthBenefits').optional({ nullable: true }).trim().isLength({ max: 1000 }).withMessage('Health benefits cannot exceed 1000 characters'),
    body('productInfo.storage').optional({ nullable: true }).trim().isLength({ max: 500 }).withMessage('Storage cannot exceed 500 characters'),
    body('productInfo.nutritionalFacts').optional().isObject().withMessage('nutritionalFacts must be an object'),
    // Custom validation: either price or priceOptions must be provided
    body().custom((value) => {
      const hasPrice = value.price !== null && value.price !== undefined && value.price !== '' && Number(value.price) >= 0;
      const hasPriceOptions = Array.isArray(value.priceOptions) && value.priceOptions.length > 0 && 
        value.priceOptions.some(opt => opt && opt.price !== null && opt.price !== undefined && opt.price !== '' && Number(opt.price) >= 0);
      if (!hasPrice && !hasPriceOptions) {
        throw new Error('Either price or at least one price option with price must be provided');
      }
      return true;
    }),
    handleValidationErrors,
  ],
  
  updateOrderStatus: [
    commonRules.mongoId,
    commonRules.status,
    handleValidationErrors,
  ],
  
  mongoIdParam: [
    commonRules.mongoId,
    handleValidationErrors,
  ],
  
  createTicket: [
    body('category').trim().notEmpty().withMessage('Category is required').isIn(['Late Delivery', 'Missing Item', 'Quality Issue', 'Other']).withMessage('Invalid category'),
    body('details').trim().notEmpty().withMessage('Details are required').isLength({ min: 10, max: 2000 }).withMessage('Details must be between 10 and 2000 characters'),
    body('orderId').optional({ nullable: true }).trim(),
    body('phone').optional({ nullable: true }).trim().isLength({ min: 10, max: 15 }).withMessage('Phone must be between 10 and 15 digits'),
    body('userId').optional({ nullable: true }).isMongoId().withMessage('Invalid user ID format'),
    handleValidationErrors,
  ],
  
  updateTicket: [
    commonRules.mongoId,
    body('status').optional().isIn(['Open', 'Resolved']).withMessage('Invalid status'),
    body('adminReply').optional({ nullable: true }).trim().isLength({ max: 2000 }).withMessage('Admin reply cannot exceed 2000 characters'),
    handleValidationErrors,
  ],
  
  verifyPayment: [
    body('razorpay_order_id').trim().notEmpty().withMessage('Razorpay order ID is required'),
    body('razorpay_payment_id').trim().notEmpty().withMessage('Razorpay payment ID is required'),
    body('razorpay_signature').trim().notEmpty().withMessage('Razorpay signature is required'),
    body('orderDetails').isObject().withMessage('Order details are required'),
    body('orderDetails.customer').isObject().withMessage('Customer details are required'),
    body('orderDetails.customer.name').trim().notEmpty().withMessage('Customer name is required'),
    body('orderDetails.customer.phone').trim().notEmpty().withMessage('Customer phone is required'),
    body('orderDetails.customer.address').trim().notEmpty().withMessage('Customer address is required'),
    body('orderDetails.items').isArray({ min: 1 }).withMessage('Items array is required'),
    body('orderDetails.totalAmount').isFloat({ min: 0.01 }).withMessage('Total amount must be a positive number'),
    handleValidationErrors,
  ],
  
  createPaymentOrder: [
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
    handleValidationErrors,
  ],
};

module.exports = {
  validators,
  handleValidationErrors,
  commonRules,
};
