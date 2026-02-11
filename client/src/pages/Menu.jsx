import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import MenuCard from '../features/menu/MenuCard';
import { Search, ChevronDown, X, ShoppingBag, ChevronRight } from 'lucide-react';
import { useCartStore } from '../features/cart/cartStore';
import { cn } from '../lib/utils';

const SORT_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'featured', label: 'Featured' },
  { value: 'bestselling', label: 'Best Selling' },
  { value: 'name_asc', label: 'A → Z' },
  { value: 'name_desc', label: 'Z → A' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'date_asc', label: 'Date: Old to New' },
  { value: 'date_desc', label: 'Date: New to Old' },
];

const ITEMS_PER_PAGE = 12;

export default function Menu() {
  const [searchQuery, setSearchQuery] = useState('');
  const [menuItems, setMenuItems] = useState([]);
  const [categoryList, setCategoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vegFilter, setVegFilter] = useState(false);
  const [sortBy, setSortBy] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sortOpen, setSortOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [categoryPage, setCategoryPage] = useState({});
  const items = useCartStore((s) => s.items);
  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);

  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then((r) => r.json()).catch(() => []),
      fetch('/api/menu').then((r) => r.json()).catch(() => []),
    ]).then(([cats, menuData]) => {
      setMenuItems(menuData);
      if (cats?.length > 0) {
        setCategoryList(cats.map((c) => ({ name: c.name, displayOrder: c.displayOrder ?? 999 })));
        setExpandedCategories(new Set(cats.map((c) => c.name)));
      } else {
        const names = [...new Set(menuData.map((i) => i.category).filter(Boolean))].sort();
        setCategoryList(names.map((name, i) => ({ name, displayOrder: i })));
        setExpandedCategories(new Set(names));
      }
      setLoading(false);
    });
  }, []);

  const categories = categoryList.length > 0
    ? [...categoryList].sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999))
    : [...new Set(menuItems.map((i) => i.category).filter(Boolean))].sort().map((name, i) => ({ name, displayOrder: i }));

  const filteredAndSorted = useMemo(() => {
    let list = menuItems.filter(
      (item) =>
        item.isAvailable !== false &&
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (vegFilter === false || item.isVegetarian !== false) &&
        (selectedCategory === null || item.category === selectedCategory) &&
        (sortBy !== 'featured' || item.isFeatured === true) &&
        (sortBy !== 'bestselling' || (item.salesCount || 0) > 0)
    );

    const getPrice = (i) => {
      const opts = i.priceOptions || [];
      return opts.length > 0 ? Math.min(...opts.map((o) => o.price)) : i.price;
    };

    switch (sortBy) {
      case 'all':
        // Default: keep insertion order (or DB order)
        break;
      case 'featured':
        list = [...list].sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
        break;
      case 'bestselling':
        list = [...list].sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
        break;
      case 'name_asc':
        list = [...list].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        list = [...list].sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'price_asc':
        list = [...list].sort((a, b) => getPrice(a) - getPrice(b));
        break;
      case 'price_desc':
        list = [...list].sort((a, b) => getPrice(b) - getPrice(a));
        break;
      case 'date_asc':
        list = [...list].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
        break;
      case 'date_desc':
        list = [...list].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
      default:
        break;
    }
    return list;
  }, [menuItems, searchQuery, vegFilter, selectedCategory, sortBy]);

  const itemsByCategory = useMemo(() => {
    const map = new Map();
    filteredAndSorted.forEach((item) => {
      const cat = item.category || 'Other';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(item);
    });
    return map;
  }, [filteredAndSorted]);

  const getSortedCategoryItems = (categoryItems) => {
    if (!categoryItems || categoryItems.length === 0) return [];
    const getPrice = (i) => {
      const opts = i.priceOptions || [];
      return opts.length > 0 ? Math.min(...opts.map((o) => o.price)) : i.price;
    };
    const sorted = [...categoryItems];
    switch (sortBy) {
      case 'all':
        return sorted;
      case 'featured':
        return sorted.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
      case 'bestselling':
        return sorted.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
      case 'name_asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'name_desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case 'price_asc':
        return sorted.sort((a, b) => getPrice(a) - getPrice(b));
      case 'price_desc':
        return sorted.sort((a, b) => getPrice(b) - getPrice(a));
      case 'date_asc':
        return sorted.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      case 'date_desc':
        return sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      default:
        return sorted;
    }
  };

  const toggleCategory = (catName) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catName)) next.delete(catName);
      else next.add(catName);
      return next;
    });
  };

  const expandAll = () => setExpandedCategories(new Set(categories.map((c) => c.name)));
  const collapseAll = () => setExpandedCategories(new Set());

  const setPageForCategory = (catName, page) => {
    setCategoryPage((prev) => ({ ...prev, [catName]: page }));
  };

  useEffect(() => {
    setCategoryPage({});
  }, [sortBy, searchQuery, vegFilter, selectedCategory]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-surface/50 border-b border-gray-200 dark:border-white/5 py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-serif font-bold mb-3 md:mb-4 text-primary">
            Our Menu
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Fresh, nutritious meals crafted with care. Explore our curated selection.
          </p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="sticky top-16 md:top-20 z-40 bg-white/90 dark:bg-background/95 backdrop-blur-md border-b border-gray-100 dark:border-white/5 py-3 md:py-4 shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 flex flex-col gap-3 md:gap-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 md:gap-4">
            {/* Category chips – horizontally scrollable on mobile */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 lg:flex-wrap lg:overflow-visible">
              {categories.map((cat) => {
                const name = typeof cat === 'string' ? cat : cat.name;
                return (
                <button
                  key={name}
                  onClick={() => setSelectedCategory(selectedCategory === name ? null : name)}
                  className={cn(
                    'px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all border flex items-center gap-2 whitespace-nowrap',
                    selectedCategory === name ? 'bg-primary text-white border-primary shadow-md shadow-primary/25' : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/20'
                  )}
                >
                  {name}
                  {selectedCategory === name && <X size={14} className="opacity-80" />}
                </button>
              );})}
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="px-4 py-2 rounded-full text-sm font-bold border border-primary/50 text-primary hover:bg-primary/10"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-between lg:justify-end">
              <div className="relative w-full sm:w-64 lg:w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-white/10 border border-transparent dark:border-white/10 rounded-full pl-9 pr-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-black focus:ring-2 ring-primary/50 placeholder:text-gray-500"
                />
              </div>

              <div className="relative">
                <button
                  onClick={() => setSortOpen(!sortOpen)}
                  className="px-4 py-2 bg-gray-100 dark:bg-white/10 border border-transparent dark:border-white/10 rounded-full text-sm font-medium flex items-center gap-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ring-primary/50"
                >
                  {SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'Sort'} <ChevronDown size={16} className={cn('transition-transform', sortOpen && 'rotate-180')} />
                </button>
                <AnimatePresence>
                  {sortOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-1 w-56 bg-surface border border-gray-200 dark:border-white/10 rounded-xl shadow-xl py-1 z-50"
                    >
                      {SORT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setSortBy(opt.value);
                            setSortOpen(false);
                          }}
                          className={cn(
                            'w-full text-left px-4 py-2 text-sm text-foreground hover:bg-gray-100 dark:hover:bg-white/5',
                            sortBy === opt.value && 'text-primary font-bold'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

            <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className={cn('text-sm font-bold', vegFilter ? 'text-gray-500 dark:text-gray-400' : 'text-foreground')}>All</span>
              <button
                onClick={() => setVegFilter(!vegFilter)}
                className={cn(
                  'relative inline-flex h-7 w-14 items-center rounded-full transition-colors',
                  vegFilter ? 'bg-green-600' : 'bg-gray-600'
                )}
              >
                <span className={cn('inline-block h-5 w-5 rounded-full bg-white transition-transform', vegFilter ? 'translate-x-8' : 'translate-x-1')} />
              </button>
              <span className={cn('text-sm font-bold', vegFilter ? 'text-green-600' : 'text-gray-500 dark:text-gray-400')}>Veg Only</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-end">
              <Link
                to="/checkout"
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 text-primary border border-primary/50 font-bold hover:bg-primary/30 transition-colors"
              >
                <ShoppingBag size={18} /> View Cart {itemCount > 0 && `(${itemCount})`}
              </Link>
              <Link
                to="/checkout"
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-background font-bold hover:bg-accent transition-colors"
              >
                Checkout <ChevronRight size={18} />
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setVegFilter(false);
                  setSelectedCategory(null);
                  setSortBy('all');
                  setCategoryPage({});
                  // expand all categories again
                  setExpandedCategories(new Set(categories.map((c) => c.name)));
                }}
                className="text-xs font-medium px-3 py-1.5 rounded-full border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
              >
                Clear filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible category sections */}
      <div className="container mx-auto px-3 sm:px-4 mt-6 md:mt-8 pb-24">
        {loading ? (
          <div className="text-center py-16 md:py-20 text-gray-500 dark:text-gray-400 text-sm md:text-base">
            Loading menu...
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16 md:py-20 text-gray-600 dark:text-gray-500 text-sm md:text-base">
            No categories yet.
          </div>
        ) : (
          <div className="space-y-2 md:space-y-3">
            <div className="flex justify-end gap-2 mb-3 md:mb-4 text-xs sm:text-sm">
              <button onClick={expandAll} className="text-xs font-medium text-primary hover:underline">Expand all</button>
              <span className="text-gray-400">|</span>
              <button onClick={collapseAll} className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:underline">Collapse all</button>
            </div>
            {categories.map(({ name: catName }) => {
              const rawCategoryItems = itemsByCategory.get(catName) || [];
              const categoryItems = getSortedCategoryItems(rawCategoryItems);
              const count = categoryItems.length;
              const isExpanded = expandedCategories.has(catName);
              if (count === 0 && selectedCategory) return null;
              if (count === 0) {
                return (
                  <div key={catName} className="rounded-xl border border-gray-200 dark:border-white/5 bg-surface overflow-hidden">
                    <button type="button" onClick={() => toggleCategory(catName)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <span className="font-bold text-foreground">{catName}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <ChevronDown size={20} className={cn('text-gray-500 dark:text-gray-400 transition-transform', isExpanded && 'rotate-180')} />
                        <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/10 px-2.5 py-0.5 rounded-full font-medium min-w-[2rem] text-right">{count}</span>
                      </div>
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                          <div className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-white/5">No items matching your filters.</div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }
              const currentPage = categoryPage[catName] ?? 1;
              const totalPages = Math.ceil(count / ITEMS_PER_PAGE) || 1;
              const paginatedItems = categoryItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

              return (
                <div key={catName} className="rounded-xl border border-gray-200 dark:border-white/5 bg-surface overflow-hidden">
                  <button type="button" onClick={() => toggleCategory(catName)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <span className="font-bold text-foreground">{catName}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <ChevronDown size={20} className={cn('text-gray-500 dark:text-gray-400 transition-transform', isExpanded && 'rotate-180')} />
                      <span className="text-sm font-medium text-primary bg-primary/10 dark:bg-primary/20 text-primary px-2.5 py-0.5 rounded-full min-w-[2rem] text-right">{count}</span>
                    </div>
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5 md:gap-6 p-4 sm:p-5 pt-2 border-t border-gray-100 dark:border-white/5">
                          {paginatedItems.map((item) => <MenuCard key={item.id} item={item} />)}
                        </div>
                        {totalPages > 1 && (
                          <div className="flex items-center justify-center gap-2 py-4 px-5 border-t border-gray-100 dark:border-white/5">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setPageForCategory(catName, Math.max(1, currentPage - 1)); }}
                              disabled={currentPage === 1}
                              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-white/20 text-foreground text-sm font-medium"
                            >
                              Prev
                            </button>
                            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                              Page {currentPage} of {totalPages}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setPageForCategory(catName, Math.min(totalPages, currentPage + 1)); }}
                              disabled={currentPage === totalPages}
                              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-white/20 text-foreground text-sm font-medium"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
        {!loading && categories.length > 0 && filteredAndSorted.length === 0 && (
          <div className="text-center py-16 md:py-20 text-gray-600 dark:text-gray-500 text-sm md:text-base">
            No dishes found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}
