import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../features/auth/authStore';
import { motion } from 'framer-motion';
import { LogIn, User, Lock, Phone } from 'lucide-react';

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        password: '',
        email: '',
        address: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { login, register, isAuthenticated } = useAuthStore();
    const navigate = useNavigate();
    const searchParams = new URLSearchParams(window.location.search);
    const redirect = searchParams.get('redirect') || '/';

    useEffect(() => {
        if (isAuthenticated) {
            navigate(redirect);
        }
    }, [isAuthenticated, navigate, redirect]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Prevent double submission
        if (loading) return;
        
        setError('');
        setLoading(true);

        try {
            let result;
            if (isLogin) {
                result = await login(formData.phone, formData.password);
            } else {
                if (!formData.name || !formData.phone || !formData.password) {
                    setError('Name, phone, and password are required');
                    setLoading(false);
                    return;
                }
                result = await register(formData.name, formData.phone, formData.password, formData.email, formData.address);
            }

            if (result.success) {
                navigate(redirect);
            } else {
                setError(result.error || 'Authentication failed');
            }
        } catch (err) {
            setError(err.message || 'An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4 py-20">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface border border-gray-200 dark:border-white/5 rounded-2xl p-8 w-full max-w-md shadow-2xl"
            >
                <div className="text-center mb-8">
                    <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4 text-primary">
                        <LogIn size={32} />
                    </div>
                    <h2 className="text-3xl font-serif font-bold text-foreground mb-2">
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400">
                        {isLogin ? 'Sign in to continue ordering' : 'Sign up to start ordering'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div>
                            <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">Full Name</label>
                            <div className="bg-gray-100 dark:bg-black/40 border border-gray-300 dark:border-white/10 rounded-lg px-4 py-3 flex items-center gap-3">
                                <User className="text-gray-500 dark:text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="John Doe"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="bg-transparent w-full text-foreground outline-none"
                                    required={!isLogin}
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">Phone Number</label>
                        <div className="bg-gray-100 dark:bg-black/40 border border-gray-300 dark:border-white/10 rounded-lg px-4 py-3 flex items-center gap-3">
                            <Phone className="text-gray-500 dark:text-gray-400" size={20} />
                            <input
                                type="tel"
                                placeholder="+91 98765 43210"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="bg-transparent w-full text-foreground outline-none"
                                required
                            />
                        </div>
                    </div>

                    {!isLogin && (
                        <>
                            <div>
                                <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">Email (Optional)</label>
                                <div className="bg-gray-100 dark:bg-black/40 border border-gray-300 dark:border-white/10 rounded-lg px-4 py-3 flex items-center gap-3">
                                    <User className="text-gray-500 dark:text-gray-400" size={20} />
                                    <input
                                        type="email"
                                        placeholder="john@example.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="bg-transparent w-full text-foreground outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">Address (Optional)</label>
                                <div className="bg-gray-100 dark:bg-black/40 border border-gray-300 dark:border-white/10 rounded-lg px-4 py-3 flex items-center gap-3">
                                    <User className="text-gray-500 dark:text-gray-400" size={20} />
                                    <textarea
                                        placeholder="Your address"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="bg-transparent w-full text-foreground outline-none resize-none h-20"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">Password</label>
                        <div className="bg-gray-100 dark:bg-black/40 border border-gray-300 dark:border-white/10 rounded-lg px-4 py-3 flex items-center gap-3">
                            <Lock className="text-gray-500 dark:text-gray-400" size={20} />
                            <input
                                type="password"
                                placeholder="Enter your password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="bg-transparent w-full text-foreground outline-none"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-background font-bold py-3 rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError('');
                            setFormData({ name: '', phone: '', password: '', email: '', address: '' });
                        }}
                        className="text-gray-500 dark:text-gray-400 hover:text-primary transition-colors text-sm"
                    >
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <span className="text-primary font-bold">{isLogin ? 'Sign Up' : 'Sign In'}</span>
                    </button>
                </div>

                <div className="mt-4 text-center">
                    <Link to="/" className="text-gray-500 dark:text-gray-400 hover:text-primary transition-colors text-sm">
                        ← Back to Home
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
