
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

  useEffect(() => {
    const saved = localStorage.getItem('kareem_crm_v3');
    if (saved) setContacts(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('kareem_crm_v3', JSON.stringify(contacts));
  }, [contacts]);

  const startCamera = async () => {
    setShowScan(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      alert("يرجى تفعيل الكاميرا من الإعدادات");
      setShowScan(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
    setShowScan(false);
  };

  const captureAndProcess = async () => {
    if (!canvasRef.current || !videoRef.current) return;
    setIsProcessing(true);
    const ctx = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx?.drawImage(videoRef.current, 0, 0);
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
      alert("حدث خطأ. تأكد من وضوح الكارت.");
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
      alert("عذراً، لم يتم العثور على رقم موبايل صحيح");
      return;
    }
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
    if (url) window.open(url, '_blank');
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
      <header className="safe-top bg-black/50 backdrop-blur-2xl p-6 border-b border-white/5 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tighter">كاريوكي CRM</h1>
          <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Studio Mode</p>
        </div>
        <button onClick={startCamera} className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/20"><Plus /></button>
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
            <div className="w-12 h-12 bg-indigo-600/20 rounded-xl flex items-center justify-center text-indigo-400 font-black text-lg border border-indigo-500/20">
              {contact.companyName.charAt(0)}
            </div>
            <div className="flex-1 text-right">
              <h3 className="font-bold text-slate-100">{contact.companyName}</h3>
              <p className="text-[10px] text-slate-500 font-bold">{contact.personName}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-700" />
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
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="relative flex-1 bg-black">
            <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="w-[85%] aspect-[1.6/1] border-2 border-white/30 rounded-[32px] shadow-[0_0_0_1000px_rgba(0,0,0,0.6)]"></div>
              <p className="mt-8 text-white/60 text-xs font-bold tracking-widest uppercase">ضع الكارت داخل الإطار</p>
            </div>
            {isProcessing && (
              <div className="absolute inset-0 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-[10px] font-black tracking-[0.3em] uppercase text-indigo-400">Analyzing Card...</p>
              </div>
            )}
          </div>
          <div className="h-32 bg-black flex justify-between items-center px-12 safe-bottom">
            <button onClick={stopCamera} className="text-slate-500 text-xs font-black uppercase">إلغاء</button>
            <button onClick={captureAndProcess} className="w-20 h-20 rounded-full bg-white border-[6px] border-white/20 active:scale-90 transition-all"></button>
            <div className="w-10"></div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* Detail Sheet */}
      {selectedContact && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setSelectedContact(null)}></div>
          <div className="relative bg-[#0F0F0F] rounded-t-[40px] safe-bottom max-h-[92vh] overflow-y-auto border-t border-white/10 p-8">
            <div className="flex flex-col items-center mb-8">
              <div className="w-20 h-20 bg-indigo-600 rounded-[28px] flex items-center justify-center text-3xl font-black mb-4 shadow-2xl">
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
              className="w-full py-6 bg-indigo-600 rounded-[24px] flex items-center justify-center gap-3 font-black text-lg mb-8 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
            >
              <MessageCircle className="w-6 h-6" />
              إرسال رسالة كاريوكي
            </button>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Social & Contact (Editable)</h3>
              {[
                { icon: <Instagram className="w-4 h-4" />, key: 'instagram', label: 'Instagram (Username or Link)', color: "text-rose-500", type: 'instagram' },
                { icon: <Facebook className="w-4 h-4" />, key: 'facebook', label: 'Facebook Link', color: "text-blue-500", type: 'facebook' },
                { icon: <Globe className="w-4 h-4" />, key: 'website', label: 'Website Link', color: "text-indigo-400", type: 'website' },
                { icon: <MessageCircle className="w-4 h-4" />, key: 'whatsapp', label: 'WhatsApp Number', color: "text-emerald-500", type: 'whatsapp' },
                { icon: <Phone className="w-4 h-4" />, key: 'phone', label: 'Other Phone', color: "text-slate-400", type: 'phone' },
              ].map((item) => {
                const val = (selectedContact as any)[item.key] || "";
                return (
                  <div key={item.key} className="flex items-center gap-4 p-4 bg-white/5 rounded-[22px] border border-white/5">
                    <div 
                      className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 ${item.color} shrink-0 cursor-pointer active:scale-90 transition-transform`}
                      onClick={() => openExternal(item.type, val)}
                    >
                      {item.icon}
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-[8px] text-slate-600 font-black uppercase mb-1">{item.label}</p>
                      <input 
                        className="w-full bg-transparent border-none focus:outline-none font-bold text-slate-200 text-sm"
                        value={val === "null" ? "" : val}
                        onChange={(e) => updateContact({...selectedContact, [item.key]: e.target.value})}
                        placeholder={`أدخل ${item.key}...`}
                      />
                    </div>
                    {val && val !== "null" && (
                      <button onClick={() => openExternal(item.type, val)} className="p-2 text-indigo-400">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-10 flex justify-between items-center px-4">
              <button onClick={() => {if(confirm('حذف؟')) {setContacts(prev=>prev.filter(c=>c.id!==selectedContact.id)); setSelectedContact(null);}}} className="text-rose-500/50 text-[10px] font-black uppercase tracking-widest">حذف العميل</button>
              <button onClick={() => setSelectedContact(null)} className="bg-white/10 px-6 py-2 rounded-full text-white text-[10px] font-black uppercase tracking-widest">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Templates Sheet */}
      {showPlaybook && (
        <div className="fixed inset-0 z-[110] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setShowPlaybook(false)}></div>
          <div className="relative bg-[#111] rounded-t-[40px] p-8 border-t border-white/10 pb-12">
            <h3 className="text-center font-black mb-8 text-indigo-400 uppercase tracking-widest">اختيار الرسالة</h3>
            <div className="space-y-4">
              {DEFAULT_TEMPLATES.map((t) => (
                <button 
                  key={t.id}
                  onClick={() => { if(selectedContact) openWhatsApp(selectedContact, t.text); setShowPlaybook(false); }}
                  className="w-full p-6 bg-white/5 rounded-[28px] flex items-center justify-between text-right border border-white/5"
                >
                  <div className="flex-1">
                    <p className="font-black text-white text-sm mb-1">{t.label}</p>
                    <p className="text-[10px] text-slate-500 line-clamp-1 leading-relaxed">{t.text}</p>
                  </div>
                  <Send className="w-5 h-5 text-indigo-500 mr-4 shrink-0" />
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
