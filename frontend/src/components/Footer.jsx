import React from 'react';
import { Shield, Terminal, Binary, Lock, Code2, Heart } from 'lucide-react';

export default function Footer({ setActiveTab }) {
  return (
    <footer className="border-t border-white/[0.08] bg-[#07080D]/90 backdrop-blur-md mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand & Project Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-cyan-400 p-[1px] flex items-center justify-center">
                <div className="w-full h-full bg-[#0B0D17] rounded-[7px] flex items-center justify-center">
                  <Shield className="w-4 h-4 text-purple-400" />
                </div>
              </div>
              <span className="text-lg font-bold text-white font-mono">Secret<span className="text-cyan-400">Pixel</span></span>
            </div>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              An academic cybersecurity research project combining classical symmetric cryptography 
              (Caesar Cipher, shift 3) with spatial-domain Least Significant Bit (LSB) steganography 
              on 24-bit uncompressed Windows BMP images.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="px-2.5 py-1 text-xs rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">
                C99 Engine
              </span>
              <span className="px-2.5 py-1 text-xs rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
                FastAPI Gateway
              </span>
              <span className="px-2.5 py-1 text-xs rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
                React 18 + Vite
              </span>
              <span className="px-2.5 py-1 text-xs rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                PSNR &gt; 60 dB
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-4 font-mono">
              Navigation
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <button onClick={() => setActiveTab('landing')} className="hover:text-purple-400 transition-colors">
                  Home
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('dashboard')} className="hover:text-purple-400 transition-colors">
                  Dashboard
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('embed')} className="hover:text-purple-400 transition-colors">
                  Hide Secret Message
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('extract')} className="hover:text-purple-400 transition-colors">
                  Extract &amp; Decrypt
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('how-it-works')} className="hover:text-purple-400 transition-colors">
                  How It Works
                </button>
              </li>
            </ul>
          </div>

          {/* Technical Specifications */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-4 font-mono">
              Core Specifications
            </h4>
            <ul className="space-y-2 text-xs text-slate-400 font-mono">
              <li className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                <span>Cipher: Caesar (k = +3 / -3)</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                <span>Format: 24-bit uncompressed BMP</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                <span>Padding: 4-byte scanline alignment</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>LSB: 1 bit per RGB channel</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>Framing: 32-bit length prefix</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/[0.06] pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© 2026 SecretPixel Academic Research Project. All rights reserved.</p>
          <div className="flex items-center space-x-2 mt-4 sm:mt-0 font-mono">
            <span>Core: ISO C99</span>
            <span>•</span>
            <span>Build: GCC 14.1</span>
            <span>•</span>
            <span>Execution: Native Subprocess</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
