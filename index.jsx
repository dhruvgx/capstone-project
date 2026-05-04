import React, { useState, useEffect, useContext, createContext, useMemo } from 'react';
import { 
  ShoppingCart, Heart, User, Search, Star, Menu, X, 
  ArrowLeft, Trash2, Plus, Minus, CheckCircle, LogOut, 
  ChevronDown, CreditCard, Truck, ShieldCheck
} from 'lucide-react';

// ==========================================
// 1. CONTEXTS (State Management & Routing)
// ==========================================

const RouterContext = createContext();
const AuthContext = createContext();
const ShopContext = createContext();
const ToastContext = createContext();

// Toast Provider for Notifications
const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-3 rounded shadow-lg text-white font-medium flex items-center gap-2 transform transition-all ${t.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {t.type === 'success' && <CheckCircle size={18} />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// Custom Router Provider
const RouterProvider = ({ children }) => {
  const [currentPath, setCurrentPath] = useState('/');
  const [params, setParams] = useState({});

  const navigate = (path, newParams = {}) => {
    setCurrentPath(path);
    setParams(newParams);
    window.scrollTo(0, 0);
  };

  return (
    <RouterContext.Provider value={{ currentPath, params, navigate }}>
      {children}
    </RouterContext.Provider>
  );
};

// Authentication Provider (LocalStorage Session)
const AuthProvider = ({ children }) => {
  const { addToast } = useContext(ToastContext);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('ama_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('ama_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('ama_user');
    }
  }, [user]);

  const login = (email, password) => {
    // Mock login
    const mockUser = { id: 1, name: email.split('@')[0], email };
    setUser(mockUser);
    addToast('Successfully logged in!');
  };

  const logout = () => {
    setUser(null);
    addToast('Logged out successfully.', 'info');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Shop Provider (API, Cart, Wishlist, Search, Filters)
const ShopProvider = ({ children }) => {
  const { addToast } = useContext(ToastContext);
  
  // API State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortOrder, setSortOrder] = useState('default');

  // Persisted State
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('ama_cart');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [wishlist, setWishlist] = useState(() => {
    const saved = localStorage.getItem('ama_wishlist');
    return saved ? JSON.parse(saved) : [];
  });

  // Fetch Fake API Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [prodRes, catRes] = await Promise.all([
          fetch('https://fakestoreapi.com/products'),
          fetch('https://fakestoreapi.com/products/categories')
        ]);
        
        if (!prodRes.ok || !catRes.ok) throw new Error("Failed to fetch data");
        
        const prods = await prodRes.json();
        const cats = await catRes.json();
        
        setProducts(prods);
        setCategories(cats);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Save Cart & Wishlist to LocalStorage
  useEffect(() => {
    localStorage.setItem('ama_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('ama_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  // Cart Functions
  const addToCart = (product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...prev, { ...product, quantity }];
    });
    addToast('Added to Cart');
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
    addToast('Removed from Cart', 'info');
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const clearCart = () => setCart([]);

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cart]);

  const cartItemCount = useMemo(() => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  }, [cart]);

  // Wishlist Functions
  const toggleWishlist = (product) => {
    setWishlist(prev => {
      const isWishlisted = prev.some(item => item.id === product.id);
      if (isWishlisted) {
        return prev.filter(item => item.id !== product.id);
      } else {
        addToast('Added to Wishlist');
        return [...prev, product];
      }
    });
  };

  const isWishlisted = (id) => wishlist.some(item => item.id === id);

  return (
    <ShopContext.Provider value={{
      products, categories, loading, error,
      searchQuery, setSearchQuery,
      selectedCategory, setSelectedCategory,
      sortOrder, setSortOrder,
      cart, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, cartItemCount,
      wishlist, toggleWishlist, isWishlisted
    }}>
      {children}
    </ShopContext.Provider>
  );
};

// ==========================================
// 2. REUSABLE UI COMPONENTS
// ==========================================

