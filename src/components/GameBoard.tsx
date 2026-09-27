import React, { useState } from 'react';
import { CardView } from './CardView';
import { ChatPanel } from './ChatPanel';
import { AskCardModal } from './AskCardModal';
import { GameOverModal } from './GameOverModal';
import { RoomState, Card, QuartetGroup } from '../types/game';
import {
  HelpCircle,
  Layers,
  Award,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  BookOpen,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { sounds } from '../utils/sound';

interface GameBoardProps {
  roomState: RoomState;
  onDrawInitial: () => void;
  onDrawAllInitial: () => void;
  onDrawCard: () => void;
  onAskCategory: (targetGroupId: string) => void;
  onAskSpecificCard: (targetGroupId: string, targetCardName: string) => void;
  onRespondCategory: (hasCategory: boolean) => void;
  onRespondCard: (hasCard: boolean) => void;
  onSendMessage: (text: string) => void;
  onRestartGame: () => void;
  onExitGame: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  roomState,
  onDrawInitial,
  onDrawAllInitial,
  onDrawCard,
  onAskCategory,
  onAskSpecificCard,
  onRespondCategory,
  onRespondCard,
  onSendMessage,
  onRestartGame,
  onExitGame,
}) => {
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [selectedSeriesFilter, setSelectedSeriesFilter] = useState<string | null>(null);
  const [inspectCard, setInspectCard] = useState<Card | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(true);

  const { self, opponent, status, turnPlayerId, deckCount, quartets, activeAsk, lastAction, cardsReceivedThisTurn } =
    roomState;

  if (!self) return null;

  const isMyTurn = turnPlayerId === self.id;
  const isInitialPhase = status === 'initial_draw';
  const needInitialDraw = isInitialPhase && self.initialDrawnCount < 4;

  // Check respondent states for Step 1 (category) and Step 2 (specific card)
  const isBeingAskedCategory = Boolean(
    activeAsk &&
      activeAsk.toPlayerId === self.id &&
      activeAsk.stage === 'category' &&
      activeAsk.status === 'pending_category'
  );

  const iHoldCategoryCards = Boolean(
    isBeingAskedCategory &&
      activeAsk &&
      self.hand.some((c) => c.groupId === activeAsk.targetGroupId)
  );

  const isBeingAskedCard = Boolean(
    activeAsk &&
      activeAsk.toPlayerId === self.id &&
      activeAsk.stage === 'card' &&
      activeAsk.status === 'pending_card'
  );

  const iHoldSpecificCard = Boolean(
    isBeingAskedCard &&
      activeAsk &&
      self.hand.some((c) => c.groupId === activeAsk.targetGroupId && c.name === activeAsk.targetCardName)
  );

  // Is Asker waiting for Step 2 selection?
  const isAskerPendingStep2 = Boolean(
    activeAsk &&
      activeAsk.fromPlayerId === self.id &&
      activeAsk.stage === 'card' &&
      activeAsk.status === 'pending_card_selection'
  );

  // Filter player hand
  const filteredHand = selectedSeriesFilter
    ? self.hand.filter((c) => c.groupId === selectedSeriesFilter)
    : self.hand;

  // Hand grouped by series
  const handGroupIds = Array.from(new Set(self.hand.map((c) => c.groupId)));

  const handleDeckClick = () => {
    if (isInitialPhase) {
      if (needInitialDraw) {
        sounds.playDraw();
        onDrawInitial();
      }
    } else if (isMyTurn && deckCount > 0) {
      sounds.playDraw();
      onDrawCard();
    }
  };

  return (
    <div dir="rtl" className="h-full w-full min-h-0 p-2 sm:p-3 overflow-hidden flex flex-col">
      {/* Ask Card Modal (Two-step mechanism) */}
      <AskCardModal
        isOpen={isAskModalOpen || isAskerPendingStep2}
        onClose={() => setIsAskModalOpen(false)}
        playerHand={self.hand}
        allQuartets={quartets}
        opponentName={opponent?.name || 'היריב'}
        activeAsk={activeAsk}
        currentUserId={self.id}
        onAskCategory={onAskCategory}
        onAskSpecificCard={onAskSpecificCard}
      />

      {/* Card Inspection Modal (for studying facts in detail without cluttering layout) */}
      {inspectCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl text-right">
            <button
              onClick={() => setInspectCard(null)}
              className="absolute top-3 left-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                {inspectCard.groupTitle}
              </span>
              <span className="text-xs text-slate-400">עיון מעמיק בקלף</span>
            </div>
            <h3 className="font-extrabold text-white text-lg mb-2">{inspectCard.name}</h3>
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3 mb-4">
              <div className="flex items-start gap-2">
                <BookOpen className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-200 leading-relaxed">{inspectCard.description}</p>
              </div>
            </div>
            <div className="text-xs text-slate-400 mb-1 font-bold">כל קלפי הסדרה:</div>
            <div className="grid grid-cols-2 gap-1.5 mb-4">
              {inspectCard.allGroupCardNames.map((name, i) => (
                <div
                  key={i}
                  className={`px-2 py-1 rounded-lg text-xs truncate ${
                    name === inspectCard.name
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {name}
                </div>
              ))}
            </div>
            <button
              onClick={() => setInspectCard(null)}
              className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
            >
              סגור
            </button>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      <GameOverModal
        isOpen={status === 'game_over'}
        winnerId={roomState.winnerId}
        self={self}
        opponent={opponent}
        allQuartets={quartets}
        isHost={self.isHost}
        onRestart={onRestartGame}
        onExit={onExitGame}
      />

      {/* Main Single-Screen Viewport: Arena (Flex-1) + Chat Sidebar (fixed width) */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-2.5 overflow-hidden">
        {/* Game Arena Column */}
        <div className="flex-1 min-h-0 flex flex-col justify-between gap-2 overflow-hidden">
          {/* 1. OPPONENT STRIP (TOP) - Compact */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl px-3 py-2 shadow-md backdrop-blur-md shrink-0 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white font-black flex items-center justify-center shadow-xs text-xs">
                {opponent?.name ? opponent.name.slice(0, 2) : 'יריב'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-white text-xs sm:text-sm">
                    {opponent?.name || 'היריב'}
                  </span>
                  {!isMyTurn && !isInitialPhase && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                      <Clock className="w-2.5 h-2.5" />
                      <span>בתורו לחשוב...</span>
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400">
                  {isInitialPhase
                    ? `משך ${opponent?.initialDrawnCount || 0}/4 קלפי פתיחה`
                    : `${opponent?.cardsCount || 0} קלפים ביד`}
                </div>
              </div>
            </div>

            {/* Opponent's Face-Down Cards Stack */}
            <div className="flex-1 flex items-center justify-center max-w-sm px-2 overflow-hidden">
              {opponent && opponent.cardsCount > 0 ? (
                <div className="flex items-center justify-center -space-x-7 sm:-space-x-8 rtl:space-x-reverse py-0.5">
                  {Array.from({ length: Math.min(opponent.cardsCount, 10) }).map((_, i) => (
                    <div key={i} className="transition-transform hover:-translate-y-1 hover:z-10 shadow-sm">
                      <CardView card={{} as any} isFaceDown size="xs" />
                    </div>
                  ))}
                  {opponent.cardsCount > 10 && (
                    <div className="z-10 bg-slate-800 border border-slate-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
                      +{opponent.cardsCount - 10}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-slate-500 text-[10px]">
                  {isInitialPhase ? 'היריב טרם משך את קלפי הפתיחה' : 'ליריב אין קלפים ביד כרגע'}
                </span>
              )}
            </div>

            {/* Opponent Completed Quartets Badge */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 px-2.5 py-1 rounded-xl shrink-0">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] font-bold text-slate-300">רביעיות:</span>
              <span className="px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 text-[11px] font-black">
                {opponent?.completedQuartets.length || 0}
              </span>
            </div>
          </div>

          {/* 2. CENTER TABLE AREA - Compact, Interactive Deck, Dynamic Two-Step Ask Prompts */}
          <div className="bg-gradient-to-b from-slate-900/90 via-slate-850/80 to-slate-900/90 border border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-xl backdrop-blur-md shrink-0 flex flex-col justify-between relative">
            {/* Top Status & Turn Bar */}
            <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    isMyTurn || isInitialPhase ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                  }`}
                />
                <h3 className="font-extrabold text-xs sm:text-sm text-white truncate">
                  {isInitialPhase
                    ? needInitialDraw
                      ? `משכו 4 קלפי פתיחה מהקופה! (משכתם ${self.initialDrawnCount}/4)`
                      : `ממתינים ל-${opponent?.name || 'היריב'} שימשוך קלפי פתיחה (${opponent?.initialDrawnCount || 0}/4)`
                    : isMyTurn
                    ? 'תורך לשחק! שאל את היריב (ב-2 שלבים) להשלמת רביעייה'
                    : `תורו של ${opponent?.name || 'היריב'} לשחק...`}
                </h3>
              </div>

              {/* Fast draw helper for initial phase */}
              {needInitialDraw && (
                <button
                  onClick={onDrawAllInitial}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] transition-colors whitespace-nowrap shadow-xs"
                >
                  משוך את כל ה-4
                </button>
              )}

              {/* Consecutive success streak badge */}
              {isMyTurn && (cardsReceivedThisTurn || 0) > 0 && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                  <Flame className="w-3 h-3 text-amber-400 animate-bounce" />
                  <span>קיבלת {cardsReceivedThisTurn} קלפים ברצף! המשך לשאול</span>
                </div>
              )}
            </div>

            {/* ACTIVE TWO-STEP ASK DIALOG / NOTIFICATION */}
            {activeAsk && (
              <div
                className={`mb-2 p-2.5 rounded-xl border shadow-md animate-in zoom-in-95 duration-150 ${
                  activeAsk.status === 'success'
                    ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                    : activeAsk.status === 'failed'
                    ? 'bg-rose-950/70 border-rose-500/50 text-rose-200'
                    : 'bg-amber-950/60 border-amber-500/50 text-amber-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-lg bg-slate-900/60 border border-slate-700 shrink-0">
                      <HelpCircle className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      {/* Step 1: Category inquiry */}
                      {activeAsk.stage === 'category' && (
                        <div>
                          <span className="text-[10px] font-extrabold text-amber-400 block">
                            [שלב 1 מתוך 2: שאלת סדרה/נושא]
                          </span>
                          <span className="text-white font-bold">
                            {activeAsk.fromPlayerName} שואל את {activeAsk.toPlayerName}:
                          </span>
                          <span className="text-slate-200 mr-1 font-semibold">
                            "האם יש לך קלפים מסדרת '{activeAsk.targetGroupTitle}'?"
                          </span>
                        </div>
                      )}

                      {/* Step 2: Specific card inquiry */}
                      {activeAsk.stage === 'card' && (
                        <div>
                          <span className="text-[10px] font-extrabold text-emerald-400 block">
                            [שלב 2 מתוך 2: שאלת קלף ספציפי]
                          </span>
                          <span className="text-white font-bold">
                            {activeAsk.fromPlayerName} שואל את {activeAsk.toPlayerName}:
                          </span>
                          <span className="text-slate-200 mr-1 font-semibold">
                            "האם יש לך את הקלף '{activeAsk.targetCardName}' מסדרת '{activeAsk.targetGroupTitle}'?"
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RESPONDENT CONTROLS */}
                  {/* Respondent for Step 1 (Category) */}
                  {isBeingAskedCategory && (
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => {
                          sounds.playTransferSuccess();
                          onRespondCategory(true);
                        }}
                        disabled={!iHoldCategoryCards}
                        className={`px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all shadow-xs ${
                          iHoldCategoryCards
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse cursor-pointer'
                            : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                        }`}
                        title={iHoldCategoryCards ? 'אישור: יש לך קלפים מסדרה זו' : 'אין ברשותך קלפים מסדרה זו'}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>כן, יש לי מהסדרה!</span>
                      </button>

                      <button
                        onClick={() => {
                          sounds.playMiss();
                          onRespondCategory(false);
                        }}
                        disabled={iHoldCategoryCards}
                        className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all border ${
                          !iHoldCategoryCards
                            ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 cursor-pointer animate-pulse'
                            : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                        }`}
                        title={!iHoldCategoryCards ? 'אין ברשותך קלפים מסדרה זו' : 'לא ניתן לשקר: יש לך קלף מסדרה זו!'}
                      >
                        אין לי מהסדרה!
                      </button>
                    </div>
                  )}

                  {/* Respondent for Step 2 (Specific Card) */}
                  {isBeingAskedCard && (
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => {
                          sounds.playTransferSuccess();
                          onRespondCard(true);
                        }}
                        disabled={!iHoldSpecificCard}
                        className={`px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all shadow-xs ${
                          iHoldSpecificCard
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse cursor-pointer'
                            : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                        }`}
                        title={iHoldSpecificCard ? 'מסור את הקלף ליריב' : 'הקלף אינו בידך'}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>כן, יש לי! (מסור)</span>
                      </button>

                      <button
                        onClick={() => {
                          sounds.playMiss();
                          onRespondCard(false);
                        }}
                        disabled={iHoldSpecificCard}
                        className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all border ${
                          !iHoldSpecificCard
                            ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 cursor-pointer animate-pulse'
                            : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                        }`}
                        title={!iHoldSpecificCard ? 'הקלף אינו בידך' : 'לא ניתן לשקר: הקלף בידך!'}
                      >
                        אין לי!
                      </button>
                    </div>
                  )}

                  {/* Asker waiting prompt */}
                  {activeAsk.fromPlayerId === self.id &&
                    (activeAsk.status === 'pending_category' || activeAsk.status === 'pending_card') && (
                      <div className="text-[11px] text-amber-300 font-bold flex items-center gap-1 animate-pulse shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                        <span>ממתין לתשובת היריב...</span>
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Central Table Centerpiece: Compact Deck and Quick Controls */}
            <div className="flex items-center justify-around gap-4 py-1">
              {/* Left Side: Rule and Last Action Summary */}
              <div className="hidden sm:block text-right max-w-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  אירוע אחרון
                </span>
                <p className="text-[11px] text-slate-200 line-clamp-2 leading-tight">
                  {lastAction || 'המשחק בעיצומו'}
                </p>
                <span className="text-[9px] text-indigo-400/80 block mt-1">
                  * משיכה מהקופה מתבצעת בסיום תור רק אם לא הושגו קלפים מהיריב
                </span>
              </div>

              {/* Center: The Compact 3D Deck */}
              <div
                onClick={handleDeckClick}
                className={`relative select-none rounded-xl p-1 transition-transform ${
                  needInitialDraw || (isMyTurn && deckCount > 0)
                    ? 'cursor-pointer hover:scale-105 active:scale-95'
                    : 'cursor-default opacity-85'
                }`}
                title={
                  needInitialDraw
                    ? 'לחץ למשיכת קלף פתיחה'
                    : isMyTurn
                    ? 'לחץ למשיכת קלף מהקופה (מעביר תור)'
                    : 'ערימת הקופה'
                }
              >
                {/* 3D Stack Effect behind */}
                <div className="absolute inset-x-1 -bottom-1 h-full bg-indigo-950/60 rounded-xl border border-indigo-600/30 transform translate-y-1 -rotate-1 pointer-events-none" />

                {/* Top Deck Card */}
                <div className="relative w-28 sm:w-32 h-24 sm:h-28 rounded-xl bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 border-2 border-indigo-400/60 shadow-lg p-2 flex flex-col items-center justify-between">
                  <div className="w-full flex items-center justify-between text-[10px] text-indigo-300">
                    <span className="font-bold">קופה</span>
                    <span className="px-1.5 py-0.2 rounded-md bg-indigo-500/20 font-mono font-bold text-[9px]">
                      {deckCount}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-indigo-300">
                    <Layers className="w-5 h-5" />
                    <span className="text-[10px] font-bold">רביעיות</span>
                  </div>

                  <span
                    className={`block w-full py-0.5 px-1 rounded-md text-[9px] font-bold text-center transition-all ${
                      needInitialDraw
                        ? 'bg-indigo-600 text-white animate-bounce'
                        : isMyTurn && deckCount > 0
                        ? 'bg-emerald-600 text-white animate-pulse'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {needInitialDraw ? `משוך (${self.initialDrawnCount}/4)` : 'קופת קלפים'}
                  </span>
                </div>
              </div>

              {/* Right Side: Primary Player Action Button */}
              <div className="flex flex-col items-center justify-center gap-1">
                <button
                  onClick={() => setIsAskModalOpen(true)}
                  disabled={!isMyTurn || isInitialPhase || self.hand.length === 0}
                  className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all shadow-md ${
                    isMyTurn && !isInitialPhase && self.hand.length > 0
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-amber-500/30 animate-pulse active:scale-95 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  }`}
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>
                    {(cardsReceivedThisTurn || 0) > 0 ? 'שאל שוב מהיריב! 🔥' : 'בקש קלף מהיריב'}
                  </span>
                </button>

                {isMyTurn && !isInitialPhase && (
                  <span className="text-[9px] text-amber-300/90 font-semibold">
                    (ב-2 שלבים: סדרה ואז קלף)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 3. PLAYER'S HAND & SHELF (BOTTOM) - Flex-1 Min-H-0, No Overflow */}
          <div className="flex-1 min-h-0 bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 shadow-xl backdrop-blur-md flex flex-col justify-between overflow-hidden">
            {/* Header: Hand Info, Series Filter Pills & Completed Quartets Counter */}
            <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white font-black flex items-center justify-center shadow-xs text-xs">
                  {self.name.slice(0, 2)}
                </div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-white text-xs sm:text-sm">{self.name} (אתה)</h3>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    {self.hand.length} קלפים
                  </span>
                </div>
              </div>

              {/* Series Filter Chips */}
              {handGroupIds.length > 1 && (
                <div className="flex items-center gap-1 overflow-x-auto max-w-xs sm:max-w-md scrollbar-none text-[10px]">
                  <button
                    onClick={() => setSelectedSeriesFilter(null)}
                    className={`px-2 py-0.5 rounded-lg font-bold whitespace-nowrap transition-colors ${
                      selectedSeriesFilter === null
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    הכל ({self.hand.length})
                  </button>
                  {handGroupIds.map((gid) => {
                    const groupDef = quartets.find((q) => q.id === gid);
                    const count = self.hand.filter((c) => c.groupId === gid).length;
                    return (
                      <button
                        key={gid}
                        onClick={() => setSelectedSeriesFilter(gid)}
                        className={`px-2 py-0.5 rounded-lg font-bold whitespace-nowrap transition-colors border ${
                          selectedSeriesFilter === gid
                            ? 'bg-indigo-600 border-indigo-400 text-white'
                            : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        {groupDef?.title || 'סדרה'} ({count}/4)
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Player Completed Quartets Badge */}
              <div className="flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-lg shrink-0">
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-300">
                  רביעיות שהשלמת: {self.completedQuartets.length}
                </span>
              </div>
            </div>

            {/* Hand Cards Horizontal Carousel / Grid (Designed to fit cleanly with horizontal scroll if hand is large) */}
            <div className="flex-1 min-h-0 flex items-center py-1 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-slate-700">
              {self.hand.length === 0 ? (
                <div className="w-full py-4 text-center text-slate-500 flex flex-col items-center justify-center">
                  <Layers className="w-6 h-6 mb-1 opacity-40 text-indigo-400" />
                  <p className="text-xs">אין לך קלפים ביד כרגע.</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {isInitialPhase ? 'לחץ על הקופה למשיכת 4 קלפי הפתיחה!' : 'משוך קלף מהקופה.'}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 h-full px-1">
                  {filteredHand.map((card) => (
                    <CardView
                      key={card.id}
                      card={card}
                      size="compact"
                      onClick={() => setInspectCard(card)}
                      className="cursor-pointer"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Real-time Chat & Event Panel Column (Single-screen sidebar) */}
        <div className="w-full lg:w-72 xl:w-80 h-48 lg:h-full shrink-0 min-h-0">
          <ChatPanel
            messages={roomState.messages}
            currentUserId={self.id}
            onSendMessage={onSendMessage}
            isOpen={isChatOpen}
            onToggleOpen={() => setIsChatOpen(!isChatOpen)}
          />
        </div>
      </div>
    </div>
  );
};
