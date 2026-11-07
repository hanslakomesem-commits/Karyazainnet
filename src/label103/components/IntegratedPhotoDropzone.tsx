import React, { useState, useRef } from 'react';
import { Camera, Upload, Sparkles, Loader2, CheckCircle2, Image as ImageIcon, X, PlusCircle } from 'lucide-react';

interface IntegratedPhotoDropzoneProps {
  onNamesDetected: (names: string[], mode: 'append' | 'replace') => void;
  currentNameCount: number;
}

export const IntegratedPhotoDropzone: React.FC<IntegratedPhotoDropzoneProps> = ({
  onNamesDetected,
  currentNameCount,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScannedCount, setLastScannedCount] = useState<number | null>(null);
  const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detectedList, setDetectedList] = useState<string[]>([]);
  const [autoInsertMode, setAutoInsertMode] = useState<'append' | 'replace'>(
    currentNameCount > 0 ? 'append' : 'replace'
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      setErrorMessage('Harap unggah file foto/gambar (JPG, PNG, WEBP).');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setLastScannedCount(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target?.result as string;
      setPreviewThumbnail(base64Data);

      try {
        const response = await fetch('/api/extract-from-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType: file.type || 'image/jpeg',
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Gagal mengenali tulisan dari foto');
        }

        const names: string[] = data.names || [];

        if (names.length === 0) {
          throw new Error(
            'Tidak ada nama tamu yang berhasil terdeteksi. Pastikan foto buku terang dan tulisan pulpen tidak buram.'
          );
        }

        setDetectedList(names);
        setLastScannedCount(names.length);

        // LANGSUNG MASUKKAN KE KOTAK NAMA SECARA OTOMATIS
        const targetMode = currentNameCount > 0 ? autoInsertMode : 'replace';
        onNamesDetected(names, targetMode);
      } catch (err: any) {
        console.error(err);
        setErrorMessage(
          err.message || 'Terjadi gangguan saat memindai foto. Silakan coba lagi.'
        );
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleClearPreview = () => {
    setPreviewThumbnail(null);
    setDetectedList([]);
    setLastScannedCount(null);
    setErrorMessage(null);
  };

  return (
    <div className="bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 border border-amber-200/90 rounded-xl p-4 shadow-2xs no-print space-y-3">
      {/* Header of Scanner Section */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-xs">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>Scan Foto Buku Catatan Tamu (Tulisan Pulpen)</span>
              <span className="px-1.5 py-0.2 bg-amber-200/80 text-amber-900 rounded text-[10px] font-semibold">
                AI Vision
              </span>
            </h3>
            <p className="text-[11px] text-slate-600">
              Cukup foto halaman buku bertuliskan pulpen, nama-nama yang berjejer ke bawah otomatis disalin ke kotak nama tanpa perlu diketik!
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        {currentNameCount > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-white/80 px-2 py-1 rounded-md border border-slate-200">
            <span>Aksi:</span>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="insertMode"
                checked={autoInsertMode === 'append'}
                onChange={() => setAutoInsertMode('append')}
                className="text-amber-600 focus:ring-amber-500"
              />
              <span>Tambah</span>
            </label>
            <span className="text-slate-300">/</span>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="insertMode"
                checked={autoInsertMode === 'replace'}
                onChange={() => setAutoInsertMode('replace')}
                className="text-amber-600 focus:ring-amber-500"
              />
              <span>Ganti</span>
            </label>
          </div>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Upload Zone / Active Scanning Area */}
      {!isProcessing ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed border-amber-300/80 hover:border-amber-500 bg-white/70 hover:bg-white rounded-xl p-4 transition-all flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            {previewThumbnail ? (
              <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-300 shrink-0 bg-slate-900 shadow-xs">
                <img
                  src={previewThumbnail}
                  alt="Foto Terakhir"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleClearPreview}
                  className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 cursor-pointer shadow-xs"
                  title="Hapus Pratinjau"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="w-11 h-11 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <ImageIcon className="w-5 h-5 text-amber-700" />
              </div>
            )}

            <div>
              <div className="text-xs font-semibold text-slate-800">
                {previewThumbnail
                  ? 'Foto halaman buku siap discan lagi atau ganti foto baru'
                  : 'Buku catatan tamu disetor dalam bentuk tulisan pulpen?'}
              </div>
              <p className="text-[11px] text-slate-500">
                Tinggal jepret dengan kamera HP atau unggah foto bukunya. Otomatis membaca nama berjejer ke bawah tanpa tanda koma.
              </p>
            </div>
          </div>

          {/* Quick Buttons */}
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 sm:flex-initial px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Foto dengan Kamera</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 sm:flex-initial px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Pilih Foto dari Galeri</span>
            </button>
          </div>
        </div>
      ) : (
        /* Processing Loading State */
        <div className="bg-white border border-amber-300 rounded-xl p-6 text-center space-y-3 shadow-xs animate-pulse">
          <div className="flex items-center justify-center gap-2 text-amber-800 font-bold text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
            <span>Sedang Membaca Tulisan Pulpen di Halaman Buku...</span>
          </div>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
            AI sedang menganalisis setiap baris nama, membersihkan nomor urut, serta menyusunnya langsung ke kotak teks.
          </p>
        </div>
      )}

      {/* Error Notice */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3.5 py-2 rounded-lg flex items-center justify-between gap-2">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-700 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Success Notification Bar */}
      {lastScannedCount !== null && lastScannedCount > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-3.5 py-2.5 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Berhasil mengenali {lastScannedCount} nama tamu dari foto pulpen!</strong>{' '}
              Nama-nama telah langsung dimasukkan ke kotak nama di bawah.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-[11px] rounded flex items-center gap-1 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Foto Halaman Berikutnya</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
