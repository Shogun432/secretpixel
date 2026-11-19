import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, Lock, Eye, ArrowRight, Binary, Cpu, Layers, 
  Sparkles, CheckCircle2, FileImage, ShieldCheck, Terminal 
} from 'lucide-react';

export default function LandingPage({ setActiveTab }) {
  // Interactive mini simulation in hero
  const demoPlain = "TOP SECRET 007";
  const [demoIndex, setDemoIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setDemoIndex((prev) => (prev + 1) % demoPlain.length);
    }, 1600);
    return () => clearInterval(timer);
  }, []);

  const activeChar = demoPlain[demoIndex];
  // Caesar shift 3
  const isAlpha = /[A-Za-z]/.test(activeChar);
  const activeCipher = isAlpha 
    ? String.fromCharCode(((activeChar.charCodeAt(0) - 65 + 3) % 26) + 65)
    : activeChar;
  const activeBinary = activeCipher.charCodeAt(0).toString(2).padStart(8, '0');

  // Simulated 8 RGB color channel values
  const baseColorBytes = [240, 185, 92, 134, 201, 78, 160, 222];
  const stegoColorBytes = baseColorBytes.map((byte, idx) => {
    const bit = parseInt(activeBinary[idx], 10);
    return (byte & 0xFE) | bit;
  });

  return (
    <div className="space-y-20 sm:space-y-28 py-10">
      
      {/* HERO SECTION */}
      <section className="relative px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center pt-6 sm:pt-12">
        
        {/* Subtle Backdrop Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />

        {/* Academic Tag */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 font-mono mb-6"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          <span>Academic Cryptography &amp; Steganography Project</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-300">ISO C99</span>
        </motion.div>

        {/* Main Title */}
        <motion.h1 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight"
        >
          Hide Your Secrets in <br className="hidden sm:inline" />
          <span className="text-gradient-primary">Plain Sight.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed"
        >
          Conceal confidential messages inside ordinary 24-bit uncompressed BMP images 
          using a combined <span className="text-slate-200 font-medium">Caesar Cipher ($k=3$)</span> and 
          <span className="text-slate-200 font-medium"> spatial LSB steganography</span> engine.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
        >
          <button
            onClick={() => setActiveTab('embed')}
            className="w-full sm:w-auto px-7 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all flex items-center justify-center space-x-2 shadow-sm"
          >
            <Lock className="w-4 h-4" />
            <span>Start Hiding Messages</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTab('extract')}
            className="w-full sm:w-auto px-7 py-3 rounded-lg glass-panel hover:bg-white/[0.04] text-slate-200 font-medium text-sm transition-all flex items-center justify-center space-x-2"
          >
            <Eye className="w-4 h-4 text-cyan-400" />
            <span>Extract Secret</span>
          </button>

          <button
            onClick={() => setActiveTab('how-it-works')}
            className="w-full sm:w-auto px-5 py-3 rounded-lg text-slate-400 hover:text-slate-200 font-medium text-xs transition-colors"
          >
            How It Works →
          </button>
        </motion.div>

        {/* HERO INTERACTIVE ANIMATED VISUAL */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-14 max-w-3xl mx-auto glass-panel p-6 sm:p-7 rounded-2xl text-left relative overflow-hidden"
        >
          <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06] mb-5">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-600" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-600" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-600" />
              <span className="text-xs text-slate-400 font-mono ml-2">LSB Execution Pipeline</span>
            </div>
            <div className="flex items-center space-x-2 font-mono text-[11px]">
              <span className="px-2 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/[0.06]">
                Shift: +3
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                PSNR &gt; 60 dB
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Step 1: Caesar */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/[0.05] space-y-3">
              <span className="text-[11px] font-mono text-indigo-400 font-semibold uppercase tracking-wider block">
                1. Caesar Cipher
              </span>
              <div className="flex items-center justify-around font-mono py-2 bg-white/[0.02] rounded-lg">
                <div className="text-center">
                  <span className="text-[10px] text-slate-500 block">Plain</span>
                  <span className="text-xl font-bold text-slate-100">'{activeChar}'</span>
                </div>
                <span className="text-indigo-400 text-xs font-semibold">+3 →</span>
                <div className="text-center">
                  <span className="text-[10px] text-indigo-400 block">Cipher</span>
                  <span className="text-xl font-bold text-indigo-300">'{activeCipher}'</span>
                </div>
              </div>
              <div className="text-[11px] font-mono text-slate-500 flex justify-between">
                <span>ASCII: {activeCipher.charCodeAt(0)}</span>
                <span>Wrap: {isAlpha ? 'mod 26' : 'keep'}</span>
              </div>
            </div>

            {/* Step 2: Binary */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/[0.05] space-y-3">
              <span className="text-[11px] font-mono text-cyan-400 font-semibold uppercase tracking-wider block">
                2. Binary Stream
              </span>
              <div className="grid grid-cols-8 gap-0.5 py-3 font-mono text-center">
                {activeBinary.split('').map((bit, idx) => (
                  <div key={idx} className="p-1 rounded bg-cyan-950/40 text-cyan-300 text-xs font-bold border border-cyan-500/20">
                    {bit}
                  </div>
                ))}
              </div>
              <div className="text-[11px] font-mono text-slate-500 flex justify-between">
                <span>Format: 8-bit</span>
                <span>LSB stream</span>
              </div>
            </div>

            {/* Step 3: LSB Injection */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/[0.05] space-y-3">
              <span className="text-[11px] font-mono text-emerald-400 font-semibold uppercase tracking-wider block">
                3. Pixel LSB Masking
              </span>
              <div className="space-y-1 font-mono text-[11px] py-1">
                <div className="flex justify-between text-slate-400">
                  <span>Cover Byte:</span>
                  <span>{baseColorBytes[0]} ({baseColorBytes[0].toString(2)})</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>Stego Byte:</span>
                  <span>{stegoColorBytes[0]} ({stegoColorBytes[0].toString(2)})</span>
                </div>
              </div>
              <div className="text-[11px] font-mono text-slate-500 flex justify-between">
                <span>Max Drift: ±1</span>
                <span className="text-emerald-400">0.39% Δ</span>
              </div>
            </div>

          </div>
        </motion.div>
      </section>

      {/* CORE SPECIFICATIONS */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-indigo-400 mb-2">
            Theoretical Foundations
          </h2>
          <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Dual-Layer Cryptographic Architecture
          </h3>
          <p className="mt-2 text-slate-400 text-sm">
            Security by encryption plus obscurity by steganography.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1 */}
          <div className="glass-panel p-6 rounded-2xl hover:border-white/[0.12] transition-colors">
            <div className="w-10 h-10 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Caesar Cipher Engine</h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Modular arithmetic preserves uppercase, lowercase, punctuation, digits, and spaces:
              <code className="text-[11px] text-indigo-300 font-mono block mt-2 p-2 bg-black/40 rounded border border-white/[0.05]">
                E(x) = (x + 3) mod 26
              </code>
            </p>
            <div className="text-[11px] font-mono text-slate-400 space-y-1">
              <div>• Deterministic O(N) runtime</div>
              <div>• Bijective substitution mapping</div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="glass-panel p-6 rounded-2xl hover:border-white/[0.12] transition-colors">
            <div className="w-10 h-10 rounded-lg bg-cyan-600/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
              <FileImage className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">24-Bit BMP Processing</h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Direct binary parsing of Windows BMP file headers with strict row stride alignment:
              <code className="text-[11px] text-cyan-300 font-mono block mt-2 p-2 bg-black/40 rounded border border-white/[0.05]">
                padding = (4 - (W * 3 % 4)) % 4
              </code>
            </p>
            <div className="text-[11px] font-mono text-slate-400 space-y-1">
              <div>• Preserves 0-3 padding bytes</div>
              <div>• 32-bit big-endian length prefix</div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="glass-panel p-6 rounded-2xl hover:border-white/[0.12] transition-colors">
            <div className="w-10 h-10 rounded-lg bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Spatial LSB Steganography</h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Alters only the lowest bit of raw RGB color channels. Evaluated via standard metric:
              <code className="text-[11px] text-emerald-300 font-mono block mt-2 p-2 bg-black/40 rounded border border-white/[0.05]">
                PSNR = 10 * log10(255² / MSE)
              </code>
            </p>
            <div className="text-[11px] font-mono text-slate-400 space-y-1">
              <div>• PSNR &gt; 60 dB fidelity</div>
              <div>• Deep copy cover preservation</div>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
