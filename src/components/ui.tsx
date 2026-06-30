import React from 'react';
import { cn } from '../utils';
import { useApp } from '../store';

export const Card = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("bg-[#1c1c1c] border border-white/5 rounded-3xl p-6", className)} {...props}>
    {children}
  </div>
);

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'white' }>(
  ({ className, variant = 'primary', ...props }, ref) => {
    const { state } = useApp();
    const isMonochrome = state?.settings?.theme === 'monochrome';
    
    const variants = {
      primary: isMonochrome 
        ? "bg-[#fafafa] text-[#090911] hover:bg-[#e4e4e7] font-semibold"
        : "bg-[#a3e635] text-[#090911] hover:bg-[#84cc16] font-semibold",
      secondary: "bg-[#1c1c1c] text-[#fafafa] hover:bg-[#2a2a2a] border border-white/5",
      danger: "bg-transparent border border-[#f43f5e]/30 text-[#f43f5e] hover:bg-[#f43f5e]/10",
      ghost: "bg-transparent text-[#717171] hover:text-[#fafafa] hover:bg-white/5",
      white: "bg-white text-[#090911] hover:bg-[#e4e4e7] font-semibold focus:ring-white/50"
    };
    
    return (
      <button 
        ref={ref}
        className={cn(
          "px-4 py-2 rounded-xl transition-all duration-200 ease-in-out flex items-center justify-center gap-2 outline-none focus:ring-2", 
          isMonochrome ? "focus:ring-white/50" : "focus:ring-[#a3e635]/50",
          variants[variant], 
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export const Switch = ({ checked, onChange }: { checked: boolean; onChange: (c: boolean) => void }) => {
  const { state } = useApp();
  const isMonochrome = state?.settings?.theme === 'monochrome';
  
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2",
        isMonochrome ? "focus:ring-white/50" : "focus:ring-[#a3e635]/50",
        checked 
          ? (isMonochrome ? "bg-[#fafafa]" : "bg-[#a3e635]") 
          : "bg-white/10"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
};

