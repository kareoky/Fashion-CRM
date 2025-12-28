
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
  Check,
  Zap,
  BrainCircuit,
  AlertCircle
} from 'lucide-react';
import { extractBusinessCardData, generateFollowUpStrategy } from './services/geminiService';
import { BusinessCardData, ContactCategory, ContactStatus } from './types';
import { CATEGORIES, STATUSES, DEFAULT_TEMPLATES } from './constants';

const App: React.FC = () => {
  const [contacts, setContacts] = useState<BusinessCardData[]>([]);
  const [view, setView] = useState<'list' | 'pipeline'>('list');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
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

  const handleGenerateStrategy = async () => {
    if (!selectedContact) return;
    setIsGeneratingStrategy(true);
    try {
      const strategy = await generateFollowUpStrategy(selectedContact);
      updateContact({ ...selectedContact, aiStrategy: strategy });
    } catch (error) {
      alert("فشل توليد الخطة. تأكد من جودة الاتصال بالإنترنت.");
    } finally {
      setIsGeneratingStrategy(false);
    }
  };

  const deleteContact = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا العميل نهائياً؟')) {
      setContacts(prev => prev.filter(c => c.id !== id));
      setSelectedContact(null);
    }
  };

  const openWhatsApp = (contact: BusinessCardData, templateText: string) => {
    const allNumbers = contact.whatsapp
      .split(/[;,\s]+/)
      .map(n => n.trim())
      .filter(n => n.length > 7);
    
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
    let raw = number.trim();
    if (raw.startsWith('00')) raw = raw.substring(2);
    if (raw.startsWith('+')) raw = raw.substring(1);
    let clean = raw.replace(/\D/g, ''); 
    if (!clean.startsWith('20') && clean.startsWith('01') && clean.length === 11) clean = '2' + clean;
    else if (!clean.startsWith('20') && clean.startsWith('1') && clean.length === 10) clean = '20' + clean;

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
                <button onClick={() => deleteContact(selectedContact.id)} className="p-2 bg-rose-50 rounded-full text-rose-500 active:bg-rose-100 transition-colors"><Trash2 className="w-5 h-5" /></button>
                <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                <button onClick={() => setSelectedContact(null)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X className="w-5 h-5" /></button>
             </div>
             
             <div className="p-8 space-y-8 pb-12">
                {/* Profile Header */}
                <div className="flex flex-col items-center text-center space-y-4">
                   <div className="w-28 h-28 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[40px] flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-indigo-100 uppercase relative overflow-hidden group">
                      {selectedContact.companyName.charAt(0)}
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-active:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold">تغيير</div>
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

                {/* AI Action Plan Card */}
                <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-6 rounded-[36px] text-white space-y-4 shadow-2xl shadow-indigo-200 relative overflow-hidden">
                   <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl"></div>
                   <div className="flex items-center gap-3 relative z-10">
                      <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-950">
                         <BrainCircuit className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="font-black text-xs uppercase tracking-widest text-indigo-400">خطة العمل الذكية</h4>
                   </div>
                   
                   {selectedContact.aiStrategy ? (
                      <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 relative z-10">
                         <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                            {selectedContact.aiStrategy}
                         </p>
                         <button 
                            onClick={handleGenerateStrategy}
                            className="mt-4 flex items-center gap-2 text-indigo-300 text-xs font-black uppercase tracking-widest hover:text-white transition-colors"
                         >
                            <Zap className="w-3 h-3" /> تحديث الخطة
                         </button>
                      </div>
                   ) : (
                      <div className="flex flex-col items-center py-4 space-y-4 relative z-10">
                         <p className="text-white/60 text-xs text-center font-bold px-6">
                            اترك Gemini يحلل هذا العميل ويقترح عليك استراتيجية تواصل مثالية
                         </p>
                         <button 
                           onClick={handleGenerateStrategy}
                           disabled={isGeneratingStrategy}
                           className="w-full bg-white text-slate-900 py-4 rounded-2xl font-black text-sm active:scale-95 transition-all flex items-center justify-center gap-2"
                         >
                           {isGeneratingStrategy ? (
                             <div className="flex gap-1">
                               <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                               <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                               <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                             </div>
                           ) : (
                             <>توليد خطة العمل <Sparkles className="w-4 h-4 text-indigo-500" /></>
                           )}
                         </button>
                      </div>
                   )}
                </div>

                {/* Primary Contact Action */}
                <button 
                   onClick={() => setShowPlaybook(true)}
                   className="w-full bg-indigo-600 p-6 rounded-[32px] text-white flex items-center justify-between shadow-xl shadow-indigo-100 active:scale-95 transition-all"
                >
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                         <MessageCircle className="w-6 h-6" />
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest">التواصل السريع</p>
                         <p className="text-lg font-black">إرسال واتساب</p>
                      </div>
                   </div>
                   <ChevronRight className="w-6 h-6 text-indigo-200" />
                </button>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-5 bg-slate-50 rounded-[28px] space-y-2 border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">التصنيف</p>
                      <select 
                        className="bg-transparent font-black text-indigo-950 outline-none w-full"
                        value={selectedContact.category}
                        onChange={(e) => updateContact({...selectedContact, category: e.target.value as ContactCategory})}
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                   </div>
                   <div className="p-5 bg-slate-50 rounded-[28px] space-y-2 border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">المرحلة</p>
                      <select 
                        className="bg-transparent font-black text-indigo-950 outline-none w-full"
                        value={selectedContact.status}
                        onChange={(e) => updateContact({...selectedContact, status: e.target.value as ContactStatus})}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                   </div>
                </div>

                {/* Contact List */}
                <div className="space-y-3">
                   {[
                     { icon: <Phone className="w-5 h-5" />, key: 'phone', label: 'أرقام الهاتف', color: "bg-blue-50 text-blue-500" },
                     { icon: <MessageCircle className="w-5 h-5" />, key: 'whatsapp', label: 'أرقام الواتساب', color: "bg-emerald-50 text-emerald-500" },
                     { icon: <Instagram className="w-5 h-5" />, key: 'instagram', label: 'انستجرام', color: "bg-rose-50 text-rose-500" },
                     { icon: <Mail className="w-5 h-5" />, key: 'email', label: 'إيميل', color: "bg-indigo-50 text-indigo-500" },
                   ].map((item) => (
                     <div key={item.key} className="flex flex-col p-5 bg-white border border-slate-100 rounded-[28px] space-y-2 group focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                       <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color} shadow-sm group-focus-within:scale-110 transition-transform`}>{item.icon}</div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                       </div>
                       <input 
                         className="flex-1 bg-transparent font-bold text-slate-900 focus:outline-none pr-2 text-lg"
                         value={(selectedContact as any)[item.key]}
                         placeholder={`أدخل ${item.label}`}
                         onChange={(e) => updateContact({...selectedContact, [item.key]: e.target.value})}
                       />
                     </div>
                   ))}
                </div>

                {/* Notes & Field */}
                <div className="p-8 bg-slate-50 rounded-[40px] space-y-6 border border-slate-100">
                   <div className="space-y-2">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">تخصص العميل</h5>
                      <input 
                        className="w-full bg-transparent font-black text-slate-900 focus:outline-none border-b-2 border-slate-200 pb-2 text-xl"
                        value={selectedContact.field}
                        placeholder="أطفال، رجالي، لانجري..."
                        onChange={(e) => updateContact({...selectedContact, field: e.target.value})}
                      />
                   </div>
                   <div className="space-y-2">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ملاحظات الاجتماع</h5>
                      <textarea 
                        className="w-full bg-transparent font-medium text-slate-600 focus:outline-none min-h-[120px] resize-none text-lg leading-relaxed"
                        value={selectedContact.notes}
                        placeholder="اكتب هنا ما لفت انتباهك في الكارت أو الاجتماع..."
                        onChange={(e) => updateContact({...selectedContact, notes: e.target.value})}
                      />
                   </div>
                </div>
                
                <button 
                  onClick={() => setSelectedContact(null)}
                  className="w-full py-6 bg-slate-900 text-white font-black text-lg rounded-[28px] active:scale-95 transition-all shadow-xl shadow-slate-200"
                >
                  حفظ التعديلات
                </button>

                <div className="flex justify-center pt-4">
                   <button 
                     onClick={() => deleteContact(selectedContact.id)}
                     className="flex items-center gap-2 text-rose-500 font-bold text-sm uppercase tracking-widest"
                   >
                     <AlertCircle className="w-4 h-4" /> حذف العميل من القائمة
                   </button>
                </div>
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
             <h3 className="text-2xl font-black text-slate-950 mb-8 text-center">اختيار القالب المناسب</h3>
             <div className="space-y-4">
                {DEFAULT_TEMPLATES.map((t) => (
                   <button 
                     key={t.id}
                     onClick={() => { if(selectedContact) openWhatsApp(selectedContact, t.text); setShowPlaybook(false); }}
                     className="w-full p-7 bg-slate-50 hover:bg-indigo-50 border border-slate-100 rounded-[32px] flex items-center justify-between group transition-all text-right shadow-sm"
                   >
                     <div className="flex-1">
                        <p className="font-black text-slate-900 text-lg mb-1">{t.label}</p>
                        <p className="text-xs text-slate-400 font-bold">إرسال الرسالة المقترحة تلقائياً</p>
                     </div>
                     <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg text-indigo-500 group-active:scale-90 transition-transform">
                        <Send className="w-7 h-7" />
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
