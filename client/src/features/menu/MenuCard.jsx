import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Plus, Minus, ShoppingBag, XCircle, Edit3 } from 'lucide-react';
import { useCartStore, getCartLineId } from '../cart/cartStore';
import { cn } from '../../lib/utils';
import { MENU_IMAGE_OVERRIDES } from './imageOverrides';

export default function MenuCard({ item }) {
    const { items, addItem, removeItem, updateQuantity, updateItemOption } = useCartStore();
    const isAvailable = item.isAvailable !== false;

    const priceOptions = item.priceOptions || [];
    const hasOptions = priceOptions.length > 0;
    const minPrice = hasOptions ? Math.min(...priceOptions.map((o) => o.price)) : item.price;
    const defaultOption = hasOptions ? (priceOptions.find((o) => o.isDefault) || priceOptions[0]) : null;

    const [selectedOption, setSelectedOption] = useState(defaultOption);
    // Hot item preferences
    const [noGarlic, setNoGarlic] = useState(false);
    const [noOnion, setNoOnion] = useState(false);
    const [customInstructions, setCustomInstructions] = useState('');
    const [showHotOptions, setShowHotOptions] = useState(false);
    // Cooking requests for sweets
    const [cookingRequests, setCookingRequests] = useState({
        sugar: false,
        jaggery: false,
        dates: false
    });
    const [cookingInstructions, setCookingInstructions] = useState('');
    const [showCookingRequests, setShowCookingRequests] = useState(false);
    
    const isSweetItem = item.category?.toLowerCase().includes('dessert') || 
                       item.category?.toLowerCase().includes('sweet') ||
                       item.name?.toLowerCase().includes('sweet') ||
                       item.name?.toLowerCase().includes('gulab') ||
                       item.name?.toLowerCase().includes('rasmalai') ||
                       item.name?.toLowerCase().includes('jamun') ||
                       item.name?.toLowerCase().includes('kheer') ||
                       item.name?.toLowerCase().includes('halwa') ||
                       item.name?.toLowerCase().includes('barfi') ||
                       item.name?.toLowerCase().includes('laddu');
    const isGiftPack = item.category?.toLowerCase().includes('gift') ||
                      item.name?.toLowerCase().includes('gift pack') ||
                      item.name?.toLowerCase().includes('giftpack') ||
                      item.name?.toLowerCase().includes('gift box') ||
                      item.name?.toLowerCase().includes('giftbox');
    // Show customization for all items except sweets and gift packs
    const showCustomization = !isSweetItem && !isGiftPack;

    // Build product from current form state (for matching cart line)
    const buildProductFromForm = (optOverride) => {
        const baseItem = {
            ...item,
            noGarlic: showCustomization ? noGarlic : false,
            noOnion: showCustomization ? noOnion : false,
            customInstructions: showCustomization ? customInstructions : '',
            cookingRequests: isSweetItem ? cookingRequests : {},
            cookingInstructions: isSweetItem ? cookingInstructions : ''
        };
        if (!hasOptions) return baseItem;
        const opt = optOverride || selectedOption || defaultOption;
        return { ...baseItem, price: opt?.price ?? item.price, selectedOption: opt?.label };
    };

    const currentProduct = buildProductFromForm();
    const cartItem = items.find((i) => (i.cartLineId || getCartLineId(i)) === getCartLineId(currentProduct));
    const quantity = cartItem ? cartItem.quantity : 0;
    const cartLineId = cartItem ? (cartItem.cartLineId || getCartLineId(cartItem)) : null;
    const totalQtyForProduct = items.filter((i) => i.id === item.id).reduce((s, i) => s + i.quantity, 0);
    const currentOption = quantity > 0 && cartItem?.selectedOption
        ? priceOptions.find((o) => o.label === cartItem.selectedOption) || defaultOption
        : selectedOption;

    useEffect(() => {
        if (hasOptions && defaultOption) setSelectedOption(defaultOption);
    }, [item.id, hasOptions]);

    const toAddWithOption = () => {
        const opt = quantity > 0 ? (priceOptions.find((o) => o.label === cartItem?.selectedOption) || defaultOption) : (selectedOption || defaultOption);
        return buildProductFromForm(opt);
    };

    const handleOptionChange = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const label = e.target.value;
        const opt = priceOptions.find((o) => o.label === label);
        if (!opt) return;
        if (quantity > 0 && cartLineId) {
            updateItemOption(cartLineId, opt.label, opt.price);
        } else {
            setSelectedOption(opt);
        }
    };

    const handleCustomize = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowHotOptions(true);
        setNoGarlic(false);
        setNoOnion(false);
        setCustomInstructions('');
    };

    const handleCreate = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isAvailable) {
            addItem(toAddWithOption());
        }
    };

    const increment = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isAvailable) {
            addItem(toAddWithOption());
        }
    };

    const decrement = (e) => {
        e.stopPropagation();
        if (!cartLineId) return;
        if (quantity > 1) {
            updateQuantity(cartLineId, quantity - 1);
        } else {
            removeItem(cartLineId);
        }
    };

    const imageSrc = MENU_IMAGE_OVERRIDES[item.name] ?? item.image;

    return (
        <motion.div
            layout
            className={cn(
                "rounded-3xl overflow-hidden group relative transition-all duration-500 flex flex-col h-full",
                totalQtyForProduct > 0
                    ? "bg-white dark:bg-surface shadow-[0_10px_40px_-10px_rgba(255,69,0,0.3)] ring-1 ring-primary transform -translate-y-2 scale-[1.02] border border-gray-100 dark:border-white/5"
                    : "bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:shadow-xl hover:-translate-y-1 dark:hover:border-primary/30 dark:hover:shadow-primary/10"
            )}
        >
            <Link to={`/menu/product/${item.id}`} className="block relative h-64 overflow-hidden">
                <img
                    src={imageSrc}
                    alt={item.name}
                    className={cn(
                        "w-full h-full object-cover transition-transform duration-700 will-change-transform",
                        totalQtyForProduct > 0 ? "scale-110 saturate-150" : "group-hover:scale-110 group-hover:saturate-150"
                    )}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent dark:from-black/40 dark:via-background/20" />

                <div className="absolute top-4 right-4 z-10">
                    <AnimatePresence>
                        {totalQtyForProduct > 0 && (
                            <motion.div
                                initial={{ scale: 0, rotate: -20 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0 }}
                                className="bg-gradient-to-r from-primary to-accent text-background text-xs font-black px-4 py-1.5 rounded-full flex items-center gap-1 shadow-lg shadow-primary/40"
                            >
                                <ShoppingBag size={14} fill="currentColor" /> {totalQtyForProduct} IN CART
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="absolute bottom-4 left-4 z-10 flex gap-2">
                    {item.isVegetarian !== false ? (
                        <span className="bg-white/90 dark:bg-green-900/80 backdrop-blur-sm text-green-700 dark:text-green-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded shadow-sm border border-green-200 dark:border-green-800">
                            Veg
                        </span>
                    ) : (
                        <span className="bg-white/90 dark:bg-red-900/80 backdrop-blur-sm text-red-700 dark:text-red-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded shadow-sm border border-red-200 dark:border-red-800">
                            Non-Veg
                        </span>
                    )}
                </div>
                {!isAvailable && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20">
                        <div className="bg-red-500/90 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                            <XCircle size={20} /> Out of Stock
                        </div>
                    </div>
                )}
            </Link>

            <div className="p-5 flex flex-col flex-1 relative">
                <div className="flex justify-between items-start mb-2">
                    <Link to={`/menu/product/${item.id}`} className="text-lg font-bold font-serif text-gray-900 dark:text-white leading-tight group-hover:text-primary transition-colors hover:underline decoration-primary/30 underline-offset-4">{item.name}</Link>
                </div>

                <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                        {hasOptions ? `₹${minPrice} onwards` : `₹${item.price}`}
                    </span>
                    {item.price > 400 && <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded font-bold">BESTSELLER</span>}
                    {!isAvailable && <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded font-bold">OUT OF STOCK</span>}
                </div>

                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed flex-1">{item.description}</p>

                {/* Customization options for all items except sweets and gift packs */}
                {showCustomization && isAvailable && (
                    <div className="mb-3 space-y-2">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowHotOptions(!showHotOptions);
                            }}
                            className="text-xs text-primary hover:underline font-medium"
                        >
                            {showHotOptions ? 'Hide' : 'Show'} customization options
                        </button>
                        {showHotOptions && (
                            <div className="bg-gray-50 dark:bg-black/30 p-3 rounded-lg border border-gray-200 dark:border-white/10 space-y-2" onClick={(e) => e.stopPropagation()}>
                                <div className="flex flex-wrap gap-3">
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={noGarlic}
                                            onChange={(e) => setNoGarlic(e.target.checked)}
                                            className="w-4 h-4 text-primary rounded"
                                        />
                                        <span className="text-xs text-foreground">No Garlic</span>
                                    </label>
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={noOnion}
                                            onChange={(e) => setNoOnion(e.target.checked)}
                                            className="w-4 h-4 text-primary rounded"
                                        />
                                        <span className="text-xs text-foreground">No Onion</span>
                                    </label>
                                </div>
                                <textarea
                                    value={customInstructions}
                                    onChange={(e) => setCustomInstructions(e.target.value)}
                                    placeholder="Additional instructions (optional)"
                                    className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded px-2 py-1.5 text-xs text-foreground resize-none h-16"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Cooking Requests for Sweets */}
                {isSweetItem && isAvailable && (
                    <div className="mb-3 space-y-2">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowCookingRequests(!showCookingRequests);
                            }}
                            className="text-xs text-primary hover:underline font-medium"
                        >
                            {showCookingRequests ? 'Hide' : 'Show'} cooking requests
                        </button>
                        {showCookingRequests && (
                            <div className="bg-gray-50 dark:bg-black/30 p-3 rounded-lg border border-gray-200 dark:border-white/10 space-y-2" onClick={(e) => e.stopPropagation()}>
                                <p className="text-xs font-bold text-foreground mb-2">Sweetener Options:</p>
                                <div className="flex flex-wrap gap-3 mb-2">
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={cookingRequests.sugar}
                                            onChange={(e) => setCookingRequests(prev => ({ ...prev, sugar: e.target.checked }))}
                                            className="w-4 h-4 text-primary rounded"
                                        />
                                        <span className="text-xs text-foreground">Sugar</span>
                                    </label>
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={cookingRequests.jaggery}
                                            onChange={(e) => setCookingRequests(prev => ({ ...prev, jaggery: e.target.checked }))}
                                            className="w-4 h-4 text-primary rounded"
                                        />
                                        <span className="text-xs text-foreground">Jaggery</span>
                                    </label>
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={cookingRequests.dates}
                                            onChange={(e) => setCookingRequests(prev => ({ ...prev, dates: e.target.checked }))}
                                            className="w-4 h-4 text-primary rounded"
                                        />
                                        <span className="text-xs text-foreground">Dates</span>
                                    </label>
                                </div>
                                <textarea
                                    value={cookingInstructions}
                                    onChange={(e) => setCookingInstructions(e.target.value)}
                                    placeholder="Additional instructions (multilingual)"
                                    className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded px-2 py-1.5 text-xs text-foreground resize-none h-16"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        )}
                    </div>
                )}

                {hasOptions && isAvailable && (
                    <div className="mb-3" onClick={(e) => e.preventDefault()}>
                        <label className="sr-only">Quantity / size</label>
                        <select
                            value={currentOption?.label ?? ''}
                            onChange={handleOptionChange}
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                                "w-full py-2.5 pl-3 pr-8 rounded-lg text-sm font-medium border bg-white dark:bg-black/30 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none appearance-none cursor-pointer",
                                totalQtyForProduct > 0 && "border-primary/50 bg-primary/5 dark:bg-primary/10"
                            )}
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.25rem' }}
                        >
                            {priceOptions.map((opt) => (
                                <option key={opt.label} value={opt.label}>
                                    {opt.label} — ₹{opt.price}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-white/5 relative z-20">
                    <AnimatePresence mode='wait'>
                        {!isAvailable ? (
                            <motion.button
                                disabled
                                className="w-full py-4 rounded-xl font-bold text-gray-500 bg-gray-800/50 cursor-not-allowed relative overflow-hidden"
                            >
                                <span className="relative flex items-center justify-center gap-2">
                                    <XCircle size={20} /> Out of Stock
                                </span>
                            </motion.button>
                        ) : quantity === 0 ? (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleCreate}
                                className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-primary to-accent hover:from-primary/95 hover:to-accent/95 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 flex items-center justify-center gap-2 text-sm tracking-wide"
                            >
                                <Plus size={18} strokeWidth={2.5} /> Add to Cart
                            </motion.button>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="space-y-2"
                            >
                                <div className="flex items-center justify-between bg-gray-100/80 dark:bg-white/5 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-xl p-2 gap-1">
                                    <button
                                        onClick={decrement}
                                        className="w-11 h-11 flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-300 hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-200 active:scale-95"
                                    >
                                        <Minus size={20} strokeWidth={2.5} />
                                    </button>
                                    <motion.div
                                        key={quantity}
                                        initial={{ scale: 1.5 }}
                                        animate={{ scale: 1 }}
                                        className="font-black text-xl text-primary min-w-[2rem] text-center"
                                    >
                                        {quantity}
                                    </motion.div>
                                    <button
                                        onClick={increment}
                                        title="Repeat - add another"
                                        className="w-11 h-11 flex items-center justify-center rounded-xl bg-gradient-to-r from-primary to-accent text-white hover:shadow-lg hover:shadow-primary/30 transition-all duration-200 active:scale-95"
                                    >
                                        <Plus size={20} strokeWidth={2.5} />
                                    </button>
                                </div>
                                <button
                                    onClick={handleCustomize}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-primary hover:text-white hover:bg-primary/20 dark:hover:bg-primary/30 rounded-xl border-2 border-dashed border-primary/40 hover:border-primary/60 transition-all duration-200"
                                >
                                    <Edit3 size={16} strokeWidth={2} /> Customize (add with different options)
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
}
