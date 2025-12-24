
import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  User, 
  Building2, 
  Phone, 
  Mail, 
  Instagram, 
  Plus, 
  Search, 
  ChevronRight, 
  MessageCircle, 
  Clock, 
  Filter,
  Trash2,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  List as ListIcon,
  ChevronLeft,
  Send,
  Calendar,
  MoreVertical,
  HelpCircle,
  Briefcase
} from 'lucide-react';
import { extractBusinessCardData } from './services/geminiService';
import { BusinessCardData, ContactCategory, ContactStatus } from './types';
import { CATEGORIES, STATUSES, DEFAULT_TEMPLATES } from './constants';

const App: React.FC = () => {
  const [contacts, setContacts] = useState<BusinessCardData[]>([]);
  const [view, setView] = useState<'list' | 'pipeline' | 'scan' | 'detail'>('list');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContact, setSelectedContact] = useState<BusinessCardData | null>(null);
  const [showPlaybook, setShowPlaybook] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('fashion_contacts');
    if (saved) setContacts(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('fashion_contacts', JSON.stringify(contacts));
  }, [contacts]);

  // Camera logic
  const startCamera = async () => {
    setView('scan');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error(err);
      alert("Camera access denied or not available.");
      setView('list');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const captureAndProcess = async () => {
    if (!canvasRef.current || !videoRef.current) return;
    
    setIsProcessing(true);
    const context = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context?.drawImage(videoRef.current, 0, 0);
    
    const base64 = canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
    
    try {
      const data = await extractBusinessCardData(base64);
      const newContact: BusinessCardData = {
        id: crypto.randomUUID(),
        companyName: data.companyName || 'Unknown Company',
        personName: data.personName || 'Unknown Person',
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
      setView('detail');
    } catch (error) {
      alert("Failed to process image. Make sure the card is clear and try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteContact = (id: string) => {
    if (window.confirm("Delete this contact permanently?")) {
      setContacts(prev => prev.filter(c => c.id !== id));
      if (selectedContact?.id === id) {
        setSelectedContact(null);
        setView('list');
      }
    }
  };

  const updateContact = (updated: BusinessCardData) => {
    setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));
    setSelectedContact(updated);
  };

  const openWhatsApp = (contact: BusinessCardData, templateText: string) => {
    const myName = "Kareoke"; // App Owner Name
    const event = "Fashion Expo 2024"; // Context
    
    const text = templateText
      .replace(/{{personName}}/g, contact.personName)
      .replace(/{{myName}}/g, myName)
      .replace(/{{event}}/g, event);

    const encoded = encodeURIComponent(text);
    const phone = contact.whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
    
    // Auto-update status to contacted if it was new
    if (contact.status === 'New') {
      updateContact({ ...contact, status: 'Contacted', lastContactDate: new Date().toISOString() });
    } else {
      updateContact({ ...contact, lastContactDate: new Date().toISOString() });
    }
  };

  const getPlaybookSuggestion = (contact: BusinessCardData) => {
    const daysSinceCreated = Math.floor((Date.now() - new Date(contact.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    
    if (contact.status === 'New') return {
      title: "Send First Contact",
      action: () => openWhatsApp(contact, DEFAULT_TEMPLATES[0].text),
      icon: <Send className="w-5 h-5" />,
      desc: "Introduce yourself as the fashion photographer they met."
    };
    
    if (contact.status === 'Contacted') return {
      title: "Follow Up",
      action: () => openWhatsApp(contact, DEFAULT_TEMPLATES[1].text),
      icon: <Clock className="w-5 h-5" />,
      desc: "It's time to check if they saw your portfolio."
    };
    
    if (contact.status === 'Interested') return {
      title: "Propose Meeting",
      action: () => {}, // Custom logic or just open detail
      icon: <Briefcase className="w-5 h-5" />,
      desc: "They seem interested. Schedule a coffee or a test shoot."
    };

    return {
      title: "Stay on Radar",
      action: () => {},
      icon: <HelpCircle className="w-5 h-5" />,
      desc: "Keep this relationship warm with occasional updates."
    };
  };

  const filteredContacts = contacts.filter(c => 
    c.personName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.companyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white shadow-xl overflow-hidden border-x border-slate-200">
      
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white z-10">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Fashion CRM</h1>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Photographer Edition</p>
        </div>
        <button 
          onClick={startCamera}
          className="p-3 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-100 active:scale-95 transition-transform"
        >
          <Camera className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative bg-slate-50">
        
        {/* VIEW: SCANNING */}
        {view === 'scan' && (
          <div className="absolute inset-0 bg-black z-50 flex flex-col">
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="absolute w-full h-full object-cover"
              />
              {/* Overlay Frame */}
              <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none flex items-center justify-center">
                <div className="w-full aspect-[1.6/1] border-2 border-dashed border-white/60 rounded-xl relative">
                   <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-400 rounded-tl"></div>
                   <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-400 rounded-tr"></div>
                   <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-400 rounded-bl"></div>
                   <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-400 rounded-br"></div>
                </div>
              </div>
              
              {isProcessing && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white p-8 text-center">
                  <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-lg font-medium">Reading Business Card...</p>
                  <p className="text-sm opacity-70 mt-2">Gemini is extracting the details</p>
                </div>
              )}
            </div>
            
            <div className="bg-black/80 px-8 py-10 flex justify-between items-center">
              <button onClick={() => { stopCamera(); setView('list'); }} className="text-white/80 font-medium">Cancel</button>
              <button 
                disabled={isProcessing}
                onClick={captureAndProcess} 
                className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all ${isProcessing ? 'opacity-50' : 'active:scale-90'}`}
              >
                <div className="w-16 h-16 bg-white rounded-full"></div>
              </button>
              <div className="w-12"></div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {/* VIEW: LIST */}
        {view === 'list' && (
          <div className="p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search brands or names..."
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              {filteredContacts.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="w-8 h-8 text-indigo-400" />
                  </div>
                  <p className="text-slate-500 font-medium">No contacts yet</p>
                  <button onClick={startCamera} className="text-indigo-600 text-sm mt-2 font-semibold underline">Scan your first card</button>
                </div>
              ) : (
                filteredContacts.map(contact => (
                  <div 
                    key={contact.id} 
                    onClick={() => { setSelectedContact(contact); setView('detail'); }}
                    className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm active:bg-slate-50 transition-colors flex items-center gap-4 cursor-pointer"
                  >
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold shrink-0">
                      {contact.companyName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 truncate">{contact.companyName}</h3>
                      <p className="text-sm text-slate-500 truncate">{contact.personName}</p>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        contact.status === 'New' ? 'bg-green-100 text-green-700' : 
                        contact.status === 'Contacted' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {contact.status}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300 mt-1" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* VIEW: PIPELINE */}
        {view === 'pipeline' && (
          <div className="p-4 overflow-x-auto h-full">
            <div className="flex gap-4 h-full pb-10">
              {STATUSES.map(status => (
                <div key={status} className="w-64 shrink-0 flex flex-col gap-3">
                  <div className="flex justify-between items-center px-1">
                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">{status}</h3>
                    <span className="bg-slate-200 text-slate-600 text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold">
                      {contacts.filter(c => c.status === status).length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {contacts.filter(c => c.status === status).map(contact => (
                      <div 
                        key={contact.id}
                        onClick={() => { setSelectedContact(contact); setView('detail'); }}
                        className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 cursor-pointer active:scale-95 transition-transform"
                      >
                        <p className="font-bold text-sm text-slate-800">{contact.companyName}</p>
                        <p className="text-xs text-slate-500 mt-1">{contact.personName}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW: DETAIL / EDIT */}
        {view === 'detail' && selectedContact && (
          <div className="flex flex-col h-full bg-white">
            <div className="p-4 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white z-10">
              <button onClick={() => setView('list')} className="p-2 -ml-2"><ChevronLeft className="w-6 h-6 text-slate-600" /></button>
              <h2 className="font-bold text-slate-800">Contact Details</h2>
              <button onClick={() => deleteContact(selectedContact.id)} className="p-2 text-rose-500"><Trash2 className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-8 pb-32">
              {/* Profile Header */}
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-indigo-100">
                  {selectedContact.companyName.charAt(0)}
                </div>
                <div>
                  <input 
                    className="text-2xl font-black text-slate-900 text-center w-full focus:outline-none"
                    value={selectedContact.companyName}
                    onChange={(e) => updateContact({...selectedContact, companyName: e.target.value})}
                  />
                  <input 
                    className="text-slate-500 font-medium text-center w-full focus:outline-none"
                    value={selectedContact.personName}
                    onChange={(e) => updateContact({...selectedContact, personName: e.target.value})}
                  />
                </div>
              </div>

              {/* Classification */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Category</label>
                  <select 
                    className="w-full p-3 bg-slate-50 rounded-xl border-none text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
                    value={selectedContact.category}
                    onChange={(e) => updateContact({...selectedContact, category: e.target.value as ContactCategory})}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Status</label>
                  <select 
                    className="w-full p-3 bg-slate-50 rounded-xl border-none text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
                    value={selectedContact.status}
                    onChange={(e) => updateContact({...selectedContact, status: e.target.value as ContactStatus})}
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Playbook Button */}
              <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 flex items-center gap-4">
                <div className="p-3 bg-indigo-600 rounded-xl text-white">
                  {getPlaybookSuggestion(selectedContact).icon}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-indigo-900">{getPlaybookSuggestion(selectedContact).title}</h4>
                  <p className="text-xs text-indigo-700/70 leading-relaxed">{getPlaybookSuggestion(selectedContact).desc}</p>
                </div>
                <button 
                  onClick={getPlaybookSuggestion(selectedContact).action}
                  className="p-3 bg-white rounded-full shadow-sm text-indigo-600 active:scale-90 transition-transform"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>

              {/* Data Rows */}
              <div className="space-y-4">
                {[
                  { icon: <Phone className="w-4 h-4" />, label: "Phone", key: 'phone', val: selectedContact.phone },
                  { icon: <MessageCircle className="w-4 h-4 text-green-500" />, label: "WhatsApp", key: 'whatsapp', val: selectedContact.whatsapp },
                  { icon: <Mail className="w-4 h-4" />, label: "Email", key: 'email', val: selectedContact.email },
                  { icon: <Instagram className="w-4 h-4 text-pink-500" />, label: "Instagram", key: 'instagram', val: selectedContact.instagram },
                ].map((item) => (
                  <div key={item.key} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                    <div className="text-slate-400">{item.icon}</div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{item.label}</p>
                      <input 
                        className="w-full bg-transparent font-semibold text-slate-800 focus:outline-none"
                        value={item.val}
                        onChange={(e) => updateContact({...selectedContact, [item.key]: e.target.value})}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Notes & History</label>
                <textarea 
                  className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 text-sm min-h-[100px]"
                  placeholder="Last conversation, requirements, or follow-up plans..."
                  value={selectedContact.notes}
                  onChange={(e) => updateContact({...selectedContact, notes: e.target.value})}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Playbook Sidebar/Modal (Optional) */}
      {showPlaybook && (
         <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end">
            <div className="w-full bg-white rounded-t-[32px] p-8 pb-12 animate-in slide-in-from-bottom duration-300">
               <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8"></div>
               <h3 className="text-xl font-black mb-6">Playbook Suggestions</h3>
               <div className="space-y-4">
                  {DEFAULT_TEMPLATES.map((t, idx) => (
                    <button 
                      key={t.id}
                      onClick={() => {
                        if (selectedContact) openWhatsApp(selectedContact, t.text);
                        setShowPlaybook(false);
                      }}
                      className="w-full p-5 bg-slate-50 hover:bg-indigo-50 rounded-2xl text-left border border-slate-100 flex justify-between items-center group transition-all"
                    >
                      <div>
                        <p className="font-bold text-slate-800">{t.label}</p>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">Send a pre-formatted message to start or follow up.</p>
                      </div>
                      <Send className="w-5 h-5 text-indigo-400 group-hover:text-indigo-600" />
                    </button>
                  ))}
               </div>
               <button 
                  onClick={() => setShowPlaybook(false)}
                  className="w-full mt-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-xs"
               >
                 Close
               </button>
            </div>
         </div>
      )}

      {/* Bottom Navigation */}
      <nav className="h-20 bg-white border-t border-slate-100 flex items-center justify-around px-6 pb-2">
        <button 
          onClick={() => setView('list')} 
          className={`flex flex-col items-center gap-1 transition-colors ${view === 'list' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <ListIcon className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Contacts</span>
        </button>
        <button 
          onClick={() => setView('pipeline')} 
          className={`flex flex-col items-center gap-1 transition-colors ${view === 'pipeline' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Pipeline</span>
        </button>
        <button 
          disabled={!selectedContact}
          onClick={() => setShowPlaybook(true)}
          className={`flex flex-col items-center gap-1 transition-colors ${selectedContact ? 'text-indigo-600' : 'text-slate-200 cursor-not-allowed'}`}
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Playbook</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
