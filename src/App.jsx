import React, { useState, useMemo, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { 
  LayoutDashboard, 
  MonitorSmartphone, 
  ChefHat, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  Search,
  CheckCircle2,
  Clock,
  Banknote,
  TrendingUp,
  PackageOpen,
  Moon,
  Sun,
  AlertTriangle
} from 'lucide-react';

// --- MOCK DATA ---
const INVENTORY = [
  { id: 1, name: 'Green Harvest', price: 180, category: 'Juices', requiresKitchen: true, emoji: '🥒', ingredients: 'Bottle Gourd, Cucumber, Red Apple', tags: 'Liver Support | Alkalizing', benefits: 'High Vitamin C content to strengthen the immune system and brighten skin.' },
  { id: 2, name: 'Citrus Reset', price: 160, category: 'Juices', requiresKitchen: true, emoji: '🍊', ingredients: 'Orange, Carrot, Ginger', tags: 'Immunity | Vitamin C', benefits: 'Natural nitrates help improve blood circulation and athletic stamina.' },
  { id: 3, name: 'Beet Vitality', price: 210, category: 'Juices', requiresKitchen: true, emoji: '🍎', ingredients: 'Beetroot, Lemon, Apple', tags: 'Energy | Blood Flow', benefits: 'Packed with magnesium and antioxidants for healthy heart and glowing skin.' },
  { id: 4, name: 'Pink Dragon', price: 240, category: 'Juices', requiresKitchen: true, emoji: '🌸', ingredients: 'Dragon Fruit, Apple, Mint', tags: 'Glow | Anti-Oxidant', benefits: 'Anti-inflammatory properties that kickstart metabolism and settle the stomach.' },
  { id: 5, name: 'Ginger Shot', price: 70, category: 'Shots', requiresKitchen: true, emoji: '🫚', ingredients: 'Ginger, Lemon, Honey', tags: 'Metabolism | Digestion', benefits: 'Lycopene-rich hydration that helps muscle recovery after workouts.' },
  { id: 6, name: 'Watermelon Zest', price: 130, category: 'Juices', requiresKitchen: true, emoji: '🍉', ingredients: 'Watermelon, Lime, Black Salt', tags: 'Cooling | Rehydrating', benefits: 'Natural enzymes for gut health and high Vitamin A for eye health.' },
  { id: 7, name: 'Mango Magic', price: 190, category: 'Juices', requiresKitchen: true, emoji: '🥭', ingredients: 'Alphonso Mango, Orange, Mint', tags: 'Seasonal | Rich', benefits: 'Curcumin from turmeric provides powerful anti-inflammatory and brain-boosting benefits.' },
  { id: 8, name: 'Golden Root', price: 160, category: 'Juices', requiresKitchen: true, emoji: '🏺', ingredients: 'Fresh Turmeric, Carrot, Black Pepper', tags: 'Anti-inflammatory | Warm', benefits: 'Anthocyanins in berries help protect the heart and improve cognitive function.' },
  { id: 9, name: 'Berry Fusion', price: 260, category: 'Juices', requiresKitchen: true, emoji: '🍓', ingredients: 'Mixed Berries, Red Apple, Lemon', tags: 'Antioxidant | Heart Health', benefits: 'Contains bromelain from pineapple to aid digestion and reduce bloating.' },
  { id: 10, name: 'Paradise Punch', price: 150, category: 'Juices', requiresKitchen: true, emoji: '🍍', ingredients: 'Pineapple, Cucumber, Mint', tags: 'Tropical | Digestion', benefits: 'Fresh and tropical flavor profile.' }
];

const CATEGORIES = ['All', 'Juices', 'Shots'];

// 👇 Your Custom Firebase Keys 👇
const myFirebaseConfig = {
  apiKey: "AIzaSyAtKfJtMhNwy8A7dqOp4tPcKyja980RPMk",
  authDomain: "juicebarpos-9fa74.firebaseapp.com",
  projectId: "juicebarpos-9fa74",
  storageBucket: "juicebarpos-9fa74.firebasestorage.app",
  messagingSenderId: "314414981613",
  appId: "1:314414981613:web:091cbc8a62a4318fb5c7e4"
};

// We are strictly using YOUR database right now
const app = initializeApp(myFirebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "juicebarpos-9fa74"; // Using your project ID as the folder name

export default function App() {
  const [activeTab, setActiveTab] = useState('pos');
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [orderCounter, setOrderCounter] = useState(1);
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [isConnected, setIsConnected] = useState(false); // <--- ADDED: Connection tracking

  // --- THEME STATE ---
  const [isDark, setIsDark] = useState(false);
  const [accentColor, setAccentColor] = useState('emerald');

  // Dynamically map tailwind classes based on selected theme & mode
  const theme = useMemo(() => {
    const maps = {
      indigo: {
        bg: 'bg-indigo-600', bgHover: 'hover:bg-indigo-700',
        text: isDark ? 'text-indigo-400' : 'text-indigo-600',
        iconBg: isDark ? 'bg-indigo-900/50 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100',
        navActive: isDark ? 'bg-indigo-900/40 text-indigo-400' : 'bg-indigo-50 text-indigo-600',
      },
      emerald: {
        bg: 'bg-emerald-600', bgHover: 'hover:bg-emerald-700',
        text: isDark ? 'text-emerald-400' : 'text-emerald-600',
        iconBg: isDark ? 'bg-emerald-900/50 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100',
        navActive: isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-600',
      },
      rose: {
        bg: 'bg-rose-600', bgHover: 'hover:bg-rose-700',
        text: isDark ? 'text-rose-400' : 'text-rose-600',
        iconBg: isDark ? 'bg-rose-900/50 text-rose-400 group-hover:bg-rose-600 group-hover:text-white' : 'bg-rose-50 text-rose-600 group-hover:bg-rose-100',
        navActive: isDark ? 'bg-rose-900/40 text-rose-400' : 'bg-rose-50 text-rose-600',
      }
    };
    return maps[accentColor];
  }, [isDark, accentColor]);

  // Authenticate user
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Firebase Auth Error:", error);
        if (error.code === 'auth/configuration-not-found' || error.code === 'auth/admin-restricted-operation') {
          setAuthError("ACTION REQUIRED: Go to Firebase Console -> Authentication -> Sign-in method, and ensure 'Anonymous' is Enabled.");
        } else {
          setAuthError(`Auth Error: ${error.message}`);
        }
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Sync orders from cloud
  useEffect(() => {
    if (!user) {
      setIsConnected(false);
      return;
    }
    // 👇 CHANGED: Now pulling from a shared 'public' folder instead of a private 'user' folder
    const ordersRef = collection(db, 'artifacts', appId, 'public', 'data', 'orders');
    const unsubscribe = onSnapshot(ordersRef, (snapshot) => {
      setIsConnected(true); // <--- ADDED: Successfully connected and reading data!
      const fetchedOrders = [];
      snapshot.forEach(document => {
        const data = document.data();
        fetchedOrders.push({ ...data, timestamp: new Date(data.timestamp) });
      });
      fetchedOrders.sort((a, b) => b.timestamp - a.timestamp);
      setOrders(fetchedOrders);
      if (fetchedOrders.length > 0) {
        const maxCounter = Math.max(...fetchedOrders.map(o => parseInt(o.id.replace('#ORD-', ''), 10) || 0));
        setOrderCounter(maxCounter + 1);
      }
    }, (error) => {
      console.error("Firestore error:", error);
      setIsConnected(false);
      setAuthError(`Database Error: ${error.message} (Check Firestore Rules)`);
    });
    return () => unsubscribe();
  }, [user]);

  // --- POS LOGIC ---
  const addToCart = (item) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((cartItem) => cartItem.id === item.id);
      if (existingItem) {
        return prevCart.map((cartItem) =>
          cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem
        );
      }
      return [...prevCart, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id === id) {
          const newQuantity = item.quantity + delta;
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
        }
        return item;
      }).filter(item => item.quantity > 0)
    );
  };

  const removeFromCart = (id) => setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbygCEQ7oPxh4J_ffFfcLexZAfxUDp2IL6CTmYU23ts7c1qcviCFfgeA6Fq0QOIZFrNuAA/exec'; 

  const saveOrderToSheets = async (order) => {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') return;
    const orderDate = order.timestamp;
    const monthYear = orderDate.toLocaleString('default', { month: 'long', year: 'numeric' }); 
    const payload = new URLSearchParams({
      action: 'create', sheetName: monthYear, orderId: order.id,
      date: orderDate.toLocaleDateString(), time: orderDate.toLocaleTimeString(),
      items: order.items.map(i => `${i.quantity}x ${i.name}`).join(', '),
      total: order.total, status: order.status
    });
    try {
      await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: payload });
    } catch (error) { console.error("Sheets Error:", error); }
  };

  const updateOrderInSheets = async (orderId, newStatus, timestamp) => {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') return;
    const monthYear = timestamp.toLocaleString('default', { month: 'long', year: 'numeric' }); 
    const payload = new URLSearchParams({ action: 'update', sheetName: monthYear, orderId: orderId, status: newStatus });
    try {
      fetch(GOOGLE_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: payload }).catch(err => console.error(err));
    } catch (error) { console.error("Sheets Error:", error); }
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    // 👇 ADDED: Prevent checkout if database is disconnected so we don't ruin Google Sheets with duplicate IDs
    if (!isConnected) {
        setAuthError("Cannot checkout: Database is not connected! Please fix Firebase configuration first.");
        return;
    }

    const newOrder = {
      id: `#ORD-${String(orderCounter).padStart(4, '0')}`,
      items: [...cart], total: cartTotal, timestamp: new Date().toISOString(), 
      status: 'pending', hasKitchenItems: cart.some(item => item.requiresKitchen)
    };
    setCart([]);
    if (user) {
      // 👇 CHANGED: Saving new orders to the shared public folder
      const orderRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', newOrder.id);
      setDoc(orderRef, newOrder).catch(console.error);
    }
    saveOrderToSheets({ ...newOrder, timestamp: new Date(newOrder.timestamp) });
  };

  const completeOrder = (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    if (user) {
      // 👇 CHANGED: Updating orders in the shared public folder
      const orderRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId);
      updateDoc(orderRef, { status: 'completed' }).catch(console.error);
    }
    updateOrderInSheets(orderId, 'completed', order.timestamp);
  };

  const filteredItems = useMemo(() => {
    return INVENTORY.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const activeKitchenOrders = orders.filter(o => o.status === 'pending' && o.hasKitchenItems);
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const totalItemsSold = orders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);

  // --- UI THEME HELPER CLASSES ---
  const ui = {
    mainBg: isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800',
    panelBg: isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200',
    itemCard: isDark ? 'bg-slate-800 border-slate-700 hover:border-slate-500 shadow-slate-900/50 text-slate-100' : 'bg-white border-slate-100 hover:border-slate-300 shadow-sm text-slate-700',
    inputBg: isDark ? 'bg-slate-700 text-white placeholder-slate-400' : 'bg-slate-100 text-slate-800 placeholder-slate-500',
    cartItem: isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-100',
    cartControls: isDark ? 'bg-slate-800 border-slate-600 text-slate-300' : 'bg-white border-slate-200 text-slate-500',
    textMuted: isDark ? 'text-slate-400' : 'text-slate-500',
  };

  return (
    <div className={`relative flex h-screen font-sans transition-colors duration-200 ${ui.mainBg}`}>
      
      {/* ERROR BANNER */}
      {authError && (
        <div className="absolute top-0 left-0 w-full z-50 bg-red-600 text-white p-3 text-sm font-bold shadow-lg flex justify-between items-center">
          <div className="flex items-center">
            <AlertTriangle className="mr-2" size={20} />
            <span>{authError}</span>
          </div>
          <button onClick={() => setAuthError(null)} className="bg-red-800 hover:bg-red-900 px-4 py-1 rounded transition-colors">
            Dismiss
          </button>
        </div>
      )}

      {/* --- SIDEBAR NAVIGATION --- */}
      <nav className={`w-24 ${ui.panelBg} border-r flex flex-col items-center py-6 shadow-sm z-10 transition-colors duration-200`}>
        <div className={`w-12 h-12 ${theme.bg} rounded-xl flex items-center justify-center mb-10 text-white shadow-lg transition-colors`}>
          <ShoppingBag size={24} />
        </div>
        
        <div className="flex flex-col space-y-6 w-full">
          <NavItem icon={<MonitorSmartphone size={24} />} label="POS" isActive={activeTab === 'pos'} onClick={() => setActiveTab('pos')} isDark={isDark} theme={theme} />
          <NavItem icon={<ChefHat size={24} />} label="Kitchen" isActive={activeTab === 'kitchen'} onClick={() => setActiveTab('kitchen')} badge={activeKitchenOrders.length} isDark={isDark} theme={theme} />
          <NavItem icon={<LayoutDashboard size={24} />} label="Dashboard" isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} isDark={isDark} theme={theme} />
        </div>
      </nav>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 overflow-hidden">
        
        {/* === POS VIEW === */}
        {activeTab === 'pos' && (
          <div className="flex h-full">
            {/* Products Grid */}
            <div className="flex-1 flex flex-col h-full">
              {/* TOP BAR & THEME CONTROLS */}
              <div className={`p-6 ${ui.panelBg} border-b shadow-sm flex items-center justify-between z-0 transition-colors duration-200 ${authError ? 'mt-12' : ''}`}>
                
                {/* Categories */}
                <div className="flex space-x-2 overflow-x-auto no-scrollbar pb-2">
                  {CATEGORIES.map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                        selectedCategory === category 
                          ? `${theme.bg} text-white` 
                          : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                {/* Search & Theme Toggles */}
                <div className="flex items-center space-x-4">
                  <div className="relative w-64">
                    <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${ui.textMuted}`} size={18} />
                    <input 
                      type="text"
                      placeholder="Search menu..."
                      className={`w-full pl-10 pr-4 py-2 ${ui.inputBg} border-none rounded-full focus:ring-2 focus:ring-slate-400 outline-none transition-colors`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Theme Switches */}
                  <div className={`flex items-center space-x-2 pl-4 border-l ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                    
                    {/* 👇 ADDED: Database Status Indicator */}
                    <div className={`flex items-center mr-2 px-3 py-1.5 rounded-full border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <div className={`w-2.5 h-2.5 rounded-full mr-2 ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse'}`}></div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            {isConnected ? 'Live' : 'Offline'}
                        </span>
                    </div>

                    <button onClick={() => setIsDark(!isDark)} className={`p-2 rounded-full transition-colors ${isDark ? 'bg-slate-700 text-yellow-400' : 'bg-slate-100 text-slate-600'}`}>
                      {isDark ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <div className={`flex space-x-1 border rounded-full p-1 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                      {['indigo', 'emerald', 'rose'].map(c => (
                        <button 
                          key={c} 
                          onClick={() => setAccentColor(c)} 
                          className={`w-6 h-6 rounded-full transition-transform ${c==='indigo'?'bg-indigo-600':c==='emerald'?'bg-emerald-600':'bg-rose-600'} ${accentColor === c ? 'scale-110 ring-2 ring-offset-2 ' + (isDark?'ring-offset-slate-800 ring-slate-400':'ring-offset-white ring-slate-400') : 'opacity-70 hover:opacity-100'}`} 
                        />
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              {/* Items Grid */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredItems.map(item => (
                    <div 
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className={`p-4 rounded-2xl border cursor-pointer active:scale-95 flex flex-col items-center text-center group transition-all duration-200 ${ui.itemCard}`}
                    >
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-colors text-3xl ${theme.iconBg}`}>
                        {item.emoji}
                      </div>
                      <h3 className="font-semibold mb-1 leading-tight">{item.name}</h3>
                      <p className={`text-xs mb-2 h-8 overflow-hidden leading-tight ${ui.textMuted}`}>{item.ingredients}</p>
                      <p className={`font-bold ${theme.text}`}>₹{item.price.toFixed(2)}</p>
                      {item.requiresKitchen && (
                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full mt-2 ${isDark ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-500'}`}>
                          Fresh Prep
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cart Sidebar */}
            <div className={`w-96 ${ui.panelBg} border-l flex flex-col shadow-xl z-10 transition-colors duration-200 ${authError ? 'pt-12' : ''}`}>
              <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                <h2 className="text-xl font-bold flex items-center">
                  <ShoppingBag className={`mr-2 ${theme.text}`} size={20} /> Current Order
                </h2>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cart.length === 0 ? (
                  <div className={`h-full flex flex-col items-center justify-center space-y-4 ${ui.textMuted}`}>
                    <PackageOpen size={48} opacity={0.5} />
                    <p>Cart is empty</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className={`flex items-center justify-between p-3 rounded-xl border ${ui.cartItem}`}>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{item.name}</h4>
                        <p className={`text-sm font-medium ${theme.text}`}>₹{(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                      <div className={`flex items-center space-x-3 px-2 py-1 rounded-lg shadow-sm border ${ui.cartControls}`}>
                        <button onClick={() => updateQuantity(item.id, -1)} className={`hover:${theme.text} transition-colors`}>
                          <Minus size={16} />
                        </button>
                        <span className="font-bold w-4 text-center text-sm text-current">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className={`hover:${theme.text} transition-colors`}>
                          <Plus size={16} />
                        </button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="ml-3 text-red-400 hover:text-red-500 p-2 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className={`p-6 border-t ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`flex justify-between items-center mb-2 ${ui.textMuted}`}>
                  <span>Subtotal</span>
                  <span>₹{cartTotal.toFixed(2)}</span>
                </div>
                <div className={`flex justify-between items-center mb-6 ${ui.textMuted}`}>
                  <span>Tax (8%)</span>
                  <span>₹{(cartTotal * 0.08).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-6 text-xl font-bold">
                  <span>Total</span>
                  <span>₹{(cartTotal * 1.08).toFixed(2)}</span>
                </div>
                <button 
                  onClick={handleCheckout}
                  disabled={cart.length === 0}
                  className={`w-full ${theme.bg} ${theme.bgHover} text-white py-4 rounded-xl font-bold text-lg transition-colors disabled:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg`}
                >
                  Checkout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* === KITCHEN DISPLAY SYSTEM (KDS) === */}
        {activeTab === 'kitchen' && (
          <div className={`h-full flex flex-col ${authError ? 'pt-12' : ''}`}>
            <div className={`p-6 border-b flex justify-between items-center shadow-md ${ui.panelBg}`}>
              <h2 className="text-2xl font-bold flex items-center">
                <ChefHat className={`mr-3 ${theme.text}`} size={28} /> Kitchen Display
              </h2>
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                <Clock className={theme.text} size={18} />
                <span className="font-medium">{activeKitchenOrders.length} Active Orders</span>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-x-auto">
              <div className="flex space-x-6 min-w-max h-full">
                {activeKitchenOrders.length === 0 ? (
                  <div className={`w-full flex flex-col items-center justify-center ${ui.textMuted}`}>
                    <CheckCircle2 size={64} className="mb-4 opacity-50" />
                    <h3 className="text-xl">No active kitchen orders</h3>
                    <p>Great job team!</p>
                  </div>
                ) : (
                  activeKitchenOrders.map(order => (
                    <div key={order.id} className={`w-80 rounded-xl shadow-xl flex flex-col h-full max-h-[600px] border-t-8 border-orange-500 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                      <div className={`p-4 border-b flex justify-between items-center rounded-t-lg ${isDark ? 'border-slate-700 bg-slate-700/50' : 'border-slate-100 bg-orange-50/50'}`}>
                        <span className="font-black text-xl">{order.id}</span>
                        <span className={`text-sm font-bold px-2 py-1 rounded ${isDark ? 'bg-orange-900/50 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                          {order.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {order.items.filter(item => item.requiresKitchen).map(item => (
                          <div key={item.id} className={`flex items-start pb-4 border-b last:border-0 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                            <span className={`font-bold text-lg mr-3 w-8 h-8 flex items-center justify-center rounded ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
                              {item.quantity}x
                            </span>
                            <div className="flex-1">
                              <h4 className="font-bold text-lg leading-tight">{item.name}</h4>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className={`p-4 border-t rounded-b-xl ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        <button 
                          onClick={() => completeOrder(order.id)}
                          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center shadow-md shadow-green-200/50"
                        >
                          <CheckCircle2 className="mr-2" size={20} /> Mark Completed
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* === DASHBOARD VIEW === */}
        {activeTab === 'dashboard' && (
          <div className={`h-full overflow-y-auto p-8 ${authError ? 'pt-20' : ''}`}>
            <h2 className="text-2xl font-bold mb-8 flex items-center">
              <TrendingUp className={`mr-3 ${theme.text}`} size={28} /> Dashboard Overview
            </h2>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <StatCard title="Total Revenue" value={`₹${totalRevenue.toFixed(2)}`} icon={<Banknote size={24} />} themeColor="emerald" isDark={isDark} />
              <StatCard title="Total Orders" value={orders.length} icon={<ShoppingBag size={24} />} themeColor="indigo" isDark={isDark} />
              <StatCard title="Items Sold" value={totalItemsSold} icon={<PackageOpen size={24} />} themeColor="orange" isDark={isDark} />
            </div>

            {/* Recent Orders Table */}
            <div className={`rounded-2xl shadow-sm border overflow-hidden ${ui.panelBg}`}>
              <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                <h3 className="text-lg font-bold">Recent Transactions</h3>
              </div>
              {orders.length === 0 ? (
                <div className={`p-10 text-center ${ui.textMuted}`}>No transactions yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`text-sm ${isDark ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-50 text-slate-500'}`}>
                        <th className="p-4 font-semibold">Order ID</th>
                        <th className="p-4 font-semibold">Time</th>
                        <th className="p-4 font-semibold">Items</th>
                        <th className="p-4 font-semibold">Status</th>
                        <th className="p-4 font-semibold text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className={`border-b transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-700/30' : 'border-slate-50 hover:bg-slate-50/50'}`}>
                          <td className="p-4 font-medium">{order.id}</td>
                          <td className={`p-4 text-sm ${ui.textMuted}`}>
                            {order.timestamp.toLocaleTimeString()}
                          </td>
                          <td className={`p-4 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              order.status === 'completed' || !order.hasKitchenItems
                                ? isDark ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-700' 
                                : isDark ? 'bg-orange-900/40 text-orange-400' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {order.status === 'completed' || !order.hasKitchenItems ? 'Completed' : 'Prep'}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-right">
                            ₹{order.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

// --- HELPER COMPONENTS ---

function NavItem({ icon, label, isActive, onClick, badge, isDark, theme }) {
  return (
    <div className="relative group w-full px-2">
      <button 
        onClick={onClick}
        className={`w-full flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 ${
          isActive 
            ? theme.navActive
            : isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
        }`}
      >
        <div className={`mb-1 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
          {icon}
        </div>
        <span className="text-[10px] font-bold tracking-wide uppercase">{label}</span>
      </button>
      {badge > 0 && (
        <span className={`absolute top-2 right-4 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm border-2 ${isDark ? 'bg-orange-600 border-slate-800' : 'bg-orange-500 border-white'}`}>
          {badge}
        </span>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, themeColor, isDark }) {
  const colors = {
    emerald: isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600',
    indigo: isDark ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-50 text-indigo-600',
    orange: isDark ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-600',
  };

  return (
    <div className={`p-6 rounded-2xl shadow-sm border flex items-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className={`w-14 h-14 rounded-full flex items-center justify-center mr-4 ${colors[themeColor]}`}>
        {icon}
      </div>
      <div>
        <p className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{title}</p>
        <h4 className="text-2xl font-bold">{value}</h4>
      </div>
    </div>
  );
}