import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getApiUrl } from './config';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LandingPage from './components/LandingPage';
import DashboardPage from './components/DashboardPage';
import HideMessagePage from './components/HideMessagePage';
import ExtractMessagePage from './components/ExtractMessagePage';
import HowItWorksPage from './components/HowItWorksPage';

export default function App() {
  const [activeTab, setActiveTab] = useState('landing');
  const [backendStatus, setBackendStatus] = useState('checking');
  const [sharedStegoFile, setSharedStegoFile] = useState(null);
  const [operations, setOperations] = useState(() => {
    try {
      const saved = localStorage.getItem('secretpixel_operations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Poll backend health status
  const checkHealth = async () => {
    try {
      const res = await fetch(getApiUrl('/api/health'));
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'healthy' && data.c_backend?.executable_operational) {
          setBackendStatus('healthy');
          return;
        }
      }
      setBackendStatus('degraded');
    } catch {
      setBackendStatus('offline');
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 8000);
    return () => clearInterval(interval);
  }, []);

  // Record an operation in session memory
  const handleOperationComplete = (newOp) => {
    setOperations((prev) => {
      const updated = [newOp, ...prev].slice(0, 50); // Keep last 50
      try {
        localStorage.setItem('secretpixel_operations', JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to cache operation:', err);
      }
      return updated;
    });
  };

  const clearOperations = () => {
    setOperations([]);
    try {
      localStorage.removeItem('secretpixel_operations');
    } catch {}
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation Header */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        backendStatus={backendStatus} 
      />

      {/* Main Content Area */}
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          {activeTab === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <LandingPage setActiveTab={setActiveTab} />
            </motion.div>
          )}

          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <DashboardPage 
                setActiveTab={setActiveTab} 
                operations={operations}
                clearOperations={clearOperations}
                backendStatus={backendStatus}
              />
            </motion.div>
          )}

          {activeTab === 'embed' && (
            <motion.div
              key="embed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <HideMessagePage 
                onOperationComplete={handleOperationComplete}
                setActiveTab={setActiveTab}
                setSharedStegoFile={setSharedStegoFile}
              />
            </motion.div>
          )}

          {activeTab === 'extract' && (
            <motion.div
              key="extract"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <ExtractMessagePage 
                onOperationComplete={handleOperationComplete}
                setActiveTab={setActiveTab}
                sharedStegoFile={sharedStegoFile}
              />
            </motion.div>
          )}

          {activeTab === 'how-it-works' && (
            <motion.div
              key="how-it-works"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <HowItWorksPage setActiveTab={setActiveTab} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <Footer setActiveTab={setActiveTab} />
    </div>
  );
}
