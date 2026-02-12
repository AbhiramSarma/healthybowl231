import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/authStore';
import { Package, MessageSquare, ChevronRight, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiUrl from '../lib/apiUrl';

export default function Account() {
  const { isAuthenticated, user, token, init, verifyToken } = useAuthStore();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated && token) verifyToken();
    else if (!token) init();
  }, [isAuthenticated, token, init, verifyToken]);

  useEffect(() => {
    if (isAuthenticated && token) {
      Promise.all([
        fetch(apiUrl('/api/orders'), { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
        fetch(apiUrl('/api/user/tickets'), { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      ])
        .then(([ord, tkt]) => {
          setOrders(Array.isArray(ord) ? ord : []);
          setTickets(Array.isArray(tkt) ? tkt : []);
        })
        .catch(() => {
          setOrders([]);
          setTickets([]);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, token]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-20 px-4">
        <div className="container max-w-2xl mx-auto text-center py-20">
          <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-6">
            <LogIn className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-serif font-bold mb-2">Sign in to view your account</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Access your orders and support tickets.</p>
          <Link to="/login?redirect=/account" className="inline-block bg-primary text-background px-8 py-3 rounded-full font-bold hover:bg-accent transition-colors">
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-20 px-4">
      <div className="container max-w-4xl mx-auto">
        <h1 className="text-3xl font-serif font-bold mb-2">My Account</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">{user?.name} • {user?.phone}</p>

        {/* Past Orders */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Package size={24} className="text-primary" />
              Past Orders
            </h2>
            <Link to="/menu" className="text-primary text-sm font-bold hover:underline flex items-center gap-1">
              Order again <ChevronRight size={16} />
            </Link>
          </div>
          <div className="bg-surface border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : orders.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No orders yet.</div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-white/5">
                {orders.slice(0, 10).map((order) => (
                  <Link
                    key={order._id}
                    to={`/track-order?orderId=${order._id}`}
                    className="block p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-foreground">
                          Order #{order.orderId || order._id?.slice(-8)?.toUpperCase()}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString()} • ₹{order.totalAmount}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 truncate max-w-md">
                          {order.items?.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          order.status === 'delivered'
                            ? 'bg-green-500/20 text-green-400'
                            : order.status === 'out_for_delivery'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-yellow-500/20 text-yellow-500'
                        }`}
                      >
                        {order.status?.replace('_', ' ')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Support Tickets */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <MessageSquare size={24} className="text-primary" />
              Support Tickets
            </h2>
            <Link to="/support" className="text-primary text-sm font-bold hover:underline flex items-center gap-1">
              Create ticket <ChevronRight size={16} />
            </Link>
          </div>
          <div className="bg-surface border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No support tickets.</div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-white/5">
                {tickets.map((ticket) => (
                  <div key={ticket._id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-foreground">{ticket.category}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md">{ticket.details}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          ticket.status === 'Resolved' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-500'
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