const Button = ({ children, onClick, variant = 'primary', className = '', fullWidth = false }) => {
  const baseStyle = "px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2";
  const widthStyle = fullWidth ? "w-full" : "";
  
  const variants = {
    primary: "bg-yellow-400 hover:bg-yellow-500 text-black",
    secondary: "bg-orange-500 hover:bg-orange-600 text-white",
    outline: "border border-gray-300 hover:bg-gray-50 text-gray-700",
    danger: "bg-red-500 hover:bg-red-600 text-white",
    ghost: "hover:bg-gray-100 text-gray-700"
  };

  return (
    <button onClick={onClick} className={`${baseStyle} ${variants[variant]} ${widthStyle} ${className}`}>
      {children}
    </button>
  );
};

const RatingStars = ({ rating }) => {
  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star 
          key={star} 
          size={14} 
          className={star <= Math.round(rating?.rate || 0) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"} 
        />
      ))}
      <span className="text-blue-600 text-xs ml-1 hover:underline cursor-pointer">
        {rating?.count || 0}
      </span>
    </div>
  );
};

const ProductCard = ({ product }) => {
  const { navigate } = useContext(RouterContext);
  const { addToCart, toggleWishlist, isWishlisted } = useContext(ShopContext);

  return (
    <div className="bg-white p-4 flex flex-col gap-3 relative border border-gray-200 rounded-lg hover:shadow-xl transition-shadow group">
      <button 
        onClick={() => toggleWishlist(product)}
        className="absolute top-3 right-3 p-1.5 bg-white rounded-full shadow-sm hover:bg-gray-50 z-10"
      >
        <Heart size={18} className={isWishlisted(product.id) ? "fill-red-500 text-red-500" : "text-gray-400"} />
      </button>

      <div 
        className="h-48 w-full cursor-pointer flex items-center justify-center overflow-hidden bg-white"
        onClick={() => navigate('/product', { id: product.id })}
      >
        <img src={product.image} alt={product.title} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300" />
      </div>

      <div className="flex flex-col flex-grow">
        <h3 
          className="text-sm font-medium text-gray-900 line-clamp-2 cursor-pointer hover:text-blue-600"
          onClick={() => navigate('/product', { id: product.id })}
        >
          {product.title}
        </h3>
        
        <div className="mt-1">
          <RatingStars rating={product.rating} />
        </div>
        
        <div className="mt-2 text-xl font-bold text-gray-900">
          ₹{product.price.toFixed(2)}
        </div>
        
        <p className="text-xs text-gray-500 mt-1 uppercase">Free Delivery</p>
      </div>

      <Button onClick={() => addToCart(product)} variant="primary" fullWidth className="mt-auto text-sm py-1.5">
        Add to Cart
      </Button>
    </div>
  );
};

// ==========================================
// 3. PAGE COMPONENTS
// ==========================================

