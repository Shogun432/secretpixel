import React, { useState } from 'react';
import { 
  Lock, Key, Binary, FileImage, Layers, Eye, ShieldCheck, 
  ArrowRight, Sparkles, CheckCircle2, ChevronRight, Calculator 
} from 'lucide-react';

export default function HowItWorksPage({ setActiveTab }) {
  // Step 1 interactive tester
  const [testChar, setTestChar] = useState('H');
  const [shiftKey, setShiftKey] = useState(3);

  // Compute cipher for testChar
  const shiftChar = (ch, k) => {
    if (/[A-Z]/.test(ch)) {
      return String.fromCharCode(((ch.charCodeAt(0) - 65 + k) % 26) + 65);
    }
    if (/[a-z]/.test(ch)) {
      return String.fromCharCode(((ch.charCodeAt(0) - 97 + k) % 26) + 97);
    }
    return ch;
  };

  const encryptedChar = shiftChar(testChar || 'A', shiftKey);
  const binaryCipher = (encryptedChar.charCodeAt(0) || 0).toString(2).padStart(8, '0');

  // Step 4 LSB Bit Masking Interactive Simulator
  const [sampleCoverByte, setSampleCoverByte] = useState(204); // 11001100
  const [sampleSecretBit, setSampleSecretBit] = useState(1);
  const clearedCoverByte = sampleCoverByte & 0xFE;
  const embeddedStegoByte = clearedCoverByte | sampleSecretBit;

  // Step 3 Row padding interactive tester
  const [sampleWidth, setSampleWidth] = useState(33);
  const rawRowBytes = sampleWidth * 3;
  const paddingBytes = (4 - (rawRowBytes % 4)) % 4;
  const totalRowStride = rawRowBytes + paddingBytes;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-mono text-indigo-300">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Interactive Theoretical Breakdown</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          How SecretPixel Works
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          The mathematical formulations, binary bit streams, and 24-bit BMP image scanline handling 
          implemented inside SecretPixel's C99 backend.
        </p>
      </div>

      {/* STEP 1: CAESAR CIPHER */}
      <section className="glass-panel p-6 sm:p-8 rounded-2xl space-y-5">
        <div className="flex items-center space-x-3 text-indigo-400">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-mono font-bold text-sm">
            1
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Cryptographic Layer: Caesar Cipher (k = 3)</h2>
            <p className="text-xs text-slate-400 font-mono">Classical Symmetric Alphabetic Substitution with Cyclic Wrap-Around</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Before any bits touch image pixels, the plaintext message is encrypted using a Caesar substitution cipher. 
          Each letter is shifted forward by <strong className="text-indigo-300">3 positions</strong> in the alphabet with modulo 26 wrap-around. 
          Non-alphabetic characters (numbers, punctuation, and spaces) are faithfully preserved.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          
          {/* Formula Card */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/[0.05] font-mono text-xs space-y-2">
            <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[11px]">Mathematical Formulation</span>
            <div className="p-2.5 bg-black/50 rounded-lg text-indigo-300 text-xs border border-white/[0.05]">
              E(x) = (x - base + 3) mod 26 + base
            </div>
            <div className="p-2.5 bg-black/50 rounded-lg text-cyan-300 text-xs border border-white/[0.05]">
              D(x) = (x - base - 3 + 26) mod 26 + base
            </div>
            <p className="text-[10px] text-slate-500">
              *Where base = 'A' (65) or 'a' (97). Adding +26 prevents negative modulo in C.
            </p>
          </div>

          {/* Interactive Tester */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/[0.05] space-y-3">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-300 block">
              Interactive Character Shifter
            </span>

            <div className="flex items-center space-x-3">
              <label className="text-xs font-mono text-slate-400">Char:</label>
              <input
                type="text"
                maxLength={1}
                value={testChar}
                onChange={(e) => setTestChar(e.target.value.toUpperCase())}
                className="w-10 h-10 text-center text-lg font-mono font-bold glass-input rounded-lg text-white"
              />
              <span className="text-indigo-400 font-mono text-xs">+3 →</span>
              <div className="w-10 h-10 flex items-center justify-center text-lg font-mono font-bold bg-indigo-600/20 border border-indigo-500/30 rounded-lg text-indigo-300">
                {encryptedChar}
              </div>
            </div>

            <div className="text-xs font-mono text-slate-400 flex justify-between pt-2 border-t border-white/[0.05]">
              <span>ASCII: {encryptedChar.charCodeAt(0)}</span>
              <span>Binary: {binaryCipher}</span>
            </div>
          </div>

        </div>
      </section>

      {/* STEP 2: PROTOCOL FRAMING & BINARY STREAMING */}
      <section className="glass-panel p-6 sm:p-8 rounded-2xl space-y-4">
        <div className="flex items-center space-x-3 text-cyan-400">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center font-mono font-bold text-sm">
            2
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Protocol Framing &amp; Binary Streaming</h2>
            <p className="text-xs text-slate-400 font-mono">32-Bit Big-Endian Length Prefix + 8-Bit Character Payload</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          How does the C extractor know the message length without reading past the end of the text? 
          SecretPixel embeds a <strong className="text-cyan-300">32-bit big-endian unsigned integer (uint32_t)</strong> 
          representing message length in the first 32 color channels:
        </p>

        {/* Wire Protocol Diagram */}
        <div className="p-4 bg-black/40 rounded-xl border border-white/[0.05] font-mono text-xs overflow-x-auto">
          <div className="min-w-[500px] flex items-stretch border border-white/[0.08] rounded-lg overflow-hidden text-center text-xs">
            <div className="w-2/5 bg-cyan-950/40 border-r border-cyan-500/20 p-3">
              <span className="text-cyan-300 font-bold block mb-1">32-Bit Length Prefix (4 Bytes)</span>
              <span className="text-[11px] text-slate-400 block">Channels 0 to 31 (Big-Endian)</span>
            </div>
            <div className="w-3/5 bg-indigo-950/30 p-3">
              <span className="text-indigo-300 font-bold block mb-1">Ciphertext Payload Bits (N × 8 Bits)</span>
              <span className="text-[11px] text-slate-400 block">Channels 32 to (32 + N*8 - 1)</span>
            </div>
          </div>
        </div>
      </section>

      {/* STEP 3: BMP 24-BIT ARCHITECTURE & ROW PADDING */}
      <section className="glass-panel p-6 sm:p-8 rounded-2xl space-y-4">
        <div className="flex items-center space-x-3 text-indigo-400">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-mono font-bold text-sm">
            3
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">BMP 24-Bit Image Structure &amp; 4-Byte Alignment</h2>
            <p className="text-xs text-slate-400 font-mono">Strict Scanline Padding Preservation</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          In Windows Bitmap files, each horizontal scanline must be aligned to a multiple of 4 bytes. 
          If the image width in bytes (<code className="text-xs text-indigo-300">width × 3</code>) is not divisible by 4, 
          1 to 3 padding bytes are appended to each row. 
          SecretPixel strictly skips padding bytes during bit embedding and extraction:
        </p>

        {/* Padding Calculator */}
        <div className="p-4 rounded-xl bg-black/40 border border-white/[0.05] space-y-3 font-mono text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
              Row Padding Live Formula Calculator
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-slate-400">Width:</span>
              <input
                type="number"
                min={1}
                max={4096}
                value={sampleWidth}
                onChange={(e) => setSampleWidth(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 glass-input px-2 py-0.5 rounded text-white text-center font-mono text-xs"
              />
              <span className="text-slate-400">px</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-2.5 rounded-lg bg-black/50 border border-white/[0.05]">
              <span className="text-slate-500 block mb-0.5">Color Bytes</span>
              <span className="text-sm font-bold text-slate-200">{sampleWidth} × 3 = {rawRowBytes} B</span>
            </div>
            <div className="p-2.5 rounded-lg bg-black/50 border border-white/[0.05]">
              <span className="text-slate-500 block mb-0.5">Padding</span>
              <span className="text-sm font-bold text-indigo-400">{paddingBytes} byte(s) / row</span>
            </div>
            <div className="p-2.5 rounded-lg bg-black/50 border border-white/[0.05]">
              <span className="text-slate-500 block mb-0.5">Total Row Stride</span>
              <span className="text-sm font-bold text-cyan-400">{totalRowStride} bytes in file</span>
            </div>
          </div>
        </div>
      </section>

      {/* STEP 4: SPATIAL LSB BIT-MASKING */}
      <section className="glass-panel p-6 sm:p-8 rounded-2xl space-y-4">
        <div className="flex items-center space-x-3 text-emerald-400">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-mono font-bold text-sm">
            4
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Spatial LSB Bit-Masking Mechanics</h2>
            <p className="text-xs text-slate-400 font-mono">Bitwise AND/OR Substitution</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          To embed a secret bit into an 8-bit color channel byte <code className="text-xs text-emerald-300 font-mono">C</code>, 
          the C core executes:
        </p>

        <div className="p-3 bg-black/50 rounded-xl border border-white/[0.06] font-mono text-xs text-emerald-400">
          channel_byte = (channel_byte &amp; 0xFE) | (secret_bit &amp; 0x01);
        </div>

        {/* Interactive Bit-Mask Simulator */}
        <div className="p-4 rounded-xl bg-black/40 border border-white/[0.05] space-y-3 font-mono text-xs">
          <span className="text-slate-300 font-semibold uppercase tracking-wider text-[11px] block">
            Interactive Bitwise Masking Sandbox
          </span>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
            
            <div className="space-y-1">
              <label className="text-slate-400">Original Byte (0-255):</label>
              <input
                type="range"
                min={0}
                max={255}
                value={sampleCoverByte}
                onChange={(e) => setSampleCoverByte(parseInt(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <div className="flex justify-between text-slate-300 text-[11px]">
                <span>Dec: {sampleCoverByte}</span>
                <span className="text-indigo-300">Bin: {sampleCoverByte.toString(2).padStart(8, '0')}</span>
              </div>
            </div>

            <div className="space-y-1 text-center">
              <label className="text-slate-400 block">Secret Bit:</label>
              <div className="inline-flex rounded-lg bg-black/60 p-0.5 border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setSampleSecretBit(0)}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    sampleSecretBit === 0 ? 'bg-cyan-600 text-white' : 'text-slate-400'
                  }`}
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => setSampleSecretBit(1)}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    sampleSecretBit === 1 ? 'bg-indigo-600 text-white' : 'text-slate-400'
                  }`}
                >
                  1
                </button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 space-y-0.5">
              <span className="text-emerald-400 font-semibold block text-[11px]">Stego Channel Byte:</span>
              <div className="text-sm font-bold text-white">
                Dec: {embeddedStegoByte} (Δ = {embeddedStegoByte - sampleCoverByte})
              </div>
              <div className="text-emerald-300 text-[11px]">
                Bin: {embeddedStegoByte.toString(2).padStart(8, '0')}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* STEP 5: PSNR & QUALITY METRICS */}
      <section className="glass-panel p-6 sm:p-8 rounded-2xl space-y-4">
        <div className="flex items-center space-x-3 text-amber-400">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-mono font-bold text-sm">
            5
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Visual Imperceptibility &amp; PSNR Analysis</h2>
            <p className="text-xs text-slate-400 font-mono">Mathematical Verification of Undetectability</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Because 1-bit LSB substitution alters a color channel intensity by at most <strong className="text-amber-300">±1</strong> 
          out of 255 levels (0.39%), human eyes cannot perceive the change. 
          SecretPixel mathematically verifies this fidelity via <strong className="text-amber-300">Mean Squared Error (MSE)</strong> 
          and <strong className="text-amber-300">Peak Signal-to-Noise Ratio (PSNR)</strong>:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-black/40 border border-white/[0.05] font-mono text-xs space-y-1.5">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px] block">MSE Equation</span>
            <div className="p-2.5 bg-black/50 rounded-lg text-slate-200">
              MSE = (1 / (3 × W × H)) × Σ (I(x,y,c) - I'(x,y,c))²
            </div>
            <p className="text-[10px] text-slate-500">
              Cumulative squared pixel error across all RGB channels.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-white/[0.05] font-mono text-xs space-y-1.5">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px] block">PSNR Equation</span>
            <div className="p-2.5 bg-black/50 rounded-lg text-emerald-400">
              PSNR = 10 × log10( 255² / MSE ) dB
            </div>
            <p className="text-[10px] text-slate-500">
              PSNR &gt; 40 dB is imperceptible to human sight. SecretPixel typically achieves <strong>60 to 80 dB</strong>.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="text-center py-4">
        <button
          onClick={() => setActiveTab('embed')}
          className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors inline-flex items-center space-x-2 shadow-sm"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Try It: Hide a Secret Message</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
}
