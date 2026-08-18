import React, { useState, useEffect } from 'react';
import { Target, BarChart2, History, ListTodo, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../store';
import { cn } from '../utils';
import { motion } from 'motion/react';

export function Sidebar() {
  const { state, setTab, isFullscreen } = useApp();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });
  const [logoClicks, setLogoClicks] = useState<number[]>([]);

  const handleLogoClick = () => {
    const now = Date.now();
    const newClicks = [...logoClicks.filter(t => now - t < 1000), now];
    setLogoClicks(newClicks);
    if (newClicks.length >= 3) {
      window.dispatchEvent(new CustomEvent('trigger-rusan-easter-egg'));
      setLogoClicks([]);
    }
  };

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed]);
  
  const navItems = [
    { id: 'focus', icon: Target, label: 'Фокус' },
    { id: 'stats', icon: BarChart2, label: 'Статистика' },
    { id: 'history', icon: History, label: 'История' },
    { id: 'plans', icon: ListTodo, label: 'Планы' },
    { id: 'settings', icon: Settings, label: 'Настройки' },
  ] as const;

  const handleNavClick = (id: string) => {
    setTab(id);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden md:flex bg-[#111112] border-r border-white/5 flex-col p-6 h-full flex-shrink-0 transition-all duration-300 relative select-none",
        isCollapsed ? "w-20 items-center px-4" : "w-64"
      )}>
        <div className={cn("flex items-center mb-12 text-[#fafafa] w-full", isCollapsed ? "flex-col gap-4 justify-center" : "justify-between")}>
          {isCollapsed ? (
            <img 
              src="/icon.png" 
              className="w-6 h-6 rounded-md object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity" 
              alt="Logo" 
              referrerPolicy="no-referrer" 
              onClick={handleLogoClick}
            />
          ) : (
            <div 
              onClick={handleLogoClick}
              className="flex items-center gap-3 whitespace-nowrap overflow-hidden flex-shrink-0 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <img 
                src="/icon.png" 
                className="w-6 h-6 rounded-md object-cover flex-shrink-0" 
                alt="Logo" 
                referrerPolicy="no-referrer" 
              />
              <span className="text-xl font-bold tracking-tight uppercase whitespace-nowrap flex-shrink-0">Ege Boss</span>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-[#717171] hover:text-[#fafafa] transition-colors p-1 focus:outline-none outline-none select-none"
            aria-label="Toggle Sidebar"
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        <nav className="flex-1 space-y-2 w-full">
          {navItems.map((item) => {
            const isActive = state.activeTab === item.id;
            const Icon = item.icon;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  "w-full flex items-center p-3 rounded-xl transition-all text-sm relative group text-left focus:outline-none outline-none select-none",
                  isCollapsed ? "justify-center" : "gap-3",
                  isActive ? "text-[#fafafa]" : "text-[#717171] hover:text-[#fafafa]"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                {isActive && (
                  <motion.div 
                    layoutId="active-nav-bg-desktop"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="absolute inset-0 bg-white/5 rounded-xl"
                  />
                )}
                {isActive && (
                  <motion.div 
                    layoutId="active-nav-indicator-desktop"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="absolute left-0 w-1 h-4 bg-white rounded-full z-10"
                  />
                )}
                <Icon size={20} className={cn("relative z-10", isActive ? "text-[#fafafa]" : "text-[#717171] group-hover:text-[#fafafa]")} />
                {!isCollapsed && <span className="font-medium relative z-10">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className={cn(
        "flex md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#111112] border-t border-white/5 z-50 justify-around items-center px-4 transition-all duration-300",
        isFullscreen && "translate-y-full opacity-0 pointer-events-none"
      )}>
        {navItems.map((item) => {
          const isActive = state.activeTab === item.id;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-xl transition-all relative",
                isActive ? "text-[#fafafa]" : "text-[#717171]"
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="active-nav-indicator-mobile"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="absolute -top-1 w-5 h-1 bg-white rounded-full"
                />
              )}
              <Icon size={22} className={isActive ? "text-[#fafafa]" : "text-[#717171]"} />
            </button>
          );
        })}
      </div>
    </>
  );
}
