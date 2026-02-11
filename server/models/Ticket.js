const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        index: true
    },
    orderId: { 
        type: String, 
        required: false,
        index: true
    },
    email: { 
        type: String,
        trim: true,
        lowercase: true
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['Late Delivery', 'Missing Item', 'Quality Issue', 'Other'],
        index: true
    },
    details: { 
        type: String,
        required: [true, 'Details are required'],
        trim: true,
        maxlength: [2000, 'Details cannot exceed 2000 characters']
    },
    adminReply: { 
        type: String,
        trim: true,
        maxlength: [2000, 'Admin reply cannot exceed 2000 characters']
    },
    status: {
        type: String,
        enum: ['Open', 'Resolved'],
        default: 'Open',
        index: true
    },
    createdAt: { type: Date, default: Date.now, index: true }
}, {
    timestamps: true
});

// Compound indexes
ticketSchema.index({ userId: 1, createdAt: -1 });
ticketSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Ticket', ticketSchema);
