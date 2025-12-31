
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
  X,
  Trash2
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

  // Load Initial Data
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
      if (document.hidden) {
        stopCamera();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Save Data on Change
  useEffect(() => {
    localStorage.setItem('kareem_crm_v3', JSON.stringify(contacts));
  }, [contacts]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.pause();
    }
    setShowScan(false);
    setCameraError(null);
  };

  const startCamera = async () => {
    // Force reset state
    if (streamRef.current) stopCamera();
    
    setShowScan(true);
    setCameraError(null);
    
    // UI stabilization delay
    await new Promise(r => setTimeout(r, 400));
    
    try {
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
        videoRef.current.setAttribute('muted', 'true');
        // iOS requires a direct user gesture for play() sometimes
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            console.log("Auto-play prevented", e);
            setCameraError("اضغط على الشاشة لتشغيل الكاميرا");
          });
        }
      }
    } catch (err: any) {
      console.error("Camera Error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError("إذن الكاميرا مرفوض. يرجى تفعيلها من إعدادات الآيفون > Safari > الكاميرا.");
      } else {
        setCameraError("الكاميرا معطلة أو مشغولة. جرب زر إعادة التنشيط.");
      }
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
      alert("خطأ في التحليل. جرب مرة أخرى.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Improved Update Logic (Crucial for the Editing Issue)
  const handleUpdateField = (field: keyof BusinessCardData, value: string) => {
    if (!selectedContact) return;
    
    // 1. Update the local selected object immediately so the input feels responsive
    const updatedContact = { ...selectedContact, [field]: value };
    setSelectedContact(updatedContact);
    
    // 2. Sync with the main list
    setContacts(prev => prev.map(c => c.id === selectedContact.id ? updatedContact : c));
  };

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
          setContacts(prev => [...json, ...prev]);
          alert("تم استيراد البيانات!");
          setShowSettings(false);
        }
      } catch (err) { alert("ملف غير صالح."); }
    };
    reader.readAsText(file);
  };

  const backupToGmail = () => {
    const summary = contacts.map(c => `• ${c.companyName}: ${c.phone}`).join('\n');
    const fullData = JSON.stringify(contacts, null, 2);
    const body = `نسخة احتياطية كاريوكي CRM\n\n${summary}\n\nبيانات الاستعادة:\n${fullData}`;
    window.open(`mailto:?subject=Kareem CRM Backup&body=${encodeURIComponent(body)}`, '_blank');
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
            <p className="text-[9px] text-indigo-500 font-bold uppercase tracking-[0.2em]">Live Sync Active</p>
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
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-indigo-400" />
          <input 
            placeholder="بحث في البراندات..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-11 pl-4 text-sm focus:outline-none focus:border-indigo-600/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <main className="flex-1 overflow-y-auto custom-scroll p-5 space-y-3">
        {filteredContacts.map(contact => (
          <div key={contact.id} onClick={() => setSelectedContact(contact)} className="bg-[#0D0D0D] p-4 rounded-[22px] border border-white/5 flex items-center gap-4 active:bg-white/5 active:scale-[0.98] transition-all">
            <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center text-indigo-400 font-black text-lg border border-indigo-500/10">
              {contact.companyName.charAt(0)}
            </div>
            <div className="flex-1 text-right overflow-hidden">
              <h3 className="font-bold text-slate-200 text-sm truncate">{contact.companyName}</h3>
              <p className="text-[10px] text-slate-600 font-medium truncate">{contact.personName || 'جهة اتصال'}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-800" />
          </div>
        ))}
        {contacts.length === 0 && !isProcessing && (
          <div className="flex flex-col items-center justify-center py-32 opacity-20">
             <Camera className="w-12 h-12 mb-4" />
             <p className="font-bold text-xs uppercase tracking-widest">No Data Found</p>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[150] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowSettings(false)}></div>
          <div className="relative bg-[#0F0F0F] rounded-t-[40px] p-8 pb-12 border-t border-white/10 slide-in-from-bottom animate-in">
             <h2 className="text-xl font-black text-center mb-8">إدارة البيانات</h2>
             <div className="grid grid-cols-2 gap-4">
                <button onClick={exportData} className="flex flex-col items-center gap-3 p-6 bg-white/5 rounded-3xl border border-white/5 active:scale-95 transition-transform">
                  <Download className="w-5 h-5 text-indigo-400" />
                  <span className="text-xs font-bold">تصدير (Backup)</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-3 p-6 bg-white/5 rounded-3xl border border-white/5 active:scale-95 transition-transform">
                  <Upload className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-bold">استيراد (Restore)</span>
                </button>
                <button onClick={backupToGmail} className="col-span-2 flex items-center justify-center gap-4 p-5 bg-indigo-600 rounded-3xl active:scale-95">
                  <Mail className="w-5 h-5" />
                  <span className="text-sm font-black">نسخ إلى الجيميل</span>
                </button>
             </div>
             <input type="file" ref={fileInputRef} onChange={importData} accept=".json" className="hidden" />
             <button onClick={() => setShowSettings(false)} className="w-full mt-8 py-4 text-slate-500 font-bold text-xs uppercase tracking-widest">إغلاق</button>
          </div>
        </div>
      )}

      {/* Camera Overlay */}
      {showScan && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col animate-in fade-in">
          <div className="relative flex-1 bg-black overflow-hidden">
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="w-[85%] aspect-[1.6/1] border-2 border-white/20 rounded-[32px] shadow-[0_0_0_1000px_rgba(0,0,0,0.8)]"></div>
            </div>
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center bg-black/90 z-30">
                <p className="text-rose-500 font-bold mb-8 leading-relaxed">{cameraError}</p>
                <button onClick={startCamera} className="bg-indigo-600 px-10 py-5 rounded-2xl flex items-center gap-3 font-black shadow-xl shadow-indigo-600/30">
                  <RefreshCw className="w-5 h-5" /> إعادة تنشيط الكاميرا
                </button>
              </div>
            )}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center z-50">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-[9px] font-black tracking-[0.4em] uppercase text-indigo-400">Analysing Card...</p>
              </div>
            )}
          </div>
          <div className="h-44 bg-black flex justify-between items-center px-12 safe-bottom">
            <button onClick={stopCamera} className="text-slate-600 text-[10px] font-black uppercase p-4">Close</button>
            <button 
              onClick={captureAndProcess} 
              disabled={isProcessing}
              className="w-20 h-20 rounded-full bg-white border-[6px] border-white/10 active:scale-90 transition-all shadow-2xl disabled:opacity-10"
            ></button>
            <button onClick={startCamera} className="p-4 text-indigo-500/50">
               <RefreshCw className="w-5 h-5" />
            </button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* Details Sheet - EDITING FIXED HERE */}
      {selectedContact && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-sm" onClick={() => setSelectedContact(null)}></div>
          <div className="relative bg-[#0A0A0A] rounded-t-[45px] safe-bottom max-h-[92vh] overflow-y-auto border-t border-white/5 p-8 shadow-2xl slide-in-from-bottom animate-in">
            <div className="flex flex-col items-center mb-10">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-[35px] flex items-center justify-center text-4xl font-black mb-6 border border-white/10">
                {selectedContact.companyName.charAt(0)}
              </div>
              <input 
                className="text-2xl font-black text-white text-center bg-white/5 rounded-xl px-4 py-2 border-none focus:outline-none w-full"
                value={selectedContact.companyName}
                onChange={(e) => handleUpdateField('companyName', e.target.value)}
                placeholder="اسم الشركة"
              />
              <input 
                className="text-slate-500 font-bold text-center bg-transparent border-none focus:outline-none w-full mt-2"
                value={selectedContact.personName}
                onChange={(e) => handleUpdateField('personName', e.target.value)}
                placeholder="اسم الشخص"
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
                { icon: <Instagram className="w-4 h-4" />, key: 'instagram' as const, label: 'Instagram', color: "text-rose-500" },
                { icon: <Facebook className="w-4 h-4" />, key: 'facebook' as const, label: 'Facebook', color: "text-blue-500" },
                { icon: <Globe className="w-4 h-4" />, key: 'website' as const, label: 'Website', color: "text-indigo-400" },
                { icon: <MessageCircle className="w-4 h-4" />, key: 'whatsapp' as const, label: 'WhatsApp', color: "text-emerald-500" },
                { icon: <Phone className="w-4 h-4" />, key: 'phone' as const, label: 'Phone', color: "text-slate-400" },
              ].map((item) => {
                const val = (selectedContact as any)[item.key] || "";
                return (
                  <div key={item.key} className="flex items-center gap-4 p-4 bg-white/5 rounded-[22px] border border-white/5">
                    <div 
                      className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 ${item.color} shrink-0 cursor-pointer active:scale-90`}
                      onClick={() => openExternal(item.key, val)}
                    >
                      {item.icon}
                    </div>
                    <div className="flex-1 text-right overflow-hidden">
                      <p className="text-[7px] text-slate-600 font-black uppercase mb-1 tracking-widest">{item.label}</p>
                      <input 
                        className="w-full bg-transparent border-none focus:outline-none font-bold text-slate-300 text-sm"
                        value={val === "null" ? "" : val}
                        onChange={(e) => handleUpdateField(item.key, e.target.value)}
                        placeholder={`...`}
                      />
                    </div>
                    {val && val !== "null" && (
                      <button onClick={() => openExternal(item.key, val)} className="p-2 text-indigo-400 active:scale-90">
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
                className="text-rose-900 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
              >
                <Trash2 className="w-3 h-3" /> حذف
              </button>
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
            <h3 className="text-center font-black mb-10 text-indigo-500 uppercase tracking-[0.3em] text-xs">Choose Message</h3>
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
