import React, { useState } from 'react';
import { 
  MessageCircle, 
  X, 
  Send, 
  HelpCircle, 
  CreditCard, 
  BookOpen, 
  Sparkles, 
  PhoneCall, 
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { User } from 'firebase/auth';
import { AppUser } from '../types';

interface WhatsAppSupportWidgetProps {
  user: User | AppUser | null;
}

export const WhatsAppSupportWidget: React.FC<WhatsAppSupportWidgetProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedTopic, setSelectedTopic] = useState<string>('payment');
  const [customMessage, setCustomMessage] = useState<string>('');

  const adminPhoneFormatted = "0852-3117-6597";
  const rawPhone = "6285231176597";

  const topics = [
    {
      id: 'payment',
      icon: CreditCard,
      title: 'Kendala Pembayaran / Aktivasi',
      defaultText: `Halo Admin ZAIN.NET, saya ingin menanyakan perihal pembayaran & aktivasi akses modul.${user?.email ? ` (Akun: ${user.email})` : ''}`
    },
    {
      id: 'guidance',
      icon: BookOpen,
      title: 'Cara Menggunakan Modul',
      defaultText: `Halo Admin ZAIN.NET, saya butuh panduan/bantuan cara menggunakan modul akademik (skripsi/artikel/parafrase).`
    },
    {
      id: 'plagiarism',
      icon: Sparkles,
      title: 'Konsultasi Penurunan Plagiasi',
      defaultText: `Halo Admin ZAIN.NET, saya ingin bertanya tentang cara kerja modul penurunan plagiasi & parafrase dokumen docx.`
    },
    {
      id: 'other',
      icon: HelpCircle,
      title: 'Pertanyaan Lain / Kendala Teknis',
      defaultText: `Halo Admin ZAIN.NET, saya mengalami kendala teknis pada aplikasi ZAIN.NET.`
    }
  ];

  const handleOpenWhatsApp = (textToSend?: string) => {
    const message = textToSend || customMessage || topics.find(t => t.id === selectedTopic)?.defaultText || "Halo Admin ZAIN.NET, saya butuh bantuan.";
    const encoded = encodeURIComponent(message);
    const waUrl = `https://wa.me/${rawPhone}?text=${encoded}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end">
      {/* Expanded Support Card */}
      {isOpen && (
        <div className="mb-3 w-80 sm:w-96 rounded-3xl bg-slate-900/95 border border-emerald-500/30 shadow-2xl shadow-emerald-950/50 backdrop-blur-md overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                    <span>Customer Service ZAIN.NET</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                  </h4>
                  <p className="text-[11px] text-emerald-100 font-medium mt-0.5">
                    WhatsApp Online • {adminPhoneFormatted}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white/80 hover:text-white cursor-pointer"
                title="Tutup Bantuan"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3.5">
            <div className="bg-slate-800/80 rounded-2xl p-3 border border-slate-700/60 text-xs text-slate-300 leading-relaxed">
              <p className="font-semibold text-emerald-300 mb-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Ada kendala atau hal yang kurang dimengerti?
              </p>
              Tim admin kami siap membantu Anda seputar aktivasi lisensi, modul skripsi, dan pembayaran.
            </div>

            {/* Topic Select */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Pilih Topik Bantuan:
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {topics.map((t) => {
                  const Icon = t.icon;
                  const isSelected = selectedTopic === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedTopic(t.id);
                        setCustomMessage(t.defaultText);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 font-bold'
                          : 'bg-slate-800/50 hover:bg-slate-800 border border-slate-700/40 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <span>{t.title}</span>
                      </div>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message Preview / Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Pesan yang akan dikirim:
              </label>
              <textarea
                value={customMessage || topics.find(t => t.id === selectedTopic)?.defaultText || ''}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 transition-colors resize-none placeholder-slate-500"
                placeholder="Tulis pertanyaan Anda..."
              />
            </div>

            {/* Direct Connect WhatsApp Button */}
            <button
              onClick={() => handleOpenWhatsApp()}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all active:scale-95 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Hubungi Kami Lewat WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>

            <div className="text-center pt-1">
              <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <span>Nomor CS Resmi:</span>
                <strong className="text-emerald-300 font-mono">085231176597</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        id="whatsapp-floating-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/40 border border-emerald-400/40 transition-all duration-200 active:scale-95 cursor-pointer"
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </span>

        <MessageCircle className="w-5 h-5 text-white" />
        
        <span className="hidden sm:inline-block">Customer Service (WA)</span>
        <span className="sm:hidden">Bantuan CS</span>

        {/* Tooltip on hover */}
        {!isOpen && (
          <div className="hidden group-hover:block absolute bottom-full mb-2 right-0 bg-slate-900 text-slate-200 text-xs px-3 py-1.5 rounded-xl border border-slate-700 shadow-lg whitespace-nowrap pointer-events-none">
            Hubungi Admin WA (085231176597)
          </div>
        )}
      </button>
    </div>
  );
};
