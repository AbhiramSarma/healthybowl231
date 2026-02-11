import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, Menu, X, LogIn, LogOut, User } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useCartStore } from '../features/cart/cartStore';
import { useAuthStore } from '../features/auth/authStore';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const items = useCartStore((state) => state.items);
    const { isAuthenticated, user, logout, init, isInitialized } = useAuthStore();
    const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
    const location = useLocation();
    const navigate = useNavigate();

    // Initialize auth on mount if not already initialized
    useEffect(() => {
        if (!isInitialized) {
            init();
        }
    }, []); // Empty deps - only run once on mount

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setIsOpen(false);
    }, [location]);

    const navLinks = [
        { name: 'Home', path: '/' },
        { name: 'Menu', path: '/menu' },
        { name: 'Featured', path: '/featured' },
        { name: 'Track Order', path: '/track-order' },
        { name: 'Locations', path: '/locations' },
    ];

    return (
        <nav
            className={cn(
                'fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b',
                scrolled
                    ? 'bg-white/95 dark:bg-black/60 backdrop-blur-xl border-gray-200 dark:border-white/10 py-3 shadow-md dark:shadow-[0_4px_30px_rgba(0,0,0,0.5)]'
                    : 'bg-transparent border-transparent py-5'
            )}
        >
            <div className="container mx-auto px-4 flex items-center justify-between">
                <Link to="/" className="text-2xl font-serif font-bold text-primary flex items-center gap-2">
                    Healthy Bowl
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={cn(
                                "font-medium transition-colors hover:text-primary",
                                location.pathname === link.path ? "text-primary" : "text-gray-700 dark:text-gray-300"
                            )}
                        >
                            {link.name}
                        </Link>
                    ))}
                    <ThemeToggle className="hidden md:flex" />
                    <Link to="/checkout" className="relative group">
                        <ShoppingBag className="w-6 h-6 text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors" />
                        {itemCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-primary text-background text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full animate-pulse">
                                {itemCount}
                            </span>
                        )}
                    </Link>
                    {isAuthenticated ? (
                        <div className="flex items-center gap-4">
                            <Link to="/account" className="text-sm text-gray-700 dark:text-gray-300 hover:text-primary flex items-center gap-2 transition-colors">
                                <User size={16} />
                                {user?.name}
                            </Link>
                            <button
                                onClick={() => {
                                    logout();
                                    navigate('/');
                                }}
                                className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-primary transition-colors"
                            >
                                <LogOut size={18} />
                                <span className="hidden md:inline">Logout</span>
                            </button>
                        </div>
                    ) : (
                        <Link
                            to="/login"
                            className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-primary transition-colors"
                        >
                            <LogIn size={18} />
                            <span className="hidden md:inline">Login</span>
                        </Link>
                    )}
                </div>

                {/* Mobile right controls (theme + menu) */}
                <div className="flex items-center gap-3 md:hidden">
                    {/* Mobile theme toggle outside the menu */}
                    <ThemeToggle className="flex md:hidden" />
                    <button
                        className="text-gray-700 dark:text-gray-300"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        {isOpen ? <X /> : <Menu />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-white/95 dark:bg-background/95 backdrop-blur-lg border-b border-gray-200 dark:border-white/10"
                    >
                        <div className="flex flex-col p-4 gap-4">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={cn(
                                        "text-lg font-medium",
                                        location.pathname === link.path ? "text-primary" : "text-gray-700 dark:text-gray-300"
                                    )}
                                >
                                    {link.name}
                                </Link>
                            ))}
                            <Link to="/checkout" className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                <ShoppingBag className="w-5 h-5" />
                                Checkout ({itemCount})
                            </Link>
                            {isAuthenticated ? (
                                <div className="space-y-2">
                                    <Link to="/account" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-primary" onClick={() => setIsOpen(false)}>
                                        <User size={18} />
                                        {user?.name}
                                    </Link>
                                    <button
                                        onClick={() => {
                                            logout();
                                            navigate('/');
                                            setIsOpen(false);
                                        }}
                                        className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-primary transition-colors w-full"
                                    >
                                        <LogOut size={18} />
                                        Logout
                                    </button>
                                </div>
                            ) : (
                                <Link
                                    to="/login"
                                    className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-primary transition-colors"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <LogIn size={18} />
                                    Login
                                </Link>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
