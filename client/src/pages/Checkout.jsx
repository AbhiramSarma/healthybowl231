import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '../features/cart/cartStore';
import { useAuthStore } from '../features/auth/authStore';
import { useNavigate } from 'react-router-dom';
import { Smartphone, MapPin, User, Phone, Trash2, ChevronRight, Banknote, Upload } from 'lucide-react';
import { cn } from '../lib/utils';
import apiUrl from '../lib/apiUrl';

export default function Checkout() {
    const { items, total, clearCart, removeItem, updateQuantity } = useCartStore();
    const { isAuthenticated, token, user, verifyToken } = useAuthStore();
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Cart Items, 2: Delivery Details, 3: Payment
    const [form, setForm] = useState({ name: '', phone: '', address: '' });
    const [errors, setErrors] = useState({});
    const [paymentMethod, setPaymentMethod] = useState('UPI');
    const [loading, setLoading] = useState(false);
    const [deliveryFee, setDeliveryFee] = useState(40);
    const [paymentScreenshot, setPaymentScreenshot] = useState(null);

    useEffect(() => {
        // Fetch dynamic delivery fee
        fetch(apiUrl('/api/calculate-fee'), { method: 'POST' })
            .then(res => res.json())
            .then(data => setDeliveryFee(data.fee))
            .catch(err => console.error(err));
    }, []);

    // Pre-fill form with user data when user is available and on delivery step
    useEffect(() => {
        if (user && step >= 2) {
            setForm(prev => ({
                ...prev,
                name: user.name || prev.name,
                phone: user.phone || prev.phone,
                address: user.address || prev.address
            }));
        }
    }, [user, step]);

    const validateForm = () => {
        const err = {};
        const name = (form.name || '').trim();
        const phone = (form.phone || '').replace(/\D/g, '');
        const address = (form.address || '').trim();
        if (!name || name.length < 2) err.name = 'Name must be at least 2 characters';
        if (!phone || phone.length < 10) err.phone = 'Enter a valid 10-digit phone number';
        if (!address || address.length < 10) err.address = 'Address must be at least 10 characters';
        setErrors(err);
        return Object.keys(err).length === 0;
    };

    const handleNextStep = () => {
        // Allow guest checkout - no authentication required
        if (step === 2) {
            if (!validateForm()) return;
        }
        setStep(step + 1);
    };

    // Handle UPI payment with screenshot upload
    const handlePayment = async () => {
        if (!validateForm()) return;

        if (!paymentScreenshot) {
            alert("Please upload your payment screenshot after paying via UPI");
            return;
        }

        setLoading(true);

        try {
            const itemsWithPreferences = items.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                cookingRequests: item.cookingRequests || {},
                noGarlic: item.noGarlic || false,
                noOnion: item.noOnion || false,
                customInstructions: item.customInstructions || ''
            }));

            const formData = new FormData();
            formData.append('customer', JSON.stringify({
                name: form.name.trim(),
                phone: form.phone.replace(/\D/g, ''),
                address: form.address.trim()
            }));
            formData.append('items', JSON.stringify(itemsWithPreferences));
            formData.append('totalAmount', String(grandTotal));
            formData.append('screenshot', paymentScreenshot);

            const headers = {};
            if (isAuthenticated && token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await fetch(apiUrl('/api/create-order-upi'), {
                method: 'POST',
                headers,
                body: formData
            });

            const data = await res.json();

            if (data.success) {
                clearCart();
                navigate(`/track-order?orderId=${data.orderId}`);
            } else {
                alert(data.message || "Order submission failed");
            }
        } catch (e) {
            console.error(e);
            alert("Order submission failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };


    if (items.length === 0) {
        return (
            <div className="min-h-screen bg-background pt-24 text-center px-4">
                <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-6">
                    <Banknote className="w-10 h-10 text-gray-500" />
                </div>
                <h2 className="text-2xl font-serif font-bold mb-2 text-foreground">Your cart is empty</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8">Looks like you haven't added anything yet.</p>
                <button onClick={() => navigate('/menu')} className="bg-primary text-background px-8 py-3 rounded-full font-bold hover:bg-accent transition-colors">
                    Browse Menu
                </button>
            </div>
        )
    }

    const cartTotal = total();
    const grandTotal = cartTotal + deliveryFee;

    return (
        <div className="min-h-screen bg-background pt-24 pb-20 px-4">
            <div className="container mx-auto max-w-6xl">
                <h1 className="text-3xl font-serif font-bold mb-8 text-foreground">Checkout</h1>

                {/* Steps Indicator */}
                <div className="flex items-center justify-between mb-8 px-4">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center gap-2">
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                                step >= s ? "bg-primary text-background" : "bg-surface text-gray-500"
                            )}>
                                {s}
                            </div>
                            <span className={cn("text-sm font-medium", step >= s ? "text-foreground" : "text-gray-500")}>
                                {s === 1 ? 'Cart' : s === 2 ? 'Delivery' : 'Payment'}
                            </span>
                            {s < 3 && <div className="w-10 h-[1px] bg-gray-200 dark:bg-white/10 mx-2" />}
                        </div>
                    ))}
                </div>

                {!isAuthenticated && step >= 2 && (
                    <div className="bg-blue-500/20 border border-blue-500/50 text-blue-400 px-4 py-3 rounded-lg mb-6 text-sm">
                        ℹ️ You're checking out as a guest. <button onClick={() => navigate('/login?redirect=/checkout')} className="underline font-bold hover:text-blue-300">Login</button> to save your order history.
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-6">
                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.div
                                    key="cart"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="bg-surface border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden"
                                >
                                    <div className="p-6">
                                        <h2 className="text-xl font-bold mb-6">Your Items</h2>
                                        <div className="space-y-6">
                                            {items.map((item) => (
                                                <div key={item.id} className="space-y-3">
                                                    <div className="flex gap-4 items-center">
                                                        <img src={item.image} alt={item.name} className="w-20 h-20 rounded-lg object-cover" />
                                                        <div className="flex-1">
                                                            <h3 className="font-bold text-foreground">{item.name}</h3>
                                                            <p className="text-primary text-sm font-bold">₹{item.price}</p>
                                                        </div>
                                                        <div className="flex items-center gap-3 bg-background/50 rounded-lg p-1">
                                                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center hover:text-primary transition-colors">-</button>
                                                            <span className="font-bold w-4 text-center text-foreground">{item.quantity}</span>
                                                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center hover:text-primary transition-colors">+</button>
                                                        </div>
                                                        <button onClick={() => removeItem(item.id)} className="p-2 text-gray-500 hover:text-red-500 transition-colors">
                                                            <Trash2 size={20} />
                                                        </button>
                                                    </div>
                                                    {/* Display item preferences if set */}
                                                    {((item.noGarlic || item.noOnion || item.customInstructions) || 
                                                      (item.cookingRequests && Object.values(item.cookingRequests).some(v => v)) || 
                                                      item.cookingInstructions) && (
                                                        <div className="ml-24 space-y-2 bg-gray-50 dark:bg-black/20 p-3 rounded-lg border border-gray-200 dark:border-white/10">
                                                            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Item Preferences</p>
                                                            
                                                            {/* Customization preferences (for all items except sweets and gift packs) */}
                                                            {(item.noGarlic || item.noOnion || item.customInstructions) && (
                                                                <div className="space-y-1">
                                                                    {item.noGarlic && <p className="text-xs text-foreground">✓ No Garlic</p>}
                                                                    {item.noOnion && <p className="text-xs text-foreground">✓ No Onion</p>}
                                                                    {item.customInstructions && <p className="text-xs text-foreground italic">{item.customInstructions}</p>}
                                                                </div>
                                                            )}
                                                            
                                                            {/* Cooking requests for sweets */}
                                                            {item.cookingRequests && Object.values(item.cookingRequests).some(v => v) && (
                                                                <div className="space-y-1">
                                                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Sweetener:</p>
                                                                    {item.cookingRequests.sugar && <p className="text-xs text-foreground">✓ Sugar</p>}
                                                                    {item.cookingRequests.jaggery && <p className="text-xs text-foreground">✓ Jaggery</p>}
                                                                    {item.cookingRequests.dates && <p className="text-xs text-foreground">✓ Dates</p>}
                                                                </div>
                                                            )}
                                                            
                                                            {item.cookingInstructions && (
                                                                <p className="text-xs text-foreground italic mt-1">{item.cookingInstructions}</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {step === 2 && (
                                <motion.div
                                    key="delivery"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="bg-surface border border-white/5 rounded-2xl p-6 space-y-6"
                                >
                                    <h2 className="text-xl font-bold mb-6">Delivery Details</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm text-gray-500 dark:text-gray-400">Full Name *</label>
                                            <div className={cn("bg-gray-50 dark:bg-background rounded-lg px-4 py-3 flex items-center gap-3", errors.name ? "border border-red-500" : "border border-gray-200 dark:border-white/10")}>
                                                <User className="text-gray-500 dark:text-gray-400" size={20} />
                                                <input
                                                    type="text"
                                                    value={form.name}
                                                    onChange={e => { setForm({ ...form, name: e.target.value }); setErrors((prev) => ({ ...prev, name: '' })); }}
                                                    className="bg-transparent w-full text-foreground outline-none"
                                                    placeholder="John Doe"
                                                    minLength={2}
                                                />
                                            </div>
                                            {errors.name && <p className="text-red-400 text-xs">{errors.name}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm text-gray-500 dark:text-gray-400">Phone Number *</label>
                                            <div className={cn("bg-gray-50 dark:bg-background rounded-lg px-4 py-3 flex items-center gap-3", errors.phone ? "border border-red-500" : "border border-gray-200 dark:border-white/10")}>
                                                <Phone className="text-gray-500 dark:text-gray-400" size={20} />
                                                <input
                                                    type="tel"
                                                    value={form.phone}
                                                    onChange={e => { setForm({ ...form, phone: e.target.value }); setErrors((prev) => ({ ...prev, phone: '' })); }}
                                                    className="bg-transparent w-full text-foreground outline-none"
                                                    placeholder="9876543210"
                                                    maxLength={15}
                                                />
                                            </div>
                                            {errors.phone && <p className="text-red-400 text-xs">{errors.phone}</p>}
                                        </div>
                                        <div className="md:col-span-2 space-y-2">
                                            <label className="text-sm text-gray-500 dark:text-gray-400">Address *</label>
                                            <div className={cn("bg-gray-50 dark:bg-background rounded-lg px-4 py-3 flex items-start gap-3", errors.address ? "border border-red-500" : "border border-gray-200 dark:border-white/10")}>
                                                <MapPin className="text-gray-500 dark:text-gray-400 mt-1" size={20} />
                                                <textarea
                                                    value={form.address}
                                                    onChange={e => { setForm({ ...form, address: e.target.value }); setErrors((prev) => ({ ...prev, address: '' })); }}
                                                    className="bg-transparent w-full text-foreground outline-none resize-none h-24"
                                                    placeholder="Flat No, Building, Street, City, Pincode..."
                                                    minLength={10}
                                                />
                                            </div>
                                            {errors.address && <p className="text-red-400 text-xs">{errors.address}</p>}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {step === 3 && (
                                <motion.div
                                    key="payment"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="bg-surface border border-white/5 rounded-2xl p-6"
                                >
                                    <h2 className="text-xl font-bold mb-6">Payment Method</h2>
                                    <div className="mb-8">
                                        <div className="p-4 rounded-xl border flex flex-col items-center gap-3 bg-primary/10 border-primary text-primary max-w-xs">
                                            <Smartphone size={32} />
                                            <span className="font-bold">UPI</span>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="p-6 bg-gray-50 dark:bg-background rounded-xl border border-gray-200 dark:border-white/5 text-center">
                                            <div className="w-48 h-48 bg-white mx-auto mb-4 p-2">
                                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=mock@upi&pn=HealthyBowl&am=${grandTotal}`} alt="QR Code" />
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Scan to pay ₹{grandTotal} with Any UPI App</p>
                                        </div>

                                        <div className="p-6 bg-gray-50 dark:bg-background rounded-xl border border-gray-200 dark:border-white/5">
                                            <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
                                                <Upload size={20} /> Upload Payment Screenshot
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">After payment, upload a screenshot of the success screen</p>
                                            <label className="block cursor-pointer">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => setPaymentScreenshot(e.target.files?.[0] || null)}
                                                />
                                                <div className={cn(
                                                    "border-2 border-dashed rounded-xl p-6 text-center transition-colors",
                                                    paymentScreenshot ? "border-green-500 bg-green-500/10" : "border-gray-300 dark:border-white/20 hover:border-primary"
                                                )}>
                                                    {paymentScreenshot ? (
                                                        <p className="text-green-600 dark:text-green-400 font-medium">
                                                            ✓ {paymentScreenshot.name}
                                                        </p>
                                                    ) : (
                                                        <p className="text-gray-500 dark:text-gray-400">Click to select image (PNG, JPG)</p>
                                                    )}
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex justify-between mt-8">
                            {step > 1 && (
                                <button
                                    onClick={() => setStep(step - 1)}
                                    className="px-6 py-3 font-bold text-gray-500 dark:text-gray-400 hover:text-foreground transition-colors"
                                >
                                    Back
                                </button>
                            )}
                            {step < 3 ? (
                                <button
                                    onClick={handleNextStep}
                                    className="ml-auto bg-primary text-background px-8 py-3 rounded-full font-bold hover:bg-accent transition-colors flex items-center gap-2"
                                >
                                    Next <ChevronRight size={18} />
                                </button>
                            ) : (
                                <button
                                    onClick={handlePayment}
                                    disabled={loading || !paymentScreenshot}
                                    className="ml-auto bg-green-500 text-white px-8 py-3 rounded-full font-bold hover:bg-green-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? 'Submitting...' : `Submit Order ₹${grandTotal}`}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Sidebar Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-surface border border-gray-200 dark:border-white/5 rounded-2xl p-6 sticky top-24">
                            <h2 className="text-xl font-bold font-serif mb-6 text-foreground">Order Summary</h2>
                            <div className="space-y-4 mb-6">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                                    <span className="text-foreground font-medium">₹{cartTotal}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Delivery Fee</span>
                                    <span className="text-foreground font-medium">₹{deliveryFee}</span>
                                </div>
                                <div className="h-[1px] bg-gray-200 dark:bg-white/10 my-4" />
                                <div className="flex justify-between text-xl font-bold text-primary">
                                    <span>Total</span>
                                    <span>₹{grandTotal}</span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 text-center">
                                Pay via UPI & upload payment screenshot
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
