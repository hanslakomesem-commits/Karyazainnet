import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { UploadZone } from './components/UploadZone';
import { PhotoList } from './components/PhotoList';
import { ConfigPanel } from './components/ConfigPanel';
import { DocumentPreview } from './components/DocumentPreview';
import { ExportToolbar } from './components/ExportToolbar';
import { XmlModal } from './components/XmlModal';
import { GridConfig, PhotoItem } from './types';
import { calculateLayout, generateDocxBlob, generateDocumentXml, expandPhotosWithCopies } from './utils/openXmlGenerator';
import { generatePdfBlob } from './utils/pdfGenerator';
import { processImageToBlob, generateSamplePhotoFile } from './utils/imageProcessor';
import { convertPdfToJpgPages, detectIsStnk, detectIsKtp } from './utils/pdfToJpg';
import {
  A4_LAYOUT_PRESETS,
  A4LayoutPreset,
  A4_FULL_PLANS,
  FullA4PhotoPlan,
  applyFullA4Plan,
} from './utils/conversions';
import { CheckCircle2, AlertCircle, FileText, Sparkles, CreditCard, LayoutGrid } from 'lucide-react';

const INITIAL_CONFIG: GridConfig = {
  unit: 'cm',
  targetWidthCm: 3.0,
  targetHeightCm: 4.0,
  resizeMode: 'smart_crop',
  autoRotateMode: 'keep',
  sizeLayoutMode: 'uniform',
  multiSizePackingMode: 'compact_side_by_side',
  rowConfigs: [
    { id: 'row_1', widthCm: 4.0, heightCm: 6.0, columnsMode: 'custom', customColumns: 5 },
    { id: 'row_2', widthCm: 3.0, heightCm: 4.0, columnsMode: 'custom', customColumns: 6 },
    { id: 'row_3', widthCm: 2.0, heightCm: 3.0, columnsMode: 'custom', customColumns: 8 },
  ],
  paperType: 'A4',
  customPaperWidthCm: 21.0,
  customPaperHeightCm: 29.7,
  orientation: 'portrait',
  margins: {
    topCm: 0.3,
    bottomCm: 1.0,
    leftCm: 0.5,
    rightCm: 0.5,
  },
  gutterCm: 0.08,
  rowSpacingCm: 0.3,
  columnsMode: 'auto',
  customColumns: 6,
  showCutGuides: true,
  showLabels: false,
  labelType: 'filename',
  backgroundColor: '#FFFFFF',
  dpi: 300,
};

interface PhotoGridViewProps {
  onExportComplete?: (fileName: string) => void;
}

