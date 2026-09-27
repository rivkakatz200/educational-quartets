import React from 'react';
import { X, BookOpen, Layers, MessageSquare, Award, ArrowRight, CheckCircle2 } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-850/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">חוקי משחק הרביעיות הלימודי</h2>
              <p className="text-xs text-slate-400">חוקי התורות, מנגנון השאלה בשני שלבים וכללי משיכת הקופה</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="סגור"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-200">
          {/* Target */}
          <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3.5 flex items-start gap-3">
            <Award className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-white text-sm mb-1">מטרת המשחק</h3>
              <p className="text-slate-300 leading-relaxed text-xs">
                לאסוף כמה שיותר <strong>רביעיות</strong> (סדרות של 4 קלפים החולקים נושא לימודי משותף).
                השחקן שצבר את מספר הרביעיות הרב ביותר בסיום המשחק הוא המנצח!
              </p>
            </div>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3">
              <div className="flex items-center gap-2 text-indigo-400 font-bold mb-1.5 text-xs">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] border border-indigo-500/40">
                  1
                </span>
                <span>משיכת 4 קלפי פתיחה</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                בתחילת המשחק כל שחקן מושך <strong>4 קלפי פתיחה</strong> בלחיצה על ערימת הקופה במרכז השולחן.
                הקלפים שלכם גלויים רק לכם.
              </p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold mb-1.5 text-xs">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] border border-amber-500/40">
                  2
                </span>
                <span>מנגנון שאלה בשני שלבים</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                <strong>א. שאלת סדרה כללית:</strong> שואלים על סדרה שברשותכם לפחות קלף אחד ממנה.<br />
                <strong>ב. שאלת קלף ספציפי:</strong> רק אם היריב אישר שיש לו קלפים מסדרה זו, בוחרים קלף ספציפי מתוכה.
              </p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1.5 text-xs">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] border border-emerald-500/40">
                  3
                </span>
                <span>רצף שאלות בהצלחה</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                אם ליריב יש את הקלף המבוקש והוא מוסר אותו, <strong>התור שלכם נמשך!</strong> תוכלו להמשיך לשאול שוב (מאותה סדרה או מסדרה אחרת) כל עוד אתם מצליחים לקבל קלפים.
              </p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold mb-1.5 text-xs">
                <span className="w-5 h-5 rounded-full bg-rose-500/20 flex items-center justify-center text-[10px] border border-rose-500/40">
                  4
                </span>
                <span>כלל משיכת קופה בסיום תור</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                משיכת קלף מהקופה מתבצעת בסיום תור <strong>רק אם לא קיבלתם אף קלף מהיריב</strong> במהלך כל אותו התור! אם קיבלתם אפילו קלף אחד, אינכם מושכים מהקופה והתור פשוט עובר.
              </p>
            </div>
          </div>

          {/* Quartet Completion */}
          <div className="bg-slate-800/40 border border-slate-700/70 rounded-xl p-3 flex items-center gap-3">
            <Layers className="w-6 h-6 text-cyan-400 shrink-0" />
            <div>
              <h4 className="font-bold text-white text-xs">השלמת רביעייה אוטומטית</h4>
              <p className="text-slate-300 text-[11px] leading-relaxed mt-0.5">
                ברגע שצברתם את כל 4 הקלפים של סדרה כלשהי, המערכת מזהה זאת מיד, מורידה אותם למדף הרביעיות ומעניקה נקודה!
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-850/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-md"
          >
            <span>הבנתי, סגור</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
};
