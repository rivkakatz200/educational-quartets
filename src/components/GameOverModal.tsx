import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, BookOpen, Layers, Star, CheckCircle, Award } from 'lucide-react';
import { QuartetGroup, PlayerPublic } from '../types/game';
import { sounds } from '../utils/sound';

interface GameOverModalProps {
  isOpen: boolean;
  winnerId: string | null;
  self: PlayerPublic;
  opponent: PlayerPublic | null;
  allQuartets: QuartetGroup[];
  isHost: boolean;
  onRestart: () => void;
  onExit: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  winnerId,
  self,
  opponent,
  allQuartets,
  isHost,
  onRestart,
  onExit,
}) => {
  useEffect(() => {
    if (isOpen) {
      sounds.playVictory();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isMeWinner = winnerId === self.id;
  const isTie = winnerId === 'tie';
  const myScore = self.completedQuartets.length;
  const oppScore = opponent?.completedQuartets.length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div
        dir="rtl"
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Top Trophy Banner */}
        <div className="text-center p-6 bg-gradient-to-b from-indigo-950/80 via-slate-900 to-slate-900 border-b border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400 text-amber-400 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/20 mb-3 animate-bounce">
            <Trophy className="w-8 h-8 fill-current" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white">
            {isTie ? 'תיקו מרתק!' : isMeWinner ? 'ניצחת במשחק! 🎉' : `${opponent?.name || 'היריב'} ניצח!`}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {isTie
              ? `שני השחקנים סיימו עם ${myScore} רביעיות כל אחד`
              : isMeWinner
              ? `צברת ${myScore} רביעיות מול ${oppScore} של היריב. כל הכבוד!`
              : `היריב צבר ${oppScore} רביעיות מול ${myScore} שלך. משחק נהדר!`}
          </p>

          {/* Scores summary */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <div
              className={`px-5 py-3 rounded-2xl border ${
                isMeWinner
                  ? 'bg-amber-950/40 border-amber-400 ring-2 ring-amber-400'
                  : 'bg-slate-800/80 border-slate-700'
              }`}
            >
              <div className="text-xs text-slate-400 font-semibold">{self.name} (אתה)</div>
              <div className="text-2xl font-black text-white mt-0.5">{myScore} רביעיות</div>
            </div>

            <span className="text-slate-500 font-black text-xl">VS</span>

            <div
              className={`px-5 py-3 rounded-2xl border ${
                !isMeWinner && !isTie
                  ? 'bg-amber-950/40 border-amber-400 ring-2 ring-amber-400'
                  : 'bg-slate-800/80 border-slate-700'
              }`}
            >
              <div className="text-xs text-slate-400 font-semibold">{opponent?.name || 'היריב'}</div>
              <div className="text-2xl font-black text-white mt-0.5">{oppScore} רביעיות</div>
            </div>
          </div>
        </div>

        {/* Study Summary & Review */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <h3 className="font-extrabold text-white text-base">
              סיכום וחזרה על חומר הלימוד של המשחק
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            עברו על כל הרביעיות והעובדות שנלמדו במהלך המשחק כדי להטמיע את הידע:
          </p>

          <div className="space-y-3">
            {allQuartets.map((group) => (
              <div
                key={group.id}
                className="bg-slate-800/60 border border-slate-750 rounded-2xl p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                    {group.title}
                  </span>
                  <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                    4 קלפים
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {group.cards.map((c) => (
                    <div
                      key={c.id}
                      className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5"
                    >
                      <div className="font-bold text-indigo-300 text-xs mb-1">{c.name}</div>
                      <div className="text-[11px] text-slate-400 leading-relaxed">
                        {c.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-850 flex items-center justify-between gap-3">
          <button
            onClick={onExit}
            className="px-5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
          >
            חזרה ללובי הראשי
          </button>

          {isHost ? (
            <button
              onClick={onRestart}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/30"
            >
              <RotateCcw className="w-4 h-4" />
              <span>שחק שוב עם אותם קלפים</span>
            </button>
          ) : (
            <span className="text-xs text-slate-400">
              ממתין למנהל החדר שיתחיל משחק חדש...
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
