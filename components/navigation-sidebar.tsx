'use client';

import React, { useState } from 'react';
import { Briefcase, BookOpen, Settings, ChevronLeft, ChevronRight } from 'lucide-react';

type NavOption = 'cases' | 'dictionary' | 'settings';

interface NavigationSidebarProps {
  selectedOption: NavOption;
  onSelectOption: (option: NavOption) => void;
  children: React.ReactNode;
}

export function NavigationSidebar({ selectedOption, onSelectOption, children }: NavigationSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const navItems: { id: NavOption; icon: typeof Briefcase; label: string }[] = [
    { id: 'cases', icon: Briefcase, label: 'Cases' },
    { id: 'dictionary', icon: BookOpen, label: 'Dictionary' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <>
      {/* Collapsible Navigation Bar */}
      <aside
        className={`
          bg-oxford border-r border-oxford/20 flex flex-col shrink-0 z-30 transition-all duration-300
          ${isExpanded ? 'w-16' : 'w-16'}
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-oxford/20 shrink-0">
          <span className="font-serif text-xl font-bold text-gold tracking-tight">R</span>
        </div>

        {/* Navigation Icons */}
        <nav className="flex-1 flex flex-col items-center py-4 gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = selectedOption === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectOption(item.id)}
                className={`
                  w-12 h-12 rounded-lg flex items-center justify-center transition-all group relative
                  ${isActive
                    ? 'bg-gold text-oxford shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-oxford/50'
                  }
                `}
                title={item.label}
              >
                <Icon className="h-5 w-5" />

                {/* Tooltip */}
                <div className="absolute left-full ml-2 px-2 py-1 bg-oxford text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity border border-oxford/20">
                  {item.label}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Expand/Collapse Toggle */}
        <div className="p-2 border-t border-oxford/20">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-12 h-12 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-oxford/50 transition-all"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </button>
        </div>
      </aside>

      {/* Expanded Panel */}
      {isExpanded && (
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 z-20 shadow-lg">
          {children}
        </aside>
      )}
    </>
  );
}
