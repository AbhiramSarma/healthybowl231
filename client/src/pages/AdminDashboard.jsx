import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Save, Trash, Plus, MessageSquare, CheckCircle, ArrowUp, ArrowDown, X, Trash2, Download, Check } from 'lucide-react';
import { io } from 'socket.io-client';
import ThemeToggle from '../components/ThemeToggle';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const socket = io(SOCKET_URL);

// Helper function to build API URL
const apiUrl = (endpoint) => {
    const base = API_BASE_URL.replace(/\/$/, ''); // Remove trailing slash
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return base ? `${base}${path}` : path;
};

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('orders'); // menu | tickets | orders
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [orders, setOrders] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [newCategoryName, setNewCategoryName] = useState('');
    const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
    const [editingCategoryId, setEditingCategoryId] = useState(null);
    const [editingCategoryName, setEditingCategoryName] = useState('');
    const [selectedCategories, setSelectedCategories] = useState(new Set());
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [newOrderNotification, setNewOrderNotification] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const isAdmin = localStorage.getItem('isAdmin');
        if (!isAdmin) navigate('/admin');

        fetchItems();
        fetchCategories();
        fetchTickets();
        fetchOrders();

        // Socket.io real-time updates
        socket.on('new_order', (newOrder) => {
            console.log('New order received:', newOrder);
            setNewOrderNotification(true);
            fetchOrders(); // Refresh orders list
            fetchItems(); // Also refresh menu items in case they were updated
            // Auto-hide notification after 5 seconds
            setTimeout(() => setNewOrderNotification(false), 5000);
        });

        socket.on('admin_order_update', (updatedOrder) => {
            console.log('Order updated:', updatedOrder);
            fetchOrders(); // Refresh orders list
        });

        // Also keep polling as backup (every 5 seconds)
        const interval = setInterval(() => {
            fetchItems();
            fetchTickets();
            fetchOrders();
        }, 5000);

        return () => {
            socket.off('new_order');
            socket.off('admin_order_update');
            clearInterval(interval);
        };
    }, []);

    const fetchItems = () => {
        fetch(apiUrl('/api/menu'))
            .then(res => res.json())
            .then(data => setItems(data))
            .catch(err => console.error('Failed to fetch menu:', err));
    };

    const fetchCategories = () => {
        fetch(apiUrl('/api/categories'))
            .then(res => res.json())
            .then(data => setCategories(data))
            .catch(err => console.error('Failed to fetch categories:', err));
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) {
            alert('Please enter a category name');
            return;
        }

        try {
            const res = await fetch(apiUrl('/api/categories'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newCategoryName.trim() })
            });

            if (res.ok) {
                const newCategory = await res.json();
                const updatedCategories = [...categories, newCategory].sort((a, b) => a.displayOrder - b.displayOrder);
                setCategories(updatedCategories);
                setNewCategoryName('');
                setShowNewCategoryInput(false);
                return newCategory; // Return the new category
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to create category');
                return null;
            }
        } catch (error) {
            alert('Failed to create category');
            return null;
        }
    };

    const handleMoveCategory = async (categoryId, direction) => {
        const categoryIndex = categories.findIndex(c => c._id === categoryId);
        if (categoryIndex === -1) return;

        const newIndex = direction === 'up' ? categoryIndex - 1 : categoryIndex + 1;
        if (newIndex < 0 || newIndex >= categories.length) return;

        // Swap display orders
        const updatedCategories = [...categories];
        const temp = updatedCategories[categoryIndex].displayOrder;
        updatedCategories[categoryIndex].displayOrder = updatedCategories[newIndex].displayOrder;
        updatedCategories[newIndex].displayOrder = temp;

        // Update state optimistically
        setCategories(updatedCategories.sort((a, b) => a.displayOrder - b.displayOrder));

        // Save to server
        try {
            await fetch(apiUrl('/api/categories/reorder'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    categories: updatedCategories.map(cat => ({
                        id: cat._id,
                        displayOrder: cat.displayOrder
                    }))
                })
            });
            fetchCategories(); // Refresh to ensure consistency
        } catch (error) {
            alert('Failed to reorder categories');
            fetchCategories(); // Revert on error
        }
    };

    const handleEditCategory = (cat) => {
        setEditingCategoryId(cat._id);
        setEditingCategoryName(cat.name);
    };

    const handleSaveCategoryName = async () => {
        if (!editingCategoryId || !editingCategoryName.trim()) return;
        try {
            const res = await fetch(apiUrl(`/api/categories/${editingCategoryId}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editingCategoryName.trim() })
            });
            if (res.ok) {
                fetchCategories();
                fetchItems();
                setEditingCategoryId(null);
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to update');
            }
        } catch (e) {
            alert('Failed to update category');
        }
    };

    const handleBulkDeleteCategories = async () => {
        if (selectedCategories.size === 0) return;
        if (!window.confirm(`Delete ${selectedCategories.size} category(ies)?`)) return;
        try {
            await Promise.all([...selectedCategories].map((id) => fetch(apiUrl(`/api/categories/${id}`), { method: 'DELETE' })));
            setSelectedCategories(new Set());
            fetchCategories();
            fetchItems();
        } catch (e) {
            alert('Bulk delete failed');
        }
    };

    const handleBulkDeleteItems = async () => {
        if (selectedItems.size === 0) return;
        if (!window.confirm(`Delete ${selectedItems.size} dish(es)?`)) return;
        try {
            await Promise.all([...selectedItems].map((id) => fetch(apiUrl(`/api/menu/${id}`), { method: 'DELETE' })));
            setSelectedItems(new Set());
            fetchItems();
        } catch (e) {
            alert('Bulk delete failed');
        }
    };

    const toggleCategorySelect = (id) => {
        setSelectedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleItemSelect = (id) => {
        setSelectedItems((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleDeleteCategory = async (categoryId, categoryName) => {
        // Check if category has items
        const itemsInCategory = items.filter(item => item.category === categoryName);
        if (itemsInCategory.length > 0) {
            if (!window.confirm(`This category has ${itemsInCategory.length} item(s). Deleting it will remove the category but the items will remain. Are you sure you want to delete this category?`)) {
                return;
            }
        } else {
            if (!window.confirm(`Are you sure you want to delete the category "${categoryName}"? This action cannot be undone.`)) {
                return;
            }
        }

        try {
            const res = await fetch(apiUrl(`/api/categories/${categoryId}`), {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchCategories(); // Refresh categories
                fetchItems(); // Refresh items in case any were affected
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to delete category');
            }
        } catch (error) {
            alert('Failed to delete category');
        }
    };

    const fetchTickets = () => {
        fetch(apiUrl('/api/tickets'))
            .then(res => res.json())
            .then(data => setTickets(data));
    };

    const fetchOrders = () => {
        fetch(apiUrl('/api/admin/orders'))
            .then(res => res.json())
            .then(data => setOrders(data));
    };

    const handleEdit = (item) => {
        setEditingId(item.id);
        setEditForm(item);
    };

    const handleSave = async () => {
        const normalizedOpts = normalizePriceOptions(editForm.priceOptions);
        const payload = { ...editForm, priceOptions: normalizedOpts };
        if (normalizedOpts.length > 0) {
            payload.price = (normalizedOpts.find(o => o.isDefault) || normalizedOpts[0]).price;
        } else if (payload.price !== '' && payload.price != null) {
            payload.price = Number(payload.price);
        }
            const res = await fetch(apiUrl(`/api/menu/${editingId}`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            setEditingId(null);
            fetchItems(); // Refresh menu items
        } else {
            alert('Failed to update item');
        }
    };

    const updateOrderStatus = async (id, status) => {
        await fetch(apiUrl(`/api/orders/${id}/status`), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        fetchOrders();
    };

    const handleResolveTicket = async (id) => {
        await fetch(apiUrl(`/api/tickets/${id}`), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Resolved' })
        });
        fetchTickets();
    };

    const handleReopenTicket = async (id) => {
        await fetch(apiUrl(`/api/tickets/${id}`), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Open' })
        });
        fetchTickets();
    };

    const handleReplyTicket = async (id, reply) => {
        await fetch(apiUrl(`/api/tickets/${id}`), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminReply: reply })
        });
        fetchTickets();
    };

    const handleChange = (field, value) => {
        setEditForm(prev => ({ ...prev, [field]: value }));
    };

    const priceOptionsList = Array.isArray(editForm.priceOptions) ? editForm.priceOptions : [];

    const addPriceOption = () => {
        const opts = [...priceOptionsList, { label: '', price: '', isDefault: priceOptionsList.length === 0 }];
        setEditForm(prev => ({ ...prev, priceOptions: opts }));
    };

    const removePriceOption = (index) => {
        const opts = priceOptionsList.filter((_, i) => i !== index);
        if (opts.length > 0 && opts.every(o => !o.isDefault)) opts[0].isDefault = true;
        setEditForm(prev => ({ ...prev, priceOptions: opts }));
    };

    const updatePriceOption = (index, field, value) => {
        const opts = priceOptionsList.map((o, i) => (i === index ? { ...o, [field]: value } : o));
        setEditForm(prev => ({ ...prev, priceOptions: opts }));
    };

    const setDefaultPriceOption = (index) => {
        const opts = priceOptionsList.map((o, i) => ({ ...o, isDefault: i === index }));
        setEditForm(prev => ({ ...prev, priceOptions: opts }));
    };

    const normalizePriceOptions = (opts) => {
        if (!opts || !opts.length) return [];
        const list = opts
            .filter(o => o && String(o.label || '').trim() && (o.price !== '' && o.price != null))
            .map(o => ({ label: String(o.label).trim(), price: Number(o.price), isDefault: !!o.isDefault }));
        if (list.length && !list.some(o => o.isDefault)) list[0].isDefault = true;
        return list;
    };

    const handleDelete = async (itemId) => {
        if (!window.confirm('Are you sure you want to delete this dish? This action cannot be undone.')) {
            return;
        }
        try {
            const res = await fetch(apiUrl(`/api/menu/${itemId}`), {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchItems(); // Refresh menu items
            } else {
                alert('Failed to delete item');
            }
        } catch (error) {
            alert('Failed to delete item');
        }
    };

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-serif font-bold text-foreground">Admin Dashboard</h1>
                    <div className="flex items-center gap-4">
                        <ThemeToggle className="shrink-0" />
                        {newOrderNotification && (
                            <div className="bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-2 rounded-lg text-sm font-bold animate-pulse">
                                New Order Received! 🎉
                            </div>
                        )}
                        <button
                            onClick={() => {
                                localStorage.removeItem('isAdmin');
                                navigate('/admin');
                            }}
                            className="text-red-400 hover:text-red-300"
                        >
                            Logout
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-8 border-b border-gray-200 dark:border-white/10">
                    <button
                        onClick={() => setActiveTab('menu')}
                        className={`px-6 py-3 font-bold border-b-2 transition-colors ${activeTab === 'menu' ? 'border-primary text-primary' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-foreground'}`}
                    >
                        Menu Management
                    </button>
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`px-6 py-3 font-bold border-b-2 transition-colors ${activeTab === 'orders' ? 'border-primary text-primary' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-foreground'}`}
                    >
                        Orders
                        {orders.filter(o => o.status !== 'delivered').length > 0 && (
                            <span className="ml-2 bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                                {orders.filter(o => o.status !== 'delivered').length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('tickets')}
                        className={`px-6 py-3 font-bold border-b-2 transition-colors ${activeTab === 'tickets' ? 'border-primary text-primary' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-foreground'}`}
                    >
                        Support Tickets
                        {tickets.filter(t => t.status === 'Open').length > 0 && (
                            <span className="ml-2 bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                                {tickets.filter(t => t.status === 'Open').length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Menu Tab */}
                {activeTab === 'menu' && (
                    <div className="space-y-6">
                        {/* Category Management Section */}
                        <div className="bg-surface p-6 rounded-xl border border-gray-200 dark:border-white/5">
                            <h3 className="text-xl font-bold text-foreground mb-4">Manage Categories</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Edit names, reorder, or bulk delete categories.</p>
                            {selectedCategories.size > 0 && (
                                <button onClick={handleBulkDeleteCategories} className="mb-4 flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold">
                                    <Trash2 size={18} /> Delete {selectedCategories.size} selected
                                </button>
                            )}
                            <div className="space-y-2 mb-4">
                                {categories.length === 0 ? (
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">No categories yet. Create your first category below.</p>
                                ) : (
                                    categories.map((category, index) => (
                                        <div key={category._id} className="bg-gray-100 dark:bg-black/40 p-3 rounded-lg flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCategories.has(category._id)}
                                                    onChange={() => toggleCategorySelect(category._id)}
                                                    className="w-4 h-4"
                                                />
                                                {editingCategoryId === category._id ? (
                                                    <div className="flex gap-2">
                                                        <input
                                                            value={editingCategoryName}
                                                            onChange={(e) => setEditingCategoryName(e.target.value)}
                                                            className="bg-gray-200 dark:bg-black/60 border border-gray-300 dark:border-white/10 px-2 py-1 rounded text-foreground"
                                                            autoFocus
                                                        />
                                                        <button onClick={handleSaveCategoryName} className="text-green-600 dark:text-green-400">Save</button>
                                                        <button onClick={() => setEditingCategoryId(null)} className="text-gray-500 dark:text-gray-400">Cancel</button>
                                                    </div>
                                                ) : (
                                                    <span className="text-foreground font-medium">{category.name}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {editingCategoryId !== category._id && (
                                                    <button onClick={() => handleEditCategory(category)} className="p-1.5 bg-blue-600/20 rounded text-blue-400" title="Edit name"><Edit2 size={14} /></button>
                                                )}
                                                <button
                                                    onClick={() => handleMoveCategory(category._id, 'up')}
                                                    disabled={index === 0}
                                                    className="p-1.5 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-foreground"
                                                    title="Move up"
                                                >
                                                    <ArrowUp size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleMoveCategory(category._id, 'down')}
                                                    disabled={index === categories.length - 1}
                                                    className="p-1.5 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-foreground"
                                                    title="Move down"
                                                >
                                                    <ArrowDown size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCategory(category._id, category.name)}
                                                    className="p-1.5 bg-red-600/20 hover:bg-red-600/40 rounded transition-colors text-red-400"
                                                    title="Delete category"
                                                >
                                                    <Trash size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {showNewCategoryInput ? (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Enter new category name"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleCreateCategory()}
                                        className="flex-1 bg-gray-100 dark:bg-black/40 border border-gray-300 dark:border-white/10 p-2 rounded-lg text-foreground"
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleCreateCategory}
                                        className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold"
                                    >
                                        Add
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowNewCategoryInput(false);
                                            setNewCategoryName('');
                                        }}
                                        className="bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-foreground px-4 py-2 rounded-lg"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowNewCategoryInput(true)}
                                    className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                                >
                                    <Plus size={18} /> Add New Category
                                </button>
                            )}
                        </div>

                        {/* Add Item Button */}
                        <div className="bg-surface p-4 rounded-xl border border-gray-200 dark:border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-foreground">Add New Dish</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">Create a new menu item.</p>
                            </div>
                            <div className="flex gap-2 w-full md:w-auto">
                                <button
                                    onClick={() => {
                                        setEditingId('new');
                                        setEditForm({ 
                                            name: '', 
                                            price: '', 
                                            category: categories.length > 0 ? categories[0].name : '', 
                                            description: '', 
                                            image: '', 
                                            isAvailable: true,
                                            isVegetarian: true,
                                            isFeatured: false,
                                            salesCount: 0,
                                            productInfo: {},
                                            priceOptions: []
                                        });
                                        setShowNewCategoryInput(false);
                                        setNewCategoryName('');
                                    }}
                                    className="bg-primary text-black font-bold px-4 py-2 rounded-lg flex items-center gap-2 w-full md:w-auto justify-center hover:bg-white transition-colors"
                                >
                                    <Plus size={20} /> Add Item
                                </button>
                            </div>
                        </div>

                        {/* Add/Edit Form Context */}
                        {editingId === 'new' && (
                            <div className="bg-surface p-6 rounded-xl border border-primary/50 relative">
                                <h3 className="text-xl font-bold text-foreground mb-4">Create New Item</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input
                                        placeholder="Item Name"
                                        value={editForm.name}
                                        onChange={(e) => handleChange('name', e.target.value)}
                                        className="bg-gray-100 dark:bg-black/40 border border-gray-300 dark:border-white/10 p-3 rounded-lg text-foreground"
                                    />
                                    <input
                                        placeholder="Price"
                                        type="number"
                                        value={editForm.price}
                                        onChange={(e) => handleChange('price', e.target.value)}
                                        className="bg-gray-100 dark:bg-black/40 border border-gray-300 dark:border-white/10 p-3 rounded-lg text-foreground"
                                    />
                                    <div className="md:col-span-2">
                                        <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">Category</label>
                                        {showNewCategoryInput ? (
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Enter new category name"
                                                    value={newCategoryName}
                                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                                    onKeyPress={async (e) => {
                                                        if (e.key === 'Enter') {
                                                            const newCategory = await handleCreateCategory();
                                                            if (newCategory) {
                                                                handleChange('category', newCategory.name);
                                                            }
                                                        }
                                                    }}
                                                    className="flex-1 bg-gray-100 dark:bg-black/40 border border-gray-300 dark:border-white/10 p-3 rounded-lg text-foreground"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={async () => {
                                                        const newCategory = await handleCreateCategory();
                                                        if (newCategory) {
                                                            handleChange('category', newCategory.name);
                                                        }
                                                    }}
                                                    className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold"
                                                >
                                                    Add & Use
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setShowNewCategoryInput(false);
                                                        setNewCategoryName('');
                                                    }}
                                                    className="bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-foreground px-4 py-2 rounded-lg"
                                                >
                                                    <X size={20} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <select
                                                    value={editForm.category || ''}
                                                    onChange={(e) => {
                                                        if (e.target.value === '__NEW__') {
                                                            setShowNewCategoryInput(true);
                                                        } else {
                                                            handleChange('category', e.target.value);
                                                        }
                                                    }}
                                                    className="flex-1 bg-gray-100 dark:bg-black/40 border border-gray-300 dark:border-white/10 p-3 rounded-lg text-foreground"
                                                >
                                                    <option value="">Select a category</option>
                                                    {categories.length === 0 ? (
                                                        <option value="" disabled>No categories available</option>
                                                    ) : (
                                                        categories.map(cat => (
                                                            <option key={cat._id} value={cat.name}>{cat.name}</option>
                                                        ))
                                                    )}
                                                    <option value="__NEW__">+ Create New Category</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        placeholder="Image URL (http://...)"
                                        value={editForm.image}
                                        onChange={(e) => handleChange('image', e.target.value)}
                                        className="bg-gray-100 dark:bg-black/40 border border-gray-300 dark:border-white/10 p-3 rounded-lg text-foreground"
                                    />
                                    <textarea
                                        placeholder="Description"
                                        value={editForm.description}
                                        onChange={(e) => handleChange('description', e.target.value)}
                                        className="bg-gray-100 dark:bg-black/40 border border-gray-300 dark:border-white/10 p-3 rounded-lg text-foreground md:col-span-2 h-20"
                                    />
                                    <div className="md:col-span-2">
                                        <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">Type</label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="isVegetarian"
                                                    value="true"
                                                    checked={editForm.isVegetarian !== false}
                                                    onChange={() => handleChange('isVegetarian', true)}
                                                    className="w-4 h-4 text-primary"
                                                />
                                                <span className="text-foreground">Vegetarian</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="isVegetarian"
                                                    value="false"
                                                    checked={editForm.isVegetarian === false}
                                                    onChange={() => handleChange('isVegetarian', false)}
                                                    className="w-4 h-4 text-primary"
                                                />
                                                <span className="text-foreground">Non-Vegetarian</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={editForm.isFeatured} onChange={(e) => handleChange('isFeatured', e.target.checked)} className="w-4 h-4" />
                                                <span className="text-foreground">Featured</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={(editForm.salesCount || 0) > 0} onChange={(e) => handleChange('salesCount', e.target.checked ? 100 : 0)} className="w-4 h-4" />
                                                <span className="text-foreground">Best Selling</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">Quantity & Price options</label>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Add options like 250gm, 500gm, 1kg with different prices. Leave empty to use single price only.</p>
                                        <div className="space-y-2 mb-2">
                                            {priceOptionsList.map((opt, idx) => (
                                                <div key={idx} className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10">
                                                    <input
                                                        placeholder="e.g. 250gm, 500gm, 1kg"
                                                        value={opt.label || ''}
                                                        onChange={(e) => updatePriceOption(idx, 'label', e.target.value)}
                                                        className="w-32 bg-gray-100 dark:bg-black/40 border border-gray-300 dark:border-white/10 px-2 py-1.5 rounded text-foreground text-sm"
                                                    />
                                                    <input
                                                        type="number"
                                                        placeholder="Price"
                                                        value={opt.price === '' ? '' : opt.price}
                                                        onChange={(e) => updatePriceOption(idx, 'price', e.target.value === '' ? '' : Number(e.target.value))}
                                                        className="w-24 bg-gray-100 dark:bg-black/40 border border-gray-300 dark:border-white/10 px-2 py-1.5 rounded text-foreground text-sm"
                                                    />
                                                    <label className="flex items-center gap-1 text-sm text-foreground cursor-pointer shrink-0">
                                                        <input
                                                            type="radio"
                                                            name="defaultOption"
                                                            checked={!!opt.isDefault}
                                                            onChange={() => setDefaultPriceOption(idx)}
                                                            className="w-3.5 h-3.5"
                                                        />
                                                        Default
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => removePriceOption(idx)}
                                                        className="p-1.5 text-red-500 hover:bg-red-500/20 rounded transition-colors"
                                                        title="Remove option"
                                                    >
                                                        <Trash size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={addPriceOption}
                                            className="text-sm bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-foreground px-3 py-1.5 rounded-lg font-medium flex items-center gap-1"
                                        >
                                            <Plus size={14} /> Add quantity option
                                        </button>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">Full Description</label>
                                        <textarea placeholder="Product page description" value={editForm.productInfo?.fullDescription || ''} onChange={(e) => handleChange('productInfo', { ...editForm.productInfo, fullDescription: e.target.value })} className="bg-gray-100 dark:bg-black/40 border border-gray-300 dark:border-white/10 p-3 rounded-lg text-foreground w-full h-16" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">Ingredients (comma-separated)</label>
                                        <input placeholder="Ingredient1, Ingredient2" value={Array.isArray(editForm.productInfo?.ingredients) ? editForm.productInfo.ingredients.join(', ') : ''} onChange={(e) => handleChange('productInfo', { ...editForm.productInfo, ingredients: e.target.value ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : [] })} className="bg-gray-100 dark:bg-black/40 border border-gray-300 dark:border-white/10 p-3 rounded-lg text-foreground w-full" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">Health Benefits</label>
                                        <textarea placeholder="Health benefits" value={editForm.productInfo?.healthBenefits || ''} onChange={(e) => handleChange('productInfo', { ...editForm.productInfo, healthBenefits: e.target.value })} className="bg-gray-100 dark:bg-black/40 border border-gray-300 dark:border-white/10 p-3 rounded-lg text-foreground w-full h-16" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">Storage</label>
                                        <input placeholder="Storage instructions" value={editForm.productInfo?.storage || ''} onChange={(e) => handleChange('productInfo', { ...editForm.productInfo, storage: e.target.value })} className="bg-gray-100 dark:bg-black/40 border border-gray-300 dark:border-white/10 p-3 rounded-lg text-foreground w-full" />
                                    </div>
                                </div>
                                <div className="flex gap-4 mt-4">
                                    <button
                                        onClick={async () => {
                                            if (!editForm.category) {
                                                alert('Please select or create a category');
                                                return;
                                            }
                                            const normalizedOpts = normalizePriceOptions(editForm.priceOptions);
                                            const hasOptions = normalizedOpts.length > 0;
                                            if (!editForm.name) {
                                                alert('Please fill in item name');
                                                return;
                                            }
                                            if (!hasOptions && (editForm.price === '' || editForm.price == null)) {
                                                alert('Please fill in price, or add at least one quantity option with price');
                                                return;
                                            }
                                            const mainPrice = hasOptions
                                                ? (normalizedOpts.find(o => o.isDefault) || normalizedOpts[0]).price
                                                : Number(editForm.price);
                                            const newItem = { 
                                                ...editForm, 
                                                id: "item_" + Date.now(),
                                                price: mainPrice,
                                                priceOptions: normalizedOpts
                                            };
                                            const res = await fetch(apiUrl('/api/menu'), { 
                                                method: 'POST', 
                                                headers: { 'Content-Type': 'application/json' }, 
                                                body: JSON.stringify(newItem) 
                                            });
                                            if (res.ok) {
                                                setEditingId(null);
                                                setEditForm({});
                                                fetchItems(); // Refresh menu items
                                            } else {
                                                const error = await res.json();
                                                alert('Failed to create item: ' + (error.error || 'Unknown error'));
                                            }
                                        }}
                                        className="bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-2 rounded-lg"
                                    >
                                        Save Item
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setEditingId(null);
                                            setEditForm({});
                                            setShowNewCategoryInput(false);
                                            setNewCategoryName('');
                                        }} 
                                        className="bg-gray-200 dark:bg-white/10 text-foreground px-6 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-white/20"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {selectedItems.size > 0 && (
                            <button onClick={handleBulkDeleteItems} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold">
                                <Trash2 size={18} /> Delete {selectedItems.size} selected dishes
                            </button>
                        )}
                        <div className="grid gap-4">
                            {items.map(item => (
                                <div key={item.id} className="bg-surface p-4 rounded-xl border border-gray-200 dark:border-white/5 flex flex-col md:flex-row gap-4 items-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedItems.has(item.id)}
                                        onChange={() => toggleItemSelect(item.id)}
                                        className="w-4 h-4 flex-shrink-0"
                                    />
                                    <img src={item.image} alt={item.name} className="w-20 h-20 rounded-lg object-cover" />

                                    <div className="flex-1 w-full">
                                        {editingId === item.id ? (
                                            <div className="grid gap-2">
                                                <input
                                                    placeholder="Item Name"
                                                    value={editForm.name}
                                                    onChange={(e) => handleChange('name', e.target.value)}
                                                    className="bg-gray-100 dark:bg-black/40 border border-gray-300 dark:border-white/10 p-2 rounded text-foreground"
                                                />
                                                <input
                                                    placeholder="Price"
                                                    value={editForm.price}
                                                    type="number"
                                                    onChange={(e) => handleChange('price', e.target.value)}
                                                    className="bg-gray-100 dark:bg-black/40 border border-gray-300 dark:border-white/10 p-2 rounded text-foreground"
                                                />
                                                <div>
                                                    <label className="text-foreground text-sm mb-1 block">Cover Image URL:</label>
                                                    <input
                                                        placeholder="Image URL (http://...)"
                                                        value={editForm.image || ''}
                                                        onChange={(e) => handleChange('image', e.target.value)}
                                                        className="bg-gray-100 dark:bg-black/40 border border-gray-300 dark:border-white/10 p-2 rounded text-foreground w-full"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-foreground text-sm mb-1 block">Category:</label>
                                                    <select
                                                        value={editForm.category || ''}
                                                        onChange={(e) => handleChange('category', e.target.value)}
                                                        className="bg-gray-100 dark:bg-black/40 border border-gray-300 dark:border-white/10 p-2 rounded text-foreground w-full"
                                                    >
                                                        <option value="">Select a category</option>
                                                        {categories.map(cat => (
                                                            <option key={cat._id} value={cat.name}>{cat.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="flex items-center gap-4 flex-wrap">
                                                    <div className="flex items-center gap-2">
                                                        <label className="text-foreground text-sm">In Stock:</label>
                                                        <input
                                                            type="checkbox"
                                                            checked={editForm.isAvailable !== false}
                                                            onChange={(e) => handleChange('isAvailable', e.target.checked)}
                                                            className="w-5 h-5"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <label className="text-foreground text-sm">Featured:</label>
                                                        <input
                                                            type="checkbox"
                                                            checked={editForm.isFeatured || false}
                                                            onChange={(e) => handleChange('isFeatured', e.target.checked)}
                                                            className="w-5 h-5"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <label className="text-foreground text-sm">Best Selling:</label>
                                                        <input
                                                            type="checkbox"
                                                            checked={(editForm.salesCount || 0) > 0}
                                                            onChange={(e) => handleChange('salesCount', e.target.checked ? 100 : 0)}
                                                            className="w-5 h-5"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <label className="text-foreground text-sm">Type:</label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name={`isVegetarian-${item.id}`}
                                                            value="true"
                                                            checked={editForm.isVegetarian !== false}
                                                            onChange={() => handleChange('isVegetarian', true)}
                                                            className="w-4 h-4 text-primary"
                                                        />
                                                        <span className="text-foreground text-sm">Veg</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name={`isVegetarian-${item.id}`}
                                                            value="false"
                                                            checked={editForm.isVegetarian === false}
                                                            onChange={() => handleChange('isVegetarian', false)}
                                                            className="w-4 h-4 text-primary"
                                                        />
                                                        <span className="text-foreground text-sm">Non-Veg</span>
                                                    </label>
                                                </div>
                                                <div className="col-span-full">
                                                    <label className="text-foreground text-sm mb-1 block">Quantity & Price options</label>
                                                    <div className="space-y-2 mb-2">
                                                        {priceOptionsList.map((opt, idx) => (
                                                            <div key={idx} className="flex flex-wrap items-center gap-2 p-2 rounded bg-gray-100 dark:bg-black/30 border border-gray-200 dark:border-white/10">
                                                                <input
                                                                    placeholder="e.g. 250gm, 1kg"
                                                                    value={opt.label || ''}
                                                                    onChange={(e) => updatePriceOption(idx, 'label', e.target.value)}
                                                                    className="w-28 bg-gray-100 dark:bg-black/40 border border-gray-300 dark:border-white/10 px-2 py-1 rounded text-foreground text-sm"
                                                                />
                                                                <input
                                                                    type="number"
                                                                    placeholder="Price"
                                                                    value={opt.price === '' ? '' : opt.price}
                                                                    onChange={(e) => updatePriceOption(idx, 'price', e.target.value === '' ? '' : Number(e.target.value))}
                                                                    className="w-20 bg-gray-100 dark:bg-black/40 border border-gray-300 dark:border-white/10 px-2 py-1 rounded text-foreground text-sm"
                                                                />
                                                                <label className="flex items-center gap-1 text-sm text-foreground cursor-pointer shrink-0">
                                                                    <input type="radio" name={`defaultOpt-${item.id}`} checked={!!opt.isDefault} onChange={() => setDefaultPriceOption(idx)} className="w-3.5 h-3.5" />
                                                                    Default
                                                                </label>
                                                                <button type="button" onClick={() => removePriceOption(idx)} className="p-1 text-red-500 hover:bg-red-500/20 rounded" title="Remove"><Trash size={12} /></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <button type="button" onClick={addPriceOption} className="text-xs bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-foreground px-2 py-1 rounded font-medium flex items-center gap-1">
                                                        <Plus size={12} /> Add option
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <h3 className="text-xl font-bold text-foreground">{item.name}</h3>
                                                <p className="text-primary font-mono">
                                                    {item.priceOptions?.length ? `₹${Math.min(...item.priceOptions.map(o => o.price))} onwards` : `₹${item.price}`}
                                                </p>
                                                <div className="flex gap-2 mt-1 flex-wrap">
                                                    <span className="text-xs px-2 py-1 rounded bg-primary/20 text-primary border border-primary/50">
                                                        {item.category || 'Uncategorized'}
                                                    </span>
                                                    <span className={`text-xs px-2 py-1 rounded ${item.isAvailable !== false ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                        {item.isAvailable !== false ? 'In Stock' : 'Out of Stock'}
                                                    </span>
                                                    <span className={`text-xs px-2 py-1 rounded ${item.isVegetarian !== false ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                        {item.isVegetarian !== false ? 'Veg' : 'Non-Veg'}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        {editingId === item.id ? (
                                            <button onClick={handleSave} className="p-2 bg-green-600 rounded hover:bg-green-700 text-white"><Save size={20} /></button>
                                        ) : (
                                            <>
                                                <button onClick={() => handleEdit(item)} className="p-2 bg-blue-600 rounded hover:bg-blue-700 text-white"><Edit2 size={20} /></button>
                                                <button onClick={() => handleDelete(item.id)} className="p-2 bg-red-600 rounded hover:bg-red-700 text-white"><Trash size={20} /></button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tickets Tab */}
                {activeTab === 'tickets' && (
                    <div className="grid gap-4">
                        {tickets.length === 0 && <p className="text-gray-500 text-center py-10">No tickets found.</p>}
                        {tickets.map(ticket => (
                            <div key={ticket._id} className="bg-surface p-6 rounded-xl border border-gray-200 dark:border-white/5">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                            <MessageSquare size={18} className="text-primary" />
                                            {ticket.category}
                                        </h3>
                                        {(ticket.orderId) && <p className="text-sm text-gray-500 dark:text-gray-400">Order ID: #{ticket.orderId}</p>}
                                        <p className="text-xs text-gray-500 mt-1">{new Date(ticket.createdAt).toLocaleString()}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${ticket.status === 'Open' ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-500' : 'bg-green-500/20 text-green-600 dark:text-green-500'}`}>
                                        {ticket.status}
                                    </span>
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-black/20 p-4 rounded-lg mb-3">{ticket.details}</p>

                                {ticket.adminReply && (
                                    <div className="mb-3 bg-blue-500/5 border border-blue-500/30 rounded-lg p-3 text-sm text-blue-400">
                                        <span className="font-semibold">Admin reply: </span>
                                        {ticket.adminReply}
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <div className="flex flex-col md:flex-row gap-2">
                                        <textarea
                                            placeholder="Write a reply to the customer..."
                                            className="flex-1 bg-gray-100 dark:bg-black/40 border border-gray-300 dark:border-white/10 rounded-lg p-2 text-sm text-foreground min-h-[60px]"
                                            defaultValue={ticket.adminReply || ''}
                                            onBlur={(e) => {
                                                const value = e.target.value.trim();
                                                if (value !== (ticket.adminReply || '')) {
                                                    handleReplyTicket(ticket._id, value);
                                                }
                                            }}
                                        />
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {ticket.status === 'Open' ? (
                                            <button
                                                onClick={() => handleResolveTicket(ticket._id)}
                                                className="flex items-center gap-2 bg-gray-200 dark:bg-white/5 hover:bg-green-600 hover:text-white px-4 py-2 rounded-lg transition-colors text-foreground dark:text-gray-300 text-sm font-bold"
                                            >
                                                <CheckCircle size={16} /> Mark as Resolved
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleReopenTicket(ticket._id)}
                                                className="flex items-center gap-2 bg-gray-200 dark:bg-white/5 hover:bg-yellow-500 hover:text-white px-4 py-2 rounded-lg transition-colors text-foreground dark:text-gray-300 text-sm font-bold"
                                            >
                                                Reopen Ticket
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Orders Tab */}
                {activeTab === 'orders' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-foreground">All Orders</h2>
                            <button
                                onClick={() => {
                                    window.open(apiUrl('/api/admin/orders/export'), '_blank');
                                }}
                                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold transition-colors"
                            >
                                <Download size={18} /> Download CSV
                            </button>
                        </div>
                        {orders.length === 0 && <p className="text-gray-500 text-center py-10">No orders found.</p>}
                        <div className="grid gap-6">
                        {orders.map(order => (
                            <div key={order._id} className="bg-surface p-6 rounded-xl border border-gray-200 dark:border-white/5 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${order.status === 'delivered' ? 'bg-green-500/20 text-green-600 dark:text-green-500' :
                                        order.status === 'awaiting_confirmation' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-500' :
                                        order.status === 'received' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-500' :
                                            'bg-yellow-500/20 text-yellow-600 dark:text-yellow-500'
                                        }`}>
                                        {order.status.replace(/_/g, ' ')}
                                    </span>
                                </div>

                                <div className="mb-6">
                                    <h3 className="text-xl font-bold text-foreground mb-1">
                                        Order {order.orderId ? `#${order.orderId}` : `#${order._id.slice(-6)}`}
                                    </h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">{new Date(order.createdAt).toLocaleString()}</p>
                                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                        <p><span className="text-gray-500">Customer:</span> {order.customer?.name} ({order.customer?.phone})</p>
                                        {order.userId && typeof order.userId === 'object' && (
                                            <p><span className="text-gray-500">User ID:</span> {order.userId.name || order.userId.phone || order.userId._id}</p>
                                        )}
                                        <p><span className="text-gray-500">Address:</span> {order.customer?.address}</p>
                                    </div>
                                </div>

                                <div className="bg-gray-100 dark:bg-black/20 rounded-lg p-4 mb-6">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center mb-2 last:mb-0">
                                            <span className="text-gray-600 dark:text-gray-300">{item.quantity}x {item.name}</span>
                                            <span className="text-gray-500">₹{item.price * item.quantity}</span>
                                        </div>
                                    ))}
                                    <div className="border-t border-gray-200 dark:border-white/10 mt-3 pt-3 flex justify-between font-bold text-foreground">
                                        <span>Total</span>
                                        <span className="text-primary">₹{order.totalAmount}</span>
                                    </div>
                                </div>

                                {order.status === 'awaiting_confirmation' && order.paymentScreenshot && (
                                    <div className="mb-6 p-4 bg-amber-500/5 border border-amber-500/30 rounded-lg">
                                        <h4 className="text-sm font-bold text-amber-600 dark:text-amber-500 mb-2">Payment Screenshot</h4>
                                        <a href={apiUrl(order.paymentScreenshot)} target="_blank" rel="noopener noreferrer" className="block">
                                            <img src={apiUrl(order.paymentScreenshot)} alt="Payment screenshot" className="max-w-xs max-h-48 rounded-lg border border-gray-200 dark:border-white/10 object-contain cursor-pointer hover:opacity-90" />
                                        </a>
                                        <p className="text-xs text-gray-500 mt-2">Click image to view full size. Verify payment before confirming.</p>
                                    </div>
                                )}

                                <div className="flex gap-2 flex-wrap">
                                    {order.status === 'awaiting_confirmation' && (
                                        <button
                                            onClick={() => updateOrderStatus(order._id, 'received')}
                                            className="bg-green-600 hover:bg-green-500 text-white border border-green-500 px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                                        >
                                            <Check size={16} /> Order Confirmed
                                        </button>
                                    )}
                                    {order.status === 'received' && (
                                        <button
                                            onClick={() => updateOrderStatus(order._id, 'preparing')}
                                            className="bg-primary/20 hover:bg-primary/40 text-primary border border-primary/50 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                                        >
                                            Mark as Preparing
                                        </button>
                                    )}
                                    {order.status === 'preparing' && (
                                        <button
                                            onClick={() => updateOrderStatus(order._id, 'out_for_delivery')}
                                            className="bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-500 border border-yellow-500/50 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                                        >
                                            Mark Out for Delivery
                                        </button>
                                    )}
                                    {order.status === 'out_for_delivery' && (
                                        <button
                                            onClick={() => updateOrderStatus(order._id, 'delivered')}
                                            className="bg-green-500/20 hover:bg-green-500/40 text-green-500 border border-green-500/50 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                                        >
                                            Mark Delivered
                                        </button>
                                    )}
                                    {order.status === 'delivered' && (
                                        <span className="text-green-500 flex items-center gap-2 font-bold text-sm bg-green-500/10 px-4 py-2 rounded-full">
                                            <CheckCircle size={16} /> Order Completed
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
