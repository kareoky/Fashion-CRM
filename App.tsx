
import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Search, 
  ChevronRight, 
  MessageCircle, 
  Trash2,
  LayoutGrid,
  List as ListIcon,
  Send,
  Briefcase,
  Instagram,
  Mail,
  Phone,
  Sparkles,
  Settings,
  Plus,
  BarChart3,
  Calendar,
  X,
  Share2,
  ExternalLink,
  Globe,
  Facebook,
  BrainCircuit
} from 'lucide-react';
import { extractBusinessCardData, generateAIStrategy } from './services/geminiService';
import { BusinessCardData, ContactCategory, ContactStatus } from './types';
import { CATEGORIES, STATUSES, DEFAULT_TEMPLATES } from './constants';

const App: React.FC = () => {
  const [contacts, setContacts] = useState<BusinessCardData[]>([]);
  const [view, setView] = useState<'list' | 'pipeline'>('list');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContact, setSelectedContact] = useState<BusinessCardData | null>(null);
  const [showPlaybook, setShowPlaybook] = useState(false);
  const [showScan, setShowScan] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('fashion_contacts_v3');
    if (saved) setContacts(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('fashion_contacts_v3', JSON.stringify(contacts));
  }, [contacts]);

  const startCamera = async () => {
    setShowScan(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("يرجى تفعيل الكاميرا");
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
    const base64 = canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
    
    try {
      const data = await extractBusinessCardData(base64);
      const newContact: BusinessCardData = {
        id: crypto.randomUUID(),
        companyName: data.companyName || 'شركة غير معروفة',
        personName: data.personName || 'جهة اتصال',
        phone: data.phone || '',
        whatsapp: data.whatsapp || data.phone || '',
        email: data.email || '',
        instagram: data.instagram || '',
        facebook: data.facebook || '',
        telegram: data.telegram || '',
        website: data.website || '',
        address: data.address || '',
        category: (data.category as ContactCategory) || 'Other',
        field: data.field || '',
        status: 'New',
        notes: '',
        createdAt: new Date().toISOString(),
      };
      setContacts(prev => [newContact, ...prev]);
      setSelectedContact(newContact);
      stopCamera();
    } catch (error) {
      alert("حدث خطأ في التحليل");
    } finally {
      setIsProcessing(false);
    }
  };

  const openExternalAction = (type: string, value: string) => {
    if (!value) return;
    let url = '';
    const cleanValue = value.trim();
    
    switch (type) {
      case 'instagram':
        url = cleanValue.includes('instagram.com') 
          ? (cleanValue.startsWith('http') ? cleanValue : `https://${cleanValue}`)
          : `https://instagram.com/${cleanValue.replace('@', '')}`;
        break;
      case 'facebook':
        url = cleanValue.includes('facebook.com')
          ? (cleanValue.startsWith('http') ? cleanValue : `https://${cleanValue}`)
          : `https://facebook.com/${cleanValue}`;
        break;
      case 'telegram':
        url = cleanValue.includes('t.me')
          ? (cleanValue.startsWith('http') ? cleanValue : `https://${cleanValue}`)
          : `https://t.me/${cleanValue.replace('@', '')}`;
        break;
      case 'website':
        url = cleanValue.startsWith('http') ? cleanValue : `https://${cleanValue}`;
        break;
      case 'phone':
        url = `tel:${cleanValue.replace(/\D/g, '')}`;
        break;
      case 'email':
        url = `mailto:${cleanValue}`;
        break;
      case 'whatsapp':
        let phone = cleanValue.replace(/\D/g, '');
        if (phone.startsWith('01')) phone = '2' + phone;
        url = `https://wa.me/${phone}`;
        break;
    }
    
    if (url) window.open(url, '_blank');
  };

  const updateContact = (updated: BusinessCardData) => {
    setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));
    setSelectedContact(updated);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#F9FAFB] text-slate-900 overflow-hidden" dir="rtl">
      
      {/* Header */}
      <header className="safe-top bg-white/80 backdrop-blur-xl sticky top-0 z-40 px-6 pt-4 pb-4 flex justify-between items-end border-b border-slate-100">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">Fashion CRM Pro</span>
          <h1 className="text-3xl font-[900] tracking-tight text-slate-900">عملاء الاستوديو</h1>
        </div>
        <button onClick={startCamera} className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg active:scale-95 transition-transform"><Plus className="w-6 h-6" /></button>
      </header>

      {/* Main List */}
      <main className="flex-1 overflow-y-auto custom-scroll p-6 pb-32">
        <div className="space-y-4">
          {contacts
            .filter(c => c.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(contact => (
            <div 
              key={contact.id} 
              onClick={() => setSelectedContact(contact)}
              className="bg-white p-5 rounded-[28px] ios-shadow flex items-center gap-4 active:scale-[0.98] transition-all cursor-pointer border border-white"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-[20px] flex items-center justify-center text-white font-black text-xl shadow-inner">
                {contact.companyName.charAt(0)}
              </div>
              <div className="flex-1 text-right">
                <h3 className="font-extrabold text-slate-900 text-lg">{contact.companyName}</h3>
                <p className="text-xs text-slate-400 font-bold">{contact.personName} • {contact.category}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </div>
          ))}
        </div>
      </main>

      {/* Nav */}
      <div className="fixed bottom-10 left-8 right-8 h-20 glass rounded-[36px] shadow-2xl flex items-center justify-around px-4 z-40">
        <button onClick={() => setView('list')} className={`p-4 ${view === 'list' ? 'text-indigo-600' : 'text-slate-300'}`}><ListIcon className="w-7 h-7" /></button>
        <button onClick={startCamera} className="w-16 h-16 bg-slate-900 rounded-[24px] flex items-center justify-center text-white shadow-2xl -translate-y-6 active:scale-90 transition-all"><Camera className="w-8 h-8" /></button>
        <button onClick={() => setView('pipeline')} className={`p-4 ${view === 'pipeline' ? 'text-indigo-600' : 'text-slate-300'}`}><LayoutGrid className="w-7 h-7" /></button>
      </div>

      {/* Camera UI */}
      {showScan && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="relative flex-1">
            <video ref={videoRef} autoPlay playsInline className="absolute w-full h-full object-cover" />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="w-[85%] aspect-[1.6/1] border-2 border-white/40 rounded-[40px] relative shadow-[0_0_0_1000px_rgba(0,0,0,0.5)]"></div>
            </div>
            {isProcessing && (
              <div className="absolute inset-0 bg-indigo-950/90 backdrop-blur-xl flex flex-col items-center justify-center text-white text-center">
                <div className="w-20 h-20 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mb-6"></div>
                <h2 className="text-2xl font-black">Gemini يحلل الروابط...</h2>
              </div>
            )}
          </div>
          <div className="bg-black p-10 flex justify-between items-center safe-bottom">
             <button onClick={stopCamera} className="text-white/60 font-black">إغلاق</button>
             <button onClick={captureAndProcess} className="w-20 h-20 rounded-full bg-white border-8 border-white/20"></button>
             <div className="w-10"></div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* Profile Sheet */}
      {selectedContact && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setSelectedContact(null)}></div>
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[48px] safe-bottom max-h-[92vh] overflow-y-auto custom-scroll animate-in slide-in-from-bottom duration-500">
             <div className="sticky top-0 bg-white/90 backdrop-blur-md px-8 py-4 flex justify-between items-center z-10">
                <button onClick={() => {if(confirm('حذف؟')) setContacts(prev=>prev.filter(c=>c.id!==selectedContact.id)); setSelectedContact(null);}} className="p-2 text-rose-500"><Trash2 className="w-5 h-5" /></button>
                <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                <button onClick={() => setSelectedContact(null)} className="p-2 text-slate-400"><X className="w-5 h-5" /></button>
             </div>
             
             <div className="p-8 space-y-8 pb-20">
                <div className="flex flex-col items-center text-center space-y-4">
                   <div className="w-24 h-24 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[32px] flex items-center justify-center text-white text-3xl font-black shadow-2xl">
                      {selectedContact.companyName.charAt(0)}
                   </div>
                   <div className="space-y-1">
                      <h2 className="text-2xl font-black text-slate-900">{selectedContact.companyName}</h2>
                      <p className="text-slate-400 font-bold">{selectedContact.personName}</p>
                   </div>
                </div>

                {/* Interactive Contact Actions */}
                <div className="space-y-4">
                   <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">التواصل المباشر</h5>
                   <div className="grid grid-cols-1 gap-3">
                      {[
                        { icon: <Instagram className="w-5 h-5" />, key: 'instagram', label: 'Instagram', color: "bg-rose-50 text-rose-500", type: 'instagram' },
                        { icon: <Facebook className="w-5 h-5" />, key: 'facebook', label: 'Facebook', color: "bg-blue-50 text-blue-600", type: 'facebook' },
                        { icon: <MessageCircle className="w-5 h-5" />, key: 'whatsapp', label: 'WhatsApp', color: "bg-emerald-50 text-emerald-600", type: 'whatsapp' },
                        { icon: <Globe className="w-5 h-5" />, key: 'website', label: 'Website', color: "bg-slate-50 text-slate-700", type: 'website' },
                        { icon: <Phone className="w-5 h-5" />, key: 'phone', label: 'Phone', color: "bg-indigo-50 text-indigo-600", type: 'phone' },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-[24px] group hover:border-indigo-100 transition-colors shadow-sm">
                           <div 
                              className={`w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer active:scale-90 transition-transform ${item.color}`}
                              onClick={() => openExternalAction(item.type, (selectedContact as any)[item.key])}
                           >
                              {item.icon}
                           </div>
                           <input 
                             className="flex-1 bg-transparent font-bold text-slate-900 focus:outline-none text-sm"
                             value={(selectedContact as any)[item.key] || ''}
                             placeholder={`أضف ${item.label}...`}
                             onChange={(e) => updateContact({...selectedContact, [item.key]: e.target.value})}
                           />
                           {(selectedContact as any)[item.key] && (
                             <button 
                                onClick={() => openExternalAction(item.type, (selectedContact as any)[item.key])}
                                className="p-2 text-indigo-400 hover:text-indigo-600 active:scale-110 transition-all"
                             >
                                <ExternalLink className="w-5 h-5" />
                             </button>
                           )}
                        </div>
                      ))}
                   </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-[32px] space-y-4">
                   <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ملاحظات</h5>
                   <textarea 
                     className="w-full bg-transparent font-medium text-slate-600 focus:outline-none min-h-[100px] resize-none"
                     value={selectedContact.notes}
                     placeholder="انطباعك عن العميل..."
                     onChange={(e) => updateContact({...selectedContact, notes: e.target.value})}
                   />
                </div>
                
                <button 
                  onClick={() => setSelectedContact(null)}
                  className="w-full py-6 bg-slate-900 text-white font-black text-lg rounded-[28px] shadow-xl active:scale-95 transition-all"
                >
                  حفظ البيانات
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
