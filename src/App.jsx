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
  Search, 
  PackageOpen, 
  Moon, 
  Sun,
  Upload,
  Loader2,
  CheckCircle2,
  TrendingUp,
  Banknote
} from 'lucide-react';

// --- FIXED CONFIGURATION (Fixes the "Offline" issue on Vercel) ---
const myFirebaseConfig = {
  apiKey: "AIzaSyAtKfJtMhNwy8A7dqOp4tPcKyja980RPMk",
  authDomain: "juicebarpos-9fa74.firebaseapp.com",
  projectId: "juicebarpos-9fa74",
  storageBucket: "juicebarpos-9fa74.firebasestorage.app",
  messagingSenderId: "314414981613",
  appId: "1:314414981613:web:091cbc8a62a4318fb5c7e4"
};

const app = initializeApp(myFirebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "juicebarpos-9fa74";

// Google Script URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbygCEQ7oPxh4J_ffFfcLexZAfxUDp2IL6CTmYU23ts7c1qcviCFfgeA6Fq0QOIZFrNuAA/exec'; 

const INVENTORY = [
  { id: 1, name: 'Green Harvest', price: 180, category: 'Juices', emoji: '🥒', ingredients: 'Bottle Gourd, Cucumber, Red Apple' },
  { id: 2, name: 'Citrus Reset', price: 160, category: 'Juices', emoji: '🍊', ingredients: 'Orange, Carrot, Ginger' },
  { id: 3, name: 'Beet Vitality', price: 210, category: 'Juices', emoji: '🍎', ingredients: 'Beetroot, Lemon, Apple' },
  { id: 4, name: 'Pink Dragon', price: 240, category: 'Juices', emoji: '🌸', ingredients: 'Dragon Fruit, Apple, Mint' },
  { id: 5, name: 'Ginger Shot', price: 70, category: 'Shots', emoji: '🍯', ingredients: 'Ginger, Lemon, Honey' },
  { id: 6, name: 'Watermelon Zest', price: 130, category: 'Juices', emoji: '🍉', ingredients: 'Watermelon, Lime, Black Salt' },
  { id: 7, name: 'Mango Magic', price: 190, category: 'Juices', emoji: '🥭', ingredients: 'Alphonso Mango, Orange, Mint' },
  { id: 8, name: 'Golden Root', price: 160, category: 'Juices', emoji: '🏺', ingredients: 'Fresh Turmeric, Carrot, Black Pepper' }
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

  // --- WA CHECKOUT STATES ---
  const [address, setAddress] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [refId, setRefId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const ui = {
    bg: isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900',
    card: isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200',
    inputBg: isDark ? 'bg-slate-800' : 'bg-slate-100',
    accent: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    textMuted: isDark ? 'text-slate-400' : 'text-slate-500'
  };

  useEffect(() => {
    const initAuth = async () => {
      try { await signInAnonymously(auth); } catch (e) { console.error("Auth fail", e); }
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
  const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;

  // --- OCR & FILE UPLOAD LOGIC ---
  const apiKey = ""; 

  const extractRefId = async (base64Data, mimeType) => {
    setIsScanning(true);
    setErrorMsg('');
    let delay = 1000;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{
        role: "user",
        parts: [
          { text: "Extract the reference ID or transaction ID from this payment screenshot. Return ONLY the alphanumeric ID string. If none found, return 'NO_ID_FOUND'." },
          { inlineData: { mimeType: mimeType, data: base64Data } }
        ]
      }]
    };

    for (let i = 0; i < 5; i++) {
      try {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "NO_ID_FOUND";
        setRefId(text);
        setIsScanning(false);
        return;
      } catch (err) {
        if (i === 4) {
           setRefId("Scan Failed");
           setErrorMsg("Failed to extract Ref ID automatically. You can manually enter it in WA.");
           setIsScanning(false);
        } else {
           await new Promise(r => setTimeout(r, delay));
           delay *= 2;
        }
      }
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      setAttachment(result);
      const base64Data = result.split(',')[1];
      extractRefId(base64Data, file.type);
    };
    reader.readAsDataURL(file);
  };

  // --- GOOGLE SHEETS SYNC LOGIC ---
  const syncToSheets = async (order, action = 'create') => {
    if (!GOOGLE_SCRIPT_URL) return;
    const payload = new URLSearchParams({
      action: action,
      sheetName: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      orderId: order.id,
      date: new Date(order.timestamp).toLocaleDateString(),
      time: new Date(order.timestamp).toLocaleTimeString(),
      items: order.items.map(i => `${i.qty}x ${i.name}`).join(', '),
      total: order.total,
      status: order.status
    });
    try {
      fetch(`${GOOGLE_SCRIPT_URL}?${payload.toString()}`, { method: 'POST', mode: 'no-cors' });
    } catch (e) { console.error("Sheet sync failed", e); }
  };

  // --- WHATSAPP CHECKOUT LOGIC ---
  const handleCheckout = async () => {
    if (cart.length === 0 || !isConnected) return;
    
    if (!address.trim() || !attachment) {
       setErrorMsg("Please provide delivery address and payment screenshot.");
       return;
    }

    // Safely generate sequential Order ID by checking Firebase state
    let maxId = 0;
    orders.forEach(order => {
      const match = order.id.match(/#ORD-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxId) maxId = num;
      }
    });
    const orderId = `#ORD-${maxId + 1}`; // e.g., #ORD-1, #ORD-2, etc.

    const newOrder = {
      id: orderId,
      items: cart,
      total: cartTotal,
      status: 'pending',
      address: address,
      refId: refId,
      timestamp: new Date().toISOString()
    };
    
    // 1. Save to Firebase Database
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId), newOrder);

    // 2. Save to Google Sheets
    await syncToSheets(newOrder, 'create');

    // 3. Format WhatsApp Message
    const waMessage = `*New Order: ${orderId}*\n\n*Delivery Address:*\n${address}\n\n*Payment Ref ID:*\n${refId}\n\n*Order Details:*\n${cart.map(i => `${i.qty}x ${i.name} (₹${i.price * i.qty})`).join('\n')}\n\n*Total:* ₹${cartTotal}`;
    
    // 4. Open WhatsApp Link
    window.open(`https://wa.me/918328115683?text=${encodeURIComponent(waMessage)}`, '_blank');

    // 5. Reset Cart
    setCart([]);
    setAddress('');
    setAttachment(null);
    setRefId('');
    setErrorMsg('');
  };

  const markOrderDone = async (order) => {
    const updated = { ...order, status: 'completed', timestamp: order.timestamp };
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id), { status: 'completed' });
    await syncToSheets(updated, 'update');
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${ui.bg} font-sans`}>
      {/* 1. LEFT NAVIGATION - FIXED WIDTH */}
      <nav className={`w-20 flex-shrink-0 flex flex-col items-center py-6 border-r ${ui.card}`}>
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
              className={`relative w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all ${
                activeTab === tab.id ? ui.accent : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <tab.icon size={22} />
              {tab.id === 'kitchen' && pendingOrdersCount > 0 && (
                <span className="absolute top-0 right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 shadow-sm">
                  {pendingOrdersCount}
                </span>
              )}
              <span className="text-[10px] mt-1 font-bold">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* 2. MAIN CONTENT AREA - SQUISHABLE */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <header className={`h-20 flex-shrink-0 border-b flex items-center justify-between px-8 ${ui.card}`}>
          <div className="flex items-center space-x-4">
            {['All', 'Juices', 'Shots'].map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-6 py-2 rounded-full font-medium transition-all ${selectedCategory === cat ? ui.accent : ui.inputBg}`}>{cat}</button>
            ))}
          </div>
          <div className="flex items-center space-x-4">
             <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${ui.textMuted}`} size={18} />
                <input 
                  type="text" placeholder="Search..." 
                  className={`pl-10 pr-4 py-2 rounded-xl outline-none w-48 lg:w-64 ${ui.inputBg}`}
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                />
             </div>
             <button onClick={() => setIsDark(!isDark)} className={`p-2 rounded-xl ${ui.inputBg}`}>{isDark ? <Sun size={20} /> : <Moon size={20} />}</button>
             <div className={`flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${isConnected ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500 animate-pulse'}`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                {isConnected ? 'Live' : 'Offline'}
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          {activeTab === 'pos' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {filteredMenu.map(item => (
                <button key={item.id} onClick={() => addToCart(item)} className={`p-6 rounded-3xl border text-left transition-all hover:scale-[1.02] active:scale-95 ${ui.card}`}>
                  <div className="text-4xl mb-4">{item.emoji}</div>
                  <h3 className="font-bold text-lg">{item.name}</h3>
                  <p className={`text-sm mb-4 h-10 overflow-hidden line-clamp-2 ${ui.textMuted}`}>{item.ingredients}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-emerald-600">₹{item.price}</span>
                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-orange-100 text-orange-600 uppercase">Fresh</span>
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
                    <button onClick={() => markOrderDone(order)} className={`px-6 py-2 rounded-xl font-bold ${ui.accent}`}>Mark Done</button>
                  </div>
                  <div className="space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                        <span><span className="font-bold text-emerald-600">{item.qty}x</span> {item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className={`p-6 rounded-3xl border ${ui.card}`}>
                  <div className="flex items-center mb-2">
                    <Banknote className="mr-2 text-slate-500" size={20} />
                    <h3 className="text-slate-500 font-bold">Total Revenue</h3>
                  </div>
                  <p className="text-4xl font-black text-emerald-600">
                    ₹{orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.total, 0)}
                  </p>
                </div>
                <div className={`p-6 rounded-3xl border ${ui.card}`}>
                  <div className="flex items-center mb-2">
                    <TrendingUp className="mr-2 text-slate-500" size={20} />
                    <h3 className="text-slate-500 font-bold">Total Orders</h3>
                  </div>
                  <p className="text-4xl font-black">{orders.length}</p>
                </div>
              </div>
              <div className={`rounded-3xl border overflow-hidden ${ui.card}`}>
                <div className="p-6 border-b">
                  <h3 className="font-bold text-lg">Recent Transactions</h3>
                </div>
                <div className="p-0">
                  {orders.map(order => (
                    <div key={order.id} className="p-6 border-b last:border-0 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <div>
                        <p className="font-bold text-lg">{order.id}</p>
                        <p className="text-sm text-slate-500">{new Date(order.timestamp).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-emerald-600">₹{order.total}</p>
                        <p className={`text-xs font-bold uppercase ${order.status === 'completed' ? 'text-green-500' : 'text-orange-500'}`}>{order.status}</p>
                      </div>
                    </div>
                  ))}
                  {orders.length === 0 && <p className="p-6 text-center text-slate-500 font-bold">No transactions yet.</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 3. RIGHT SIDEBAR - PINNED WIDTH */}
      <aside className={`w-80 lg:w-96 flex-shrink-0 flex flex-col border-l shadow-2xl z-10 ${ui.card}`}>
        <div className="p-8 border-b flex-shrink-0">
          <h2 className="text-2xl font-black flex items-center"><ShoppingBag className="mr-3 text-emerald-600" /> Cart</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-30">
              <PackageOpen size={64} className="mb-4" /><p className="font-bold">Cart is empty</p>
            </div>
          ) : (
            <>
              {cart.map(item => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex-1 mr-4">
                    <h4 className="font-bold leading-tight">{item.name}</h4>
                    <p className="text-emerald-600 font-bold">₹{item.price * item.qty}</p>
                  </div>
                  <div className="flex items-center space-x-3 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                    <button onClick={() => addToCart(item)} className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors"><Plus size={14} /></button>
                    <span className="font-bold text-sm w-4 text-center">{item.qty}</span>
                    <button onClick={() => setCart(prev => prev.map(i => i.id === item.id ? { ...i, qty: Math.max(0, i.qty - 1) } : i).filter(i => i.qty > 0))} className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors"><Minus size={14} /></button>
                  </div>
                </div>
              ))}
              
              <hr className="border-slate-200 dark:border-slate-800 my-4" />
              
              <div className="space-y-4">
                {/* Delivery Address */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Delivery Address *</label>
                  <textarea 
                    value={address} 
                    onChange={e => { setAddress(e.target.value); setErrorMsg(''); }}
                    className={`w-full mt-1 p-3 rounded-xl border outline-none resize-none text-sm ${ui.inputBg} ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
                    rows="2"
                    placeholder="Enter full delivery address..."
                  />
                </div>
                
                {/* Image Upload */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Payment Screenshot *</label>
                  <label className={`mt-1 flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${attachment ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    {attachment ? (
                      <div className="flex flex-col items-center">
                        <img src={attachment} alt="Payment Proof" className="h-16 object-contain mb-2 rounded" />
                        <span className="text-xs font-bold text-emerald-600">Image Attached (Click to change)</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-slate-500">
                        <Upload size={24} className="mb-2" />
                        <span className="text-sm font-medium">Upload Screenshot</span>
                      </div>
                    )}
                  </label>
                  
                  {isScanning && <p className="text-xs text-blue-500 mt-2 flex items-center"><Loader2 className="animate-spin mr-1" size={12}/> Scanning for Ref ID...</p>}
                  {refId && !isScanning && <p className="text-xs text-emerald-600 mt-2 font-bold flex items-center"><CheckCircle2 size={12} className="mr-1"/> Ref ID: {refId}</p>}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="p-8 border-t space-y-4 flex-shrink-0">
          <div className="flex justify-between text-2xl font-black mb-2"><span>Total</span><span className="text-emerald-600">₹{cartTotal}</span></div>
          
          {errorMsg && <p className="text-xs font-bold text-red-500 text-center bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{errorMsg}</p>}
          
          <button 
            disabled={cart.length === 0 || isScanning || !isConnected}
            onClick={handleCheckout}
            className={`w-full py-5 rounded-3xl text-xl font-black shadow-xl transition-all active:scale-95 disabled:opacity-50 ${ui.accent}`}
          >
            {isConnected ? (isScanning ? 'SCANNING...' : 'CONTINUE TO WHATSAPP') : 'OFFLINE'}
          </button>
        </div>
      </aside>
    </div>
  );
}