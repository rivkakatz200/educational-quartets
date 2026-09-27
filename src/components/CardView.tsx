import React from 'react';
import { Card } from '../types/game';
import { BookOpen, Star, Sparkles } from 'lucide-react';

interface CardViewProps {
  card: Card;
  isFaceDown?: boolean;
  isHighlighted?: boolean;
  onClick?: () => void;
  className?: string;
  size?: 'xs' | 'sm' | 'compact' | 'md' | 'lg';
}

const colorThemeMap: Record<
  string,
  { bg: string; border: string; text: string; badge: string; accent: string; headerBg: string }
> = {
  blue: {
    bg: 'from-blue-950/90 to-slate-900',
    border: 'border-blue-500/50 hover:border-blue-400',
    text: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    accent: 'border-blue-500 bg-blue-500/15 text-blue-200',
    headerBg: 'bg-blue-950/70',
  },
  emerald: {
    bg: 'from-emerald-950/90 to-slate-900',
    border: 'border-emerald-500/50 hover:border-emerald-400',
    text: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    accent: 'border-emerald-500 bg-emerald-500/15 text-emerald-200',
    headerBg: 'bg-emerald-950/70',
  },
  amber: {
    bg: 'from-amber-950/90 to-slate-900',
    border: 'border-amber-500/50 hover:border-amber-400',
    text: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    accent: 'border-amber-500 bg-amber-500/15 text-amber-200',
    headerBg: 'bg-amber-950/70',
  },
  purple: {
    bg: 'from-purple-950/90 to-slate-900',
    border: 'border-purple-500/50 hover:border-purple-400',
    text: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    accent: 'border-purple-500 bg-purple-500/15 text-purple-200',
    headerBg: 'bg-purple-950/70',
  },
  rose: {
    bg: 'from-rose-950/90 to-slate-900',
    border: 'border-rose-500/50 hover:border-rose-400',
    text: 'text-rose-400',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    accent: 'border-rose-500 bg-rose-500/15 text-rose-200',
    headerBg: 'bg-rose-950/70',
  },
  cyan: {
    bg: 'from-cyan-950/90 to-slate-900',
    border: 'border-cyan-500/50 hover:border-cyan-400',
    text: 'text-cyan-400',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    accent: 'border-cyan-500 bg-cyan-500/15 text-cyan-200',
    headerBg: 'bg-cyan-950/70',
  },
  indigo: {
    bg: 'from-indigo-950/90 to-slate-900',
    border: 'border-indigo-500/50 hover:border-indigo-400',
    text: 'text-indigo-400',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    accent: 'border-indigo-500 bg-indigo-500/15 text-indigo-200',
    headerBg: 'bg-indigo-950/70',
  },
  orange: {
    bg: 'from-orange-950/90 to-slate-900',
    border: 'border-orange-500/50 hover:border-orange-400',
    text: 'text-orange-400',
    badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    accent: 'border-orange-500 bg-orange-500/15 text-orange-200',
    headerBg: 'bg-orange-950/70',
  },
};

export const CardView: React.FC<CardViewProps> = ({
  card,
  isFaceDown = false,
  isHighlighted = false,
  onClick,
  className = '',
  size = 'compact',
}) => {
  // Face down card rendering
  if (isFaceDown) {
    const isTiny = size === 'xs';
    const isSm = size === 'sm';
    return (
      <div
        onClick={onClick}
        className={`relative select-none rounded-xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 border border-indigo-500/40 shadow-lg transition-transform duration-200 shrink-0 ${
          onClick ? 'cursor-pointer hover:-translate-y-1 hover:border-indigo-400' : ''
        } ${className}`}
        style={{
          width: isTiny ? '42px' : isSm ? '56px' : '72px',
          height: isTiny ? '60px' : isSm ? '80px' : '100px',
        }}
      >
        <div className="absolute inset-1 rounded-lg border border-indigo-400/30 flex flex-col items-center justify-center p-0.5 bg-[radial-gradient(#4338ca_1px,transparent_1px)] [background-size:6px_6px]">
          <div className="w-5 h-5 rounded-md bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center shadow-inner">
            <span className="text-indigo-300 font-black text-[10px] font-mono">ר</span>
          </div>
        </div>
      </div>
    );
  }

  // Face up card rendering
  const theme = colorThemeMap[card.themeColor] || colorThemeMap.blue;
  const isCompact = size === 'compact';

  return (
    <div
      onClick={onClick}
      dir="rtl"
      className={`relative select-none flex flex-col justify-between rounded-xl bg-gradient-to-b ${theme.bg} border ${
        isHighlighted ? 'border-amber-400 shadow-amber-500/30 ring-2 ring-amber-400' : theme.border
      } shadow-md transition-all duration-200 shrink-0 ${
        onClick ? 'cursor-pointer hover:-translate-y-1.5 hover:shadow-xl hover:z-20' : ''
      } ${className}`}
      style={{
        width: isCompact ? '136px' : size === 'sm' ? '125px' : size === 'lg' ? '220px' : '160px',
        height: isCompact ? '176px' : size === 'sm' ? '155px' : size === 'lg' ? '290px' : '220px',
      }}
    >
      {/* Top Header: Series / Category */}
      <div className={`px-2 py-1.5 border-b border-slate-700/60 ${theme.headerBg} rounded-t-xl shrink-0`}>
        <div className="flex items-center justify-between gap-1">
          <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border ${theme.badge} truncate max-w-[85px]`}>
            {card.groupTitle}
          </span>
          <span className="text-[9px] font-bold text-slate-400 shrink-0">
            רביעייה
          </span>
        </div>

        {/* Card Main Title */}
        <h3 className="font-extrabold text-white text-xs leading-tight line-clamp-1 mt-1">
          {card.name}
        </h3>
      </div>

      {/* Center: List of all 4 cards in this quartet */}
      <div className="px-2 py-1 flex-1 flex flex-col justify-center space-y-0.5 bg-slate-900/30 min-h-0 overflow-hidden">
        {card.allGroupCardNames.map((name, idx) => {
          const isCurrent = name === card.name;
          return (
            <div
              key={idx}
              className={`flex items-center justify-between px-1.5 py-0.5 rounded text-[10px] leading-tight transition-colors ${
                isCurrent
                  ? `border ${theme.accent} font-black shadow-xs`
                  : 'text-slate-400 bg-slate-800/30'
              }`}
            >
              <span className="truncate max-w-[95px]">{name}</span>
              {isCurrent ? (
                <Star className="w-2.5 h-2.5 fill-current text-amber-400 shrink-0" />
              ) : (
                <span className="text-[8px] text-slate-500 shrink-0 font-mono">○</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom: Study Note / Explanation Fact */}
      <div className="px-2 py-1 border-t border-slate-700/60 bg-slate-900/60 rounded-b-xl shrink-0">
        <div className="flex items-start gap-1">
          <BookOpen className={`w-2.5 h-2.5 ${theme.text} shrink-0 mt-0.5`} />
          <p className="text-[9px] text-slate-300 leading-tight line-clamp-2" title={card.description}>
            {card.description}
          </p>
        </div>
      </div>
    </div>
  );
};
