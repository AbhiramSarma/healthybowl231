import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCartStore, getCartLineId } from '../features/cart/cartStore';
import { MENU_IMAGE_OVERRIDES } from '../features/menu/imageOverrides';
import { cn } from '../lib/utils';
import apiUrl from '../lib/apiUrl';

export default function ProductDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState(null);
  const { items, addItem, removeItem, updateQuantity } = useCartStore();
  // Hot item preferences
  const [noGarlic, setNoGarlic] = useState(false);
  const [noOnion, setNoOnion] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  // Cooking requests for sweets
  const [cookingRequests, setCookingRequests] = useState({
    sugar: false,
    jaggery: false,
    dates: false
  });
  const [cookingInstructions, setCookingInstructions] = useState('');
  
  const isSweetItem = item?.category?.toLowerCase().includes('dessert') || 
                     item?.category?.toLowerCase().includes('sweet') ||
                     item?.name?.toLowerCase().includes('sweet') ||
                     item?.name?.toLowerCase().includes('gulab') ||
                     item?.name?.toLowerCase().includes('rasmalai') ||
                     item?.name?.toLowerCase().includes('jamun') ||
                     item?.name?.toLowerCase().includes('kheer') ||
                     item?.name?.toLowerCase().includes('halwa') ||
                     item?.name?.toLowerCase().includes('barfi') ||
                     item?.name?.toLowerCase().includes('laddu');
  const isGiftPack = item?.category?.toLowerCase().includes('gift') ||
                     item?.name?.toLowerCase().includes('gift pack') ||
                     item?.name?.toLowerCase().includes('giftpack') ||
                     item?.name?.toLowerCase().includes('gift box') ||
                     item?.name?.toLowerCase().includes('giftbox');
  // Show customization for all items except sweets and gift packs
  const showCustomization = !isSweetItem && !isGiftPack;

  useEffect(() => {
    if (!id) return;
    fetch(apiUrl(`/api/menu/${id}`))
      .then((r) => r.json())
      .then((data) => {
        setItem(data);
        const priceOpts = data?.priceOptions || [];
        if (priceOpts.length > 0) {
          const def = priceOpts.find((o) => o.isDefault) || priceOpts[0];
          setSelectedOption(def);
        }
        return data;
      })
      .then((product) => {
        if (!product?.category) return;
        fetch(apiUrl('/api/menu'))
          .then((r) => r.json())
          .then((all) => {
            const sameCat = all.filter((i) => i.category === product.category && i.id !== product.id && i.isAvailable !== false);
            setRelated(sameCat.slice(0, 6));
          });
      })
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [id]);

  const imageSrc = item ? (MENU_IMAGE_OVERRIDES[item.name] ?? item.image) : '';
  const displayPrice = selectedOption ? selectedOption.price : item?.price;
  const cartProduct = item ? {
    ...item,
    price: displayPrice,
    selectedOption: selectedOption?.label,
    noGarlic: showCustomization ? noGarlic : false,
    noOnion: showCustomization ? noOnion : false,
    customInstructions: showCustomization ? customInstructions : '',
    cookingRequests: isSweetItem ? cookingRequests : {},
    cookingInstructions: isSweetItem ? cookingInstructions : ''
  } : null;
  const cartItem = item && cartProduct ? items.find((i) => (i.cartLineId || getCartLineId(i)) === getCartLineId(cartProduct)) : null;
  const quantity = cartItem?.quantity ?? 0;
  const cartLineId = cartItem ? (cartItem.cartLineId || getCartLineId(cartItem)) : null;

  const handleAdd = () => {
    if (cartProduct) {
      const productWithPreferences = {
        ...cartProduct,
        noGarlic: showCustomization ? noGarlic : false,
        noOnion: showCustomization ? noOnion : false,
        customInstructions: showCustomization ? customInstructions : '',
        cookingRequests: isSweetItem ? cookingRequests : {},
        cookingInstructions: isSweetItem ? cookingInstructions : ''
      };
      addItem(productWithPreferences);
    }
  };
  const handleIncrement = () => {
    const productWithPreferences = {
      ...cartProduct,
      noGarlic: showCustomization ? noGarlic : false,
      noOnion: showCustomization ? noOnion : false,
      customInstructions: showCustomization ? customInstructions : '',
      cookingRequests: isSweetItem ? cookingRequests : {},
      cookingInstructions: isSweetItem ? cookingInstructions : ''
    };
    addItem(productWithPreferences);
  };
  const handleDecrement = () => {
    if (!cartLineId) return;
    if (quantity > 1) updateQuantity(cartLineId, quantity - 1);
    else removeItem(cartLineId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-20 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-500">Loading...</div>
      </div>
    );
  }
  if (!item) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-20 text-center">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Product not found</p>
        <Link to="/menu" className="text-primary font-bold hover:underline">Back to Menu</Link>
      </div>
    );
  }

  const priceOptions = item.priceOptions || [];
  const hasOptions = priceOptions.length > 0;

  return (
    <div className="min-h-screen bg-background pt-24 pb-20">
      <div className="container max-w-6xl mx-auto px-4">
        <Link to="/menu" className="inline-flex items-center gap-2 text-gray-500 hover:text-primary mb-8 transition-colors">
          <ArrowLeft size={20} /> Back to Menu
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative aspect-square rounded-3xl overflow-hidden border border-gray-100 dark:border-white/10 bg-white dark:bg-surface shadow-lg dark:shadow-none"
          >
            <img src={imageSrc} alt={item.name} className="w-full h-full object-cover" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="flex gap-2">
              {item.isVegetarian !== false ? (
                <span className="bg-green-500/20 text-green-400 text-xs font-bold px-3 py-1 rounded-full">Veg</span>
              ) : (
                <span className="bg-red-500/20 text-red-400 text-xs font-bold px-3 py-1 rounded-full">Non-Veg</span>
              )}
            </div>
            <h1 className="text-4xl font-serif font-bold text-foreground">{item.name}</h1>
            <p className="text-2xl font-bold text-primary">₹{displayPrice} {hasOptions && selectedOption && <span className="text-base font-normal text-gray-500 dark:text-gray-400">({selectedOption.label})</span>}</p>

            {hasOptions && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Select option:</p>
                <div className="flex flex-wrap gap-2">
                  {priceOptions.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => setSelectedOption(opt)}
                      className={cn(
                        'px-4 py-2 rounded-lg border font-medium transition-colors',
                        selectedOption?.label === opt.label
                          ? 'bg-primary/20 border-primary text-primary'
                          : 'border-gray-300 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/30 text-foreground'
                      )}
                    >
                      {opt.label} - ₹{opt.price}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">{item.description}</p>

            {/* Customization options for all items except sweets and gift packs */}
            {showCustomization && (
              <div className="space-y-3 bg-gray-50 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-white/10">
                <p className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase">Customization Options</p>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noGarlic}
                      onChange={(e) => setNoGarlic(e.target.checked)}
                      className="w-5 h-5 text-primary rounded"
                    />
                    <span className="text-foreground font-medium">No Garlic</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noOnion}
                      onChange={(e) => setNoOnion(e.target.checked)}
                      className="w-5 h-5 text-primary rounded"
                    />
                    <span className="text-foreground font-medium">No Onion</span>
                  </label>
                </div>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="Additional instructions (optional)"
                  className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-foreground resize-none h-20"
                />
              </div>
            )}

            {/* Cooking Requests for Sweets */}
            {isSweetItem && (
              <div className="space-y-3 bg-gray-50 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-white/10">
                <p className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase">Cooking Requests</p>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cookingRequests.sugar}
                      onChange={(e) => setCookingRequests(prev => ({ ...prev, sugar: e.target.checked }))}
                      className="w-5 h-5 text-primary rounded"
                    />
                    <span className="text-foreground font-medium">Sugar</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cookingRequests.jaggery}
                      onChange={(e) => setCookingRequests(prev => ({ ...prev, jaggery: e.target.checked }))}
                      className="w-5 h-5 text-primary rounded"
                    />
                    <span className="text-foreground font-medium">Jaggery</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cookingRequests.dates}
                      onChange={(e) => setCookingRequests(prev => ({ ...prev, dates: e.target.checked }))}
                      className="w-5 h-5 text-primary rounded"
                    />
                    <span className="text-foreground font-medium">Dates</span>
                  </label>
                </div>
                <textarea
                  value={cookingInstructions}
                  onChange={(e) => setCookingInstructions(e.target.value)}
                  placeholder="Additional instructions (multilingual) - e.g., कम मीठा, Less sweet, etc."
                  className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-foreground resize-none h-20"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">You can type in Hindi, English, Urdu, or any other language</p>
              </div>
            )}

            <div className="flex items-center gap-4">
              {quantity === 0 ? (
                <button
                  onClick={handleAdd}
                  disabled={item.isAvailable === false}
                  className="flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-full font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25 disabled:opacity-50"
                >
                  <Plus size={20} /> Add to Cart
                </button>
              ) : (
                <div className="flex items-center gap-3 bg-gray-100 dark:bg-surface border border-gray-200 dark:border-white/10 rounded-xl p-2">
                  <button onClick={handleDecrement} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 text-foreground">
                    <Minus size={20} />
                  </button>
                  <span className="font-bold text-lg w-8 text-center text-foreground">{quantity}</span>
                  <button onClick={handleIncrement} className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary text-background">
                    <Plus size={20} />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Product Info */}
        {item.productInfo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 mb-16"
          >
            {item.productInfo.fullDescription && (
              <section>
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Description</h3>
                <p className="text-gray-600 dark:text-gray-400">{item.productInfo.fullDescription}</p>
              </section>
            )}
            {item.productInfo.ingredients?.length > 0 && (
              <section className="bg-white dark:bg-surface/50 p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">Ingredients</h3>
                <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 text-sm space-y-1">{item.productInfo.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}</ul>
              </section>
            )}
            {item.productInfo.nutritionalFacts && Object.keys(item.productInfo.nutritionalFacts).length > 0 && (
              <section>
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Nutritional Facts</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-surface">
                        <th className="text-left p-3 text-foreground">Nutrient</th>
                        <th className="text-left p-3 text-foreground">Per 100g</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(item.productInfo.nutritionalFacts).map(([k, v]) => (
                        <tr key={k} className="border-t border-gray-200 dark:border-white/5">
                          <td className="p-3 text-foreground">{k}</td>
                          <td className="p-3 text-gray-500 dark:text-gray-400">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
            {item.productInfo.healthBenefits && (
              <section>
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Health Benefits</h3>
                <p className="text-gray-600 dark:text-gray-400">{item.productInfo.healthBenefits}</p>
              </section>
            )}
            {item.productInfo.storage && (
              <section className="bg-white dark:bg-surface/50 p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">Storage</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{item.productInfo.storage}</p>
              </section>
            )}
          </motion.div>
        )}

        {/* You may also like */}
        {related.length > 0 && (
          <section className="border-t border-gray-200 dark:border-white/10 pt-16">
            <h2 className="text-3xl font-serif font-bold mb-8 text-gray-900 dark:text-white">You May Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {related.map((r) => (
                <Link
                  key={r.id}
                  to={`/menu/product/${r.id}`}
                  className="block bg-white dark:bg-surface rounded-2xl overflow-hidden border border-gray-100 dark:border-white/5 hover:border-primary/50 transition-all hover:-translate-y-1 shadow-md dark:shadow-none hover:shadow-xl group"
                >
                  <div className="aspect-square">
                    <img src={MENU_IMAGE_OVERRIDES[r.name] ?? r.image} alt={r.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                  <div className="p-3">
                    <p className="font-bold text-gray-900 dark:text-white truncate group-hover:text-primary">{r.name}</p>
                    <p className="text-primary text-sm">₹{r.price}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