export const PhotoGridView: React.FC<PhotoGridViewProps> = ({ onExportComplete }) => {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [config, setConfig] = useState<GridConfig>(INITIAL_CONFIG);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [isXmlModalOpen, setIsXmlModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Re-process photos whenever size or resizeMode changes
  useEffect(() => {
    if (photos.length === 0) return;

    let isMounted = true;

    const reprocessAll = async () => {
      const updatedPhotos = await Promise.all(
        photos.map(async (p) => {
          try {
            const isItemStnk = !!p.isStnk || (Math.abs(config.targetWidthCm - 23.0) < 0.2 && Math.abs(config.targetHeightCm - 7.5) < 0.2);
            const effectiveMode = isItemStnk ? 'stretch' : config.resizeMode;
            const { dataUrl, blob } = await processImageToBlob(p.dataUrl, {
              widthCm: config.targetWidthCm,
              heightCm: config.targetHeightCm,
              mode: effectiveMode,
              autoRotateMode: config.autoRotateMode,
              manualRotateAngle: p.rotation || 0,
              dpi: config.dpi,
              backgroundColor: config.backgroundColor,
            });
            return {
              ...p,
              processedDataUrl: dataUrl,
              processedBlob: blob,
            };
          } catch (e) {
            console.error('Error re-processing photo:', e);
            return p;
          }
        })
      );

      if (isMounted) {
        setPhotos(updatedPhotos);
      }
    };

    reprocessAll();

    return () => {
      isMounted = false;
    };
  }, [config.targetWidthCm, config.targetHeightCm, config.resizeMode, config.autoRotateMode, config.backgroundColor]);

  // Handle uploaded files (Image files and PDF files with auto-compress to JPG)
  const handleFilesSelected = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const pdfFiles = files.filter(
      (f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name)
    );
    const validImageFiles = files.filter(
      (f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(f.name)
    );

    if (pdfFiles.length === 0 && validImageFiles.length === 0) {
      showToast('Format file tidak didukung. Harap unggah foto (JPG/PNG/WEBP) atau dokumen PDF.', 'info');
      return;
    }

    const newPhotos: PhotoItem[] = [];

    // 1. Proses berkas PDF jika ada (Auto-compress PDF KTP / STNK ke format JPG)
    let detectedStnkInBatch = false;
    let detectedKtpInBatch = false;

    if (pdfFiles.length > 0) {
      showToast(`Mengonversi ${pdfFiles.length} file PDF ke format JPG berkualitas tinggi...`, 'info');
      for (const pdfFile of pdfFiles) {
        try {
          const convertedPages = await convertPdfToJpgPages(pdfFile, 0.94, 2.5);
          for (const page of convertedPages) {
            const isStnk = !!page.isStnk || /stnk|etbpkp|tbpkp|samsat|swdkllj|pkb|pajak.*(motor|mobil)/i.test(pdfFile.name);
            const isKtp = !isStnk && (!!page.isKtp || /ktp|nik|e-ktp/i.test(pdfFile.name));
            if (isStnk) detectedStnkInBatch = true;
            if (isKtp) detectedKtpInBatch = true;

            // Target dimensions for initial thumbnail / render
            const itemTargetWidth = isStnk ? 23.0 : (isKtp ? 8.56 : config.targetWidthCm);
            const itemTargetHeight = isStnk ? 7.5 : (isKtp ? 5.4 : config.targetHeightCm);

            // Process initial crop/stretch to target dimension
            const { dataUrl: processedDataUrl, blob: processedBlob } = await processImageToBlob(
              page.dataUrl,
              {
                widthCm: itemTargetWidth,
                heightCm: itemTargetHeight,
                mode: isStnk ? 'stretch' : config.resizeMode,
                autoRotateMode: config.autoRotateMode,
                dpi: config.dpi,
                backgroundColor: config.backgroundColor,
              }
            );

            newPhotos.push({
              id: `pdf_jpg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              file: page.file,
              name: page.file.name,
              size: page.blob.size,
              originalWidth: page.width,
              originalHeight: page.height,
              dataUrl: page.dataUrl,
              copies: 1,
              isFromPdf: true,
              pdfOriginalName: page.originalFileName,
              pdfPageNumber: page.pageNumber,
              isStnk,
              isKtp,
              processedDataUrl,
              processedBlob,
            });
          }

          const fileIsStnk = /stnk|etbpkp|tbpkp|samsat|swdkllj|pkb|pajak.*(motor|mobil)/i.test(pdfFile.name) || convertedPages.some(p => p.isStnk);
          const fileIsKtp = !fileIsStnk && (/ktp|nik|e-ktp/i.test(pdfFile.name) || convertedPages.some(p => p.isKtp));
          if (fileIsStnk) {
            showToast(`Dokumen STNK "${pdfFile.name}" terdeteksi! Ukuran otomatis disesuaikan ke STNK (23 × 7.5 cm).`);
          } else if (fileIsKtp) {
            showToast(`Dokumen KTP "${pdfFile.name}" terdeteksi! Ukuran otomatis disesuaikan ke KTP (8.56 × 5.4 cm).`);
          }
        } catch (pdfErr) {
          console.error('Gagal mengonversi file PDF:', pdfErr);
          showToast(`Gagal membaca file PDF ${pdfFile.name}: ${(pdfErr as Error).message}`, 'info');
        }
      }
    }

    // 2. Proses berkas gambar biasa (JPG, PNG, WEBP)
    for (const file of validImageFiles) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      // Get natural dimensions
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const isStnk = detectIsStnk(file.name, '', img.naturalWidth, img.naturalHeight);
      const isKtp = !isStnk && detectIsKtp(file.name, '', img.naturalWidth, img.naturalHeight);
      if (isStnk) detectedStnkInBatch = true;
      if (isKtp) detectedKtpInBatch = true;

      const itemTargetWidth = isStnk ? 23.0 : (isKtp ? 8.56 : config.targetWidthCm);
      const itemTargetHeight = isStnk ? 7.5 : (isKtp ? 5.4 : config.targetHeightCm);

      // Process initial crop/stretch
      const { dataUrl: processedDataUrl, blob: processedBlob } = await processImageToBlob(
        dataUrl,
        {
          widthCm: itemTargetWidth,
          heightCm: itemTargetHeight,
          mode: isStnk ? 'stretch' : config.resizeMode,
          autoRotateMode: config.autoRotateMode,
          dpi: config.dpi,
          backgroundColor: config.backgroundColor,
        }
      );

      newPhotos.push({
        id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        originalWidth: img.naturalWidth || 600,
        originalHeight: img.naturalHeight || 800,
        dataUrl,
        copies: 1,
        isStnk,
        isKtp,
        processedDataUrl,
        processedBlob,
      });
    }

    if (newPhotos.length > 0) {
      setPhotos((prev) => [...prev, ...newPhotos]);

      // Jika ada file STNK yang terdeteksi, otomatis aktifkan pengaturan ukuran STNK (23 × 7.5 cm) pada kertas A4 Lanskap dengan Mode 2: Stretch
      if (detectedStnkInBatch) {
        setConfig((prev) => ({
          ...prev,
          paperType: 'A4',
          orientation: 'landscape',
          sizeLayoutMode: 'uniform',
          targetWidthCm: 23.0,
          targetHeightCm: 7.5,
          resizeMode: 'stretch',
          margins: { topCm: 1.5, bottomCm: 1.5, leftCm: 1.5, rightCm: 1.5 },
        }));
        showToast('🎯 Mode STNK Otomatis Aktif: Format A4 Lanskap, Ukuran 23 × 7.5 cm & Mode 2 Stretch diterapkan!');
      } else if (detectedKtpInBatch && !detectedStnkInBatch) {
        setConfig((prev) => ({
          ...prev,
          sizeLayoutMode: 'uniform',
          targetWidthCm: 8.56,
          targetHeightCm: 5.4,
          margins: { topCm: 1.5, bottomCm: 1.5, leftCm: 1.5, rightCm: 1.5 },
        }));
        showToast('🎯 Mode KTP Otomatis Aktif: Ukuran disetel ke 8.56 × 5.4 cm');
      } else {
        const pdfCount = newPhotos.filter((p) => p.isFromPdf).length;
        if (pdfCount > 0) {
          showToast(`${newPhotos.length} item berhasil ditambahkan (${pdfCount} dari PDF auto-compress ke JPG)`);
        } else {
          showToast(`${newPhotos.length} foto berhasil ditambahkan`);
        }
      }
    }
  };

  // Load sample photos for instant testing
  const handleLoadSamples = async () => {
    const samples = [
      {
        name: 'Pas_Foto_Merah_Budi.jpg',
        bgColor: '#b91c1c',
        personColor: '#f1c27d',
        label: 'Pas Foto Budi (Merah)',
      },
      {
        name: 'Pas_Foto_Biru_Siti.jpg',
        bgColor: '#1d4ed8',
        personColor: '#e0ac69',
        label: 'Pas Foto Siti (Biru)',
      },
      {
        name: 'Pas_Foto_Merah_Ahmad.jpg',
        bgColor: '#991b1b',
        personColor: '#ffdbac',
        label: 'Pas Foto Ahmad (Merah)',
      },
      {
        name: 'Pas_Foto_Biru_Dewi.jpg',
        bgColor: '#2563eb',
        personColor: '#f1c27d',
        label: 'Pas Foto Dewi (Biru)',
      },
    ];

    const sampleFiles = await Promise.all(
      samples.map((s) =>
        generateSamplePhotoFile(s.name, s.bgColor, s.personColor, s.label)
      )
    );

    await handleFilesSelected(sampleFiles);
    showToast('4 contoh pas foto standar berhasil dimuat');
  };

  // Photo list management handlers
  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleClearAll = () => {
    setPhotos([]);
    showToast('Semua foto telah dihapus', 'info');
  };

  const handleUpdateCopies = (id: string, delta: number) => {
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return { ...p, copies: Math.max(1, (p.copies || 1) + delta) };
        }
        return p;
      })
    );
  };

  const handleSetCopies = (id: string, copies: number) => {
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return { ...p, copies: Math.max(1, copies) };
        }
        return p;
      })
    );
  };

  const handleUpdateMultiSizeCopies = (id: string, sizeKey: 'size4x6' | 'size3x4' | 'size2x3', delta: number) => {
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const ms = p.multiSizeCopies || { size4x6: 0, size3x4: 0, size2x3: 0 };
          const cur = ms[sizeKey] || 0;
          return {
            ...p,
            multiSizeCopies: { ...ms, [sizeKey]: Math.max(0, cur + delta) },
          };
        }
        return p;
      })
    );
  };

  const handleSetMultiSizeCopies = (id: string, sizeKey: 'size4x6' | 'size3x4' | 'size2x3', val: number) => {
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const ms = p.multiSizeCopies || { size4x6: 0, size3x4: 0, size2x3: 0 };
          return {
            ...p,
            multiSizeCopies: { ...ms, [sizeKey]: Math.max(0, val) },
          };
        }
        return p;
      })
    );
  };

  const handleApplyPresetMultiSize = (id: string, preset: { size4x6: number; size3x4: number; size2x3: number }) => {
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            multiSizeCopies: { ...preset },
          };
        }
        return p;
      })
    );
    showToast(`Paket foto (4x6: ${preset.size4x6}, 3x4: ${preset.size3x4}, 2x3: ${preset.size2x3}) diterapkan ke foto`);
  };

  const handleApplyPresetToAll = (preset: { size4x6: number; size3x4: number; size2x3: number }) => {
    setPhotos((prev) =>
      prev.map((p) => ({
        ...p,
        multiSizeCopies: { ...preset },
      }))
    );
    showToast(`Paket foto (4x6: ${preset.size4x6}, 3x4: ${preset.size3x4}, 2x3: ${preset.size2x3}) diterapkan ke SEMUA foto!`);
  };

  const handleDuplicatePhoto = (id: string) => {
    const found = photos.find((p) => p.id === id);
    if (!found) return;
    const cloned: PhotoItem = {
      ...found,
      id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${found.name.replace(/\.[^/.]+$/, '')}_copy.jpg`,
    };
    setPhotos((prev) => [...prev, cloned]);
  };

  // Manual rotation handlers for photos/KTP
  const handleRotatePhoto = async (id: string, deltaAngle: number = 90) => {
    const targetPhoto = photos.find((p) => p.id === id);
    if (!targetPhoto) return;
    const newRot = (((targetPhoto.rotation || 0) + deltaAngle) % 360 + 360) % 360;

    try {
      const { dataUrl, blob } = await processImageToBlob(targetPhoto.dataUrl, {
        widthCm: config.targetWidthCm,
        heightCm: config.targetHeightCm,
        mode: config.resizeMode,
        autoRotateMode: config.autoRotateMode,
        manualRotateAngle: newRot,
        dpi: config.dpi,
        backgroundColor: config.backgroundColor,
      });

      setPhotos((prev) =>
        prev.map((p) => {
          if (p.id === id) {
            return {
              ...p,
              rotation: newRot,
              processedDataUrl: dataUrl,
              processedBlob: blob,
            };
          }
          return p;
        })
      );
      showToast(`Foto diputar manual menjadi ${newRot}°`);
    } catch (e) {
      console.error('Gagal memutar foto:', e);
    }
  };

  const handleRotateAllPhotos = async (deltaAngle: number = 90) => {
    if (photos.length === 0) return;
    try {
      const updatedPhotos = await Promise.all(
        photos.map(async (p) => {
          const newRot = (((p.rotation || 0) + deltaAngle) % 360 + 360) % 360;
          const { dataUrl, blob } = await processImageToBlob(p.dataUrl, {
            widthCm: config.targetWidthCm,
            heightCm: config.targetHeightCm,
            mode: config.resizeMode,
            autoRotateMode: config.autoRotateMode,
            manualRotateAngle: newRot,
            dpi: config.dpi,
            backgroundColor: config.backgroundColor,
          });
          return {
            ...p,
            rotation: newRot,
            processedDataUrl: dataUrl,
            processedBlob: blob,
          };
        })
      );
      setPhotos(updatedPhotos);
      showToast(`Semua foto diputar manual (+${deltaAngle}°)`);
    } catch (e) {
      console.error('Gagal memutar semua foto:', e);
    }
  };

  // Calculate layout
  const layout = useMemo(() => {
    return calculateLayout(photos, config);
  }, [photos, config]);

  const totalCopies = useMemo(() => {
    return photos.reduce((acc, p) => {
      const ms = p.multiSizeCopies;
      const countMulti = (ms?.size4x6 || 0) + (ms?.size3x4 || 0) + (ms?.size2x3 || 0);
      if (countMulti > 0) return acc + countMulti;
      return acc + (p.copies || 1);
    }, 0);
  }, [photos]);

  // Generate document.xml string for modal preview
  const currentDocumentXml = useMemo(() => {
    const expanded = expandPhotosWithCopies(photos, config.labelType, config);
    const photoRIdMap = new Map<string, string>();
    photos.forEach((p, idx) => {
      photoRIdMap.set(p.id, `rIdImg${idx + 1}`);
    });
    return generateDocumentXml(expanded, photoRIdMap, layout, config);
  }, [photos, layout, config]);

  // Export to .docx action
  const handleExportDocx = async () => {
    if (photos.length === 0) return;

    try {
      setIsGenerating(true);
      setProgressPercent(10);
      setProgressText('Memulai pembuatan dokumen Word...');

      const { docxBlob } = await generateDocxBlob(photos, config, (pct, msg) => {
        setProgressPercent(pct);
        setProgressText(msg);
      });

      const fileName = `Grid_Foto_${config.targetWidthCm}x${config.targetHeightCm}cm_${config.paperType}_${config.orientation}.docx`;
      const url = URL.createObjectURL(docxBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(`Dokumen Word ${fileName} berhasil diunduh!`);
      if (onExportComplete) {
        onExportComplete(fileName);
      }
    } catch (err) {
      console.error('Export error:', err);
      showToast('Terjadi kesalahan saat mengekspor dokumen Word: ' + (err as Error).message, 'info');
    } finally {
      setIsGenerating(false);
    }
  };

  // Export to .pdf action (Auto convert / export PDF)
  const handleExportPdf = async () => {
    if (photos.length === 0) return;

    try {
      setIsGeneratingPdf(true);
      setProgressPercent(10);
      setProgressText('Menyiapkan dokumen PDF siap cetak...');

      const { pdfBlob, fileName } = await generatePdfBlob(photos, config, layout, (pct, msg) => {
        setProgressPercent(pct);
        setProgressText(msg);
      });

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(`Dokumen PDF "${fileName}" berhasil diunduh!`);
      if (onExportComplete) {
        onExportComplete(fileName);
      }
    } catch (err) {
      console.error('Export PDF error:', err);
      showToast('Terjadi kesalahan saat mengekspor PDF: ' + (err as Error).message, 'info');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100/60 text-neutral-900 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        onOpenXmlModal={() => setIsXmlModalOpen(true)}
        onLoadSamples={handleLoadSamples}
        hasPhotos={photos.length > 0}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Toast notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-neutral-900 text-white text-xs font-medium rounded-xl shadow-xl transition-all animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Top Upload Area */}
        <UploadZone
          onFilesSelected={handleFilesSelected}
          onClearAll={handleClearAll}
          onLoadSamples={handleLoadSamples}
          photoCount={photos.length}
          totalCopies={totalCopies}
        />

        {/* Uploaded Photos Grid Manager */}
        {photos.length > 0 && (
          <PhotoList
            photos={photos}
            onRemovePhoto={handleRemovePhoto}
            onUpdateCopies={handleUpdateCopies}
            onSetCopies={handleSetCopies}
            onDuplicatePhoto={handleDuplicatePhoto}
            onRotatePhoto={handleRotatePhoto}
            onRotateAllPhotos={handleRotateAllPhotos}
            onUpdateMultiSizeCopies={handleUpdateMultiSizeCopies}
            onSetMultiSizeCopies={handleSetMultiSizeCopies}
            onApplyPresetMultiSize={handleApplyPresetMultiSize}
            onApplyPresetToAll={handleApplyPresetToAll}
          />
        )}

        {/* Quick Actions Bar when photos are loaded */}
        {photos.length > 0 && (
          <div className="bg-white rounded-xl border border-neutral-200 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Pilihan Cepat Cetak:</span>
              </div>

              {/* Quick Paper Orientation Toggle */}
              <div className="flex items-center p-0.5 bg-neutral-100 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setConfig((prev) => ({ ...prev, orientation: 'portrait' }));
                    showToast('Kertas diubah ke Portrait (Tegak)');
                  }}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer text-xs flex items-center gap-1 ${
                    config.orientation === 'portrait'
                      ? 'bg-white text-blue-700 shadow-2xs font-bold'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                  title="Orientasi Kertas Tegak"
                >
                  📄 Potret (Tegak)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfig((prev) => ({ ...prev, orientation: 'landscape' }));
                    showToast('Kertas diubah ke Landscape (Mendatar)');
                  }}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer text-xs flex items-center gap-1 ${
                    config.orientation === 'landscape'
                      ? 'bg-white text-blue-700 shadow-2xs font-bold'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                  title="Orientasi Kertas Mendatar"
                >
                  📑 Lanskap (Mendatar)
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  handleApplyPresetToAll({ size4x6: 2, size3x4: 3, size2x3: 7 });
                  setConfig((prev) => ({
                    ...prev,
                    sizeLayoutMode: 'multi_size_mix',
                    multiSizePackingMode: 'compact_side_by_side',
                  }));
                }}
                className="px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                title="Terapkan ke semua foto: 2 lembar 4x6, 3 lembar 3x4, 7 lembar 2x3 otomatis ke samping"
              >
                <span>⚡ Paket Hemat User (2x 4×6, 3x 3×4, 7x 2×3)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setConfig((prev) => ({
                    ...prev,
                    sizeLayoutMode: 'per_row',
                    rowConfigs: [
                      { id: 'row_1', widthCm: 4.0, heightCm: 6.0, columnsMode: 'custom', customColumns: 5 },
                      { id: 'row_2', widthCm: 3.0, heightCm: 4.0, columnsMode: 'custom', customColumns: 6 },
                      { id: 'row_3', widthCm: 2.0, heightCm: 3.0, columnsMode: 'custom', customColumns: 8 },
                    ],
                    margins: { topCm: 0.3, bottomCm: 1.0, leftCm: 0.4, rightCm: 0.4 },
                    gutterCm: 0.05,
                    rowSpacingCm: 0.3,
                  }));
                  showToast('Paket Pas Foto Aktif: 4×6 (1 baris 5 foto) & 3×4 (1 baris 6 foto)');
                }}
                className="px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>⚡ Paket Foto (4×6: 5 foto &amp; 3×4: 6 foto)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setConfig((prev) => ({
                    ...prev,
                    sizeLayoutMode: 'uniform',
                    targetWidthCm: 8.56,
                    targetHeightCm: 5.4,
                    margins: { topCm: 1.5, bottomCm: 1.5, leftCm: 1.5, rightCm: 1.5 },
                  }));
                  showToast('Ukuran KTP (8.56 × 5.4 cm) diterapkan');
                }}
                className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ukuran KTP (8.56 × 5.4 cm)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setConfig((prev) => ({
                    ...prev,
                    paperType: 'A4',
                    orientation: 'landscape',
                    sizeLayoutMode: 'uniform',
                    targetWidthCm: 23.0,
                    targetHeightCm: 7.5,
                    resizeMode: 'stretch',
                    margins: { topCm: 1.5, bottomCm: 1.5, leftCm: 1.5, rightCm: 1.5 },
                  }));
                  showToast('Ukuran STNK (23 × 7.5 cm) di Kertas A4 Lanskap (Mode 2: Stretch) diterapkan');
                }}
                className="px-3 py-1.5 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Ukuran STNK (23 × 7.5 cm) - A4 Lanskap (Stretch)</span>
              </button>

              {/* Quick A4 Layout Presets: 1 A4 Isi 1 s/d 20 Foto (Full Paper Fit) */}
              <div className="w-full pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mr-1">
                  <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
                  1 Lembar A4 Isi (1-20 Foto Full):
                </span>
                {A4_FULL_PLANS.map((plan) => {
                  const activeDetail = config.orientation === 'landscape' ? plan.landscape : plan.portrait;
                  const isA4Active =
                    config.paperType === 'A4' &&
                    ((activeDetail.layoutMode === 'per_row' && config.sizeLayoutMode === 'per_row') ||
                      (config.customColumns === activeDetail.columns && config.customRows === activeDetail.rows));

                  return (
                    <button
                      key={plan.photoCount}
                      type="button"
                      onClick={() => {
                        const patch = applyFullA4Plan(plan, plan.recommendedOrientation);
                        setConfig((prev) => ({
                          ...prev,
                          ...patch,
                          margins: {
                            ...prev.margins,
                            ...(patch.margins || {}),
                          },
                        }));

                        // Auto-fill photo copies if photos are uploaded so the page is immediately 100% full
                        if (photos.length === 1 && photos[0].copies < plan.photoCount) {
                          setPhotos((prev) =>
                            prev.map((p, idx) => (idx === 0 ? { ...p, copies: plan.photoCount } : p))
                          );
                        } else if (photos.length > 1) {
                          const currentTotal = photos.reduce((acc, p) => acc + (p.copies || 1), 0);
                          if (currentTotal < plan.photoCount) {
                            const base = Math.floor(plan.photoCount / photos.length);
                            const remainder = plan.photoCount % photos.length;
                            setPhotos((prev) =>
                              prev.map((p, idx) => ({
                                ...p,
                                copies: base + (idx < remainder ? 1 : 0),
                              }))
                            );
                          }
                        }

                        showToast(`Template ${plan.title} (${plan.recommendedOrientation === 'landscape' ? 'Lanskap' : 'Potret'}) aktif! Mengisi 100% A4`);
                      }}
                      className={`px-2 py-0.5 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                        isA4Active
                          ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                          : 'border-slate-300 bg-white hover:border-blue-500 hover:bg-blue-50/50 text-slate-800'
                      }`}
                      title={`${plan.title} - ${plan.aiReason}`}
                    >
                      <span>Isi {plan.photoCount}</span>
                      {isA4Active && (
                        <span className="text-[9px] px-1 py-0.2 rounded font-mono bg-blue-700 text-blue-100">
                          {plan.recommendedOrientation === 'landscape' ? 'L' : 'P'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Main 2-Column Grid: Config Controls & Live Word Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Configuration Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <ConfigPanel
              config={config}
              onChangeConfig={setConfig}
              layout={layout}
              onRotateAllPhotos={handleRotateAllPhotos}
            />
          </div>

          {/* Right Column: Live Word Sheet Visualizer (7 cols) */}
          <div className="lg:col-span-7">
            <DocumentPreview
              photos={photos}
              config={config}
              layout={layout}
              onChangeOrientation={(o) => {
                setConfig((prev) => ({ ...prev, orientation: o }));
                showToast(`Orientasi kertas diubah ke ${o === 'portrait' ? 'Portrait (Tegak)' : 'Landscape (Mendatar)'}`);
              }}
            />
          </div>
        </div>

        {/* Bottom Floating Export Toolbar */}
        <ExportToolbar
          onExportDocx={handleExportDocx}
          onExportPdf={handleExportPdf}
          onOpenXmlModal={() => setIsXmlModalOpen(true)}
          isGenerating={isGenerating}
          isGeneratingPdf={isGeneratingPdf}
          progressPercent={progressPercent}
          progressText={progressText}
          photos={photos}
          layout={layout}
          config={config}
        />
      </main>

      {/* XML Code & Template Modal */}
      <XmlModal
        isOpen={isXmlModalOpen}
        onClose={() => setIsXmlModalOpen(false)}
        documentXml={currentDocumentXml}
        layout={layout}
        config={config}
      />
    </div>
  );
}
