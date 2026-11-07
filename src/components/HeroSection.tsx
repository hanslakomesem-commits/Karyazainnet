import React from 'react';
import { ArrowRight, CheckCircle2, FileText, GraduationCap, Sparkles } from 'lucide-react';
import studentImage from '../assets/images/student_study_hero.webp';

interface HeroSectionProps {
  onExploreModules: () => void;
  totalToolsCount?: number;
}

// Charitize's split carousel composition, adapted to ZAIN.NET's existing actions.
export const HeroSection: React.FC<HeroSectionProps> = ({ onExploreModules, totalToolsCount = 12 }) => (
  <section className="charitize-hero" aria-labelledby="zain-hero-title">
    <div className="charitize-hero-copy">
      <span className="charitize-eyebrow"><Sparkles size={15} /> Pusat layanan akademik ZAIN.NET</span>
      <h1 id="zain-hero-title">Urus dokumen akademik <span>lebih mudah.</span></h1>
      <p>Mulai dari skripsi, artikel dan makalah hingga nota jilid. Pilih dari {totalToolsCount} alat yang tersedia dalam 12 menu layanan, lalu lanjutkan dengan alur yang sudah Anda kenal.</p>
      <div className="charitize-hero-actions">
        <button type="button" onClick={onExploreModules} className="charitize-primary-cta">
          Lihat menu 1–12 <ArrowRight size={19} />
        </button>
        <a href="https://wa.me/6285231176597" target="_blank" rel="noopener noreferrer" className="charitize-secondary-cta">Hubungi ZAIN.NET</a>
      </div>
      <div className="charitize-hero-benefits">
        <span><CheckCircle2 size={17} /> Proses mudah</span>
        <span><FileText size={17} /> Pilihan layanan lengkap</span>
        <span><GraduationCap size={17} /> Untuk kebutuhan akademik</span>
      </div>
    </div>
    <div className="charitize-hero-visual">
      <img src={studentImage} alt="Mahasiswa menyiapkan dokumen akademik" fetchPriority="high" width="720" height="560" />
      <div className="charitize-hero-caption"><span>12</span><strong>Menu layanan ZAIN.NET</strong></div>
    </div>
  </section>
);
