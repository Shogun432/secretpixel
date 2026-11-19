import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getApiUrl } from '../config';
import { 
  Upload, Eye, Copy, Check, CheckCircle2, AlertCircle, 
  RefreshCw, Terminal, Lock, Key, ArrowRight 
} from 'lucide-react';

export default function ExtractMessagePage({ onOperationComplete, setActiveTab, sharedStegoFile }) {
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef(null);

  // If a stego image was shared from HideMessagePage, auto-populate it!
  useEffect(() => {
    if (sharedStegoFile) {
      handleFileSelect(sharedStegoFile);
    }
  }, [sharedStegoFile]);

  // Handle File Selection
  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;

    setError(null);
    setResult(null);

    if (!selectedFile.name.toLowerCase().endsWith('.bmp')) {
      setError('Invalid file format. Please upload a 24-bit uncompressed Windows BMP (.bmp) stego-image.');
      return;
    }

    setFile(selectedFile);
    setImagePreview(URL.createObjectURL(selectedFile));
  };

  // Helper: Load pre-embedded stego demo
  const loadStegoDemo = async () => {
    try {
      setError(null);
      const res = await fetch('/samples/stego_demo_cyber_256.bmp');
      const blob = await res.blob();
      const demoFile = new File([blob], 'stego_demo_cyber_256.bmp', { type: 'image/bmp' });
      handleFileSelect(demoFile);
    } catch (err) {
      setError('Failed to load demo stego image.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Execute Extract via API Gateway
  const handleExtract = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please upload a stego BMP image first.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(getApiUrl('/api/extract'), {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to extract hidden message. Image may not contain a valid steganographic payload.');
      }

      setResult(data);

      // Record in session operations log
      if (onOperationComplete) {
        onOperationComplete({
          type: 'EXTRACT',
          imageName: file.name,
          msgLength: data.extracted_length || 0,
          psnr: null,
          preview: `"${data.decrypted_plaintext.slice(0, 35)}${data.decrypted_plaintext.length > 35 ? '...' : ''}"`,
          time: new Date().toLocaleTimeString(),
        });
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!result?.decrypted_plaintext) return;
    navigator.clipboard.writeText(result.decrypted_plaintext);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Title */}
      <div>
        <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1">
          <Eye className="w-3.5 h-3.5" />
          <span>Steganographic Extraction &amp; Decryption</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Extract Secret Message
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Recover the hidden 32-bit length prefix, extract LSB-encoded ciphertext, and reverse the Caesar Cipher ($k=-3$).
        </p>
      </div>

      {/* Upload and Extract Card */}
      <form onSubmit={handleExtract} className="glass-panel p-6 sm:p-7 rounded-2xl space-y-5">
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
              Stego BMP Image
            </label>
            <button
              type="button"
              onClick={loadStegoDemo}
              className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Load Embedded Demo Image
            </button>
          </div>

          {/* Dropzone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className={`border border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              imagePreview 
                ? 'border-cyan-500/40 bg-cyan-950/10' 
                : 'border-white/[0.1] hover:border-cyan-500/40 bg-black/30 hover:bg-white/[0.02]'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={(e) => handleFileSelect(e.target.files[0])}
              accept=".bmp"
              className="hidden" 
            />

            {imagePreview ? (
              <div className="space-y-3">
                <div className="relative mx-auto max-h-52 overflow-hidden rounded-lg border border-white/[0.08] bg-black/50 flex items-center justify-center">
                  <img 
                    src={imagePreview} 
                    alt="Stego Preview" 
                    className="max-h-52 max-w-full object-contain"
                  />
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {file?.name} ({(file?.size / 1024).toFixed(1)} KB)
                </div>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                >
                  Choose Different Image
                </button>
              </div>
            ) : (
              <div className="py-6 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-cyan-400">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Click to upload or drag &amp; drop stego-image
                  </span>
                  <span className="text-[11px] text-slate-400">
                    24-bit Windows BMP (.bmp)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Action Button */}
        <button
          type="submit"
          disabled={loading || !file}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Scanning LSB Bit Stream in C Core...</span>
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              <span>Extract &amp; Decrypt Secret Message</span>
            </>
          )}
        </button>

      </form>

      {/* RECOVERED MESSAGE RESULT */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-panel p-6 sm:p-7 rounded-2xl space-y-5 border border-emerald-500/30"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Secret Message Recovered</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Extracted {result.extracted_length} bytes • Caesar Shift: -3
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={copyToClipboard}
                className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono text-slate-200 transition-colors flex items-center space-x-1.5"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Revealed Plaintext Box */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                Decrypted Plaintext Message
              </span>
              <div className="p-4 bg-black/50 rounded-xl border border-emerald-500/20 text-emerald-300 font-mono text-sm leading-relaxed select-all whitespace-pre-wrap break-words">
                {result.decrypted_plaintext}
              </div>
            </div>

            {/* Cryptographic Trace Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
              <div className="p-3 rounded-lg bg-black/40 border border-white/[0.05]">
                <span className="text-slate-500 block mb-0.5">Payload Size</span>
                <span className="text-white font-bold">{result.extracted_length} bytes</span>
              </div>
              <div className="p-3 rounded-lg bg-black/40 border border-white/[0.05]">
                <span className="text-slate-500 block mb-0.5">Applied Decryption</span>
                <span className="text-cyan-400 font-bold">Shift: {result.caesar_shift_applied} (mod 26)</span>
              </div>
              <div className="p-3 rounded-lg bg-black/40 border border-white/[0.05]">
                <span className="text-slate-500 block mb-0.5">Extracted Ciphertext</span>
                <span className="text-indigo-300 truncate block">{result.ciphertext}</span>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
