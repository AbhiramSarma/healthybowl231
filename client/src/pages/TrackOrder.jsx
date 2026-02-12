import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, ChefHat, Truck, MapPin, Package } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import apiUrl from '../lib/apiUrl';

// Use environment variable for socket URL or default to localhost
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const socket = io(SOCKET_URL);

export default function TrackOrder() {
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('orderId');
    const [order, setOrder] = useState(null);
    const [statusIndex, setStatusIndex] = useState(0);

    const steps = [
        { icon: <Package />, label: 'Order Received', value: 'received' },
        { icon: <ChefHat />, label: 'Preparing', value: 'preparing' },
        { icon: <Truck />, label: 'Out for Delivery', value: 'out_for_delivery' },
        { icon: <MapPin />, label: 'Delivered', value: 'delivered' }
    ];

    useEffect(() => {
        if (!orderId) return;

        // Fetch Order Details
        fetch(apiUrl(`/api/orders/${orderId}`))
            .then(res => res.json())
            .then(data => {
                setOrder(data);
                updateStatusIndex(data.status);
            })
            .catch(err => console.error("Failed to fetch order:", err));

        // Join Socket Room
        socket.emit('join_order', orderId);

        // Listen for Updates
        socket.on('order_status', (data) => {
            if (data.status) {
                updateStatusIndex(data.status);
                // Refresh full order to get history/updates if needed
                setOrder(prev => ({ ...prev, status: data.status }));
            }
        });

        return () => {
            socket.off('order_status');
        };
    }, [orderId]);

    const updateStatusIndex = (status) => {
        const index = steps.findIndex(s => s.value === status);
        if (index !== -1) setStatusIndex(index);
    };

    if (!orderId) return <div className="min-h-screen pt-32 text-center text-foreground">No Order ID provided.</div>;
    if (!order) return <div className="min-h-screen pt-32 text-center text-foreground">Loading order details...</div>;

    return (
        <div className="min-h-screen bg-background py-10">
            <div className="container mx-auto px-4 max-w-2xl">
                <h1 className="text-3xl font-serif font-bold mb-2 text-foreground">Track Order</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-8">
                    Order {order.orderId ? `#${order.orderId}` : `ID: #${orderId.slice(-6)}`}
                </p>

                {/* Order Details Card */}
                <div className="bg-surface border border-gray-200 dark:border-white/5 rounded-2xl p-6 mb-8">
                    <h2 className="text-xl font-bold text-foreground mb-4 border-b border-gray-200 dark:border-white/10 pb-2">Order Details</h2>
                    
                    {/* Customer Info */}
                    <div className="mb-6 space-y-2">
                        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Customer Information</h3>
                        <div className="space-y-2 text-gray-600 dark:text-gray-300">
                            <p><span className="text-gray-500">Name:</span> {order.customer?.name}</p>
                            <p><span className="text-gray-500">Phone:</span> {order.customer?.phone}</p>
                            <p><span className="text-gray-500">Address:</span> {order.customer?.address}</p>
                        </div>
                    </div>

                    {/* Order Items */}
                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Order Items</h3>
                        <div className="space-y-3">
                            {order.items && order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-gray-100 dark:bg-black/20 p-3 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-primary/20 text-primary text-xs font-bold px-2 py-1 rounded">
                                            {item.quantity}x
                                        </span>
                                        <span className="text-foreground">{item.name}</span>
                                    </div>
                                    <span className="text-gray-600 dark:text-gray-300 font-mono">₹{item.price * item.quantity}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Order Total */}
                    <div className="border-t border-gray-200 dark:border-white/10 pt-4">
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-foreground">Total Amount</span>
                            <span className="text-2xl font-bold text-primary">₹{order.totalAmount}</span>
                        </div>
                        {order.paymentId && (
                            <p className="text-xs text-gray-500 mt-2">
                                Payment ID: {order.paymentId.startsWith('COD') ? 'Cash on Delivery' : order.paymentId}
                            </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            Order placed on: {new Date(order.createdAt).toLocaleString()}
                        </p>
                    </div>
                </div>

                <div className="bg-surface border border-gray-200 dark:border-white/5 rounded-2xl p-8 relative overflow-hidden">
                    <h2 className="text-xl font-bold text-foreground mb-6">Order Status</h2>
                    {/* Progress Bar Line */}
                    <div className="absolute left-8 md:left-12 top-24 bottom-12 w-1 bg-gray-200 dark:bg-white/10">
                        <motion.div
                            className="w-full bg-primary"
                            animate={{ height: `${(statusIndex / (steps.length - 1)) * 100}%` }}
                            transition={{ duration: 1 }}
                        />
                    </div>

                    <div className="space-y-12 relative">
                        {steps.map((step, idx) => {
                            const isActive = idx <= statusIndex;
                            const isCurrent = idx === statusIndex;

                            return (
                                <div key={idx} className="flex items-center gap-6 md:gap-8">
                                    <div className={cn(
                                        "relative z-10 w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center border-4 transition-all duration-500",
                                        isActive
                                            ? "bg-primary border-primary/20 text-background"
                                            : "bg-gray-50 dark:bg-background border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400"
                                    )}>
                                        {isActive ? step.icon : <div className="w-3 h-3 bg-gray-600 rounded-full" />}

                                        {isCurrent && (
                                            <span className="absolute inset-0 rounded-full animate-ping bg-primary/30" />
                                        )}
                                    </div>

                                    <div className={cn(
                                        "transition-all duration-500",
                                        isActive ? "opacity-100" : "opacity-30"
                                    )}>
                                        <h3 className="text-lg md:text-xl font-bold text-foreground">{step.label}</h3>
                                        <p className="text-sm text-gray-500">
                                            {isCurrent ? 'Current Status' : idx < statusIndex ? 'Completed' : 'Pending'}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                </div>

                {order.status === 'delivered' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 text-center bg-green-500/10 border border-green-500/30 rounded-2xl p-6"
                    >
                        <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-primary mb-2">Order Delivered!</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">Thank you for your order. Enjoy your meal!</p>
                        <Link to="/" className="inline-block px-6 py-2 bg-primary text-background font-bold rounded-lg hover:bg-accent transition-colors">
                            Back to Home
                        </Link>
                    </motion.div>
                )}

                <div className="mt-8 text-center">
                    <Link
                        to="/support"
                        className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-foreground transition-colors text-sm border border-gray-200 dark:border-white/10 px-4 py-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5"
                    >
                        Need Help with your Order?
                    </Link>
                </div>
            </div>
        </div>
    );
}
