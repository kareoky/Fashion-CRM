
import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Search, 
  ChevronRight, 
  MessageCircle, 
  Plus,
  ExternalLink,
  Instagram,
  Globe,
  Facebook,
  Phone,
  Send,
  Database,
  Download,
  Upload,
  Mail,
  RefreshCw,
  X
} from 'lucide-react';
import { extractBusinessCardData } from './services/geminiService';
import { BusinessCardData } from './types';
import { DEFAULT_TEMPLATES } from './constants';

const App: React.FC = () => {
  const [contacts, setContacts] = useState<BusinessCardData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContact, setSelectedContact] = useState<BusinessCardData | null>(null);
  const [showPlaybook, setShowPlaybook] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('kareem_crm_v3');
    if (saved) {
      try {
        setContacts(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load data", e);
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden) stopCamera();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    localStorage.setItem('kareem_crm_v3', JSON.stringify(contacts));
  }, [contacts]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setShowScan(false);
    setCameraError(null);
  };

  const startCamera = async () => {
    setShowScan(true);
    setCameraError(null);
    
    // Crucial for iOS PWA: Small wait to let DOM catch up
    await new Promise(r => setTimeout(r, 300));
    
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const constraints = { 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.error("Camera Error:", err);
      setCameraError(err.name === 'NotAllowedError' ? "إذن الكاميرا مرفوض" : "الكاميرا معطلة حالياً");
    }
  };

  const captureAndProcess = async () => {
    if (!canvasRef.current || !videoRef.current || !streamRef.current) return;
    setIsProcessing(true);
    
    const ctx = canvasRef.current.getContext('2d');
    const video = videoRef.current;
    
    canvasRef.current.width = video.videoWidth;
    canvasRef.current.height = video.videoHeight;
    ctx?.drawImage(video, 0, 0);
    
    const base64 = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
    
    try {
      const data = await extractBusinessCardData(base64);
      const newContact: BusinessCardData = {
        id: crypto.randomUUID(),
        companyName: data.companyName || 'شركة جديدة',
        personName: data.personName || 'جهة اتصال',
        phone: data.phone || '',
        whatsapp: data.whatsapp || data.phone || '',
        email: data.email || '',
        instagram: data.instagram || '',
        facebook: data.facebook || '',
        website: data.website || '',
        address: data.address || '',
        category: 'Other',
        status: 'New',
        notes: '',
        createdAt: new Date().toISOString(),
      };
      setContacts(prev => [newContact, ...prev]);
      setSelectedContact(newContact);
      stopCamera();
    } catch (error) {
      alert("خطأ في قراءة الكارت. تأكد من الإضاءة والوضوح.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Data Management Functions
  const exportData = () => {
    const dataStr = JSON.stringify(contacts, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `kareem_crm_backup_${new Date().toLocaleDateString()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (Array.isArray(json)) {
          if (confirm(`هل تريد استيراد ${json.length} عميل؟ سيتم دمجهم مع بياناتك الحالية.`)) {
            setContacts(prev => [...json, ...prev]);
            alert("تم الاستيراد بنجاح!");
          }
        }
      } catch (err) {
        alert("ملف غير صالح.");
      }
    };
    reader.readAsText(file);
  };

  const backupToGmail = () => {
    const summary = contacts.map(c => `• ${c.companyName} (${c.personName}): ${c.phone}`).join('\n');
    const fullData = JSON.stringify(contacts, null, 2);
    const body = `قائمة عملاء كاريوكي CRM بتاريخ ${new Date().toLocaleString()}\n\nملخص:\n${summary}\n\nالبيانات التقنية (للاستعادة):\n${fullData}`;
    const mailto = `mailto:?subject=Kareem CRM Backup&body=${encodeURIComponent(body)}`;
    window.open(mailto, '_blank');
  };

  const cleanWhatsAppLink = (val: string) => {
    if (!val || val === "null") return "";
    let cleaned = val.split(/[;|,]/)[0].replace(/\D/g, '');
    if (cleaned.startsWith('01') && cleaned.length === 11) cleaned = '2' + cleaned;
    else if (cleaned.startsWith('1') && cleaned.length === 10) cleaned = '20' + cleaned;
    return cleaned;
  };

  const openWhatsApp = (contact: BusinessCardData, templateText: string) => {
    const text = templateText.replace(/{{personName}}/g, contact.personName || "يا فنان").replace(/{{companyName}}/g, contact.companyName);
    const phone = cleanWhatsAppLink(contact.whatsapp || contact.phone);
    if (!phone) return alert("رقم الواتساب غير متوفر.");
    stopCamera();
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const openExternal = (type: string, value: string) => {
    if (!value || value === "null" || value.trim() === "") return;
    let url = "";
    const v = value.trim();
    if (type === 'instagram') url = v.includes('instagram.com') ? v : `https://instagram.com/${v.replace('@', '')}`;
    else if (type === 'facebook') url = v.includes('facebook.com') ? v : `https://facebook.com/${v}`;
    else if (type === 'website') url = v.startsWith('http') ? v : `https://${v}`;
    else if (type === 'phone') url = `tel:${v.replace(/\D/g, '')}`;
    
    if (url) { stopCamera(); window.open(url, '_blank'); }
  };

  const filteredContacts = contacts.filter(c => 
    c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.personName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-[#050505] text-white overflow-hidden" dir="rtl">
      
      {/* Header */}
      <header className="safe-top bg-black/40 backdrop-blur-3xl p-6 border-b border-white/5 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowSettings(true)} className="p-2 bg-white/5 rounded-xl active:scale-90 transition-transform">
            <Database className="w-5 h-5 text-indigo-400" />
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tighter">كاريوكي CRM</h1>
            <p className="text-[9px] text-indigo-500 font-bold uppercase tracking-[0.2em]">Studio Sync On</p>
          </div>
        </div>
        <button 
          onClick={startCamera} 
          className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30 active:scale-90 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </button>
      </header>

      {/* Search */}
      <div className="p-5 pb-2">
        <div className="relative group">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
          <input 
            placeholder="بحث في أرشيف العملاء..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-11 pl-4 text-sm focus:outline-none focus:border-indigo-600/50 transition-all placeholder:text-slate-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <main className="flex-1 overflow-y-auto custom-scroll p-5 space-y-3">
        {filteredContacts.map(contact => (
          <div key={contact.id} onClick={() => setSelectedContact(contact)} className="bg-[#0D0D0D] p-4 rounded-[22px] border border-white/5 flex items-center gap-4 active:bg-indigo-600/5 transition-all active:scale-[0.98]">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-inner">
              {contact.companyName.charAt(0)}
            </div>
            <div className="flex-1 text-right">
              <h3 className="font-bold text-slate-200 text-sm">{contact.companyName}</h3>
              <p className="text-[10px] text-slate-500 font-medium">{contact.personName || 'بدون اسم'}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-800" />
          </div>
        ))}
        {contacts.length === 0 && !isProcessing && (
          <div className="flex flex-col items-center justify-center py-32 opacity-20">
             <Camera className="w-12 h-12 mb-4" />
             <p className="font-bold text-xs uppercase tracking-widest">No Contacts Yet</p>
          </div>
        )}
      </main>

      {/* Settings / Data Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[150] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowSettings(false)}></div>
          <div className="relative bg-[#0F0F0F] rounded-t-[40px] p-8 pb-12 border-t border-white/10 slide-in-from-bottom animate-in">
             <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8"></div>
             <h2 className="text-xl font-black text-center mb-10">إدارة البيانات والنسخ الاحتياطي</h2>
             
             <div className="grid grid-cols-2 gap-4">
                <button onClick={exportData} className="flex flex-col items-center gap-4 p-6 bg-white/5 rounded-3xl border border-white/5 active:bg-white/10 transition-colors">
                  <Download className="w-6 h-6 text-indigo-400" />
                  <span className="text-xs font-bold">تصدير ملف</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-4 p-6 bg-white/5 rounded-3xl border border-white/5 active:bg-white/10 transition-colors">
                  <Upload className="w-6 h-6 text-emerald-400" />
                  <span className="text-xs font-bold">استيراد ملف</span>
                </button>
                <button onClick={backupToGmail} className="col-span-2 flex items-center justify-center gap-4 p-6 bg-indigo-600 rounded-3xl active:scale-95 transition-transform">
                  <Mail className="w-5 h-5" />
                  <span className="text-sm font-black">نسخ سحابي (Gmail)</span>
                </button>
             </div>
             
             <input type="file" ref={fileInputRef} onChange={importData} accept=".json" className="hidden" />
             
             <button onClick={() => setShowSettings(false)} className="w-full mt-8 py-4 text-slate-500 font-bold text-sm">إغلاق</button>
          </div>
        </div>
      )}

      {/* Camera Overlay */}
      {showScan && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col animate-in fade-in">
          <div className="relative flex-1 bg-black overflow-hidden">
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-80" />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="w-[85%] aspect-[1.6/1] border-2 border-white/20 rounded-[32px] shadow-[0_0_0_1000px_rgba(0,0,0,0.8)] relative">
                 <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl"></div>
                 <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl"></div>
                 <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl"></div>
                 <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-500 rounded-br-xl"></div>
              </div>
            </div>
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center bg-black/90">
                <p className="text-rose-500 font-bold mb-6">{cameraError}</p>
                <button onClick={startCamera} className="bg-indigo-600 px-8 py-4 rounded-2xl flex items-center gap-2 font-black">
                  <RefreshCw className="w-4 h-4" /> إعادة تنشيط
                </button>
              </div>
            )}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center z-20">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-[9px] font-black tracking-[0.4em] uppercase text-indigo-400">Syncing with AI...</p>
              </div>
            )}
          </div>
          <div className="h-44 bg-black flex justify-between items-center px-12 safe-bottom">
            <button onClick={stopCamera} className="text-slate-600 text-[10px] font-black uppercase tracking-widest p-4">Close</button>
            <button 
              onClick={captureAndProcess} 
              disabled={isProcessing}
              className="w-20 h-20 rounded-full bg-white border-[6px] border-white/10 active:scale-90 transition-all shadow-2xl disabled:opacity-20"
            ></button>
            <button onClick={startCamera} className="p-4 text-indigo-500/50 active:text-indigo-400">
               <RefreshCw className="w-5 h-5" />
            </button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* Details Sheet */}
      {selectedContact && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-sm" onClick={() => setSelectedContact(null)}></div>
          <div className="relative bg-[#0A0A0A] rounded-t-[45px] safe-bottom max-h-[92vh] overflow-y-auto border-t border-white/5 p-8 shadow-2xl slide-in-from-bottom animate-in">
            <div className="flex flex-col items-center mb-10">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-[35px] flex items-center justify-center text-4xl font-black mb-6 shadow-2xl border border-white/10">
                {selectedContact.companyName.charAt(0)}
              </div>
              <input 
                className="text-2xl font-black text-white text-center bg-transparent border-none focus:outline-none w-full placeholder:text-slate-800"
                value={selectedContact.companyName}
                onChange={(e) => setContacts(prev => prev.map(c => c.id === selectedContact.id ? {...c, companyName: e.target.value} : c))}
                onBlur={() => setSelectedContact(prev => prev ? {...prev, companyName: (contacts.find(c=>c.id===prev.id)?.companyName || prev.companyName)} : null)}
              />
              <input 
                className="text-slate-500 font-bold text-center bg-transparent border-none focus:outline-none w-full mt-1"
                value={selectedContact.personName}
                onChange={(e) => setContacts(prev => prev.map(c => c.id === selectedContact.id ? {...c, personName: e.target.value} : c))}
              />
            </div>

            <button 
              onClick={() => setShowPlaybook(true)}
              className="w-full py-6 bg-indigo-600 rounded-[28px] flex items-center justify-center gap-3 font-black text-lg mb-10 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
            >
              <MessageCircle className="w-6 h-6" />
              إرسال رسالة كاريوكي
            </button>

            <div className="space-y-4">
              {[
                { icon: <Instagram className="w-4 h-4" />, key: 'instagram', label: 'Instagram', color: "text-rose-500", type: 'instagram' },
                { icon: <Facebook className="w-4 h-4" />, key: 'facebook', label: 'Facebook', color: "text-blue-500", type: 'facebook' },
                { icon: <Globe className="w-4 h-4" />, key: 'website', label: 'Website', color: "text-indigo-400", type: 'website' },
                { icon: <MessageCircle className="w-4 h-4" />, key: 'whatsapp', label: 'WhatsApp', color: "text-emerald-500", type: 'whatsapp' },
                { icon: <Phone className="w-4 h-4" />, key: 'phone', label: 'Phone', color: "text-slate-400", type: 'phone' },
              ].map((item) => {
                const val = (selectedContact as any)[item.key] || "";
                return (
                  <div key={item.key} className="flex items-center gap-4 p-4 bg-white/5 rounded-[22px] border border-white/5 group">
                    <div 
                      className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 ${item.color} shrink-0 cursor-pointer active:scale-90 transition-transform`}
                      onClick={() => openExternal(item.type, val)}
                    >
                      {item.icon}
                    </div>
                    <div className="flex-1 text-right overflow-hidden">
                      <p className="text-[7px] text-slate-600 font-black uppercase mb-1 tracking-widest">{item.label}</p>
                      <input 
                        className="w-full bg-transparent border-none focus:outline-none font-bold text-slate-300 text-sm truncate"
                        value={val === "null" ? "" : val}
                        onChange={(e) => {
                          const newVal = e.target.value;
                          setContacts(prev => prev.map(c => c.id === selectedContact.id ? {...c, [item.key]: newVal} : c));
                        }}
                        placeholder={`...`}
                      />
                    </div>
                    {val && val !== "null" && (
                      <button onClick={() => openExternal(item.type, val)} className="p-2 text-indigo-400 active:scale-90">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-12 flex justify-between items-center px-4">
              <button 
                onClick={() => {if(confirm('حذف؟')) {setContacts(prev=>prev.filter(c=>c.id!==selectedContact.id)); setSelectedContact(null);}}} 
                className="text-rose-900 text-[10px] font-black uppercase tracking-widest"
              >حذف العميل</button>
              <button onClick={() => setSelectedContact(null)} className="bg-white/5 px-10 py-3 rounded-full text-white text-[10px] font-black uppercase tracking-widest active:bg-white/10">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Templates Sheet */}
      {showPlaybook && (
        <div className="fixed inset-0 z-[120] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={() => setShowPlaybook(false)}></div>
          <div className="relative bg-[#111] rounded-t-[45px] p-8 border-t border-white/5 pb-20 slide-in-from-bottom animate-in">
            <div className="w-12 h-1 bg-white/5 rounded-full mx-auto mb-8"></div>
            <h3 className="text-center font-black mb-10 text-indigo-500 uppercase tracking-[0.3em] text-xs">Choose Your Message</h3>
            <div className="space-y-4">
              {DEFAULT_TEMPLATES.map((t) => (
                <button 
                  key={t.id}
                  onClick={() => { if(selectedContact) openWhatsApp(selectedContact, t.text); setShowPlaybook(false); }}
                  className="w-full p-6 bg-white/5 rounded-[30px] flex items-center justify-between text-right border border-white/5 active:bg-white/10 transition-all group"
                >
                  <div className="flex-1 overflow-hidden pr-2">
                    <p className="font-black text-white text-sm mb-1">{t.label}</p>
                    <p className="text-[10px] text-slate-500 line-clamp-1">{t.text}</p>
                  </div>
                  <Send className="w-4 h-4 text-indigo-500 ml-4 group-active:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
