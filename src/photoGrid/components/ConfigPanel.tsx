import React from 'react';
import {
  Crop,
  Maximize2,
  FileCheck,
  Settings2,
  Layers,
  Ruler,
  Scissors,
  Check,
  Tag,
  RotateCw,
  Rows,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  LayoutGrid,
} from 'lucide-react';
import {
  AutoRotateMode,
  DimensionUnit,
  GridConfig,
  PaperType,
  ResizeMode,
  CalculatedLayout,
  RowSizeConfig,
  SizeLayoutMode,
} from '../types';
import {
  SIZE_PRESETS,
  PAPER_PRESETS,
  A4_LAYOUT_PRESETS,
  A4LayoutPreset,
  A4_FULL_PLANS,
  FullA4PhotoPlan,
  applyFullA4Plan,
} from '../utils/conversions';

interface ConfigPanelProps {
  config: GridConfig;
  onChangeConfig: (updater: (prev: GridConfig) => GridConfig) => void;
  layout: CalculatedLayout;
  onRotateAllPhotos?: () => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  config,
  onChangeConfig,
  layout,
  onRotateAllPhotos,
}) => {
  // Preset selection handler
  const handleSelectPreset = (presetId: string) => {
    const preset = SIZE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    if (presetId === '3x4') {
      onChangeConfig((prev) => ({
        ...prev,
        targetWidthCm: 3.0,
        targetHeightCm: 4.0,
        columnsMode: 'custom',
        customColumns: 6,
        margins: {
          ...prev.margins,
          topCm: 0.3,
          leftCm: Math.min(prev.margins.leftCm, 0.8),
          rightCm: Math.min(prev.margins.rightCm, 0.8),
        },
        gutterCm: Math.min(prev.gutterCm, 0.12),
      }));
      return;
    }

    if (presetId === '4x6') {
      onChangeConfig((prev) => ({
        ...prev,
        targetWidthCm: 4.0,
        targetHeightCm: 6.0,
        columnsMode: 'custom',
        customColumns: 5,
        margins: {
          ...prev.margins,
          topCm: 0.3,
          leftCm: Math.min(prev.margins.leftCm, 0.5),
          rightCm: Math.min(prev.margins.rightCm, 0.5),
        },
        gutterCm: Math.min(prev.gutterCm, 0.05),
      }));
      return;
    }

    if (presetId === 'stnk') {
      onChangeConfig((prev) => ({
        ...prev,
        paperType: 'A4',
        orientation: 'landscape',
        targetWidthCm: 23.0,
        targetHeightCm: 7.5,
        resizeMode: 'stretch',
        margins: {
          topCm: 1.5,
          bottomCm: 1.5,
          leftCm: 1.5,
          rightCm: 1.5,
        },
        gutterCm: 0.2,
      }));
      return;
    }

    if (presetId === 'stnk_portrait') {
      onChangeConfig((prev) => ({
        ...prev,
        paperType: 'A4',
        orientation: 'portrait',
        targetWidthCm: 7.5,
        targetHeightCm: 23.0,
        resizeMode: 'stretch',
        margins: {
          topCm: 1.5,
          bottomCm: 1.5,
          leftCm: 1.5,
          rightCm: 1.5,
        },
        gutterCm: 0.2,
      }));
      return;
    }

    onChangeConfig((prev) => ({
      ...prev,
      targetWidthCm: preset.widthCm,
      targetHeightCm: preset.heightCm,
    }));
  };

  // Selected A4 full plan count (1 s/d 20 Foto)
  const [selectedA4Count, setSelectedA4Count] = React.useState<number>(() => {
    if (config.paperType === 'A4') {
      const match = A4_FULL_PLANS.find((p) => {
        const det = config.orientation === 'landscape' ? p.landscape : p.portrait;
        if (det.layoutMode === 'per_row' && config.sizeLayoutMode === 'per_row') {
          return true;
        }
        return config.customColumns === det.columns && config.customRows === det.rows;
      });
      return match ? match.photoCount : 6;
    }
    return 6;
  });

  const [a4OrientationChoice, setA4OrientationChoice] = React.useState<'auto' | 'portrait' | 'landscape'>('auto');

  const handleApplyFullPlan = (count: number, forcedOri?: 'auto' | 'portrait' | 'landscape') => {
    setSelectedA4Count(count);
    const plan = A4_FULL_PLANS.find((p) => p.photoCount === count);
    if (!plan) return;
    const choice = forcedOri !== undefined ? forcedOri : a4OrientationChoice;
    if (forcedOri !== undefined) {
      setA4OrientationChoice(forcedOri);
    }
    const targetOri: 'portrait' | 'landscape' =
      choice === 'auto' ? plan.recommendedOrientation : choice;

    const patch = applyFullA4Plan(plan, targetOri);
    onChangeConfig((prev) => ({
      ...prev,
      ...patch,
      margins: {
        ...prev.margins,
        ...(patch.margins || {}),
      },
    }));
  };

  const handleApplyA4LayoutPreset = (preset: A4LayoutPreset) => {
    handleApplyFullPlan(preset.photoCount);
  };

  const handleApplyPaketStudio = () => {
    onChangeConfig((prev) => ({
      ...prev,
      sizeLayoutMode: 'per_row',
      rowConfigs: [
        { id: 'row_1', widthCm: 4.0, heightCm: 6.0, columnsMode: 'custom', customColumns: 5 },
        { id: 'row_2', widthCm: 3.0, heightCm: 4.0, columnsMode: 'custom', customColumns: 6 },
        { id: 'row_3', widthCm: 2.0, heightCm: 3.0, columnsMode: 'custom', customColumns: 8 },
      ],
      margins: {
        ...prev.margins,
        leftCm: 0.5,
        rightCm: 0.5,
        topCm: 0.3,
        bottomCm: 1.0,
      },
      gutterCm: 0.08,
      rowSpacingCm: 0.3,
    }));
  };

  // Unit switch handler
  const handleUnitToggle = (newUnit: DimensionUnit) => {
    if (newUnit === config.unit) return;
    onChangeConfig((prev) => ({
      ...prev,
      unit: newUnit,
    }));
  };

  // Convert displayed values based on unit
  const displayWidth =
    config.unit === 'mm' ? (config.targetWidthCm * 10).toFixed(1) : config.targetWidthCm.toString();
  const displayHeight =
    config.unit === 'mm' ? (config.targetHeightCm * 10).toFixed(1) : config.targetHeightCm.toString();

  const handleWidthChange = (valStr: string) => {
    const val = parseFloat(valStr);
    if (isNaN(val) || val <= 0) return;
    const cm = config.unit === 'mm' ? val / 10 : val;
    onChangeConfig((prev) => ({
      ...prev,
      targetWidthCm: Number(cm.toFixed(2)),
    }));
  };

  const handleHeightChange = (valStr: string) => {
    const val = parseFloat(valStr);
    if (isNaN(val) || val <= 0) return;
    const cm = config.unit === 'mm' ? val / 10 : val;
    onChangeConfig((prev) => ({
      ...prev,
      targetHeightCm: Number(cm.toFixed(2)),
    }));
  };

  const handleAddRowConfig = () => {
    onChangeConfig((prev) => {
      const nextIdx = (prev.rowConfigs?.length || 0) + 1;
      const newRow: RowSizeConfig = {
        id: `row_${Date.now()}_${nextIdx}`,
        widthCm: 3.0,
        heightCm: 4.0,
        columnsMode: 'auto',
        customColumns: 4,
      };
      return {
        ...prev,
        rowConfigs: [...(prev.rowConfigs || []), newRow],
      };
    });
  };

  const handleRemoveRowConfig = (id: string) => {
    onChangeConfig((prev) => {
      if ((prev.rowConfigs?.length || 0) <= 1) return prev;
      return {
        ...prev,
        rowConfigs: prev.rowConfigs.filter((r) => r.id !== id),
      };
    });
  };

  const handleUpdateRowConfig = (id: string, partial: Partial<RowSizeConfig>) => {
    onChangeConfig((prev) => ({
      ...prev,
      rowConfigs: prev.rowConfigs.map((r) => (r.id === id ? { ...r, ...partial } : r)),
    }));
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs space-y-6">
      {/* SECTION 1: Target Size & Resizing Mode */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
          <div className="flex items-center gap-2">
            <Ruler className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-neutral-900">
              1. Dimensi Target &amp; Mode Penyesuaian
            </h3>
          </div>
          {/* Unit Toggle cm / mm */}
          <div className="flex items-center p-0.5 bg-neutral-100 rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => handleUnitToggle('cm')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                config.unit === 'cm'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Centimeter (cm)
            </button>
            <button
              type="button"
              onClick={() => handleUnitToggle('mm')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                config.unit === 'mm'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Millimeter (mm)
            </button>
          </div>
        </div>

        {/* Mode Ukuran Dalam 1 Kertas: Full 1 Halaman vs Per Baris vs Paket Campur */}
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-2">
            Mode Tata Letak &amp; Ukuran Kertas:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(
              [
                {
                  id: 'uniform',
                  title: '1 Ukuran Seragam',
                  desc: 'Semua foto di kertas berukuran sama (misal semua 4×6 atau 3×4).',
                },
                {
                  id: 'multi_size_mix',
                  title: 'Paket Campur (Hemat Kertas)',
                  desc: 'Atur per foto: 4×6 (5/baris), 3×4 (6/baris), 2×3 (8/baris) otomatis ke samping agar hemat kertas.',
                },
                {
                  id: 'per_row',
                  title: 'Custom Per Baris',
                  desc: 'Tentukan ukuran baris 1, baris 2, baris 3 secara spesifik.',
                },
              ] as { id: SizeLayoutMode; title: string; desc: string }[]
            ).map((m) => {
              const isSelected = config.sizeLayoutMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onChangeConfig((p) => ({ ...p, sizeLayoutMode: m.id }))}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600'
                      : 'border-neutral-200 hover:border-neutral-300 bg-neutral-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <Rows className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-xs font-bold text-neutral-900">{m.title}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </div>
                  <p className="text-[11px] text-neutral-600 leading-relaxed">{m.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Jika mode paket campur aktif, tampilkan pilihan gaya penyusunan */}
        {config.sizeLayoutMode === 'multi_size_mix' && (
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 space-y-2">
            <span className="text-xs font-bold text-indigo-950 block">
              Gaya Penyusunan Paket Campur:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => onChangeConfig((p) => ({ ...p, multiSizePackingMode: 'compact_side_by_side' }))}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  (config.multiSizePackingMode || 'compact_side_by_side') === 'compact_side_by_side'
                    ? 'border-indigo-600 bg-white ring-1 ring-indigo-600 shadow-2xs font-semibold'
                    : 'border-neutral-200 bg-white/70 hover:bg-white text-neutral-600'
                }`}
              >
                <div className="font-bold text-neutral-900 mb-0.5">🚀 Hemat Kertas (Samping / Flow)</div>
                <div className="text-[11px] text-neutral-500">
                  Foto 4×6, 3×4, dan 2×3 saling mengisi ke samping hingga batas kertas, menghemat ruang secara maksimal.
                </div>
              </button>

              <button
                type="button"
                onClick={() => onChangeConfig((p) => ({ ...p, multiSizePackingMode: 'grouped_rows' }))}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  config.multiSizePackingMode === 'grouped_rows'
                    ? 'border-indigo-600 bg-white ring-1 ring-indigo-600 shadow-2xs font-semibold'
                    : 'border-neutral-200 bg-white/70 hover:bg-white text-neutral-600'
                }`}
              >
                <div className="font-bold text-neutral-900 mb-0.5">📏 Baris Terpisah (Per Ukuran)</div>
                <div className="text-[11px] text-neutral-500">
                  Baris 4×6 (muat 5/baris), baris 3×4 (muat 6/baris), baris 2×3 (muat 8/baris) berdiri di baris tersendiri.
                </div>
              </button>
            </div>
          </div>
        )}

        {config.sizeLayoutMode === 'per_row' ? (
          <div className="bg-blue-50/40 border border-blue-200/80 rounded-xl p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-neutral-900 block">
                  Pengaturan Ukuran Per Baris ({config.rowConfigs.length} Baris)
                </span>
                <span className="text-[11px] text-neutral-500">
                  Paket Pas Foto: 4×6 muat 1 baris 5 foto &amp; 3×4 muat 1 baris 6 foto
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleApplyPaketStudio}
                  className="px-2.5 py-1 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-2xs transition-colors cursor-pointer"
                  title="Terapkan standar paket pas foto: 4x6 (5 foto) & 3x4 (6 foto)"
                >
                  ⚡ Paket Standar (4x6: 5 foto, 3x4: 6 foto)
                </button>
                <button
                  type="button"
                  onClick={handleAddRowConfig}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Baris
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {config.rowConfigs.map((rc, idx) => {
                const resolved = layout.resolvedRows[idx];
                const rowDisplayW =
                  config.unit === 'mm' ? (rc.widthCm * 10).toFixed(1) : rc.widthCm.toString();
                const rowDisplayH =
                  config.unit === 'mm' ? (rc.heightCm * 10).toFixed(1) : rc.heightCm.toString();

                return (
                  <div
                    key={rc.id}
                    className="bg-white rounded-lg border border-neutral-200 p-3 space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[11px] font-bold bg-blue-600 text-white rounded">
                          Baris {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-neutral-800">
                          Ukuran {rc.widthCm}×{rc.heightCm} cm
                        </span>
                        {resolved && (
                          <span className="text-[11px] text-blue-700 font-bold font-mono bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            {resolved.columns} foto per baris
                          </span>
                        )}
                      </div>
                      {config.rowConfigs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRowConfig(rc.id)}
                          className="p-1 text-neutral-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                          title="Hapus baris"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Quick Presets per Row */}
                    <div className="flex flex-wrap gap-1.5">
                      {SIZE_PRESETS.map((p) => {
                        const isRowPreset =
                          Math.abs(rc.widthCm - p.widthCm) < 0.01 &&
                          Math.abs(rc.heightCm - p.heightCm) < 0.01;
                        const isKtpPreset = p.id.includes('ktp');
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              const extra: Partial<RowSizeConfig> = {};
                              if (p.id === '4x6') {
                                extra.columnsMode = 'custom';
                                extra.customColumns = 5;
                              } else if (p.id === '3x4') {
                                extra.columnsMode = 'custom';
                                extra.customColumns = 6;
                              }
                              handleUpdateRowConfig(rc.id, {
                                widthCm: p.widthCm,
                                heightCm: p.heightCm,
                                ...extra,
                              });
                            }}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-all cursor-pointer ${
                              isRowPreset
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : isKtpPreset
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:border-emerald-400'
                                : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-300'
                            }`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Width, Height & Columns for this Row */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-neutral-500 mb-0.5">
                          Lebar ({config.unit})
                        </label>
                        <input
                          type="number"
                          step={config.unit === 'mm' ? '1' : '0.1'}
                          min="0.5"
                          max="50"
                          value={rowDisplayW}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val > 0) {
                              const cm = config.unit === 'mm' ? val / 10 : val;
                              handleUpdateRowConfig(rc.id, {
                                widthCm: Number(cm.toFixed(2)),
                              });
                            }
                          }}
                          className="w-full px-2 py-1 text-xs font-mono font-semibold bg-neutral-50 border border-neutral-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-neutral-500 mb-0.5">
                          Tinggi ({config.unit})
                        </label>
                        <input
                          type="number"
                          step={config.unit === 'mm' ? '1' : '0.1'}
                          min="0.5"
                          max="50"
                          value={rowDisplayH}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val > 0) {
                              const cm = config.unit === 'mm' ? val / 10 : val;
                              handleUpdateRowConfig(rc.id, {
                                heightCm: Number(cm.toFixed(2)),
                              });
                            }
                          }}
                          className="w-full px-2 py-1 text-xs font-mono font-semibold bg-neutral-50 border border-neutral-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-neutral-500 mb-0.5">
                          Muat Foto/Baris
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={rc.columnsMode === 'custom' ? rc.customColumns : resolved?.columns || 5}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val >= 1) {
                              handleUpdateRowConfig(rc.id, {
                                columnsMode: 'custom',
                                customColumns: val,
                              });
                            }
                          }}
                          className="w-full px-2 py-1 text-xs font-mono font-semibold bg-neutral-50 border border-neutral-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            {/* Quick Banner for Studio Package */}
            <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-lg flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-amber-950">
                <span className="font-bold">⚡ Paket Standar Cetak Studio:</span> 4×6 (muat 5 foto) &amp; 3×4 (muat 6 foto/baris).
              </div>
              <button
                type="button"
                onClick={handleApplyPaketStudio}
                className="px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-md shadow-2xs transition-colors cursor-pointer"
              >
                Terapkan Paket Cetak Studio
              </button>
            </div>

            {/* Pilihan Khusus: 1 Kertas A4 Isi 1 s/d 20 Foto (Full Kertas Auto-Scale) */}
            <div className="p-4 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-purple-50/70 border border-blue-200/90 rounded-xl space-y-3.5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div>
                  <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <LayoutGrid className="w-4 h-4 text-blue-600" />
                    <span>Layout Full 1 Lembar A4 (Isi 1 s/d 20 Foto Penuh)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold">
                      Full Paper Fit
                    </span>
                  </h4>
                  <p className="text-[11px] text-blue-900/80 mt-0.5">
                    Pilih jumlah foto yang diinginkan. Ukuran foto otomatis diskalakan <strong>memenuhi 1 kertas A4</strong> tanpa sisa kosong di bawah.
                  </p>
                </div>
              </div>

              {/* Grid Buttons: 1 s/d 20 Foto */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-neutral-600 font-semibold mb-1.5">
                  <span>Pilih Jumlah Foto per Lembar A4:</span>
                  <span className="text-blue-700 font-mono font-bold">
                    {selectedA4Count} Foto Aktif
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-10 gap-1.5">
                  {A4_FULL_PLANS.map((plan) => {
                    const isSelected = selectedA4Count === plan.photoCount;
                    return (
                      <button
                        key={plan.photoCount}
                        type="button"
                        onClick={() => handleApplyFullPlan(plan.photoCount)}
                        className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer font-bold text-xs ${
                          isSelected
                            ? 'border-blue-600 bg-blue-600 text-white shadow-xs scale-102 ring-2 ring-blue-400'
                            : 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/70 text-slate-800'
                        }`}
                        title={plan.title}
                      >
                        <span className="block text-[11px]">Isi {plan.photoCount}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Plan Detail & AI Recommendation Card */}
              {(() => {
                const plan = A4_FULL_PLANS.find((p) => p.photoCount === selectedA4Count) || A4_FULL_PLANS[5];
                const activeDetail = config.orientation === 'landscape' ? plan.landscape : plan.portrait;

                return (
                  <div className="bg-white/95 rounded-xl border border-blue-200 p-3.5 space-y-2.5 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                        <span className="text-xs font-bold text-blue-950">
                          {plan.title} ({config.orientation === 'landscape' ? 'Lanskap' : 'Potret'})
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          100% Lembar A4 Penuh
                        </span>
                      </div>
                    </div>

                    {/* AI Recommendation Banner */}
                    <div className="p-2.5 rounded-lg bg-indigo-50/90 border border-indigo-200/90 flex items-start gap-2 text-xs text-indigo-950">
                      <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <div className="text-[11px] leading-relaxed">
                        <strong className="text-indigo-900 block font-bold mb-0.5">
                          💡 Rekomendasi AI (Format Terbaik: {plan.recommendedOrientation === 'landscape' ? 'Lanskap / Mendatar' : 'Potret / Tegak'}):
                        </strong>
                        {plan.aiReason}
                      </div>
                    </div>

                    {/* Manual vs AI Orientation Switcher */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-neutral-600 font-semibold mb-1">
                        <span>Orientasi Kertas A4:</span>
                        <span className="text-[10px] text-neutral-500">
                          (Bisa ikuti AI atau pilih manual)
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => handleApplyFullPlan(plan.photoCount, 'auto')}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                            a4OrientationChoice === 'auto'
                              ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>⚡ Auto (AI: {plan.recommendedOrientation === 'landscape' ? 'Lanskap' : 'Potret'})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyFullPlan(plan.photoCount, 'portrait')}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                            a4OrientationChoice === 'portrait' || (a4OrientationChoice !== 'auto' && config.orientation === 'portrait')
                              ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>📄 Potret (Tegak)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyFullPlan(plan.photoCount, 'landscape')}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                            a4OrientationChoice === 'landscape' || (a4OrientationChoice !== 'auto' && config.orientation === 'landscape')
                              ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>📑 Lanskap (Mendatar)</span>
                        </button>
                      </div>
                    </div>

                    {/* Summary Info */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-neutral-600 gap-1">
                      <span>
                        Tata Letak: <strong>{activeDetail.columns} Kolom × {activeDetail.rows} Baris</strong>
                      </span>
                      <span className="font-mono text-neutral-800">
                        {activeDetail.summary}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Quick Size Presets */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-neutral-700">
                  Preset Ukuran Cepat (Pas Foto, KTP &amp; STNK):
                </label>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Tersedia Ukuran KTP &amp; STNK
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {SIZE_PRESETS.map((p) => {
                  const isSelected =
                    Math.abs(config.targetWidthCm - p.widthCm) < 0.01 &&
                    Math.abs(config.targetHeightCm - p.heightCm) < 0.01;
                  const isKtpPreset = p.id.includes('ktp');
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPreset(p.id)}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600 shadow-2xs'
                          : isKtpPreset
                          ? 'border-emerald-300 bg-emerald-50/40 hover:border-emerald-400 hover:bg-emerald-50/70'
                          : 'border-neutral-200 hover:border-neutral-300 bg-neutral-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-neutral-900">{p.label}</span>
                        {p.badge && !isSelected && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                            isKtpPreset
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {p.badge}
                          </span>
                        )}
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-neutral-500 line-clamp-1 mt-0.5">
                        {p.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Width & Height Inputs */}
            <div className="grid grid-cols-2 gap-3 bg-neutral-50/70 p-3 rounded-lg border border-neutral-200/80">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Lebar ({config.unit})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step={config.unit === 'mm' ? '1' : '0.1'}
                    min="0.5"
                    max="50"
                    value={displayWidth}
                    onChange={(e) => handleWidthChange(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono font-semibold bg-white border border-neutral-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <span className="absolute right-2.5 top-1.5 text-xs text-neutral-400 font-mono">
                    {config.unit}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 font-mono mt-1">
                  = {layout.emuWidth.toLocaleString()} EMU
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Tinggi ({config.unit})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step={config.unit === 'mm' ? '1' : '0.1'}
                    min="0.5"
                    max="50"
                    value={displayHeight}
                    onChange={(e) => handleHeightChange(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono font-semibold bg-white border border-neutral-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <span className="absolute right-2.5 top-1.5 text-xs text-neutral-400 font-mono">
                    {config.unit}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 font-mono mt-1">
                  = {layout.emuHeight.toLocaleString()} EMU
                </p>
              </div>
            </div>
          </>
        )}

        {/* Pilihan Orientasi Foto Lanskap vs Potret (2 Pilihan) */}
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-2">
            Penyesuaian Orientasi Foto (Misal Foto Lanskap ke Ukuran 4×6 Potret):
          </label>
          <div className="grid grid-cols-1 gap-2">
            {(
              [
                {
                  id: 'keep',
                  title: 'Pilihan 1: Seperti Sekarang (Paksa Potret Tanpa Rotate)',
                  desc: 'Semua foto meskipun kondisinya lanskap langsung dipaksa potret ke ukuran target (misal 4×6) tanpa diputar.',
                },
                {
                  id: 'auto_rotate_to_target',
                  title: 'Pilihan 2: Otomatis Rotate Menyesuaikan Ukuran (Lanskap → 4×6 Potret)',
                  desc: 'Jika ukuran foto asli lanskap sedangkan ukuran di kertasnya potret (misal 4×6), maka foto otomatis di-rotate 90° menyesuaikan ke ukuran 4×6.',
                },
              ] as { id: AutoRotateMode; title: string; desc: string }[]
            ).map((opt) => {
              const isSelected = config.autoRotateMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeConfig((p) => ({ ...p, autoRotateMode: opt.id }))}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <RotateCw className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-semibold text-neutral-900">{opt.title}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </div>
                  <p className="text-[11px] text-neutral-600 leading-relaxed">{opt.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Fitur Rotasi Manual */}
          <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5 text-amber-700" />
                <span className="text-xs font-bold text-amber-900">
                  Fitur Putar Manual (Khawatir Otomatis Kurang Pas):
                </span>
              </div>
            </div>
            <p className="text-[11px] text-amber-950 mb-2 leading-relaxed">
              Jika ada foto atau KTP yang posisinya miring/terbalik atau ingin diatur manual sesuai keinginan, klik tombol <strong>Putar 90°</strong> pada tiap kartu foto di atas, atau putar semua foto sekaligus:
            </p>
            {onRotateAllPhotos && (
              <button
                type="button"
                onClick={onRotateAllPhotos}
                className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Putar Semua Foto Manual (+90° Searah Jarum Jam)</span>
              </button>
            )}
          </div>
        </div>

        {/* Cropping Strategy Modes */}
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-2">
            Mode Penyesuaian Rasio Foto:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Mode 1 */}
            <button
              type="button"
              onClick={() => onChangeConfig((p) => ({ ...p, resizeMode: 'smart_crop' }))}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                config.resizeMode === 'smart_crop'
                  ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                  : 'border-neutral-200 hover:border-neutral-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Crop className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-neutral-900">
                  Mode 1: Smart Cropping (Crop &amp; Fill)
                </span>
              </div>
              <p className="text-[11px] text-neutral-600 leading-relaxed">
                Memotong tepi foto secara proporsional agar mengisi kotak penuh. Wajah tetap proporsional &amp; <strong>tidak gepeng</strong>.
              </p>
            </button>

            {/* Mode 2 */}
            <button
              type="button"
              onClick={() => onChangeConfig((p) => ({ ...p, resizeMode: 'stretch' }))}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                config.resizeMode === 'stretch'
                  ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                  : 'border-neutral-200 hover:border-neutral-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Maximize2 className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-semibold text-neutral-900">
                  Mode 2: Full Photo Resize (Stretch)
                </span>
              </div>
              <p className="text-[11px] text-neutral-600 leading-relaxed">
                Menyesuaikan paksa ke dimensi target. <strong>100% foto terlihat utuh</strong> tanpa terpotong sama sekali.
              </p>
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 2: Paper & OpenXML Layout */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-neutral-900">
            2. Pengaturan Kertas &amp; OpenXML Layout Engine
          </h3>
        </div>

        {/* Paper Size & Orientation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Ukuran Kertas (Kalkulasi Word)
            </label>
            <select
              value={config.paperType}
              onChange={(e) =>
                onChangeConfig((p) => ({
                  ...p,
                  paperType: e.target.value as PaperType,
                }))
              }
              className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="A4">A4: 21.0 × 29.7 cm (Standar Indonesia)</option>
              <option value="F4">F4 / Folio: 21.5 × 33.0 cm (Kertas Panjang)</option>
              <option value="Letter">Letter: 21.6 × 27.9 cm</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Orientasi Kertas
            </label>
            <div className="flex items-center p-0.5 bg-neutral-100 rounded-md text-xs font-medium">
              <button
                type="button"
                onClick={() => onChangeConfig((p) => ({ ...p, orientation: 'portrait' }))}
                className={`flex-1 py-1 rounded text-center transition-colors cursor-pointer ${
                  config.orientation === 'portrait'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Portrait (Tegak)
              </button>
              <button
                type="button"
                onClick={() => onChangeConfig((p) => ({ ...p, orientation: 'landscape' }))}
                className={`flex-1 py-1 rounded text-center transition-colors cursor-pointer ${
                  config.orientation === 'landscape'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Landscape (Mendatar)
              </button>
            </div>
          </div>
        </div>

        {/* Margins */}
        <div className="bg-neutral-50/70 p-3 rounded-lg border border-neutral-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-neutral-700">
              Margin Kertas (Twips: 1 cm ≈ 567 Twips)
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  onChangeConfig((p) => ({
                    ...p,
                    margins: { ...p.margins, topCm: 0.3 },
                  }))
                }
                className="px-2 py-0.5 text-[10px] bg-blue-50 text-blue-700 font-semibold border border-blue-200 rounded hover:bg-blue-100 cursor-pointer"
                title="Set margin bagian atas ke 0.3 cm (standar pas foto)"
              >
                Atas 0.3 cm
              </button>
              <button
                type="button"
                onClick={() =>
                  onChangeConfig((p) => ({
                    ...p,
                    margins: { topCm: 1.27, bottomCm: 1.27, leftCm: 1.27, rightCm: 1.27 },
                  }))
                }
                className="px-2 py-0.5 text-[10px] bg-white border border-neutral-200 rounded hover:bg-neutral-100 cursor-pointer"
              >
                Sempit (1.27 cm)
              </button>
              <button
                type="button"
                onClick={() =>
                  onChangeConfig((p) => ({
                    ...p,
                    margins: { topCm: 2.0, bottomCm: 2.0, leftCm: 2.0, rightCm: 2.0 },
                  }))
                }
                className="px-2 py-0.5 text-[10px] bg-white border border-neutral-200 rounded hover:bg-neutral-100 cursor-pointer"
              >
                Normal (2.0 cm)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-neutral-500 block mb-0.5">Atas</span>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={config.margins.topCm}
                onChange={(e) => {
                  const parsed = parseFloat(e.target.value);
                  const val = isNaN(parsed) ? 0 : parsed;
                  onChangeConfig((p) => ({
                    ...p,
                    margins: { ...p.margins, topCm: val },
                  }));
                }}
                className="w-full px-2 py-1 font-mono text-center bg-white border border-neutral-300 rounded text-xs"
              />
            </div>
            <div>
              <span className="text-[10px] text-neutral-500 block mb-0.5">Bawah</span>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={config.margins.bottomCm}
                onChange={(e) => {
                  const parsed = parseFloat(e.target.value);
                  const val = isNaN(parsed) ? 0 : parsed;
                  onChangeConfig((p) => ({
                    ...p,
                    margins: { ...p.margins, bottomCm: val },
                  }));
                }}
                className="w-full px-2 py-1 font-mono text-center bg-white border border-neutral-300 rounded text-xs"
              />
            </div>
            <div>
              <span className="text-[10px] text-neutral-500 block mb-0.5">Kiri</span>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={config.margins.leftCm}
                onChange={(e) => {
                  const parsed = parseFloat(e.target.value);
                  const val = isNaN(parsed) ? 0 : parsed;
                  onChangeConfig((p) => ({
                    ...p,
                    margins: { ...p.margins, leftCm: val },
                  }));
                }}
                className="w-full px-2 py-1 font-mono text-center bg-white border border-neutral-300 rounded text-xs"
              />
            </div>
            <div>
              <span className="text-[10px] text-neutral-500 block mb-0.5">Kanan</span>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={config.margins.rightCm}
                onChange={(e) => {
                  const parsed = parseFloat(e.target.value);
                  const val = isNaN(parsed) ? 0 : parsed;
                  onChangeConfig((p) => ({
                    ...p,
                    margins: { ...p.margins, rightCm: val },
                  }));
                }}
                className="w-full px-2 py-1 font-mono text-center bg-white border border-neutral-300 rounded text-xs"
              />
            </div>
          </div>
        </div>

        {/* Spacing & Table Grid Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Jarak Antar Kolom (Gutter)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                min="0"
                max="3"
                value={config.gutterCm}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onChangeConfig((p) => ({
                    ...p,
                    gutterCm: isNaN(val) ? 0 : val,
                  }));
                }}
                className="w-20 px-2 py-1 text-xs font-mono bg-white border border-neutral-300 rounded"
              />
              <span className="text-xs text-neutral-500">cm</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Jarak Antar Baris
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                min="0"
                max="3"
                value={config.rowSpacingCm}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onChangeConfig((p) => ({
                    ...p,
                    rowSpacingCm: isNaN(val) ? 0 : val,
                  }));
                }}
                className="w-20 px-2 py-1 text-xs font-mono bg-white border border-neutral-300 rounded"
              />
              <span className="text-xs text-neutral-500">cm</span>
            </div>
          </div>
        </div>

        {/* Auto Grid vs Manual Columns */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-700">Mode Kolom Grid:</span>
            <div className="flex items-center gap-2 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="colsMode"
                  checked={config.columnsMode === 'auto'}
                  onChange={() => onChangeConfig((p) => ({ ...p, columnsMode: 'auto' }))}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>Otomatis ({layout.columns} kolom)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer ml-2">
                <input
                  type="radio"
                  name="colsMode"
                  checked={config.columnsMode === 'custom'}
                  onChange={() => onChangeConfig((p) => ({ ...p, columnsMode: 'custom' }))}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>Kustom</span>
              </label>
              {config.columnsMode === 'custom' && (
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={config.customColumns}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    onChangeConfig((p) => ({
                      ...p,
                      customColumns: Math.max(1, isNaN(val) ? 1 : val),
                    }));
                  }}
                  className="w-14 px-1.5 py-0.5 text-xs font-mono bg-white border border-neutral-300 rounded"
                />
              )}
            </div>
          </div>

          {/* Cut Guides & Labels Checkbox */}
          <div className="pt-2 border-t border-neutral-100 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-700">
              <input
                type="checkbox"
                checked={config.showCutGuides}
                onChange={(e) =>
                  onChangeConfig((p) => ({ ...p, showCutGuides: e.target.checked }))
                }
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <Scissors className="w-3.5 h-3.5 text-neutral-500" />
              <span>
                Garis Potong Gunting (Border putus-putus tipis untuk panduan potong)
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-700">
              <input
                type="checkbox"
                checked={config.showLabels}
                onChange={(e) =>
                  onChangeConfig((p) => ({ ...p, showLabels: e.target.checked }))
                }
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <Tag className="w-3.5 h-3.5 text-neutral-500" />
              <span>Tampilkan Nama File / Label teks di bawah setiap foto</span>
            </label>
          </div>
        </div>

        {/* Calculation summary bar */}
        <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="text-neutral-700 font-medium">
            Kalkulasi Tata Letak:
          </div>
          <div className="flex flex-wrap items-center gap-3 text-neutral-600 font-mono text-[11px]">
            <span>{layout.columns} Kolom × {layout.rowsPerPage} Baris</span>
            <span>·</span>
            <span>{layout.photosPerPage} foto/halaman</span>
            <span>·</span>
            <span className="font-semibold text-blue-700">
              Total {layout.totalPages} Halaman
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
