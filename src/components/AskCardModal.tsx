import React, { useState, useEffect } from 'react';
import { Card, QuartetGroup, CardAskRequest } from '../types/game';
import { HelpCircle, X, ChevronLeft, ArrowRight, Sparkles, Check, CheckCircle2, Clock } from 'lucide-react';
import { sounds } from '../utils/sound';

interface AskCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerHand: Card[];
  allQuartets: QuartetGroup[];
  opponentName: string;
  activeAsk: CardAskRequest | null;
  currentUserId: string;
  lockedGroupId?: string | null;
  onAskCategory: (targetGroupId: string) => void;
  onAskSpecificCard: (targetGroupId: string, targetCardName: string) => void;
}

export const AskCardModal: React.FC<AskCardModalProps> = ({
  isOpen,
  onClose,
  playerHand,
  allQuartets,
  opponentName,
  activeAsk,
  currentUserId,
  lockedGroupId,
  onAskCategory,
  onAskSpecificCard,
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedCardName, setSelectedCardName] = useState<string | null>(null);

  // If activeAsk is already in stage 'card' and waiting for our selection, sync selectedGroupId
  useEffect(() => {
    if (activeAsk && activeAsk.fromPlayerId === currentUserId && activeAsk.stage === 'card') {
      setSelectedGroupId(activeAsk.targetGroupId);
    }
  }, [activeAsk, currentUserId]);

  if (!isOpen) return null;

  // Find unique series that the player currently holds at least 1 card of
  const ownedGroupIds = Array.from(new Set(playerHand.map((c) => c.groupId)));
  // Feature 4: If locked to a series, only show that series
  const ownedQuartets = allQuartets.filter((q) =>
    ownedGroupIds.includes(q.id) && (!lockedGroupId || q.id === lockedGroupId)
  );

  // Auto-select locked group
  useEffect(() => {
    if (lockedGroupId && isOpen) {
      setSelectedGroupId(lockedGroupId);
    }
  }, [lockedGroupId, isOpen]);

  // Determine which step we are currently in
  const isWaitingCategoryResponse =
    Boolean(activeAsk &&
    activeAsk.fromPlayerId === currentUserId &&
    activeAsk.stage === 'category' &&
    activeAsk.status === 'pending_category');

  const isReadyForStep2 =
    Boolean(activeAsk &&
    activeAsk.fromPlayerId === currentUserId &&
    activeAsk.stage === 'card' &&
    activeAsk.status === 'pending_card_selection');

  // Active target group for Step 2
  const activeGroupId = isReadyForStep2 ? activeAsk!.targetGroupId : selectedGroupId;
  const currentGroup = allQuartets.find((q) => q.id === activeGroupId) || null;

  const cardsHeldInSelectedGroup = currentGroup
    ? playerHand.filter((c) => c.groupId === currentGroup.id).map((c) => c.name)
    : [];

  const missingCardsInSelectedGroup = currentGroup
    ? currentGroup.cards.filter((c) => !cardsHeldInSelectedGroup.includes(c.name))
    : [];

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    setSelectedCardName(null);
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId) return;
    sounds.playAsk();
    onAskCategory(selectedGroupId);
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroupId || !selectedCardName) return;
    sounds.playAsk();
    onAskSpecificCard(activeGroupId, selectedCardName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        dir="rtl"
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-850/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">
                {isReadyForStep2
                  ? 'שלב 2 מתוך 2: בחירת קלף ספציפי'
                  : lockedGroupId
                  ? 'שאלת קלף — נעול לסדרה הנוכחית'
                  : 'שאלת קלף מהיריב (ב-2 שלבים)'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isReadyForStep2
                  ? `${opponentName} אישר שיש לו מהסדרה! כעת בחר איזה קלף לבקש.`
                  : lockedGroupId
                  ? `קיבלת קלף מהסדרה הזו — חייב להמשיך לשאול מאותה סדרה עד שתמצה.`
                  : `שלב 1: שואלים האם יש ליריב קלפים מהסדרה.`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* STEP 1: Select general category / theme */}
          {!isReadyForStep2 && !isWaitingCategoryResponse && (
            <form onSubmit={handleStep1Submit} className="space-y-4">
              {lockedGroupId && (
                <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 text-xs text-amber-200">
                  <span className="font-bold">🔒 נעול לסדרה:</span> קיבלת קלף מהסדרה הזו בתור הנוכחי. עליך להמשיך לשאול רק מאותה סדרה עד שליריב ייגמרו את כל קלפיה ממנה.
                </div>
              )}
              <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3 text-xs text-indigo-200">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-white">
                  <span className="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px]">
                    1
                  </span>
                  <span>שלב ראשון: שאלת נושא / סדרה כללית</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  שאלו את {opponentName} האם יש ברשותו קלפים מסדרה מסוימת. רק אם היריב יאשר, תוכלו לבקש ממנו קלף ספציפי מתוכה!
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  בחרו סדרה שברשותכם (יש לכם לפחות קלף אחד ממנה):
                </label>

                {ownedQuartets.length === 0 ? (
                  <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
                    אין בידכם קלפים כרגע כדי לשאול.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ownedQuartets.map((group) => {
                      const countInHand = playerHand.filter((c) => c.groupId === group.id).length;
                      const isSelected = selectedGroupId === group.id;

                      return (
                        <button
                          type="button"
                          key={group.id}
                          onClick={() => handleSelectGroup(group.id)}
                          className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-indigo-950/80 border-indigo-400 ring-2 ring-indigo-400/50 shadow-md'
                              : 'bg-slate-800/70 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
                          }`}
                        >
                          <div className="truncate">
                            <div className="font-bold text-white text-xs truncate">{group.title}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              יש לך {countInHand}/4 קלפים
                            </div>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-400 text-white'
                                : 'border-slate-600 text-transparent'
                            }`}
                          >
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={!selectedGroupId}
                  className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md ${
                    selectedGroupId
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-amber-500/30 cursor-pointer active:scale-95'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  }`}
                >
                  <span>שאל על הסדרה [שלב 1]</span>
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                </button>
              </div>
            </form>
          )}

          {/* WAITING FOR OPPONENT'S RESPONSE TO CATEGORY */}
          {isWaitingCategoryResponse && (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center mx-auto animate-pulse">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-white text-sm">
                נשלחה שאלה ל-{opponentName}...
              </h4>
              <p className="text-xs text-slate-300">
                "האם יש לך קלפים מסדרת <strong>'{activeAsk?.targetGroupTitle}'</strong>?"
              </p>
              <div className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-500/30 rounded-xl p-2.5 max-w-sm mx-auto">
                ממתינים לתשובתו של {opponentName}. אם יאשר, מסך זה יתעדכן מיד לבחירת קלף ספציפי!
              </div>
            </div>
          )}

          {/* STEP 2: Opponent confirmed! Pick specific missing card from that category */}
          {isReadyForStep2 && currentGroup && (
            <form onSubmit={handleStep2Submit} className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3 text-xs text-emerald-200">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-white">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{opponentName} אישר! יש לו קלפים מסדרת "{currentGroup.title}"</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  [שלב 2 מתוך 2]: כעת בחרו איזה קלף ספציפי וחסר תרצו לבקש מהיריב מתוך סדרה זו:
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  הקלפים שחסרים לך בסדרה זו:
                </label>

                {missingCardsInSelectedGroup.length === 0 ? (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs">
                    כבר יש לך את כל הקלפים בסדרה זו!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {missingCardsInSelectedGroup.map((item) => {
                      const isSelected = selectedCardName === item.name;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedCardName(item.name)}
                          className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-amber-950/70 border-amber-400 ring-2 ring-amber-400/50 shadow-md'
                              : 'bg-slate-800/70 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex-1 pl-2">
                            <div className="font-bold text-white text-xs">{item.name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                              {item.description}
                            </div>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${
                              isSelected
                                ? 'bg-amber-500 border-amber-400 text-slate-950'
                                : 'border-slate-600 text-transparent'
                            }`}
                          >
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={!selectedCardName}
                  className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md ${
                    selectedCardName
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-emerald-500/30 cursor-pointer active:scale-95'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  }`}
                >
                  <span>בקש קלף זה מהיריב [שלב 2]</span>
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
