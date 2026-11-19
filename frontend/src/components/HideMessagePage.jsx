import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getApiUrl } from '../config';
import { 
  Upload, FileImage, Lock, Download, CheckCircle2, AlertCircle, 
  RefreshCw, Copy, Check, BarChart2, Shield, Eye, ArrowRight, Sparkles 
} from 'lucide-react';

export default function HideMessagePage({ onOperationComplete, setActiveTab, setSharedStegoFile }) {
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageMetadata, setImageMetadata] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copiedCipher, setCopiedCipher] = useState(false);

  const fileInputRef = useRef(null);

  // Real-time Caesar shift 3 calculation for preview
  const computeCaesarPreview = (text) => {
    return text.split('').map(char => {
      if (/[A-Z]/.test(char)) {
        return String.fromCharCode(((char.charCodeAt(0) - 65 + 3) % 26) + 65);
      }
      if (/[a-z]/.test(char)) {
        return String.fromCharCode(((char.charCodeAt(0) - 97 + 3) % 26) + 97);
      }
      return char;
    }).join('');
  };

  const caesarPreview = computeCaesarPreview(message);

  // Handle Image File Selection
  const handleFileSelect = async (selectedFile) => {
    if (!selectedFile) return;

    setError(null);
    setResult(null);

    // Validate BMP extension
    if (!selectedFile.name.toLowerCase().endsWith('.bmp')) {
      setError('Invalid file format. Please upload a 24-bit uncompressed Windows BMP (.bmp) image.');
      return;
    }

    setFile(selectedFile);
    setImagePreview(URL.createObjectURL(selectedFile));

    // Call /api/info to inspect image capacity and metadata
    setInspecting(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await fetch(getApiUrl('/api/info'), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to inspect BMP image properties.');
      }

      const info = await response.json();
      setImageMetadata(info);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setInspecting(false);
    }
  };

  // Helper: Load built-in sample BMP with 1 click
  const loadSampleImage = async () => {
    try {
      setInspecting(true);
      setError(null);
      const res = await fetch('/samples/cyber_gradient_256.bmp');
      const blob = await res.blob();
      const sampleFile = new File([blob], 'cyber_gradient_256.bmp', { type: 'image/bmp' });
      await handleFileSelect(sampleFile);
    } catch (err) {
      setError('Failed to load sample image.');
    } finally {
      setInspecting(false);
    }
  };

  // Drag-and-drop handlers
  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Execute Embed via API Gateway
  const handleEmbed = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please upload a cover BMP image first.');
      return;
    }
    if (!message.trim()) {
      setError('Please enter a secret message to hide.');
      return;
    }

    const maxCapacity = imageMetadata ? imageMetadata.max_capacity_bytes : 0;
    if (maxCapacity > 0 && message.length > maxCapacity) {
      setError(`Message length (${message.length} bytes) exceeds maximum capacity (${maxCapacity} bytes) of this image.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('message', message);

      const response = await fetch(getApiUrl('/api/embed'), {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Embedding failed in C core.');
      }

      setResult(data);

      // Record in session operations log
      if (onOperationComplete) {
        onOperationComplete({
          type: 'EMBED',
          imageName: file.name,
          msgLength: message.length,
          psnr: data.metrics ? data.metrics.psnr_db : 0,
          preview: `"${message.slice(0, 35)}${message.length > 35 ? '...' : ''}"`,
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

  // Send generated stego image to Extract tab
  const handleSendToExtract = async () => {
    if (!result?.stego_image_data_uri) return;
    try {
      const res = await fetch(result.stego_image_data_uri);
      const blob = await res.blob();
      const stegoFile = new File([blob], result.download?.filename || 'stego.bmp', { type: 'image/bmp' });
      if (setSharedStegoFile) {
        setSharedStegoFile(stegoFile);
      }
      setActiveTab('extract');
    } catch (err) {
      console.error('Failed to transfer stego image:', err);
      setActiveTab('extract');
    }
  };

  // Capacity calculations
  const maxCapacity = imageMetadata ? imageMetadata.max_capacity_bytes : 0;
  const capacityUsedPercent = maxCapacity > 0 ? Math.min(100, (message.length / maxCapacity) * 100) : 0;
  const capacityRemaining = Math.max(0, maxCapacity - message.length);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Title */}
      <div>
        <div className="flex items-center space-x-2 text-xs font-mono text-indigo-400 uppercase tracking-wider mb-1">
          <Lock className="w-3.5 h-3.5" />
          <span>Steganographic Embedding Pipeline</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Hide Secret Message
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Conceal Caesar-encrypted plaintext into the LSBs of a 24-bit uncompressed BMP image.
        </p>
      </div>

      {/* Main Form & Upload Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Image Upload (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
                Cover BMP Image
              </h3>
              <button
                type="button"
                onClick={loadSampleImage}
                className="text-[11px] font-mono text-indigo-400 hover:text-indigo-300 transition-colors flex items-center space-x-1"
              >
                <span>Load Sample (256×256)</span>
              </button>
            </div>

            {/* Dropzone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                imagePreview 
                  ? 'border-indigo-500/40 bg-indigo-950/10' 
                  : 'border-white/[0.1] hover:border-indigo-500/40 bg-black/30 hover:bg-white/[0.02]'
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
                  <div className="relative mx-auto max-h-48 overflow-hidden rounded-lg border border-white/[0.08] bg-black/50 flex items-center justify-center">
                    <img 
                      src={imagePreview} 
                      alt="Cover Preview" 
                      className="max-h-48 max-w-full object-contain"
                    />
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono truncate">
                    {file?.name} ({(file?.size / 1024).toFixed(1)} KB)
                  </div>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                  >
                    Change Image
                  </button>
                </div>
              ) : (
                <div className="py-6 space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">
                      Click to upload or drag &amp; drop
                    </span>
                    <span className="text-[11px] text-slate-400">
                      24-bit uncompressed BMP (.bmp)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Image Metadata Box */}
            {inspecting && (
              <div className="flex items-center space-x-2 text-xs text-cyan-400 font-mono py-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Parsing BMP scanlines...</span>
              </div>
            )}

            {imageMetadata && (
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.05] space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Dimensions:</span>
                  <span className="text-slate-200">{imageMetadata.width} × {imageMetadata.height} px</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Row Stride:</span>
                  <span className="text-slate-200">{imageMetadata.row_stride} bytes</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Padding:</span>
                  <span className="text-slate-200">{imageMetadata.padding_per_row} byte(s)</span>
                </div>
                <div className="flex justify-between text-slate-400 pt-1.5 border-t border-white/[0.05]">
                  <span>Max Capacity:</span>
                  <span className="text-cyan-400 font-bold">{imageMetadata.max_capacity_bytes.toLocaleString()} bytes</span>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Right Column: Message Input (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          <form onSubmit={handleEmbed} className="glass-panel p-6 rounded-2xl space-y-4">
            
            <div className="flex items-center justify-between">
              <label htmlFor="secret-message" className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
                Secret Plaintext Message
              </label>
              <span className="text-[11px] font-mono text-slate-400">
                {message.length} characters
              </span>
            </div>

            <textarea
              id="secret-message"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your secret message here (e.g., Confidential credentials or coordinates)..."
              className="w-full glass-input rounded-xl p-3.5 text-xs font-mono placeholder:text-slate-500 resize-none"
            />

            {/* Capacity Gauge */}
            {imageMetadata && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Payload Usage:</span>
                  <span className={`font-semibold ${
                    capacityUsedPercent > 90 ? 'text-rose-400' : capacityUsedPercent > 50 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {capacityUsedPercent.toFixed(1)}% ({capacityRemaining.toLocaleString()} bytes left)
                  </span>
                </div>
                
                <div className="w-full h-1.5 rounded-full bg-black/60 overflow-hidden border border-white/[0.05]">
                  <div 
                    className={`h-full transition-all duration-200 ${
                      capacityUsedPercent > 90 
                        ? 'bg-rose-500' 
                        : capacityUsedPercent > 50 
                        ? 'bg-amber-400' 
                        : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.max(2, capacityUsedPercent)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Caesar Cipher Preview */}
            {message.length > 0 && (
              <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-indigo-300">
                  <span className="font-semibold">Caesar Shift Preview (+3):</span>
                  <span className="text-[10px] text-slate-500">Embedded in LSBs</span>
                </div>
                <div className="p-2.5 bg-black/40 rounded-lg font-mono text-xs text-indigo-200 break-all select-all border border-white/[0.05]">
                  {caesarPreview}
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !file || !message.trim()}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing in C Core...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Conceal Message in BMP</span>
                </>
              )}
            </button>

          </form>

        </div>

      </div>

      {/* RESULT SECTION */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-panel p-6 sm:p-7 rounded-2xl space-y-6 border border-emerald-500/30"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Stego-Image Generated</h3>
                  <p className="text-xs text-slate-400">Message successfully embedded with shift 3</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleSendToExtract}
                  className="px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono text-slate-200 transition-colors flex items-center space-x-1.5"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Test Extract</span>
                </button>

                <a
                  href={result.stego_image_data_uri || (result.download ? getApiUrl(result.download.download_url) : '#')}
                  download={result.download ? result.download.filename : 'stego.bmp'}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors flex items-center space-x-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download BMP</span>
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              
              <div className="md:col-span-5 text-center space-y-2">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                  Generated Stego Image
                </span>
                <div className="p-2 bg-black/50 rounded-xl border border-emerald-500/20 inline-block max-w-full">
                  <img 
                    src={result.stego_image_data_uri} 
                    alt="Stego Result" 
                    className="max-h-52 rounded-lg mx-auto object-contain"
                  />
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  {result.image.width} × {result.image.height} px
                </div>
              </div>

              <div className="md:col-span-7 space-y-3">
                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.05]">
                    <span className="text-slate-500 block mb-0.5">PSNR (Fidelity)</span>
                    <span className="text-xl font-bold text-emerald-400">
                      {result.metrics.psnr_db.toFixed(2)} dB
                    </span>
                    <span className="text-[10px] text-emerald-300 block mt-0.5">
                      Imperceptible (&gt; 50 dB)
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.05]">
                    <span className="text-slate-500 block mb-0.5">Mean Squared Error</span>
                    <span className="text-xl font-bold text-cyan-400">
                      {result.metrics.mse.toFixed(6)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Zero visual distortion
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.05]">
                    <span className="text-slate-500 block mb-0.5">Modified Channels</span>
                    <span className="text-base font-bold text-slate-200">
                      {result.metrics.modified_color_channels.toLocaleString()} bits
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.05]">
                    <span className="text-slate-500 block mb-0.5">Caesar Shift Key</span>
                    <span className="text-base font-bold text-indigo-300">
                      +{result.crypto.shift_key} (mod 26)
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20 space-y-1 text-xs font-mono">
                  <div className="flex items-center justify-between text-indigo-300">
                    <span>Ciphertext in LSBs:</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(result.crypto.ciphertext);
                        setCopiedCipher(true);
                        setTimeout(() => setCopiedCipher(false), 2000);
                      }}
                      className="text-indigo-400 hover:text-indigo-300 transition-colors flex items-center space-x-1 text-[11px]"
                    >
                      {copiedCipher ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCipher ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="p-2 bg-black/40 rounded-lg text-indigo-200 break-all select-all text-[11px]">
                    {result.crypto.ciphertext}
                  </div>
                </div>

              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
