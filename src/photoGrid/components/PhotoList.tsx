import React, { useState } from 'react';
import { Trash2, Copy, Plus, Minus, FileImage, RotateCw, Sparkles, SlidersHorizontal, Check } from 'lucide-react';
import { PhotoItem } from '../types';

interface PhotoListProps {
  photos: PhotoItem[];
  onRemovePhoto: (id: string) => void;
  onUpdateCopies: (id: string, delta: number) => void;
  onSetCopies: (id: string, copies: number) => void;
  onDuplicatePhoto: (id: string) => void;
  onRotatePhoto?: (id: string) => void;
  onRotateAllPhotos?: () => void;
  onUpdateMultiSizeCopies?: (id: string, sizeKey: 'size4x6' | 'size3x4' | 'size2x3', delta: number) => void;
  onSetMultiSizeCopies?: (id: string, sizeKey: 'size4x6' | 'size3x4' | 'size2x3', val: number) => void;
  onApplyPresetMultiSize?: (id: string, preset: { size4x6: number; size3x4: number; size2x3: number }) => void;
  onApplyPresetToAll?: (preset: { size4x6: number; size3x4: number; size2x3: number }) => void;
}

export const PhotoList: React.FC<PhotoListProps> = ({
  photos,
  onRemovePhoto,
  onUpdateCopies,
  onSetCopies,
  onDuplicatePhoto,
  onRotatePhoto,
  onRotateAllPhotos,
  onUpdateMultiSizeCopies,
  onSetMultiSizeCopies,
  onApplyPresetMultiSize,
  onApplyPresetToAll,
}) => {
  const [photoModes, setPhotoModes] = useState<Record<string, 'uniform' | 'multi'>>({});

  if (photos.length === 0) {
    return null;
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getMode = (item: PhotoItem): 'uniform' | 'multi' => {
    if (photoModes[item.id]) return photoModes[item.id];
    const ms = item.multiSizeCopies;
    if (ms && ((ms.size4x6 || 0) > 0 || (ms.size3x4 || 0) > 0 || (ms.size2x3 || 0) > 0)) {
      return 'multi';
    }
    return 'uniform';
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
          <FileImage className="w-4 h-4 text-neutral-600" />
          <span>Daftar Foto &amp; Dokumen KTP ({photos.length})</span>
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {onApplyPresetToAll && (
            <button
              type="button"
              onClick={() => onApplyPresetToAll({ size4x6: 2, size3x4: 3, size2x3: 7 })}
              className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-200"
              title="Atur otomatis semua foto: 2 lembar 4x6, 3 lembar 3x4, 7 lembar 2x3"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>⚡ Terapkan Paket (2x 4x6, 3x 3x4, 7x 2x3) ke Semua Foto</span>
            </button>
          )}

          {onRotateAllPhotos && (
            <button
              type="button"
              onClick={onRotateAllPhotos}
              className="px-2.5 py-1 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-200"
              title="Putar semua foto 90 derajat searah jarum jam"
            >
              <RotateCw className="w-3.5 h-3.5 text-neutral-600" />
              <span>Putar Manual Semua (90°)</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {photos.map((item, idx) => {
          const currentMode = getMode(item);
          const ms = item.multiSizeCopies || {};
          const c4x6 = ms.size4x6 || 0;
          const c3x4 = ms.size3x4 || 0;
          const c2x3 = ms.size2x3 || 0;
          const totalMulti = c4x6 + c3x4 + c2x3;

          return (
            <div
              key={item.id}
              className="group relative bg-neutral-50 rounded-xl border border-neutral-200 hover:border-neutral-300 transition-all p-3 flex flex-col justify-between shadow-xs"
            >
              {/* Delete button (X) */}
              <button
                onClick={() => onRemovePhoto(item.id)}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center opacity-90 hover:opacity-100 hover:scale-105 transition-all shadow-sm z-10 cursor-pointer"
                title="Hapus foto ini"
              >
                <Trash2 className="w-3 h-3" />
              </button>

              <div>
                {/* Thumbnail with manual Rotate Button */}
                <div className="relative aspect-3/4 max-h-48 rounded-lg overflow-hidden bg-neutral-200 mb-2 border border-neutral-200/60 group/thumb flex items-center justify-center">
                  <img
                    src={item.processedDataUrl || item.dataUrl}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 z-10">
                    <span className="px-1.5 py-0.5 rounded bg-black/70 text-[10px] text-white font-mono w-max">
                      #{idx + 1}
                    </span>
                    {item.isFromPdf && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-[9px] font-bold text-white shadow-xs w-max">
                        PDF → JPG
                      </span>
                    )}
                    {item.isStnk && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-700 text-[9px] font-bold text-white shadow-xs w-max">
                        🏍️ STNK (23 × 7.5 cm)
                      </span>
                    )}
                    {item.isKtp && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-700 text-[9px] font-bold text-white shadow-xs w-max">
                        🪪 KTP (8.56×5.4)
                      </span>
                    )}
                  </div>

                  {/* Quick Rotate Button on Thumbnail */}
                  {onRotatePhoto && (
                    <button
                      type="button"
                      onClick={() => onRotatePhoto(item.id)}
                      className="absolute bottom-1.5 right-1.5 px-2 py-1 rounded bg-black/70 hover:bg-amber-600 text-white text-[10px] font-medium flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                      title="Putar foto 90° searah jarum jam"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>{item.rotation ? `${item.rotation}°` : 'Putar 90°'}</span>
                    </button>
                  )}
                </div>

                {/* Metadata */}
                <div className="space-y-1 mb-2.5">
                  <p
                    className="text-xs font-semibold text-neutral-800 truncate"
                    title={item.name}
                  >
                    {item.name}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                    <span>{item.originalWidth}×{item.originalHeight} px</span>
                    <span>{formatFileSize(item.size)}</span>
                  </div>
                </div>

                {/* Mode Selector per Foto: 1 Ukuran vs Paket Campur */}
                <div className="mb-2.5 bg-neutral-200/60 p-0.5 rounded-lg grid grid-cols-2 text-[10px] font-medium">
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoModes((prev) => ({ ...prev, [item.id]: 'uniform' }));
                      if (onApplyPresetMultiSize) {
                        onApplyPresetMultiSize(item.id, { size4x6: 0, size3x4: 0, size2x3: 0 });
                      }
                    }}
                    className={`py-1 rounded text-center transition-all cursor-pointer ${
                      currentMode === 'uniform'
                        ? 'bg-white text-neutral-900 shadow-2xs font-bold'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    1 Ukuran Saja
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoModes((prev) => ({ ...prev, [item.id]: 'multi' }));
                      if (totalMulti === 0 && onApplyPresetMultiSize) {
                        onApplyPresetMultiSize(item.id, { size4x6: 2, size3x4: 3, size2x3: 7 });
                      }
                    }}
                    className={`py-1 rounded text-center transition-all cursor-pointer ${
                      currentMode === 'multi'
                        ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    Paket Campur ⚡
                  </button>
                </div>
              </div>

              {/* Action Bar based on Mode */}
              {currentMode === 'multi' ? (
                /* Multi Size Setting: 4x6, 3x4, 2x3 */
                <div className="pt-2 border-t border-neutral-200 space-y-2 bg-indigo-50/50 p-2.5 rounded-lg border">
                  <div className="flex items-center justify-between text-[11px] font-bold text-indigo-950">
                    <span>Atur Lembar per Ukuran:</span>
                    <span className="font-mono text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded text-[10px]">
                      Total: {totalMulti} lbr
                    </span>
                  </div>

                  {/* Row 4x6 */}
                  <div className="flex items-center justify-between text-xs bg-white px-2 py-1 rounded border border-neutral-200">
                    <div>
                      <span className="font-bold text-neutral-800">4 × 6 cm</span>
                      <span className="text-[10px] text-neutral-400 block -mt-0.5">Muat 5/baris</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onUpdateMultiSizeCopies?.(item.id, 'size4x6', -1)}
                        disabled={c4x6 <= 0}
                        className="w-5 h-5 flex items-center justify-center rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 disabled:opacity-30 cursor-pointer text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={c4x6}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          onSetMultiSizeCopies?.(item.id, 'size4x6', isNaN(val) ? 0 : Math.max(0, val));
                        }}
                        className="w-6 text-center text-xs font-bold text-neutral-900 font-mono bg-transparent border-none p-0 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => onUpdateMultiSizeCopies?.(item.id, 'size4x6', 1)}
                        className="w-5 h-5 flex items-center justify-center rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 cursor-pointer text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Row 3x4 */}
                  <div className="flex items-center justify-between text-xs bg-white px-2 py-1 rounded border border-neutral-200">
                    <div>
                      <span className="font-bold text-neutral-800">3 × 4 cm</span>
                      <span className="text-[10px] text-neutral-400 block -mt-0.5">Muat 6/baris</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onUpdateMultiSizeCopies?.(item.id, 'size3x4', -1)}
                        disabled={c3x4 <= 0}
                        className="w-5 h-5 flex items-center justify-center rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 disabled:opacity-30 cursor-pointer text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={c3x4}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          onSetMultiSizeCopies?.(item.id, 'size3x4', isNaN(val) ? 0 : Math.max(0, val));
                        }}
                        className="w-6 text-center text-xs font-bold text-neutral-900 font-mono bg-transparent border-none p-0 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => onUpdateMultiSizeCopies?.(item.id, 'size3x4', 1)}
                        className="w-5 h-5 flex items-center justify-center rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 cursor-pointer text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Row 2x3 */}
                  <div className="flex items-center justify-between text-xs bg-white px-2 py-1 rounded border border-neutral-200">
                    <div>
                      <span className="font-bold text-neutral-800">2 × 3 cm</span>
                      <span className="text-[10px] text-neutral-400 block -mt-0.5">Muat 8/baris</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onUpdateMultiSizeCopies?.(item.id, 'size2x3', -1)}
                        disabled={c2x3 <= 0}
                        className="w-5 h-5 flex items-center justify-center rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 disabled:opacity-30 cursor-pointer text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={c2x3}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          onSetMultiSizeCopies?.(item.id, 'size2x3', isNaN(val) ? 0 : Math.max(0, val));
                        }}
                        className="w-6 text-center text-xs font-bold text-neutral-900 font-mono bg-transparent border-none p-0 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => onUpdateMultiSizeCopies?.(item.id, 'size2x3', 1)}
                        className="w-5 h-5 flex items-center justify-center rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 cursor-pointer text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Quick Preset Button */}
                  <button
                    type="button"
                    onClick={() => onApplyPresetMultiSize?.(item.id, { size4x6: 2, size3x4: 3, size2x3: 7 })}
                    className="w-full py-1 bg-white hover:bg-indigo-50 border border-indigo-300 text-indigo-700 rounded text-[10px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span>⚡ Isi Cepat: 2x (4×6) + 3x (3×4) + 7x (2×3)</span>
                  </button>
                </div>
              ) : (
                /* Uniform Copies Control */
                <div className="pt-2 border-t border-neutral-200/80 flex items-center justify-between gap-1">
                  <span className="text-[11px] font-medium text-neutral-600">Jumlah Cetak:</span>
                  <div className="flex items-center gap-1 bg-white rounded border border-neutral-200 px-1 py-0.5 ml-auto">
                    <button
                      type="button"
                      onClick={() => onUpdateCopies(item.id, -1)}
                      disabled={item.copies <= 1}
                      className="w-5 h-5 flex items-center justify-center text-neutral-600 hover:text-neutral-900 disabled:opacity-30 cursor-pointer"
                      title="Kurangi cetakan"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={item.copies}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        onSetCopies(item.id, isNaN(val) ? 1 : Math.max(1, Math.min(99, val)));
                      }}
                      className="w-7 text-center text-xs font-bold text-neutral-800 font-mono bg-transparent border-none p-0 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => onUpdateCopies(item.id, 1)}
                      className="w-5 h-5 flex items-center justify-center text-neutral-600 hover:text-neutral-900 cursor-pointer"
                      title="Tambah cetakan"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
