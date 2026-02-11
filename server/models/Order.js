const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: false,
        index: true
    }, // Optional for guest orders
    customer: {
        name: { 
            type: String, 
            required: [true, 'Customer name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters'],
            maxlength: [100, 'Name cannot exceed 100 characters']
        },
        phone: { 
            type: String, 
            required: [true, 'Customer phone is required'],
            trim: true,
            match: [/^[0-9]{10,15}$/, 'Phone must be 10-15 digits']
        },
        address: { 
            type: String, 
            required: [true, 'Customer address is required'],
            trim: true,
            minlength: [10, 'Address must be at least 10 characters'],
            maxlength: [500, 'Address cannot exceed 500 characters']
        }
    },
    items: [
        {
            id: { type: String, required: true },
            name: { type: String, required: true },
            price: { type: Number, required: true, min: [0, 'Price must be positive'] },
            quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
            cookingRequests: { type: Object, default: {} },
            noGarlic: { type: Boolean, default: false },
            noOnion: { type: Boolean, default: false },
            customInstructions: { type: String, default: '', maxlength: [500, 'Instructions cannot exceed 500 characters'] }
        }
    ],
    totalAmount: { 
        type: Number, 
        required: [true, 'Total amount is required'],
        min: [0.01, 'Total amount must be positive']
    },
    paymentId: { type: String, index: true }, // Razorpay Payment ID
    orderId: { type: String, unique: true, index: true },   // Razorpay Order ID or custom order ID
    paymentMethod: { 
        type: String, 
        default: 'UPI',
        enum: ['UPI', 'Card', 'COD'],
        index: true
    },
    status: {
        type: String,
        enum: ['received', 'preparing', 'out_for_delivery', 'delivered'],
        default: 'received',
        index: true
    },
    createdAt: { type: Date, default: Date.now, index: true }
}, {
    timestamps: true
});

// Compound indexes for common queries
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'customer.phone': 1 });

module.exports = mongoose.model('Order', orderSchema);
