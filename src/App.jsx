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

// --- CONFIGURATION ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

const INVENTORY = [
  { id: 1, name: 'Green Harvest', price: 180, category: 'Juices', requiresKitchen: true, emoji: '🥒', ingredients: 'Bottle Gourd, Cucumber, Red Apple' },
  { id: 2, name: 'Citrus Reset', price: 160, category: 'Juices', requiresKitchen: true, emoji: '🍊', ingredients: 'Orange, Carrot, Ginger' },
  { id: 3, name: 'Beet Vitality', price: 210, category: 'Juices', requiresKitchen: true, emoji: '🍎', ingredients: 'Beetroot, Lemon, Apple' },
  { id: 4, name: 'Pink Dragon', price: 240, category: 'Juices', requiresKitchen: true, emoji: '🌸', ingredients: 'Dragon Fruit, Apple, Mint' },
  { id: 5, name: 'Ginger Shot', price: 70, category: 'Shots', requiresKitchen: true, emoji: '🍯', ingredients: 'Ginger, Lemon, Honey' },
  { id: 6, name: 'Watermelon Zest', price: 130, category: 'Juices', requiresKitchen: true, emoji: '🍉', ingredients: 'Watermelon, Lime, Black Salt' },
  { id: 7, name: 'Mango Magic', price: 190, category: 'Juices', requiresKitchen: true, emoji: '🥭', ingredients: 'Alphonso Mango, Orange, Mint' },
  { id: 8, name: 'Golden Root', price: 160, category: 'Juices', requiresKitchen: true, emoji: '🏺', ingredients: 'Fresh Turmeric, Carrot, Black Pepper' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('pos');
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isDark, setIsDark] = useState(false);
  const [user, setUser] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // --- THEME ---
  const ui = {
    bg: isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900',
    card: isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200',
    inputBg: isDark ? 'bg-slate-800' : 'bg-slate-100',
    accent: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    textMuted: isDark ? 'text-slate-400' : 'text-slate-500'
  };

  // --- AUTH & DATA SYNC ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) { console.error("Auth fail", e); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const ordersRef = collection(db, 'artifacts', appId, 'public', 'data', 'orders');
    const unsubscribe = onSnapshot(ordersRef, (snapshot) => {
      setIsConnected(true);
      const fetched = snapshot.docs.map(doc => ({ ...doc.data(), timestamp: new Date(doc.data().timestamp) }));
      setOrders(fetched.sort((a, b) => b.timestamp - a.timestamp));
    }, () => setIsConnected(false));
    return () => unsubscribe();
  }, [user]);

  // --- LOGIC ---
  const filteredMenu = useMemo(() => 
    INVENTORY.filter(item => 
      (selectedCategory === 'All' || item.category === selectedCategory) &&
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    ), [searchQuery, selectedCategory]
  );

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const handleCheckout = async () => {
    if (cart.length === 0 || !isConnected) return;
    const orderId = `#ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder = {
      id: orderId,
      items: cart,
      total: cartTotal,
      status: 'pending',
      timestamp: new Date().toISOString()
    };
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId), newOrder);
    setCart([]);
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${ui.bg} font-sans`}>
      {/* 1. LEFT NAVIGATION (Fixed Width) */}
      <nav className={`w-20 flex flex-col items-center py-6 border-r ${ui.card}`}>
        <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-emerald-900/20">
            <ShoppingBag className="text-white" size={24} />
        </div>
        <div className="flex-1 space-y-4">
          {[
            { id: 'pos', icon: MonitorSmartphone, label: 'POS' },
            { id: 'kitchen', icon: ChefHat, label: 'KITCHEN' },
            { id: 'dashboard', icon: LayoutDashboard, label: 'STATS' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all ${
                activeTab === tab.id ? ui.accent : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <tab.icon size={22} />
              <span className="text-[10px] mt-1 font-bold">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* 2. MAIN CONTENT AREA (Flexible, Scrollable) */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className={`h-20 border-b flex items-center justify-between px-8 ${ui.card}`}>
          <div className="flex items-center space-x-4">
            {['All', 'Juices', 'Shots'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-2 rounded-full font-medium transition-all ${
                  selectedCategory === cat ? ui.accent : ui.inputBg
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-4">
             <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${ui.textMuted}`} size={18} />
                <input 
                  type="text"
                  placeholder="Search menu..."
                  className={`pl-10 pr-4 py-2 rounded-xl outline-none w-64 ${ui.inputBg}`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
             </div>
             <button onClick={() => setIsDark(!isDark)} className={`p-2 rounded-xl ${ui.inputBg}`}>
               {isDark ? <Sun size={20} /> : <Moon size={20} />}
             </button>
             <div className={`flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${isConnected ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500 animate-pulse'}`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                {isConnected ? 'Live' : 'Offline'}
             </div>
          </div>
        </header>

        {/* Dynamic View */}
        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'pos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredMenu.map(item => (
                <button 
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className={`p-6 rounded-3xl border text-left transition-all hover:scale-[1.02] active:scale-95 ${ui.card}`}
                >
                  <div className="text-4xl mb-4">{item.emoji}</div>
                  <h3 className="font-bold text-lg">{item.name}</h3>
                  <p className={`text-sm mb-4 h-10 overflow-hidden ${ui.textMuted}`}>{item.ingredients}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-emerald-600">₹{item.price}</span>
                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-orange-100 text-orange-600 uppercase">Fresh Prep</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'kitchen' && (
            <div className="space-y-4">
              {orders.filter(o => o.status === 'pending').map(order => (
                <div key={order.id} className={`p-6 rounded-3xl border ${ui.card}`}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-black text-xl">{order.id}</h3>
                    <button 
                      onClick={async () => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id), { status: 'completed' })}
                      className={`px-6 py-2 rounded-xl font-bold ${ui.accent}`}
                    >
                      Mark Done
                    </button>
                  </div>
                  <div className="space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                        <span><span className="font-bold text-emerald-600">{item.qty}x</span> {item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 3. RIGHT SIDEBAR (Fixed Width - THE CULPRIT) */}
      <aside className={`w-96 flex flex-col border-l shadow-2xl z-10 ${ui.card}`}>
        <div className="p-8 border-b">
          <h2 className="text-2xl font-black flex items-center">
            <ShoppingBag className="mr-3 text-emerald-600" /> Current Order
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-30">
              <PackageOpen size={64} className="mb-4" />
              <p className="font-bold">Cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center justify-between group">
                <div className="flex-1">
                  <h4 className="font-bold">{item.name}</h4>
                  <p className="text-emerald-600 font-bold">₹{item.price * item.qty}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button onClick={() => addToCart(item)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><Plus size={16} /></button>
                  <span className="font-bold w-4 text-center">{item.qty}</span>
                  <button 
                    onClick={() => setCart(prev => prev.map(i => i.id === item.id ? { ...i, qty: Math.max(0, i.qty - 1) } : i).filter(i => i.qty > 0))}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Minus size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-8 border-t space-y-4">
          <div className="flex justify-between text-lg">
            <span className={ui.textMuted}>Subtotal</span>
            <span className="font-bold">₹{cartTotal}</span>
          </div>
          <div className="flex justify-between text-2xl font-black pt-4 border-t">
            <span>Total</span>
            <span className="text-emerald-600">₹{cartTotal}</span>
          </div>
          <button 
            disabled={cart.length === 0 || !isConnected}
            onClick={handleCheckout}
            className={`w-full py-5 rounded-3xl text-xl font-black shadow-xl transition-all active:scale-95 disabled:opacity-50 ${ui.accent}`}
          >
            {isConnected ? 'CHECKOUT' : 'CONNECTING...'}
          </button>
        </div>
      </aside>
    </div>
  );
}