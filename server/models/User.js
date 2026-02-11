const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    phone: { 
        type: String, 
        required: [true, 'Phone is required'],
        unique: true,
        trim: true,
        match: [/^[0-9]{10,15}$/, 'Phone must be 10-15 digits']
    },
    email: { 
        type: String, 
        default: '',
        trim: true,
        lowercase: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format']
    },
    password: { 
        type: String, 
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters']
    },
    address: { 
        type: String, 
        default: '',
        trim: true,
        maxlength: [500, 'Address cannot exceed 500 characters']
    },
    refreshToken: {
        type: String,
        default: null
    },
    refreshTokenExpires: {
        type: Date,
        default: null
    },
    createdAt: { type: Date, default: Date.now }
}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});

// Indexes for performance
// Note: phone index is automatically created by unique: true
userSchema.index({ email: 1 });
userSchema.index({ refreshToken: 1 });
userSchema.index({ createdAt: -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
