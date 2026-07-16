/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { FocusScreen } from './components/FocusScreen';
import { StatsScreen } from './components/StatsScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { PlansScreen } from './components/PlansScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { AchievementNotifier } from './components/AchievementNotifier';
import { RusanEasterEgg } from './components/RusanEasterEgg';
import { useApp } from './store';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const { state, isFullscreen, setIsFullscreen } = useApp();
  const isMonochrome = state.settings.theme === 'monochrome';

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [setIsFullscreen]);

  return (
    <div className={`flex flex-col md:flex-row h-screen w-full bg-[#090909] text-[#fafafa] overflow-hidden font-sans ${isMonochrome ? 'selection:bg-white selection:text-[#090909]' : 'selection:bg-[#a3e635] selection:text-[#090909]'}`}>
      <AchievementNotifier />
      <RusanEasterEgg />
      <Sidebar />
      <main className={`flex-1 flex flex-col h-full overflow-hidden bg-[#090909] transition-all duration-300 ${isFullscreen ? 'pb-0' : 'pb-16'} md:pb-0`}>
        <AnimatePresence mode="wait">
          {state.activeTab === 'focus' && (
            <motion.div
              key="focus"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: [0.215, 0.61, 0.355, 1] }}
              className="flex-1 flex flex-col h-full overflow-hidden"
            >
              <FocusScreen />
            </motion.div>
          )}
          {state.activeTab === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: [0.215, 0.61, 0.355, 1] }}
              className="flex-1 flex flex-col h-full overflow-hidden"
            >
              <StatsScreen />
            </motion.div>
          )}
          {state.activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: [0.215, 0.61, 0.355, 1] }}
              className="flex-1 flex flex-col h-full overflow-hidden"
            >
              <HistoryScreen />
            </motion.div>
          )}
          {state.activeTab === 'plans' && (
            <motion.div
              key="plans"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: [0.215, 0.61, 0.355, 1] }}
              className="flex-1 flex flex-col h-full overflow-hidden"
            >
              <PlansScreen />
            </motion.div>
          )}
          {state.activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: [0.215, 0.61, 0.355, 1] }}
              className="flex-1 flex flex-col h-full overflow-hidden"
            >
              <SettingsScreen />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
