const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'Category name is required'],
        unique: true,
        trim: true,
        minlength: [1, 'Category name must be at least 1 character'],
        maxlength: [50, 'Category name cannot exceed 50 characters'],
        index: true
    },
    displayOrder: { 
        type: Number, 
        required: true, 
        default: 0,
        min: [0, 'Display order must be non-negative']
    },
    isActive: { 
        type: Boolean, 
        default: true,
        index: true
    },
    createdAt: { type: Date, default: Date.now, index: true }
}, {
    timestamps: true
});

// Index for sorting
categorySchema.index({ displayOrder: 1, isActive: 1 });

module.exports = mongoose.model('Category', categorySchema);
