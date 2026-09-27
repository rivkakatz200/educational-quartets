import React, { useState } from 'react';
import { Sparkles, Volume2, VolumeX, HelpCircle, Copy, Check, LogOut, Radio } from 'lucide-react';
import { sounds } from '../utils/sound';

interface NavbarProps {
  roomCode?: string | null;
  playerName?: string;
  isHost?: boolean;
  isConnected?: boolean;
  onOpenRules: () => void;
  onLeaveRoom?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  roomCode,
  playerName,
  isHost,
  isConnected = true,
  onOpenRules,
  onLeaveRoom,
}) => {
  const [soundOn, setSoundOn] = useState(() => sounds.isEnabled());
  const [copied, setCopied] = useState(false);

  const toggleSound = () => {
    const next = sounds.toggle();
    setSoundOn(next);
  };

  const copyRoomCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="shrink-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-3 py-1.5 select-none">
      <div className="w-full flex items-center justify-between gap-3">
        {/* Logo and Title */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-md flex items-center justify-center">
            <div className="w-full h-full bg-slate-900 rounded-md flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-black text-base text-white tracking-tight">
                רביעיות <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400">לימודיות</span>
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.2 text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                זמן אמת
              </span>
            </div>
          </div>
        </div>

        {/* Center: Room Code Chip if active */}
        {roomCode && (
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-inner">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">קוד חדר:</span>
              <span className="font-mono font-bold text-sm tracking-wider text-amber-400">
                {roomCode}
              </span>
            </div>
            <button
              onClick={copyRoomCode}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              title="העתק קוד חדר"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Connection status dot */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
              isConnected
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-950/40 text-rose-300 border-rose-500/30'
            }`}
          >
            <Radio className={`w-3 h-3 ${isConnected ? 'animate-pulse text-emerald-400' : 'text-rose-400'}`} />
            <span>{isConnected ? 'מחובר לשרת' : 'מתחבר...'}</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className={`p-2 rounded-xl border transition-colors ${
              soundOn
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:text-white hover:bg-slate-750'
                : 'bg-slate-800/50 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
            title={soundOn ? 'השתק צלילים' : 'הפעל צלילים'}
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-indigo-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Rules Button */}
          <button
            onClick={onOpenRules}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white transition-colors text-xs font-medium"
            title="חוקי המשחק"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">איך משחקים?</span>
          </button>

          {/* Leave Room Button */}
          {roomCode && onLeaveRoom && (
            <button
              onClick={onLeaveRoom}
              className="p-2 rounded-xl bg-rose-950/30 hover:bg-rose-900/40 border border-rose-800/40 text-rose-300 transition-colors"
              title="עזוב חדר"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
