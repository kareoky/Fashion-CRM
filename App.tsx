
import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Search, 
  ChevronRight, 
  MessageCircle, 
  Trash2,
  Plus,
  X,
  ExternalLink,
  Instagram,
  Globe,
  Facebook,
  Phone,
  Send,
  Download
} from 'lucide-react';
import { extractBusinessCardData } from './services/geminiService';
import { BusinessCardData, ContactCategory, ContactStatus } from './types';
import { STATUSES, DEFAULT_TEMPLATES } from './constants';

const App: React.FC = () => {
  const [contacts, setContacts] = useState<BusinessCardData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContact, setSelectedContact] = useState<BusinessCardData | null>(null);
  const [showPlaybook, setShowPlaybook] = useState(false);
  const [showScan, setShowScan] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('kareem_crm_v3');
    if (saved) setContacts(JSON.parse(saved));

    // Handle background/foreground to release camera
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopCamera();
      }
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
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowScan(false);
  };

  const startCamera = async () => {
    // Small delay to ensure UI transition is finished (crucial for iOS)
    setShowScan(true);
    
    setTimeout(async () => {
      try {
        // Ensure any previous stream is dead
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
        }

        const constraints = { 
          video: { 
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          } 
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Important for iOS PWA: wait for metadata
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(e => console.error("Play failed", e));
          };
        }
      } catch (err: any) {
        console.error("Camera Error:", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          alert("يرجى السماح بالوصول للكاميرا من إعدادات المتصفح أو الهاتف.");
        } else {
          alert("الكاميرا مشغولة أو غير متاحة حالياً. يرجى المحاولة مرة أخرى.");
        }
        setShowScan(false);
      }
    }, 150); 
  };

  const captureAndProcess = async () => {
    if (!canvasRef.current || !videoRef.current || !streamRef.current) return;
    setIsProcessing(true);
    
    const ctx = canvasRef.current.getContext('2d');
    const video = videoRef.current;
    
    // Set canvas to video dimensions
    canvasRef.current.width = video.videoWidth;
    canvasRef.current.height = video.videoHeight;
    
    ctx?.drawImage(video, 0, 0);
    const base64 = canvasRef.current.toDataURL('image/jpeg', 0.6).split(',')[1];
    
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
      alert("حدث خطأ أثناء تحليل الكارت. جرب مرة تانية مع إضاءة أفضل.");
    } finally {
      setIsProcessing(false);
    }
  };

  const cleanWhatsAppLink = (val: string) => {
    if (!val || val === "null") return "";
    let cleaned = val.split(/[;|,]/)[0].replace(/\D/g, '');
    if (cleaned.startsWith('01') && cleaned.length === 11) {
      cleaned = '2' + cleaned;
    } else if (cleaned.startsWith('1') && cleaned.length === 10) {
      cleaned = '20' + cleaned;
    }
    return cleaned;
  };

  const openWhatsApp = (contact: BusinessCardData, templateText: string) => {
    const text = templateText
      .replace(/{{personName}}/g, contact.personName || "يا هندسة")
      .replace(/{{companyName}}/g, contact.companyName);
    const encoded = encodeURIComponent(text);
    const phone = cleanWhatsAppLink(contact.whatsapp || contact.phone);
    if (!phone) {
      alert("رقم الواتساب غير صحيح أو غير موجود.");
      return;
    }
    
    // Explicitly stop camera before leaving
    stopCamera();
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
  };

  const openExternal = (type: string, value: string) => {
    if (!value || value === "null" || value.trim() === "") return;
    let url = "";
    const cleanVal = value.trim();
    switch (type) {
      case 'instagram': url = cleanVal.includes('instagram.com') ? cleanVal : `https://instagram.com/${cleanVal.replace('@', '')}`; break;
      case 'facebook': url = cleanVal.includes('facebook.com') ? cleanVal : `https://facebook.com/${cleanVal}`; break;
      case 'website': url = cleanVal.startsWith('http') ? cleanVal : `https://${cleanVal}`; break;
      case 'phone': url = `tel:${cleanVal.replace(/\D/g, '')}`; break;
      case 'whatsapp': url = `https://wa.me/${cleanWhatsAppLink(cleanVal)}`; break;
    }
    if (url) {
      stopCamera();
      window.open(url, '_blank');
    }
  };

  const updateContact = (updated: BusinessCardData) => {
    setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));
    setSelectedContact(updated);
  };

  const filteredContacts = contacts.filter(c => 
    c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.personName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-[#080808] text-white overflow-hidden" dir="rtl">
      
      {/* Header */}
      <header className="safe-top bg-black/50 backdrop-blur-2xl p-6 border-b border-white/5 flex justify-between items-center z-10">
        <div>
          <h1 className="text-2xl font-black tracking-tighter">كاريوكي CRM</h1>
          <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Studio Mode</p>
        </div>
        <button 
          onClick={startCamera} 
          className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/20 active:scale-90 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </button>
      </header>

      {/* Search */}
      <div className="p-6 pb-2">
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            placeholder="بحث عن براند..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-11 pl-4 text-sm focus:outline-none focus:border-indigo-500/40"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <main className="flex-1 overflow-y-auto custom-scroll p-6 space-y-3">
        {filteredContacts.map(contact => (
          <div key={contact.id} onClick={() => setSelectedContact(contact)} className="bg-[#121212] p-4 rounded-[24px] border border-white/5 flex items-center gap-4 active:scale-[0.98] transition-all">
            <div className="w-12 h-12 bg-indigo-600/20 rounded-xl flex items-center justify-center text-indigo-400 font-black text-lg border border-indigo-500/20 shrink-0">
              {contact.companyName.charAt(0)}
            </div>
            <div className="flex-1 text-right overflow-hidden">
              <h3 className="font-bold text-slate-100 truncate">{contact.companyName}</h3>
              <p className="text-[10px] text-slate-500 font-bold truncate">{contact.personName}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-700 shrink-0" />
          </div>
        ))}
        {contacts.length === 0 && !isProcessing && (
          <div className="flex flex-col items-center justify-center py-20 opacity-20">
             <Camera className="w-16 h-16 mb-4" />
             <p className="font-bold text-sm">صور كارت عشان تبدأ</p>
          </div>
        )}
      </main>

      {/* Camera Overlay */}
      {showScan && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in">
          <div className="relative flex-1 bg-black overflow-hidden">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="absolute inset-0 w-full h-full object-cover" 
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="w-[85%] aspect-[1.6/1] border-2 border-white/30 rounded-[32px] shadow-[0_0_0_1000px_rgba(0,0,0,0.6)]"></div>
              <p className="mt-8 text-white/60 text-xs font-bold tracking-widest uppercase">ضع الكارت داخل الإطار</p>
            </div>
            {isProcessing && (
              <div className="absolute inset-0 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center z-20">
                <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-[10px] font-black tracking-[0.3em] uppercase text-indigo-400">Analyzing Card...</p>
              </div>
            )}
          </div>
          <div className="h-40 bg-black flex justify-between items-center px-12 safe-bottom">
            <button onClick={stopCamera} className="text-slate-500 text-xs font-black uppercase py-4 px-2">إلغاء</button>
            <button 
              onClick={captureAndProcess} 
              disabled={isProcessing}
              className="w-20 h-20 rounded-full bg-white border-[6px] border-white/20 active:scale-90 transition-all shadow-2xl disabled:opacity-50"
            ></button>
            <div className="w-10"></div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* Detail Sheet */}
      {selectedContact && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end animate-in fade-in">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setSelectedContact(null)}></div>
          <div className="relative bg-[#0F0F0F] rounded-t-[40px] safe-bottom max-h-[92vh] overflow-y-auto border-t border-white/10 p-8 shadow-2xl slide-in-from-bottom animate-in">
            <div className="flex flex-col items-center mb-8">
              <div className="w-20 h-20 bg-indigo-600 rounded-[28px] flex items-center justify-center text-3xl font-black mb-4 shadow-2xl border border-white/10">
                {selectedContact.companyName.charAt(0)}
              </div>
              <input 
                className="text-2xl font-black text-white text-center bg-transparent border-none focus:outline-none w-full"
                value={selectedContact.companyName}
                onChange={(e) => updateContact({...selectedContact, companyName: e.target.value})}
                placeholder="اسم الشركة"
              />
              <input 
                className="text-slate-500 font-bold text-center bg-transparent border-none focus:outline-none w-full"
                value={selectedContact.personName}
                onChange={(e) => updateContact({...selectedContact, personName: e.target.value})}
                placeholder="اسم الشخص"
              />
            </div>

            <button 
              onClick={() => setShowPlaybook(true)}
              className="w-full py-6 bg-indigo-600 rounded-[24px] flex items-center justify-center gap-3 font-black text-lg mb-8 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all border border-indigo-400/20"
            >
              <MessageCircle className="w-6 h-6" />
              إرسال رسالة كاريوكي
            </button>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Social & Contact</h3>
              {[
                { icon: <Instagram className="w-4 h-4" />, key: 'instagram', label: 'Instagram', color: "text-rose-500", type: 'instagram' },
                { icon: <Facebook className="w-4 h-4" />, key: 'facebook', label: 'Facebook', color: "text-blue-500", type: 'facebook' },
                { icon: <Globe className="w-4 h-4" />, key: 'website', label: 'Website', color: "text-indigo-400", type: 'website' },
                { icon: <MessageCircle className="w-4 h-4" />, key: 'whatsapp', label: 'WhatsApp', color: "text-emerald-500", type: 'whatsapp' },
                { icon: <Phone className="w-4 h-4" />, key: 'phone', label: 'Phone', color: "text-slate-400", type: 'phone' },
              ].map((item) => {
                const val = (selectedContact as any)[item.key] || "";
                return (
                  <div key={item.key} className="flex items-center gap-4 p-4 bg-white/5 rounded-[22px] border border-white/5 group active:bg-white/10 transition-colors">
                    <div 
                      className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 ${item.color} shrink-0 cursor-pointer active:scale-90 transition-transform`}
                      onClick={() => openExternal(item.type, val)}
                    >
                      {item.icon}
                    </div>
                    <div className="flex-1 text-right overflow-hidden">
                      <p className="text-[8px] text-slate-600 font-black uppercase mb-1">{item.label}</p>
                      <input 
                        className="w-full bg-transparent border-none focus:outline-none font-bold text-slate-200 text-sm truncate"
                        value={val === "null" ? "" : val}
                        onChange={(e) => updateContact({...selectedContact, [item.key]: e.target.value})}
                        placeholder={`أدخل ${item.label}...`}
                      />
                    </div>
                    {val && val !== "null" && (
                      <button onClick={() => openExternal(item.type, val)} className="p-2 text-indigo-400 active:scale-90 transition-transform">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-12 flex justify-between items-center px-4">
              <button onClick={() => {if(confirm('هل تريد حذف جهة الاتصال؟')) {setContacts(prev=>prev.filter(c=>c.id!==selectedContact.id)); setSelectedContact(null);}}} className="text-rose-500/50 text-[10px] font-black uppercase tracking-widest active:text-rose-500 transition-colors">حذف العميل</button>
              <button onClick={() => setSelectedContact(null)} className="bg-white/10 px-8 py-3 rounded-full text-white text-[10px] font-black uppercase tracking-widest active:bg-white/20 transition-all">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Templates Sheet */}
      {showPlaybook && (
        <div className="fixed inset-0 z-[110] flex flex-col justify-end animate-in fade-in">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setShowPlaybook(false)}></div>
          <div className="relative bg-[#111] rounded-t-[40px] p-8 border-t border-white/10 pb-16 shadow-2xl slide-in-from-bottom animate-in">
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8"></div>
            <h3 className="text-center font-black mb-8 text-indigo-400 uppercase tracking-widest">اختيار الرسالة</h3>
            <div className="space-y-4">
              {DEFAULT_TEMPLATES.map((t) => (
                <button 
                  key={t.id}
                  onClick={() => { if(selectedContact) openWhatsApp(selectedContact, t.text); setShowPlaybook(false); }}
                  className="w-full p-6 bg-white/5 rounded-[28px] flex items-center justify-between text-right border border-white/5 active:bg-white/10 transition-all group"
                >
                  <div className="flex-1 overflow-hidden pr-2">
                    <p className="font-black text-white text-sm mb-1 group-active:text-indigo-400 transition-colors">{t.label}</p>
                    <p className="text-[10px] text-slate-500 line-clamp-1 leading-relaxed">{t.text}</p>
                  </div>
                  <Send className="w-5 h-5 text-indigo-500 ml-4 shrink-0 group-active:translate-x-1 transition-transform" />
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
