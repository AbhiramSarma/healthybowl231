import { Home, Menu, ShoppingBag, MapPin, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useCartStore } from '../features/cart/cartStore';

export default function MobileNav() {
    const location = useLocation();
    const cartItems = useCartStore((state) => state.items);
    const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

    // Only show on mobile (hidden on md and up)
    const navItems = [
        { icon: <Home size={22} />, label: 'Home', path: '/' },
        { icon: <Menu size={22} />, label: 'Menu', path: '/menu' },
        {
            icon: (
                <div className="relative">
                    <ShoppingBag size={22} />
                    {cartCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-primary text-background text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                            {cartCount}
                        </span>
                    )}
                </div>
            ),
            label: 'Checkout',
            path: '/checkout'
        },
        // User account (user can log in / view orders); admin login is only via URL or desktop nav
        { icon: <User size={22} />, label: 'Account', path: '/account' }
    ];

    return (
        <div className="md:hidden fixed bottom-4 left-4 right-4 bg-white/95 dark:bg-black/80 backdrop-blur-lg border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 flex justify-between px-6 py-4">
            {navItems.map((item) => (
                <Link
                    key={item.label}
                    to={item.path}
                    className={`flex flex-col items-center gap-1 transition-colors ${location.pathname === item.path ? 'text-primary' : 'text-gray-500 dark:text-gray-400 hover:text-foreground'
                        }`}
                >
                    {item.icon}
                    <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
            ))}
        </div>
    );
}
