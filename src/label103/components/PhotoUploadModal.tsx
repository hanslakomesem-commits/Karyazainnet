import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Check, Loader2, Sparkles, AlertCircle, FileText } from 'lucide-react';

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyNames: (names: string[], mode: 'replace' | 'append') => void;
}

export const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({
  isOpen,
  onClose,
  onApplyNames,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [extractedNames, setExtractedNames] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDone, setIsDone] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMimeType(file.type || 'image/jpeg');
    setErrorMessage(null);
    setIsDone(false);
    setExtractedNames([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleProcessImage = async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/extract-from-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: selectedImage,
          mimeType,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Gagal memproses gambar');
      }

      if (!data.names || data.names.length === 0) {
        throw new Error(
          'Tidak ada nama tamu yang terdeteksi pada gambar. Pastikan tulisan terbaca jelas dan foto tidak buram.'
        );
      }

      setExtractedNames(data.names);
      setIsDone(true);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err.message || 'Terjadi kesalahan saat memproses gambar. Silakan coba lagi.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveName = (index: number) => {
    setExtractedNames((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApply = (mode: 'replace' | 'append') => {
    if (extractedNames.length === 0) return;
    onApplyNames(extractedNames, mode);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setSelectedImage(null);
    setExtractedNames([]);
    setIsProcessing(false);
    setIsDone(false);
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Pindai Foto Tulisan Tangan Buku Tamu (AI OCR)
              </h2>
              <p className="text-xs text-slate-500">
                Otomatis membaca nama berjejer ke bawah tanpa koma dari foto pulpen di buku
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Explanation Alert */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-950 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Solusi Tulisan Pulpen Tanpa Koma:</strong> Biasanya orang mencatat nama undangan di buku secara menurun ke bawah dengan pena (misal: <em>1. Bpk. Joko, 2. Ibu Siti</em> atau tanpa nomor sama sekali). AI kami akan otomatis memisahkan setiap nama, membersihkan nomor urut, dan menyusunnya ke dalam format label 103.
            </div>
          </div>

          {/* Hidden inputs */}
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

          {!selectedImage ? (
            /* Upload / Camera Dropzone */
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center space-y-4 hover:border-amber-500 transition-colors bg-slate-50/50">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Ambil Foto Langsung atau Unggah Gambar
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Format didukung: JPG, PNG, WEBP. Pastikan tulisan pena cukup terang dan terbaca.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-medium text-xs rounded-lg shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Buka Kamera / Foto Sekarang</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium text-xs rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>Pilih File dari Galeri/Komputer</span>
                </button>
              </div>
            </div>
          ) : (
            /* Image Preview & Processing State */
            <div className="space-y-4">
              <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-900 max-h-64 flex items-center justify-center">
                <img
                  src={selectedImage}
                  alt="Pratinjau Foto Catatan Undangan"
                  className="max-h-64 object-contain mx-auto"
                />
                {!isProcessing && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full transition-colors cursor-pointer"
                    title="Ganti Foto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Trigger Button */}
              {!isDone && (
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={isProcessing}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleProcessImage}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Membaca Tulisan Tangan...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Pindai Nama Tamu Sekarang</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Results Review */}
              {isDone && (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Berhasil Membaca {extractedNames.length} Nama Tamu:</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="text-[11px] text-slate-500 hover:text-amber-700 underline"
                    >
                      Pindai Foto Lain
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1 text-xs">
                    {extractedNames.map((name, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-white border border-slate-200 px-3 py-1.5 rounded-md hover:border-slate-300"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-400 text-[10px] w-5">
                            {idx + 1}.
                          </span>
                          <span className="font-medium text-slate-800">{name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveName(idx)}
                          className="text-slate-400 hover:text-red-600 p-0.5 cursor-pointer"
                          title="Hapus nama ini"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Apply Buttons */}
                  <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => handleApply('append')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      + Tambahkan ke Daftar Yang Ada
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApply('replace')}
                      className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      Ganti Daftar Nama Saat Ini
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
