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
    .isLength({ min: 10, max: 15 }).withMessage('Phone number must be between 10 and 15 digits')
    .matches(/^[0-9]+$/).withMessage('Phone number must contain only digits'),
  
  password: body('password')
    .trim()
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  
  name: body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Name contains invalid characters'),
  
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
    commonRules.name,
    commonRules.phone,
    commonRules.password,
    commonRules.email,
    body('address').optional().trim().isLength({ max: 500 }),
    handleValidationErrors,
  ],
  
  login: [
    commonRules.phone,
    commonRules.password,
    handleValidationErrors,
  ],
  
  createOrder: [
    body('customer.name').trim().notEmpty().isLength({ min: 2, max: 100 }),
    body('customer.phone').trim().notEmpty().isLength({ min: 10, max: 15 }),
    body('customer.address').trim().notEmpty().isLength({ min: 10, max: 500 }),
    body('items').isArray({ min: 1 }).withMessage('Items array is required'),
    body('items.*.id').notEmpty().withMessage('Item ID is required'),
    body('items.*.name').trim().notEmpty().withMessage('Item name is required'),
    body('items.*.price').isFloat({ min: 0 }).withMessage('Item price must be a positive number'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Item quantity must be at least 1'),
    body('totalAmount').isFloat({ min: 0.01 }).withMessage('Total amount must be a positive number'),
    handleValidationErrors,
  ],
  
  createCategory: [
    commonRules.category,
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
    body('name').trim().notEmpty().isLength({ min: 1, max: 200 }),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    commonRules.category,
    body('description').optional().trim().isLength({ max: 1000 }),
    body('image').optional().trim().isURL().withMessage('Image must be a valid URL'),
    body('isAvailable').optional().isBoolean(),
    body('isVegetarian').optional().isBoolean(),
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
};

module.exports = {
  validators,
  handleValidationErrors,
  commonRules,
};
