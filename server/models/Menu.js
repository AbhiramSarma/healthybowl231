const mongoose = require('mongoose');

const priceOptionSchema = new mongoose.Schema({
    label: { type: String, required: true },   // e.g. "250g", "500g", "1 Kg"
    unit: { type: String, default: 'g' },      // g, kg, piece, etc.
    price: { type: Number, required: true },
    quantity: { type: Number },                // e.g. 250, 500, 1000
    isDefault: { type: Boolean, default: false }
}, { _id: false });

const menuSchema = new mongoose.Schema({
    id: { 
        type: String, 
        required: [true, 'Item ID is required'],
        unique: true,
        index: true,
        trim: true
    },
    name: { 
        type: String, 
        required: [true, 'Item name is required'],
        trim: true,
        minlength: [1, 'Name must be at least 1 character'],
        maxlength: [200, 'Name cannot exceed 200 characters'],
        index: true
    },
    description: { 
        type: String, 
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    price: { 
        type: Number, 
        required: [true, 'Price is required'],
        min: [0, 'Price must be positive']
    },
    category: { 
        type: String, 
        required: [true, 'Category is required'],
        trim: true,
        index: true
    },
    image: { 
        type: String, 
        trim: true
    },
    isAvailable: { 
        type: Boolean, 
        default: true,
        index: true
    },
    isVegetarian: { 
        type: Boolean, 
        default: true,
        index: true
    },
    isFeatured: { 
        type: Boolean, 
        default: false,
        index: true
    },
    salesCount: { 
        type: Number, 
        default: 0,
        min: [0, 'Sales count cannot be negative'],
        index: true
    },
    createdAt: { type: Date, default: Date.now, index: true },
    priceOptions: [priceOptionSchema],
    productInfo: {
        fullDescription: { type: String, maxlength: [2000, 'Full description cannot exceed 2000 characters'] },
        ingredients: [String],
        nutritionalFacts: mongoose.Schema.Types.Mixed,
        healthBenefits: { type: String, maxlength: [1000, 'Health benefits cannot exceed 1000 characters'] },
        storage: { type: String, maxlength: [500, 'Storage instructions cannot exceed 500 characters'] }
    }
}, {
    timestamps: true
});

// Compound indexes for common queries
menuSchema.index({ category: 1, isAvailable: 1 });
menuSchema.index({ isFeatured: 1, isAvailable: 1 });
menuSchema.index({ salesCount: -1 });

module.exports = mongoose.model('Menu', menuSchema);
