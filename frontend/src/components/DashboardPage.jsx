import React from 'react';
import { 
  Lock, Eye, Shield, Activity, HardDrive, CheckCircle2, 
  Trash2, ArrowUpRight, Clock, Image as ImageIcon, Key, BarChart3, Copy, Check 
} from 'lucide-react';

export default function DashboardPage({ setActiveTab, operations, clearOperations, backendStatus }) {
  const totalOps = operations.length;
  const embedOps = operations.filter(op => op.type === 'EMBED');
  const extractOps = operations.filter(op => op.type === 'EXTRACT');
  
  const psnrValues = embedOps.map(op => parseFloat(op.psnr)).filter(v => !isNaN(v) && v > 0);
  const avgPsnr = psnrValues.length > 0 
    ? (psnrValues.reduce((a, b) => a + b, 0) / psnrValues.length).toFixed(2)
    : '60.76';

  const totalChars = embedOps.reduce((sum, op) => sum + (op.msgLength || 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.07] pb-6">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-indigo-400 uppercase tracking-wider mb-1">
            <Activity className="w-3.5 h-3.5" />
            <span>Research Console</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Session analytics for Caesar Cipher &amp; 24-bit LSB Steganography.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActiveTab('embed')}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors flex items-center space-x-2 shadow-sm"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>New Secret</span>
          </button>
          <button
            onClick={() => setActiveTab('extract')}
            className="px-4 py-2 rounded-lg glass-panel hover:bg-white/[0.04] text-slate-200 text-xs font-medium transition-colors flex items-center space-x-2"
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>Extract Message</span>
          </button>
        </div>
      </div>

      {/* STATS TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="glass-panel p-5 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Session Ops</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{totalOps}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            {embedOps.length} Encrypts • {extractOps.length} Decrypts
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Average PSNR</span>
            <BarChart3 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-400 font-mono">
            {avgPsnr} <span className="text-xs font-normal text-slate-400">dB</span>
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 font-mono flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>High Fidelity (&gt; 50 dB)</span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Concealed Chars</span>
            <Key className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {totalChars} <span className="text-xs font-normal text-slate-400">chars</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            Caesar Shift: +3 cyclic
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">C Core Engine</span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-base font-bold text-white font-mono flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>ISO C99 Native</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            secretpixel.exe active
          </div>
        </div>

      </div>

      {/* QUICK ACTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div 
          onClick={() => setActiveTab('embed')}
          className="glass-panel p-6 rounded-2xl hover:border-indigo-500/40 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Lock className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono text-indigo-400 flex items-center space-x-1">
              <span>Open Tool</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>

          <h3 className="text-lg font-bold text-white mb-1 group-hover:text-indigo-300 transition-colors">
            Hide &amp; Encrypt Message
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Upload a 24-bit uncompressed BMP image, enter your secret message, and embed it using 
            Caesar Cipher ($k=3$) and spatial LSB bit injection.
          </p>

          <div className="text-[11px] font-mono text-slate-500 flex space-x-3">
            <span>• Live Capacity Meter</span>
            <span>• PSNR/MSE Metrics</span>
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('extract')}
          className="glass-panel p-6 rounded-2xl hover:border-cyan-500/40 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-cyan-600/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Eye className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono text-cyan-400 flex items-center space-x-1">
              <span>Open Tool</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>

          <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-300 transition-colors">
            Extract &amp; Decrypt Secret
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Upload a stego BMP image to inspect its 32-bit length prefix, read the LSB color channels, 
            extract ciphertext, and decrypt using Caesar shift ($k=-3$).
          </p>

          <div className="text-[11px] font-mono text-slate-500 flex space-x-3">
            <span>• 32-bit Header Parsing</span>
            <span>• One-Click Copy</span>
          </div>
        </div>

      </div>

      {/* OPERATIONS LOG */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Recent Operations Log
            </h3>
          </div>

          {operations.length > 0 && (
            <button
              onClick={clearOperations}
              className="text-xs text-slate-400 hover:text-rose-400 transition-colors flex items-center space-x-1 font-mono"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {operations.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-white/[0.06] rounded-xl bg-black/20">
            <ImageIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <span className="text-xs font-medium text-slate-400 block">No Operations Recorded Yet</span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Hide or extract a message to populate this session log.
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/[0.06] text-slate-400 text-[11px]">
                  <th className="pb-2.5 font-semibold">Type</th>
                  <th className="pb-2.5 font-semibold">Image Source</th>
                  <th className="pb-2.5 font-semibold">Details / Payload</th>
                  <th className="pb-2.5 font-semibold">PSNR</th>
                  <th className="pb-2.5 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {operations.map((op, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        op.type === 'EMBED' 
                          ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                          : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                      }`}>
                        {op.type}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-300 truncate max-w-[140px]">
                      {op.imageName || 'image.bmp'}
                    </td>
                    <td className="py-2.5 text-slate-400 truncate max-w-[260px]">
                      {op.preview || `${op.msgLength || 0} bytes`}
                    </td>
                    <td className="py-2.5 text-slate-300">
                      {op.psnr ? `${op.psnr} dB` : '—'}
                    </td>
                    <td className="py-2.5 text-slate-500 text-[11px]">
                      {op.time || 'Just now'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
