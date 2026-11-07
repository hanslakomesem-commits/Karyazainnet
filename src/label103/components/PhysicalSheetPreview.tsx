import React from 'react';
import { FormatSettings, LabelSheet } from '../types';
import { Printer, Type, AlignCenter, AlignLeft, Bold } from 'lucide-react';

interface PhysicalSheetPreviewProps {
  sheets: LabelSheet[];
  settings: FormatSettings;
  onSettingsChange: (newSettings: FormatSettings) => void;
  onPrint: () => void;
}

export const PhysicalSheetPreview: React.FC<PhysicalSheetPreviewProps> = ({
  sheets,
  settings,
  onSettingsChange,
  onPrint,
}) => {
  const updateSetting = <K extends keyof FormatSettings>(key: K, value: FormatSettings[K]) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  const getFontFamilyStyle = (font: string) => {
    switch (font) {
      case 'Times New Roman':
        return '"Times New Roman", Times, serif';
      case 'Great Vibes':
        return '"Great Vibes", cursive';
      case 'Cinzel':
        return '"Cinzel", serif';
      case 'Arial':
        return 'Arial, Helvetica, sans-serif';
      default:
        return '"Plus Jakarta Sans", sans-serif';
    }
  };

  return (
    <div className="space-y-6">
      {/* Control bar for Visual/Print customization */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs no-print">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 tracking-tight">
              Kustomisasi Tampilan Cetak Stiker:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Font Picker */}
            <div className="flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={settings.fontFamily}
                onChange={(e) => updateSetting('fontFamily', e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 bg-white text-slate-700 text-xs focus:ring-1 focus:ring-amber-600 outline-hidden"
              >
                <option value="Plus Jakarta Sans">Modern Sans (Plus Jakarta)</option>
                <option value="Times New Roman">Resmi / Formal (Times New Roman)</option>
                <option value="Great Vibes">Kaligrafi / Artistik (Great Vibes)</option>
                <option value="Cinzel">Klasik Elegan (Cinzel)</option>
                <option value="Arial">Standar (Arial)</option>
              </select>
            </div>

            {/* Font Size */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Ukuran:</span>
              <div className="flex border border-slate-300 rounded overflow-hidden">
                {[9, 10, 11, 12, 13].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => updateSetting('fontSize', size)}
                    className={`px-2 py-0.5 text-[11px] transition-colors ${
                      settings.fontSize === size
                        ? 'bg-amber-600 text-white font-bold'
                        : 'bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {size}pt
                  </button>
                ))}
              </div>
            </div>

            {/* Bold Toggle */}
            <button
              type="button"
              onClick={() => updateSetting('isBoldName', !settings.isBoldName)}
              title="Tebalkan nama tamu"
              className={`p-1.5 rounded border transition-colors cursor-pointer ${
                settings.isBoldName
                  ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                  : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Bold className="w-3.5 h-3.5" />
            </button>

            {/* Alignment Toggle */}
            <div className="flex border border-slate-300 rounded overflow-hidden">
              <button
                type="button"
                onClick={() => updateSetting('alignment', 'center')}
                title="Rata Tengah"
                className={`p-1.5 transition-colors cursor-pointer ${
                  settings.alignment === 'center'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => updateSetting('alignment', 'left')}
                title="Rata Kiri"
                className={`p-1.5 transition-colors cursor-pointer ${
                  settings.alignment === 'left'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Direct Print Button */}
            <button
              type="button"
              onClick={onPrint}
              disabled={sheets.length === 0}
              className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-md shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Sekarang (Ctrl + P)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sheets Printable Container */}
      <div className="print-area space-y-8">
        {sheets.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 no-print">
            Masukkan daftar nama tamu di atas untuk melihat simulasi lembar stiker 103.
          </div>
        ) : (
          sheets.map((sheet) => (
            <div
              key={sheet.sheetNumber}
              style={{ maxWidth: '20cm' }}
              className="bg-white border border-slate-300 rounded-xl shadow-sm p-6 mx-auto print:border-none print:shadow-none print:p-0 print-page-break print:m-0"
            >
              {/* Sheet physical banner info */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-5 no-print">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-bold text-xs rounded">
                    LEMBAR {sheet.sheetNumber}
                  </span>
                  <span className="text-xs font-semibold text-slate-800">
                    Ukuran Kertas Undangan: 20 × 14 cm
                  </span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                    Kolom Label: 6,4 cm × 3,3 cm
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-500">
                    {sheet.activeItemCount} nama terisi, {sheet.emptyItemCount} kosong
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Presisi 12 Kolom (3 Kesamping × 4 Kebawah)
                </span>
              </div>

              {/* Physical Sheet 3x4 Grid Representation */}
              <div className="grid grid-cols-3 gap-3 print:gap-[3mm] mx-auto w-full">
                {sheet.rows.map((row) =>
                  row.map((cell) => (
                    <div
                      key={cell.id}
                      style={{
                        fontFamily: getFontFamilyStyle(settings.fontFamily),
                        textAlign: settings.alignment,
                      }}
                      className={`relative min-h-[96px] sm:min-h-[105px] print:min-h-[3.3cm] print:h-[3.3cm] print:max-h-[3.3cm] print:w-[6.4cm] rounded-md border p-3 flex flex-col justify-center transition-all ${
                        cell.isEmpty
                          ? 'border-dashed border-slate-200 bg-slate-50/50 print:border-transparent print:bg-transparent'
                          : 'border-slate-300 bg-white shadow-2xs hover:border-amber-400 print:border-none print:shadow-none'
                      }`}
                    >
                      {/* Subtle Slot Index Indicator */}
                      <span className="absolute top-1 right-1.5 text-[9px] font-mono text-slate-300 print:hidden select-none">
                        #{cell.globalIndex}
                      </span>

                      {cell.isEmpty ? (
                        <div className="text-center text-slate-300 text-xs italic select-none print:hidden">
                          (Kosong)
                        </div>
                      ) : (
                        <div className="flex flex-col justify-center items-center w-full px-1">
                          {/* Baris 1: Nama Tamu */}
                          <div
                            style={{
                              fontSize: `${settings.fontSize}pt`,
                              fontWeight: settings.isBoldName ? 700 : 400,
                              lineHeight: 1.25,
                            }}
                            className="text-slate-900 leading-tight w-full break-words"
                          >
                            {cell.name}
                          </div>

                          {/* Baris 2: Di */}
                          <div
                            style={{
                              fontSize: `${Math.max(8.5, settings.fontSize - 2)}pt`,
                            }}
                            className="text-slate-600 font-normal my-0.5 print:my-[1mm]"
                          >
                            {cell.prefix}
                          </div>

                          {/* Baris 3: Tempat */}
                          <div
                            style={{
                              fontSize: `${Math.max(9, settings.fontSize - 1.5)}pt`,
                            }}
                            className="text-slate-800 font-medium leading-tight"
                          >
                            {cell.destination}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Sheet footer info */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 no-print">
                <span>Ukuran Kertas Undangan: <strong>20 cm × 14 cm</strong> (Bukan Letter/A4)</span>
                <span>Dimensi per kolom: <strong>6,4 cm × 3,3 cm</strong> (3 ke samping × 4 ke bawah = 12 kolom presisi)</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
