import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MenuCard from '../features/menu/MenuCard';
import apiUrl from '../lib/apiUrl';

export default function Featured() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(apiUrl('/api/menu'))
      .then((r) => r.json())
      .then((data) => {
        const featured = (data || []).filter((i) => i.isFeatured).concat(
          (data || []).filter((i) => !i.isFeatured).sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0)).slice(0, 12)
        );
        setItems(featured.slice(0, 20));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background pt-24 pb-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-primary mb-4">Featured Products</h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">Our most popular and recommended dishes</p>
        </div>
        {loading ? (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">Loading...</div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {items.map((item) => (
              <MenuCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            <p>No featured products yet.</p>
            <Link to="/menu" className="text-primary font-bold hover:underline mt-4 inline-block">Browse full menu</Link>
          </div>
        )}
      </div>
    </div>
  );
}
