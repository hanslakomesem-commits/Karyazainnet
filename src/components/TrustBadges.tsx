import React from 'react';
import { CreditCard, Zap, ShieldCheck, Headphones } from 'lucide-react';

export const TrustBadges: React.FC = () => {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      
      {/* Item 1 */}
      <div className="bg-card rounded-xl p-4 flex items-center space-x-3 shadow-md">
        <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-lg shrink-0">
          <CreditCard className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-gray-200">Pembayaran Terpadu</h4>
          <p className="text-[10px] text-gray-500">Midtrans Gateway</p>
        </div>
      </div>

      {/* Item 2 */}
      <div className="bg-card rounded-xl p-4 flex items-center space-x-3 shadow-md">
        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-lg shrink-0">
          <Zap className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-gray-200">Proses Otomatis</h4>
          <p className="text-[10px] text-gray-500">Cepat, efisien & real-time 24/7</p>
        </div>
      </div>

      {/* Item 3 */}
      <div className="bg-card rounded-xl p-4 flex items-center space-x-3 shadow-md">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-lg shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-gray-200">Keamanan Terjamin</h4>
          <p className="text-[10px] text-gray-500">Bebas eror & privasi terlindungi</p>
        </div>
      </div>

      {/* Item 4 */}
      <div className="bg-card rounded-xl p-4 flex items-center space-x-3 shadow-md">
        <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center text-lg shrink-0">
          <Headphones className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-gray-200">Support 24/7</h4>
          <p className="text-[10px] text-gray-500">Tim support siap membantu Anda</p>
        </div>
      </div>

    </section>
  );
};