const HomePage = () => {
  const { products, categories, loading, error, searchQuery, selectedCategory, setSelectedCategory, sortOrder, setSortOrder } = useContext(ShopContext);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (searchQuery) {
      result = result.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    if (selectedCategory !== 'all') {
      result = result.filter(p => p.category === selectedCategory);
    }

    if (sortOrder === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortOrder === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortOrder === 'rating') {
      result.sort((a, b) => b.rating.rate - a.rating.rate);
    }

    return result;
  }, [products, searchQuery, selectedCategory, sortOrder]);

  if (loading) return <div className="p-8 text-center text-xl font-semibold">Loading Amazing Deals...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Filters & Sorting Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm mb-6 border border-gray-200">
        <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <span className="font-semibold text-gray-700 whitespace-nowrap">Filter:</span>
          <button 
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${selectedCategory === 'all' ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            All Products
          </button>
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-sm capitalize whitespace-nowrap ${selectedCategory === cat ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto mt-4 md:mt-0 justify-end">
          <span className="text-sm font-medium text-gray-600">Sort by:</span>
          <select 
            value={sortOrder} 
            onChange={(e) => setSortOrder(e.target.value)}
            className="border-gray-300 rounded-md text-sm py-1 pl-2 pr-8 border focus:ring-slate-500 focus:border-slate-500"
          >
            <option value="default">Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Avg. Customer Review</option>
          </select>
        </div>
      </div>

      {/* Results Header */}
      {searchQuery && (
        <h2 className="text-xl mb-4 font-medium">
          {filteredProducts.length} results for <span className="text-orange-600 font-semibold">"{searchQuery}"</span>
        </h2>
      )}

      {/* Product Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-500">
          <Search size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-xl">No products found matching your criteria.</p>
          <Button onClick={() => {setSearchQuery(''); setSelectedCategory('all');}} className="mt-4 mx-auto" variant="outline">
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
};

const ProductPage = () => {
  const { params, navigate } = useContext(RouterContext);
  const { products, addToCart, toggleWishlist, isWishlisted } = useContext(ShopContext);
  const [qty, setQty] = useState(1);
  
  const product = products.find(p => p.id === params.id);

  if (!product) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Product not found</h2>
        <Button onClick={() => navigate('/')} className="mt-4 mx-auto">Return to Home</Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <button onClick={() => navigate('/')} className="flex items-center text-sm text-blue-600 hover:underline mb-6">
        <ArrowLeft size={16} className="mr-1" /> Back to results
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-10">
          
          {/* Image Gallery (Simplified) */}
          <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg relative">
            <button 
              onClick={() => toggleWishlist(product)}
              className="absolute top-4 right-4 p-2 bg-white rounded-full shadow hover:bg-gray-100"
            >
              <Heart size={24} className={isWishlisted(product.id) ? "fill-red-500 text-red-500" : "text-gray-400"} />
            </button>
            <img src={product.image} alt={product.title} className="w-full max-w-sm object-contain h-[400px]" />
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            <p className="text-sm text-blue-600 capitalize hover:underline cursor-pointer mb-2 font-semibold">
              {product.category}
            </p>
            <h1 className="text-2xl md:text-3xl font-medium text-gray-900 leading-tight mb-2">
              {product.title}
            </h1>
            
            <div className="flex items-center gap-4 border-b border-gray-200 pb-4 mb-4">
              <RatingStars rating={product.rating} />
            </div>

            <div className="mb-6">
              <span className="text-sm text-gray-500 align-top">₹</span>
              <span className="text-4xl font-semibold text-gray-900">{product.price.toString().split('.')[0]}</span>
              <span className="text-sm text-gray-500 align-top">
                {product.price.toString().split('.')[1] ? `.${product.price.toString().split('.')[1]}` : '.00'}
              </span>
            </div>

            <p className="text-gray-700 text-base leading-relaxed mb-6">
              {product.description}
            </p>

            {/* Action Box */}
            <div className="border border-gray-200 rounded-lg p-5 bg-gray-50 flex flex-col gap-4 mt-auto">
              <div className="text-green-700 font-medium text-lg">In Stock</div>
              
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Quantity:</span>
                <div className="flex items-center border border-gray-300 rounded-md bg-white">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-1 hover:bg-gray-100 text-gray-600">-</button>
                  <span className="px-4 py-1 border-x border-gray-300 font-medium">{qty}</span>
                  <button onClick={() => setQty(qty + 1)} className="px-3 py-1 hover:bg-gray-100 text-gray-600">+</button>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <Button onClick={() => addToCart(product, qty)} variant="primary" className="py-3 rounded-full">
                  Add to Cart
                </Button>
                <Button onClick={() => { addToCart(product, qty); navigate('/checkout'); }} variant="secondary" className="py-3 rounded-full">
                  Buy Now
                </Button>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                <ShieldCheck size={16} /> Secure transaction
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const CartPage = () => {
  const { cart, updateQuantity, removeFromCart, cartTotal, cartItemCount } = useContext(ShopContext);
  const { navigate } = useContext(RouterContext);

  if (cart.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-white p-10 rounded-xl shadow-sm border border-gray-200">
          <ShoppingCart size={64} className="mx-auto text-gray-300 mb-6" />
          <h2 className="text-2xl font-semibold mb-2">Your Amazon Cart is empty</h2>
          <p className="text-gray-500 mb-6">Shop today's deals or find something you'll love.</p>
          <Button onClick={() => navigate('/')} className="mx-auto" variant="primary">Continue Shopping</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
      {/* Cart Items list */}
      <div className="flex-grow bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-end border-b border-gray-200 pb-4 mb-4">
          <h1 className="text-2xl md:text-3xl font-medium">Shopping Cart</h1>
          <span className="text-gray-500 text-sm hidden sm:block">Price</span>
        </div>

        <div className="flex flex-col gap-6">
          {cart.map(item => (
            <div key={item.id} className="flex flex-col sm:flex-row gap-4 border-b border-gray-100 pb-6 last:border-0 last:pb-0">
              <div className="w-full sm:w-40 h-40 flex-shrink-0 cursor-pointer" onClick={() => navigate('/product', { id: item.id })}>
                <img src={item.image} alt={item.title} className="w-full h-full object-contain" />
              </div>
              
              <div className="flex-grow flex flex-col">
                <div className="flex justify-between">
                  <h3 className="text-lg font-medium text-gray-900 cursor-pointer hover:text-blue-600 line-clamp-2 pr-4" onClick={() => navigate('/product', { id: item.id })}>
                    {item.title}
                  </h3>
                  <p className="text-lg font-bold whitespace-nowrap block sm:hidden">₹{item.price.toFixed(2)}</p>
                </div>
                <p className="text-sm text-green-700 my-1">In Stock</p>
                <p className="text-xs text-gray-500 mb-4">Eligible for FREE Shipping</p>

                <div className="mt-auto flex flex-wrap items-center gap-4">
                  <div className="flex items-center border border-gray-300 rounded-md bg-gray-50">
                    <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-gray-200"><Minus size={16} /></button>
                    <span className="px-3 text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-gray-200"><Plus size={16} /></button>
                  </div>
                  <span className="text-gray-300">|</span>
                  <button onClick={() => removeFromCart(item.id)} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>

              <div className="hidden sm:block text-right">
                <p className="text-lg font-bold">₹{item.price.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="text-right border-t border-gray-200 pt-4 mt-4">
          <p className="text-lg">Subtotal ({cartItemCount} items): <span className="font-bold">₹{cartTotal.toFixed(2)}</span></p>
        </div>
      </div>

      {/* Checkout Sidebar */}
      <div className="w-full lg:w-80 flex-shrink-0">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 sticky top-4">
          <div className="flex items-center gap-2 text-green-700 mb-4 text-sm font-medium">
            <CheckCircle size={18} />
            Your order qualifies for FREE Shipping.
          </div>
          
          <p className="text-xl mb-6">
            Subtotal ({cartItemCount} items): <br/><span className="font-bold text-2xl">₹{cartTotal.toFixed(2)}</span>
          </p>

          <Button onClick={() => navigate('/checkout')} variant="primary" fullWidth className="py-2.5 rounded-full shadow-sm text-sm">
            Proceed to Checkout
          </Button>
        </div>
      </div>
    </div>
  );
};

const CheckoutPage = () => {
  const { cart, cartTotal, cartItemCount, clearCart } = useContext(ShopContext);
  const { user } = useContext(AuthContext);
  const { navigate } = useContext(RouterContext);
  const { addToast } = useContext(ToastContext);

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    address: '',
    city: '',
    zip: '',
    card: ''
  });

  if (cart.length === 0 && step !== 3) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">No items to checkout</h2>
        <Button onClick={() => navigate('/')} className="mx-auto">Return to Home</Button>
      </div>
    );
  }

  const handlePlaceOrder = (e) => {
    e.preventDefault();
    setStep(3);
    clearCart();
    addToast('Order placed successfully!');
  };

  if (step === 3) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-white p-10 rounded-xl shadow-sm border border-green-200">
          <CheckCircle size={80} className="mx-auto text-green-500 mb-6" />
          <h2 className="text-3xl font-bold mb-2">Order Placed, Thank You!</h2>
          <p className="text-gray-600 mb-8">Confirmation will be sent to your email. Your items will be shipped soon.</p>
          <Button onClick={() => navigate('/')} variant="primary" className="mx-auto">Continue Shopping</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
      <div className="flex-grow space-y-6">
        <h1 className="text-3xl font-medium mb-6">Checkout</h1>

        {/* Form Container */}
        <form id="checkout-form" onSubmit={handlePlaceOrder} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-8">
          
          {/* Section 1 */}
          <div>
            <h2 className="text-xl font-medium mb-4 flex items-center gap-2"><Truck size={20} className="text-orange-500"/> Shipping Address</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input required type="text" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full border-gray-300 border rounded-md px-3 py-2 focus:ring-slate-500 focus:border-slate-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input required type="text" value={formData.address} onChange={e=>setFormData({...formData, address: e.target.value})} className="w-full border-gray-300 border rounded-md px-3 py-2 focus:ring-slate-500 focus:border-slate-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input required type="text" value={formData.city} onChange={e=>setFormData({...formData, city: e.target.value})} className="w-full border-gray-300 border rounded-md px-3 py-2 focus:ring-slate-500 focus:border-slate-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                <input required type="text" value={formData.zip} onChange={e=>setFormData({...formData, zip: e.target.value})} className="w-full border-gray-300 border rounded-md px-3 py-2 focus:ring-slate-500 focus:border-slate-500" />
              </div>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Section 2 */}
          <div>
            <h2 className="text-xl font-medium mb-4 flex items-center gap-2"><CreditCard size={20} className="text-blue-500"/> Payment Method</h2>
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-1">Credit Card Number (Mock)</label>
              <input required type="text" placeholder="0000 0000 0000 0000" value={formData.card} onChange={e=>setFormData({...formData, card: e.target.value})} className="w-full border-gray-300 border rounded-md px-3 py-2 focus:ring-slate-500 focus:border-slate-500 font-mono" />
              <div className="flex gap-4 mt-4">
                 <div className="flex-1">
                   <label className="block text-sm text-gray-600 mb-1">Expiry</label>
                   <input required type="text" placeholder="MM/YY" className="w-full border-gray-300 border rounded-md px-3 py-2" />
                 </div>
                 <div className="flex-1">
                   <label className="block text-sm text-gray-600 mb-1">CVC</label>
                   <input required type="password" placeholder="123" className="w-full border-gray-300 border rounded-md px-3 py-2" />
                 </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Order Summary Sidebar */}
      <div className="w-full md:w-80 flex-shrink-0">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm sticky top-4">
          <Button type="submit" form="checkout-form" variant="primary" fullWidth className="py-3 rounded-md shadow-sm mb-4">
            Place your order
          </Button>
          <p className="text-xs text-center text-gray-500 mb-6">By placing your order, you agree to Amazon's privacy notice and conditions of use.</p>
          
          <h3 className="font-medium text-lg mb-4">Order Summary</h3>
          <div className="space-y-2 text-sm text-gray-600 border-b border-gray-200 pb-4 mb-4">
            <div className="flex justify-between">
              <span>Items ({cartItemCount}):</span>
              <span>₹{cartTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping & handling:</span>
              <span>₹0.00</span>
            </div>
            <div className="flex justify-between">
              <span>Estimated tax:</span>
              <span>₹{(cartTotal * 0.08).toFixed(2)}</span>
            </div>
          </div>
          
          <div className="flex justify-between font-bold text-xl text-red-700">
            <span>Order total:</span>
            <span>₹{(cartTotal * 1.08).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const WishlistPage = () => {
  const { wishlist, removeFromWishlist } = useContext(ShopContext);
  const { navigate } = useContext(RouterContext);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-medium mb-6">Your Wishlist</h1>
      
      {wishlist.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
          <Heart size={64} className="mx-auto text-gray-300 mb-4" />
          <p className="text-xl text-gray-600 mb-6">Your wishlist is empty.</p>
          <Button onClick={() => navigate('/')} className="mx-auto" variant="outline">Browse Products</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {wishlist.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

const ProfilePage = () => {
  const { user, login, logout } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-16 p-8 bg-white rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-3xl font-medium mb-6">Sign in</h2>
        <form onSubmit={(e) => { e.preventDefault(); login(email, password); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input required type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all" />
          </div>
          <Button type="submit" variant="primary" fullWidth className="mt-6 py-2.5">Continue</Button>
        </form>
        <p className="text-xs text-gray-600 mt-6">
          By continuing, you agree to Amazon's Conditions of Use and Privacy Notice.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-medium">Your Account</h1>
        <Button onClick={logout} variant="ghost" className="text-red-600 hover:bg-red-50"><LogOut size={18}/> Sign Out</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start gap-4">
           <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
             <User size={32} className="text-gray-400" />
           </div>
           <div>
             <h3 className="text-xl font-medium">{user.name}</h3>
             <p className="text-gray-500">{user.email}</p>
             <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">Prime Member</span>
           </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm md:col-span-2">
          <h3 className="text-lg font-medium border-b border-gray-100 pb-3 mb-4">Recent Orders (Demo)</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border border-gray-100 rounded bg-gray-50">
              <div>
                <p className="text-sm font-medium">Order #113-482910-1239</p>
                <p className="text-xs text-gray-500">Placed on Oct 24, 2023</p>
              </div>
              <span className="text-sm text-green-600 font-medium bg-green-50 px-2 py-1 rounded">Delivered</span>
            </div>
            <div className="flex items-center justify-between p-3 border border-gray-100 rounded bg-gray-50">
              <div>
                <p className="text-sm font-medium">Order #113-984212-5551</p>
                <p className="text-xs text-gray-500">Placed on Sep 12, 2023</p>
              </div>
              <span className="text-sm text-green-600 font-medium bg-green-50 px-2 py-1 rounded">Delivered</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. LAYOUT & NAVIGATION
// ==========================================

const Navbar = () => {
  const { navigate } = useContext(RouterContext);
  const { cartItemCount, searchQuery, setSearchQuery } = useContext(ShopContext);
  const { user } = useContext(AuthContext);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(localSearch);
    navigate('/');
  };

  return (
    <header className="bg-slate-900 text-white w-full sticky top-0 z-40">
      <div className="max-w-[1500px] mx-auto px-4 py-2 flex items-center justify-between gap-4">
        
        {/* Logo */}
        <div 
          onClick={() => navigate('/')} 
          className="flex flex-col cursor-pointer border border-transparent hover:border-white rounded p-1"
        >
          <span className="text-2xl font-bold tracking-tight">Amazon<span className="text-yellow-400">.</span></span>
        </div>

        {/* Search Bar - Hidden on mobile, shown on md+ */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-grow max-w-3xl mx-4 relative rounded-md overflow-hidden">
          <input 
            type="text" 
            placeholder="Search Amazon" 
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full py-2 px-4 text-black outline-none border-none"
          />
          <button type="submit" className="bg-yellow-400 hover:bg-yellow-500 px-4 flex items-center justify-center text-black transition-colors">
            <Search size={20} />
          </button>
        </form>

        {/* Right Actions */}
        <div className="flex items-center gap-1 sm:gap-4">
          
          <div onClick={() => navigate('/profile')} className="flex flex-col justify-center cursor-pointer border border-transparent hover:border-white rounded p-1 md:p-2">
            <span className="text-[11px] leading-tight text-gray-300 hidden md:block">
              {user ? `Hello, ${user.name}` : 'Hello, sign in'}
            </span>
            <span className="text-sm font-bold leading-tight flex items-center gap-1">
              Account & Lists <ChevronDown size={14} className="hidden md:block"/>
            </span>
          </div>

          <div onClick={() => navigate('/wishlist')} className="flex flex-col justify-center cursor-pointer border border-transparent hover:border-white rounded p-1 md:p-2">
             <span className="text-[11px] leading-tight text-gray-300 hidden md:block">Returns</span>
             <span className="text-sm font-bold leading-tight flex items-center gap-1">
               <Heart size={18} className="md:hidden" /> <span className="hidden md:block">& Orders</span>
             </span>
          </div>

          <div onClick={() => navigate('/cart')} className="flex items-center cursor-pointer border border-transparent hover:border-white rounded p-1 md:p-2 relative">
            <div className="relative flex items-center">
              <ShoppingCart size={32} />
              <span className="absolute -top-1 left-3 bg-yellow-400 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cartItemCount}
              </span>
            </div>
            <span className="text-sm font-bold mt-3 hidden md:block">Cart</span>
          </div>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="md:hidden px-4 pb-3">
        <form onSubmit={handleSearch} className="flex flex-grow relative rounded-md overflow-hidden">
          <input 
            type="text" 
            placeholder="Search Amazon" 
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full py-2 px-4 text-black outline-none border-none"
          />
          <button type="submit" className="bg-yellow-400 px-4 flex items-center justify-center text-black">
            <Search size={20} />
          </button>
        </form>
      </div>

      {/* Sub Navbar */}
      <div className="bg-slate-800 text-white px-4 py-1 flex items-center text-sm gap-4 overflow-x-auto whitespace-nowrap scrollbar-hide">
        <div className="flex items-center gap-1 cursor-pointer hover:border-white border border-transparent p-1 rounded font-bold">
          <Menu size={18} /> All
        </div>
        {['Today\'s Deals', 'Customer Service', 'Registry', 'Gift Cards', 'Sell'].map(item => (
          <div key={item} className="cursor-pointer hover:border-white border border-transparent p-1 rounded">
            {item}
          </div>
        ))}
      </div>
    </header>
  );
};

const Footer = () => (
  <footer className="bg-slate-900 text-white mt-auto">
    <div className="bg-slate-800 hover:bg-slate-700 transition-colors text-center py-4 cursor-pointer text-sm" onClick={() => window.scrollTo(0,0)}>
      Back to top
    </div>
    <div className="max-w-[1000px] mx-auto py-10 px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
      <div>
        <h4 className="font-bold text-lg mb-4">Get to Know Us</h4>
        <ul className="space-y-2 text-gray-300">
          <li className="hover:underline cursor-pointer">Careers</li>
          <li className="hover:underline cursor-pointer">Blog</li>
          <li className="hover:underline cursor-pointer">About Amazon</li>
        </ul>
      </div>
      <div>
        <h4 className="font-bold text-lg mb-4">Make Money with Us</h4>
        <ul className="space-y-2 text-gray-300">
          <li className="hover:underline cursor-pointer">Sell products on Amazon</li>
          <li className="hover:underline cursor-pointer">Become an Affiliate</li>
          <li className="hover:underline cursor-pointer">Advertise Your Products</li>
        </ul>
      </div>
      <div>
        <h4 className="font-bold text-lg mb-4">Amazon Payment Products</h4>
        <ul className="space-y-2 text-gray-300">
          <li className="hover:underline cursor-pointer">Amazon Business Card</li>
          <li className="hover:underline cursor-pointer">Shop with Points</li>
          <li className="hover:underline cursor-pointer">Reload Your Balance</li>
        </ul>
      </div>
      <div>
        <h4 className="font-bold text-lg mb-4">Let Us Help You</h4>
        <ul className="space-y-2 text-gray-300">
          <li className="hover:underline cursor-pointer">Your Account</li>
          <li className="hover:underline cursor-pointer">Your Orders</li>
          <li className="hover:underline cursor-pointer">Help</li>
        </ul>
      </div>
    </div>
    <div className="border-t border-slate-700 py-6 text-center text-gray-400 text-xs">
       © 2023-2026, Amazon.com, Inc. or its affiliates (Mock UI Clone by AI)
    </div>
  </footer>
);

// ==========================================
// 5. MAIN APP COMPONENT
// ==========================================

const AppContent = () => {
  const { currentPath } = useContext(RouterContext);

  // Simple Switch Router
  const renderRoute = () => {
    switch (currentPath) {
      case '/': return <HomePage />;
      case '/product': return <ProductPage />;
      case '/cart': return <CartPage />;
      case '/checkout': return <CheckoutPage />;
      case '/wishlist': return <WishlistPage />;
      case '/profile': return <ProfilePage />;
      default: return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans flex flex-col text-gray-900">
      <Navbar />
      <main className="flex-grow">
        {renderRoute()}
      </main>
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <ShopProvider>
          <RouterProvider>
            <AppContent />
          </RouterProvider>
        </ShopProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

import ReactDOM from 'react-dom/client';
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);