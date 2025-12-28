
import React, { useState, useEffect, useRef } from 'react';
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
  Check
} from 'lucide-react';
import { extractBusinessCardData } from './services/geminiService';
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
  
  const [phoneSelector, setPhoneSelector] = useState<{ contact: BusinessCardData, template: string, numbers: string[] } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('fashion_contacts_v2');
    if (saved) setContacts(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('fashion_contacts_v2', JSON.stringify(contacts));
  }, [contacts]);

  const startCamera = async () => {
    setShowScan(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("يرجى تفعيل الكاميرا من إعدادات الآيفون");
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
        companyName: data.companyName || 'شركة جديدة',
        personName: data.personName || 'جهة اتصال',
        phone: data.phone || '',
        whatsapp: data.whatsapp || data.phone || '',
        email: data.email || '',
        instagram: data.instagram || '',
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
      alert("تعذر تحليل الصورة. حاول التصوير في إضاءة أفضل.");
    } finally {
      setIsProcessing(false);
    }
  };

  const openWhatsApp = (contact: BusinessCardData, templateText: string) => {
    // فصل الأرقام بناءً على أي فواصل (مسافات، فواصل منقوطة، فواصل عادية)
    const allNumbers = contact.whatsapp
      .split(/[;,\s]+/)
      .map(n => n.trim())
      .filter(n => n.length > 7); // استبعاد الأرقام القصيرة جداً التي قد تكون خطأ في التحليل
    
    if (allNumbers.length > 1) {
      setPhoneSelector({ contact, template: templateText, numbers: allNumbers });
    } else if (allNumbers.length === 1) {
      executeWhatsAppLink(allNumbers[0], contact, templateText);
    } else {
      alert("لا يوجد رقم واتساب مسجل لهذا العميل");
    }
  };

  const executeWhatsAppLink = (number: string, contact: BusinessCardData, templateText: string) => {
    const text = templateText
      .replace(/{{personName}}/g, contact.personName)
      .replace(/{{myName}}/g, "كريم")
      .replace(/{{event}}/g, "معرض الأزياء");
    
    const encodedText = encodeURIComponent(text);
    
    // منطق تنظيف الرقم المطور
    let raw = number.trim();
    
    // 1. التعامل مع البدايات (حذف 00 أو +)
    if (raw.startsWith('00')) raw = raw.substring(2);
    if (raw.startsWith('+')) raw = raw.substring(1);
    
    // 2. حذف أي مسافات أو علامات متبقية
    let clean = raw.replace(/\D/g, ''); 
    
    // 3. ذكاء كود الدولة (مصر كمثال أساسي)
    // إذا كان الرقم يبدأ بـ 20 فهو كامل
    if (clean.startsWith('20')) {
      // رقم سليم بالفعل
    } 
    // إذا كان يبدأ بـ 01 فهو موبايل مصري بدون كود الدولة
    else if (clean.startsWith('01') && clean.length === 11) {
      clean = '2' + clean; // نحوله لـ 201...
    }
    // إذا كان يبدأ بـ 1 فقط (بدون الـ 0)
    else if (clean.startsWith('1') && clean.length === 10) {
      clean = '20' + clean;
    }

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${clean}&text=${encodedText}`;
    window.open(whatsappUrl, '_blank');

    if (contact.status === 'New') {
      updateContact({ ...contact, status: 'Contacted', lastContactDate: new Date().toISOString() });
    }
    setPhoneSelector(null);
  };

  const updateContact = (updated: BusinessCardData) => {
    setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));
    setSelectedContact(updated);
  };

  const stats = {
    total: contacts.length,
    new: contacts.filter(c => c.status === 'New').length,
    deals: contacts.filter(c => c.status === 'Deal Closed').length
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#F9FAFB] text-slate-900 select-none overflow-hidden" dir="rtl">
      
      {/* Header */}
      <header className="safe-top bg-white/80 backdrop-blur-xl sticky top-0 z-40 px-6 pt-4 pb-4 flex justify-between items-end border-b border-slate-100">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">Fashion Contacts CRM</span>
          <h1 className="text-3xl font-[900] tracking-tight text-slate-900">عملاء الاستوديو</h1>
        </div>
        <div className="flex gap-2 pb-1">
           <button className="p-3 bg-slate-50 rounded-2xl text-slate-400 active:scale-90 transition-transform"><Settings className="w-5 h-5" /></button>
           <button onClick={startCamera} className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100 active:scale-95 transition-transform"><Plus className="w-6 h-6" /></button>
        </div>
      </header>

      {/* Stats */}
      <div className="px-6 py-4 flex gap-3 overflow-x-auto no-scrollbar bg-white">
        <div className="flex-1 min-w-[120px] p-4 bg-indigo-50 rounded-3xl flex flex-col items-center border border-indigo-100/50">
          <span className="text-indigo-600 font-black text-xl">{stats.total}</span>
          <span className="text-[10px] font-bold text-indigo-400 uppercase">إجمالي الجهات</span>
        </div>
        <div className="flex-1 min-w-[120px] p-4 bg-emerald-50 rounded-3xl flex flex-col items-center border border-emerald-100/50">
          <span className="text-emerald-600 font-black text-xl">{stats.new}</span>
          <span className="text-[10px] font-bold text-emerald-400 uppercase">عملاء جدد</span>
        </div>
        <div className="flex-1 min-w-[120px] p-4 bg-violet-50 rounded-3xl flex flex-col items-center border border-violet-100/50">
          <span className="text-violet-600 font-black text-xl">{stats.deals}</span>
          <span className="text-[10px] font-bold text-violet-400 uppercase">عقود مغلقة</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-6 py-4 bg-white">
        <div className="relative group">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            type="text" 
            placeholder="ابحث عن براند، مصنع، أو اسم..."
            className="w-full pr-11 pl-4 py-4 bg-slate-50 border-none rounded-[20px] text-sm font-bold focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto custom-scroll pb-32">
        {view === 'list' ? (
          <div className="p-6 space-y-4 fade-in">
            {contacts
              .filter(c => c.personName.toLowerCase().includes(searchTerm.toLowerCase()) || c.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(contact => (
              <div 
                key={contact.id} 
                onClick={() => setSelectedContact(contact)}
                className="bg-white p-5 rounded-[28px] ios-shadow border border-slate-50 flex items-center gap-4 active:scale-[0.97] transition-all cursor-pointer"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-slate-800 to-slate-950 rounded-[20px] flex items-center justify-center text-white font-black text-xl shadow-inner uppercase">
                  {contact.companyName.charAt(0)}
                </div>
                <div className="flex-1 text-right">
                  <h3 className="font-extrabold text-slate-900 text-lg">{contact.companyName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-slate-100 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-tighter">{contact.category}</span>
                    <p className="text-xs text-slate-400 font-bold flex items-center gap-1">
                      <Briefcase className="w-3 h-3" /> {contact.personName}
                    </p>
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  contact.status === 'New' ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)] animate-pulse' : 'bg-indigo-400'
                }`}></div>
              </div>
            ))}
          </div>
        ) : (
          /* Pipeline View */
          <div className="flex gap-4 p-6 overflow-x-auto h-full items-start custom-scroll no-scrollbar fade-in">
            {STATUSES.map(status => (
              <div key={status} className="w-80 shrink-0 space-y-5">
                <div className="flex items-center justify-between px-3 bg-white/50 p-2 rounded-2xl">
                  <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{status}</h3>
                  <span className="bg-white text-indigo-600 px-3 py-1 rounded-xl text-xs font-black shadow-sm border border-slate-100">
                    {contacts.filter(c => c.status === status).length}
                  </span>
                </div>
                <div className="space-y-4">
                  {contacts.filter(c => c.status === status).map(c => (
                    <div key={c.id} onClick={() => setSelectedContact(c)} className="bg-white p-5 rounded-[24px] ios-shadow border border-slate-50 active:scale-95 transition-all">
                      <h4 className="font-black text-slate-900 mb-1">{c.companyName}</h4>
                      <p className="text-[10px] text-slate-400 font-bold">{c.category} • {c.personName}</p>
                    </div>
                  ))}
                  <button onClick={startCamera} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-3xl text-slate-300 flex items-center justify-center hover:bg-slate-50 transition-colors">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating Bottom Nav */}
      <div className="fixed bottom-10 left-8 right-8 h-20 glass rounded-[36px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] flex items-center justify-around px-4 z-40 border border-white/50">
        <button onClick={() => setView('list')} className={`flex flex-col items-center gap-1 transition-all p-4 ${view === 'list' ? 'text-indigo-600 scale-110' : 'text-slate-300'}`}>
          <ListIcon className="w-7 h-7" strokeWidth={view === 'list' ? 3 : 2} />
        </button>
        
        <button onClick={startCamera} className="w-16 h-16 bg-slate-900 rounded-[24px] flex items-center justify-center text-white shadow-2xl shadow-slate-400 -translate-y-6 border-4 border-white active:scale-90 transition-all">
          <Camera className="w-8 h-8" />
        </button>
        
        <button onClick={() => setView('pipeline')} className={`flex flex-col items-center gap-1 transition-all p-4 ${view === 'pipeline' ? 'text-indigo-600 scale-110' : 'text-slate-300'}`}>
          <LayoutGrid className="w-7 h-7" strokeWidth={view === 'pipeline' ? 3 : 2} />
        </button>
      </div>

      {/* Phone Number Selector Sheet */}
      {phoneSelector && (
        <div className="fixed inset-0 z-[120]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setPhoneSelector(null)}></div>
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[48px] safe-bottom p-8 animate-in slide-in-from-bottom duration-400">
             <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-10"></div>
             <h3 className="text-2xl font-black text-slate-950 mb-4 text-center">اختر الرقم للإرسال</h3>
             <p className="text-slate-400 text-center text-sm font-bold mb-8">أي رقم تود مراسلته على واتساب؟</p>
             <div className="space-y-4">
                {phoneSelector.numbers.map((number, idx) => (
                   <button 
                     key={idx}
                     onClick={() => executeWhatsAppLink(number, phoneSelector.contact, phoneSelector.template)}
                     className="w-full p-6 bg-slate-50 hover:bg-indigo-50 border border-slate-100 rounded-[28px] flex items-center justify-between group transition-all text-right"
                   >
                     <div className="flex-1">
                        <p className="font-black text-slate-900 text-xl tracking-wider">{number}</p>
                        <p className="text-xs text-indigo-400 font-bold mt-1">إرسال الرسالة لهذا الرقم</p>
                     </div>
                     <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100 text-white">
                        <MessageCircle className="w-6 h-6" />
                     </div>
                   </button>
                ))}
             </div>
             <button onClick={() => setPhoneSelector(null)} className="w-full mt-10 py-5 text-slate-400 font-black uppercase tracking-widest text-xs">إلغاء</button>
          </div>
        </div>
      )}

      {/* Camera UI */}
      {showScan && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="relative flex-1 overflow-hidden">
            <video ref={videoRef} autoPlay playsInline className="absolute w-full h-full object-cover" />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="w-[85%] aspect-[1.6/1] border-2 border-white/40 rounded-[40px] relative">
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-indigo-500 rounded-tl-[36px]"></div>
                  <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-indigo-500 rounded-tr-[36px]"></div>
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-indigo-500 rounded-bl-[36px]"></div>
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-indigo-500 rounded-br-[36px]"></div>
                </div>
            </div>
            
            {isProcessing && (
              <div className="absolute inset-0 bg-indigo-950/80 backdrop-blur-xl flex flex-col items-center justify-center text-white px-10 text-center">
                <div className="w-24 h-24 relative flex items-center justify-center mb-8">
                  <div className="absolute inset-0 border-4 border-white/10 border-t-indigo-400 rounded-full animate-spin"></div>
                  <Sparkles className="w-10 h-10 text-indigo-300 animate-pulse" />
                </div>
                <h2 className="text-2xl font-black mb-3">Gemini يحلل الكارت...</h2>
              </div>
            )}
          </div>
          <div className="bg-black/95 safe-bottom p-10 flex justify-between items-center px-12">
             <button onClick={stopCamera} className="text-white/60 font-black text-sm uppercase tracking-widest active:text-white">إغلاق</button>
             <button onClick={captureAndProcess} className="w-20 h-20 rounded-full bg-white flex items-center justify-center border-[8px] border-white/20 active:scale-90 transition-all">
                <div className="w-16 h-16 rounded-full border-4 border-black/10"></div>
             </button>
             <div className="w-16"></div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* iOS Modal Profile */}
      {selectedContact && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setSelectedContact(null)}></div>
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[48px] safe-bottom max-h-[92vh] overflow-y-auto custom-scroll animate-in slide-in-from-bottom duration-500 ios-shadow">
             <div className="sticky top-0 bg-white/90 backdrop-blur-md px-8 py-4 flex justify-between items-center z-10">
                <button onClick={() => setSelectedContact(null)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X className="w-5 h-5" /></button>
                <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                <button className="p-2 bg-slate-100 rounded-full text-slate-400"><Share2 className="w-5 h-5" /></button>
             </div>
             
             <div className="p-8 space-y-8 pb-12">
                {/* Profile Header */}
                <div className="flex flex-col items-center text-center space-y-4">
                   <div className="w-28 h-28 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[40px] flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-indigo-100 uppercase">
                      {selectedContact.companyName.charAt(0)}
                   </div>
                   <div className="space-y-1">
                      <input 
                        className="text-3xl font-[900] text-slate-900 w-full text-center focus:outline-none bg-transparent"
                        value={selectedContact.companyName}
                        onChange={(e) => updateContact({...selectedContact, companyName: e.target.value})}
                      />
                      <input 
                        className="text-slate-400 font-bold text-lg w-full text-center focus:outline-none bg-transparent"
                        value={selectedContact.personName}
                        onChange={(e) => updateContact({...selectedContact, personName: e.target.value})}
                      />
                   </div>
                </div>

                {/* AI Playbook Action */}
                <div className="bg-slate-900 p-6 rounded-[36px] text-white flex items-center gap-5 shadow-2xl shadow-slate-200">
                   <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shrink-0">
                      <MessageCircle className="w-6 h-6" />
                   </div>
                   <div className="flex-1">
                      <h4 className="font-black text-sm uppercase tracking-widest text-indigo-400 mb-1">الخطوة القادمة</h4>
                      <p className="text-white text-sm font-bold">بدء التواصل الفوري</p>
                   </div>
                   <button 
                     onClick={() => setShowPlaybook(true)}
                     className="bg-white text-slate-900 px-6 py-4 rounded-2xl font-black text-sm active:scale-95 transition-all"
                   >
                     ارسل الآن
                   </button>
                </div>

                {/* Contact List */}
                <div className="space-y-3">
                   {[
                     { icon: <Phone className="w-5 h-5" />, key: 'phone', label: 'أرقام الهاتف', color: "bg-blue-50 text-blue-500" },
                     { icon: <MessageCircle className="w-5 h-5" />, key: 'whatsapp', label: 'أرقام الواتساب', color: "bg-emerald-50 text-emerald-500" },
                     { icon: <Instagram className="w-5 h-5" />, key: 'instagram', label: 'انستجرام', color: "bg-rose-50 text-rose-500" },
                     { icon: <Mail className="w-5 h-5" />, key: 'email', label: 'إيميل', color: "bg-indigo-50 text-indigo-500" },
                   ].map((item) => (
                     <div key={item.key} className="flex flex-col p-4 bg-white border border-slate-100 rounded-[24px] space-y-2">
                       <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>{item.icon}</div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                       </div>
                       <input 
                         className="flex-1 bg-transparent font-bold text-slate-900 focus:outline-none pr-2"
                         value={(selectedContact as any)[item.key]}
                         placeholder={`أدخل ${item.label}`}
                         onChange={(e) => updateContact({...selectedContact, [item.key]: e.target.value})}
                       />
                     </div>
                   ))}
                </div>

                {/* Notes */}
                <div className="p-6 bg-slate-50 rounded-[32px] space-y-4">
                   <div className="space-y-2">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ملاحظات خاصة</h5>
                      <textarea 
                        className="w-full bg-transparent font-medium text-slate-600 focus:outline-none min-h-[100px] resize-none"
                        value={selectedContact.notes}
                        placeholder="اكتب أي تفاصيل أخرى..."
                        onChange={(e) => updateContact({...selectedContact, notes: e.target.value})}
                      />
                   </div>
                </div>
                
                <button 
                  onClick={() => setSelectedContact(null)}
                  className="w-full py-5 bg-slate-900 text-white font-black text-sm rounded-3xl active:scale-95 transition-all"
                >
                  حفظ وإغلاق
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Playbook Templates Sheet */}
      {showPlaybook && (
        <div className="fixed inset-0 z-[110]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowPlaybook(false)}></div>
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[48px] safe-bottom p-8 animate-in slide-in-from-bottom duration-400">
             <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-10"></div>
             <h3 className="text-2xl font-black text-slate-950 mb-8 text-center">اختيار قالب الرسالة</h3>
             <div className="space-y-4">
                {DEFAULT_TEMPLATES.map((t) => (
                   <button 
                     key={t.id}
                     onClick={() => { if(selectedContact) openWhatsApp(selectedContact, t.text); setShowPlaybook(false); }}
                     className="w-full p-6 bg-slate-50 hover:bg-indigo-50 border border-slate-100 rounded-[28px] flex items-center justify-between group transition-all text-right"
                   >
                     <div className="flex-1">
                        <p className="font-black text-slate-900 text-lg">{t.label}</p>
                     </div>
                     <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-indigo-500">
                        <Send className="w-6 h-6" />
                     </div>
                   </button>
                ))}
             </div>
             <button onClick={() => setShowPlaybook(false)} className="w-full mt-10 py-5 text-slate-400 font-black uppercase tracking-widest text-xs">تراجع</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
