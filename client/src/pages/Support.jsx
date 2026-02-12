import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, CheckCircle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../features/auth/authStore';
import apiUrl from '../lib/apiUrl';

export default function Support() {
    const { isAuthenticated, token, user } = useAuthStore();
    const [step, setStep] = useState('identification'); // identification -> select-order -> category -> details -> success
    const [formData, setFormData] = useState({ category: '', orderId: '', details: '', phone: '' });
    const [ticketId, setTicketId] = useState(null);
    const [userOrders, setUserOrders] = useState([]);

    // When logged in, auto-load last 2 orders from the account (no phone required)
    useEffect(() => {
        const fetchAccountOrders = async () => {
            if (!isAuthenticated || !token) return;
            try {
                const res = await fetch(apiUrl('/api/orders'), {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                const orders = Array.isArray(data) ? data : [];
                // Newest first
                const sorted = [...orders].sort(
                    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
                );
                const lastTwo = sorted.slice(0, 2);
                setUserOrders(lastTwo);
                // If we have orders, go directly to select-order, otherwise straight to category
                if (lastTwo.length > 0) {
                    setStep('select-order');
                } else {
                    setStep('category');
                }
            } catch (e) {
                console.error('Failed to load account orders for support:', e);
            }
        };

        fetchAccountOrders();
    }, [isAuthenticated, token]);

    const fetchOrders = async () => {
        if (!formData.phone) return;
        try {
            const res = await fetch(`/api/orders?phone=${formData.phone}`);
            const data = await res.json();
            setUserOrders(data);
            setStep('select-order');
        } catch (e) {
            console.error(e);
        }
    };

    const categories = ['Late Delivery', 'Missing Item', 'Quality Issue', 'Other'];

    const handleCategorySelect = (cat) => {
        // For order-related issues, require an orderId
        const needsOrder = cat !== 'Other';
        if (needsOrder && !formData.orderId) {
            alert('Please select the order this issue is about first.');
            if (isAuthenticated && userOrders.length > 0) {
                setStep('select-order');
            } else {
                setStep('identification');
            }
            return;
        }
        setFormData({ ...formData, category: cat });
        setStep('details');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Extra safety: enforce orderId for order-related issues
        const needsOrder = formData.category && formData.category !== 'Other';
        if (needsOrder && !formData.orderId) {
            alert('Please select the related order before submitting this ticket.');
            if (isAuthenticated && userOrders.length > 0) {
                setStep('select-order');
            } else {
                setStep('identification');
            }
            return;
        }

        const payload = { ...formData };
        if (isAuthenticated && token && user?.id) payload.userId = user.id;
        const res = await fetch(apiUrl('/api/tickets'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        setTicketId(data._id);
        setStep('success');
    };

    return (
        <div className="min-h-screen bg-background pt-24 px-4 pb-20">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-4xl font-serif font-bold text-foreground mb-2 text-center">Help Center</h1>
                <p className="text-gray-500 dark:text-gray-400 text-center mb-12">We are here to help you with your order.</p>

                <div className="bg-surface border border-gray-200 dark:border-white/5 rounded-2xl p-8 shadow-2xl">
                    <AnimatePresence mode="wait">

                        {/* Step 1: User Identification (Phone) */}
                        {!isAuthenticated && step === 'identification' && (
                            <motion.div
                                key="ident"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                <h3 className="text-xl font-bold text-foreground mb-6">Find your orders</h3>
                                <div className="space-y-4">
                                    <input
                                        type="tel"
                                        placeholder="Enter your phone number"
                                        className="w-full bg-gray-100 dark:bg-black/40 border border-gray-300 dark:border-white/10 rounded-lg p-3 text-foreground"
                                        value={formData.phone || ''}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                    <button
                                        onClick={fetchOrders}
                                        disabled={!formData.phone || formData.phone.length < 10}
                                        className="w-full bg-primary text-background font-bold py-3 rounded-lg disabled:opacity-50"
                                    >
                                        Find Orders
                                    </button>
                                    <button
                                        onClick={() => setStep('category')}
                                        className="w-full text-gray-500 dark:text-gray-400 text-sm hover:text-foreground"
                                    >
                                        Skip & Continue without Order ID
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 1.5: Select Order */}
                        {step === 'select-order' && (
                            <motion.div
                                key="select-order"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                <h3 className="text-xl font-bold text-foreground mb-6">Select an Order</h3>
                                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                    {userOrders.length === 0 ? (
                                        <p className="text-gray-500 dark:text-gray-400">No recent orders found.</p>
                                    ) : (
                                        userOrders.map(order => (
                                            <button
                                                key={order._id}
                                                onClick={() => {
                                                    setFormData({ ...formData, orderId: order._id });
                                                    setStep('category');
                                                }}
                                                className="w-full text-left p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-primary transition-all text-foreground"
                                            >
                                                <div className="flex justify-between mb-1">
                                                    <span className="font-bold">#{order._id.slice(-6)}</span>
                                                    <span className="text-gray-500 dark:text-gray-400 text-sm">{new Date(order.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-gray-600 dark:text-gray-500 text-sm truncate">
                                                    {order.items.map(i => i.name).join(', ')}
                                                </p>
                                                <div className="mt-2 text-primary font-bold text-sm">₹{order.totalAmount}</div>
                                            </button>
                                        ))
                                    )}
                                </div>
                                <button onClick={() => setStep('category')} className="w-full mt-4 py-3 border border-gray-200 dark:border-white/10 rounded-lg text-gray-500 dark:text-gray-400 hover:text-foreground">
                                    Continue without selecting
                                </button>
                            </motion.div>
                        )}

                        {/* Step 2: Category Selection */}
                        {step === 'category' && (
                            <motion.div
                                key="cat"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (isAuthenticated && userOrders.length > 0) {
                                                setStep('select-order');
                                            } else {
                                                setStep('identification');
                                            }
                                        }}
                                        className="text-sm text-gray-500 dark:text-gray-400 hover:text-foreground"
                                    >
                                        ← Back
                                    </button>
                                    <h3 className="text-xl font-bold text-foreground text-center flex-1">
                                        What do you need help with?
                                    </h3>
                                </div>
                                {formData.orderId && (
                                    <div className="mb-6 p-3 bg-primary/10 border border-primary/30 rounded-lg text-sm text-primary flex justify-between items-center">
                                        <span>Selected Order: #{formData.orderId.slice(-6)}</span>
                                        <button
                                            onClick={() => {
                                                setFormData({ ...formData, orderId: '' });
                                                if (isAuthenticated && userOrders.length > 0) {
                                                    setStep('select-order');
                                                } else {
                                                    setStep('identification');
                                                }
                                            }}
                                            className="underline"
                                        >
                                            Change
                                        </button>
                                    </div>
                                )}
                                <div className="grid gap-4">
                                    {categories.map((cat) => (
                                        <button
                                            key={cat}
                                            onClick={() => handleCategorySelect(cat)}
                                            className="w-full text-left p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-primary/10 hover:border-primary/50 transition-all group flex justify-between items-center text-foreground"
                                        >
                                            <span className="font-medium">{cat}</span>
                                            <ChevronRight className="text-gray-500 group-hover:text-primary" size={20} />
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Step 3: Form Details */}
                        {step === 'details' && (
                            <motion.div
                                key="details"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                <h3 className="text-xl font-bold text-foreground mb-6">Tell us more details</h3>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {/* Order ID field removed as it is now selected previously */}

                                    <div>
                                        <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">Additional Details</label>
                                        <textarea
                                            required
                                            className="w-full bg-gray-100 dark:bg-black/40 border border-gray-300 dark:border-white/10 rounded-lg p-3 text-foreground h-32"
                                            placeholder="Please explain the issue..."
                                            value={formData.details}
                                            onChange={e => setFormData({ ...formData, details: e.target.value })}
                                        ></textarea>
                                    </div>
                                    <div className="flex gap-4">
                                        <button type="button" onClick={() => setStep('category')} className="px-6 py-3 rounded-lg border border-gray-300 dark:border-white/10 text-foreground hover:bg-gray-100 dark:hover:bg-white/5">Back</button>
                                        <button type="submit" className="flex-1 bg-primary text-background font-bold rounded-lg hover:bg-accent">Submit Ticket</button>
                                    </div>
                                </form>
                            </motion.div>
                        )}

                        {/* Step 3: Success */}
                        {step === 'success' && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-8"
                            >
                                <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle size={48} />
                                </div>
                                <h3 className="text-2xl font-bold text-foreground mb-2">Ticket Created!</h3>
                                <p className="text-gray-500 dark:text-gray-400 mb-8">Ticket ID: #{ticketId?.slice(-6)}<br />We will resolve this shortly.</p>
                                <Link to="/" className="inline-block px-8 py-3 bg-gray-200 dark:bg-white/10 rounded-full text-foreground hover:bg-gray-300 dark:hover:bg-white/20 font-bold">
                                    Return Home
                                </Link>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
