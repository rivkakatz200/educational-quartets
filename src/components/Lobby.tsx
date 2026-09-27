import React, { useState } from 'react';
import { Sparkles, Users, Key, Play, Plus, BookOpen, Layers, CheckCircle2, Copy, Check, RefreshCw, Wand2, ChevronRight, Edit3, Trash2 } from 'lucide-react';
import { PREDEFINED_DECKS, PredefinedDeck } from '../data/defaultDecks';
import { QuartetGroup } from '../types/game';
import { sounds } from '../utils/sound';

interface LobbyProps {
  onCreateRoom: (playerName: string, quartets: QuartetGroup[]) => void;
  onJoinRoom: (roomCode: string, playerName: string) => void;
  roomCode?: string | null;
  isHost?: boolean;
  playersCount?: number;
  opponentName?: string | null;
  quartets?: QuartetGroup[];
  onStartGame?: () => void;
  onUpdateQuartets?: (quartets: QuartetGroup[]) => void;
  isLoading?: boolean;
}

export const Lobby: React.FC<LobbyProps> = ({
  onCreateRoom,
  onJoinRoom,
  roomCode,
  isHost = false,
  playersCount = 1,
  opponentName = null,
  quartets = [],
  onStartGame,
  onUpdateQuartets,
  isLoading = false,
}) => {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [playerName, setPlayerName] = useState(() => {
    try {
      return localStorage.getItem('reviyot_player_name') || '';
    } catch {
      return '';
    }
  });
  const [joinCode, setJoinCode] = useState('');
  const [materialSource, setMaterialSource] = useState<'preset' | 'custom'>('preset');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(PREDEFINED_DECKS[0].id);
  const [customText, setCustomText] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [customQuartets, setCustomQuartets] = useState<QuartetGroup[]>(PREDEFINED_DECKS[0].quartets);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [previewQuartetIndex, setPreviewQuartetIndex] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Update player name and store in localStorage
  const handleNameChange = (name: string) => {
    setPlayerName(name);
    try {
      localStorage.setItem('reviyot_player_name', name);
    } catch {
      // ignore
    }
  };

  // Change preset
  const handleSelectPreset = (preset: PredefinedDeck) => {
    setSelectedPresetId(preset.id);
    setCustomQuartets(preset.quartets);
    setPreviewQuartetIndex(0);
    setErrorMsg(null);
  };

  // Generate quartets using AI
  const handleGenerateWithAi = async () => {
    if (!customText.trim()) {
      setErrorMsg('נא להזין טקסט, סיכום או רשימת נושאים עבור ה-AI');
      return;
    }

    setIsAiGenerating(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/generate-quartets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicOrText: customText, count: 4 }),
      });

      if (!res.ok) {
        throw new Error('שגיאה בתקשורת עם השרת');
      }

      const data = await res.json();
      if (data.quartets && Array.isArray(data.quartets) && data.quartets.length >= 2) {
        setCustomQuartets(data.quartets);
        setPreviewQuartetIndex(0);
        sounds.playTransferSuccess();
      } else {
        throw new Error('לא התקבלו מספיק רביעיות מחומר הלימוד');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('הייתה תקלה ביצירת הרביעיות מה-AI. השתמשנו ברביעיות לדוגמה, אך תוכל לנסות שוב עם טקסט מפורט יותר.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Create room trigger
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = playerName.trim() || 'שחקן 1';
    if (!playerName.trim()) handleNameChange(finalName);

    if (customQuartets.length < 2) {
      setErrorMsg('נדרשות לפחות 2 סדרות של רביעיות כדי לפתוח משחק');
      return;
    }

    onCreateRoom(finalName, customQuartets);
  };

  // Join room trigger
  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = playerName.trim() || 'שחקן 2';
    if (!playerName.trim()) handleNameChange(finalName);

    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMsg('נא להזין קוד חדר');
      return;
    }

    onJoinRoom(cleanCode, finalName);
  };

  // Copy code & link
  const copyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyInviteLink = () => {
    if (!roomCode) return;
    const url = `${window.location.origin}?room=${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // If in waiting room (room created)
  if (roomCode) {
    const activeQuartets = quartets.length > 0 ? quartets : customQuartets;
    const currentPreview = activeQuartets[previewQuartetIndex] || activeQuartets[0];

    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in duration-300">
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="text-center max-w-xl mx-auto mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              חדר המשחק פתוח וממתין
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              הזמינו את השחקן השני להצטרף
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              שתפו את קוד החדר עם החבר או בן הזוג ללמידה. ברגע שיתחבר, תוכלו ללחוץ על "התחל משחק"!
            </p>
          </div>

          {/* Room Code Card */}
          <div className="bg-gradient-to-br from-indigo-950/60 via-slate-800/80 to-slate-900 border border-indigo-500/40 rounded-2xl p-6 max-w-md mx-auto text-center shadow-xl shadow-indigo-950/40 mb-8">
            <span className="text-xs font-medium text-slate-300 uppercase tracking-wider">קוד החדר שלכם:</span>
            <div className="my-3 flex items-center justify-center gap-3">
              <span className="font-mono text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-400 tracking-widest drop-shadow-md">
                {roomCode}
              </span>
            </div>

            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={copyCode}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-md shadow-indigo-600/30 active:scale-95"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'הקוד הועתק!' : 'העתק קוד'}</span>
              </button>

              <button
                onClick={copyInviteLink}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-200 hover:text-white font-medium text-sm transition-all border border-slate-600 active:scale-95"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'הקישור הועתק!' : 'העתק קישור'}</span>
              </button>
            </div>
          </div>

          {/* Players status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto mb-8">
            <div className="bg-slate-800/70 border border-emerald-500/40 rounded-2xl p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                P1
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{playerName || 'שחקן 1'}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                    מנהל חדר
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>מוכן למשחק</span>
                </div>
              </div>
            </div>

            <div
              className={`rounded-2xl p-4 flex items-center gap-3.5 border transition-all ${
                playersCount >= 2
                  ? 'bg-slate-800/70 border-emerald-500/40'
                  : 'bg-slate-800/30 border-dashed border-slate-700'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold border ${
                  playersCount >= 2
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}
              >
                P2
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm text-white">
                  {opponentName || (playersCount >= 2 ? 'שחקן 2 מחובר' : 'ממתין לשחקן נוסף...')}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {playersCount >= 2 ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      הצטרף לחדר בהצלחה!
                    </span>
                  ) : (
                    'הזינו את קוד החדר במכשיר השני'
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Start Game Action */}
          <div className="max-w-md mx-auto text-center mb-8">
            {isHost ? (
              <button
                onClick={onStartGame}
                disabled={playersCount < 2}
                className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all shadow-xl ${
                  playersCount >= 2
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-600/30 active:scale-98 animate-pulse cursor-pointer'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
              >
                <Play className="w-5 h-5 fill-current" />
                <span>{playersCount >= 2 ? 'התחל משחק עכשיו!' : 'ממתין להצטרפות השחקן השני...'}</span>
              </button>
            ) : (
              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 text-sm">
                מחובר לחדר בהצלחה! המנהל יתחיל את המשחק בעוד רגע...
              </div>
            )}
          </div>

          {/* Material Review in Waiting Room */}
          <div className="border-t border-slate-800 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-sm">
                  רביעיות במשחק זה ({activeQuartets.length} סדרות, {activeQuartets.length * 4} קלפים)
                </h3>
              </div>
              <span className="text-xs text-slate-400">הצצה לחומר הלימוד</span>
            </div>

            {/* Quartet Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {activeQuartets.map((group, idx) => (
                <button
                  key={group.id}
                  onClick={() => setPreviewQuartetIndex(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
                    idx === previewQuartetIndex
                      ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750 hover:text-white'
                  }`}
                >
                  {group.title}
                </button>
              ))}
            </div>

            {/* Selected Quartet preview cards */}
            {currentPreview && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                {currentPreview.cards.map((card, cIdx) => (
                  <div
                    key={card.id || cIdx}
                    className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 flex flex-col justify-between hover:border-indigo-500/50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                          קלף {cIdx + 1}/4
                        </span>
                        <span className="text-[10px] text-slate-400">{currentPreview.title}</span>
                      </div>
                      <h4 className="font-bold text-white text-sm mb-1.5">{card.name}</h4>
                      <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                        {card.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Lobby initial state (Create or Join)
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold mb-4 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>משחק רביעיות לימודי בזמן אמת</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          הכניסו חומר לימוד, פתחו חדר, ושחקו יחד!
        </h2>
        <p className="text-slate-400 text-sm sm:text-base mt-2 leading-relaxed">
          מערכת ה-AI מסדרת את חומר הלימוד שלכם לרביעיות חכמות. שחקו מול חבר, בדקו מי זוכר יותר טוב, והפכו כל מבחן למשחק קלפים מותח.
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl">
        {/* Tabs */}
        <div className="grid grid-cols-2 border-b border-slate-800 bg-slate-800/40 p-2 gap-2">
          <button
            onClick={() => {
              setTab('create');
              setErrorMsg(null);
            }}
            className={`py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              tab === 'create'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>יצירת חדר לימוד חדש</span>
          </button>

          <button
            onClick={() => {
              setTab('join');
              setErrorMsg(null);
            }}
            className={`py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              tab === 'join'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>הצטרפות לחדר קיים עם קוד</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 sm:p-8">
          {errorMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-sm flex items-start gap-3">
              <span className="text-rose-400 font-bold shrink-0">שגיאה:</span>
              <p>{errorMsg}</p>
            </div>
          )}

          {tab === 'create' ? (
            <form onSubmit={handleCreateSubmit} className="space-y-6">
              {/* Player Name */}
              <div>
                <label className="block text-sm font-bold text-white mb-2">שם השחקן שלך:</label>
                <input
                  type="text"
                  required
                  value={playerName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="למשל: דניאל, נועה, רועי..."
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors text-sm"
                />
              </div>

              {/* Study Material Choice */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-white">בחירת חומר הלימוד למשחק:</label>
                  <div className="flex gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setMaterialSource('preset')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        materialSource === 'preset'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      מאגר נושאים מוכנים
                    </button>
                    <button
                      type="button"
                      onClick={() => setMaterialSource('custom')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        materialSource === 'custom'
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Wand2 className="w-3 h-3 text-amber-300" />
                      <span>הזנת חומר חופשי (AI)</span>
                    </button>
                  </div>
                </div>

                {materialSource === 'preset' ? (
                  /* Predefined decks grid */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PREDEFINED_DECKS.map((preset) => (
                      <div
                        key={preset.id}
                        onClick={() => handleSelectPreset(preset)}
                        className={`cursor-pointer rounded-2xl p-4 border transition-all ${
                          selectedPresetId === preset.id
                            ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500'
                            : 'bg-slate-800/50 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
                              {preset.category}
                            </span>
                            <h4 className="font-bold text-white text-base mt-0.5">{preset.name}</h4>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                              {preset.description}
                            </p>
                          </div>
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                              selectedPresetId === preset.id
                                ? 'bg-indigo-600 border-indigo-400 text-white'
                                : 'border-slate-600 text-transparent'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{preset.quartets.length} סדרות • {preset.quartets.length * 4} קלפים</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Custom Material AI Input */
                  <div className="space-y-3 bg-slate-800/40 border border-slate-700/80 rounded-2xl p-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-300">
                          הדבק כאן סיכום, פרק בספר, מושגים למבחן או כל נושא שתרצה לתרגל:
                        </span>
                        <span className="text-[11px] text-purple-400 flex items-center gap-1 font-medium">
                          <Sparkles className="w-3 h-3" />
                          מעובד אוטומטית לרביעיות
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        placeholder="למשל: סיכום בהיסטוריה על מלחמת העולם השנייה, מושגים בכימיה אורגנית, מילים בפסיכומטרי, דיני חוזים במשפטים..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm leading-relaxed"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateWithAi}
                      disabled={isAiGenerating || !customText.trim()}
                      className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                        isAiGenerating
                          ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-wait'
                          : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white shadow-lg shadow-indigo-600/30'
                      }`}
                    >
                      {isAiGenerating ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                          <span>ה-AI מנתח את החומר ומחלק לרביעיות...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4 text-amber-300" />
                          <span>צור רביעיות לימודיות באמצעות AI</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Quartets Preview & Inspection */}
              <div className="bg-slate-800/50 border border-slate-700/80 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <h4 className="font-bold text-white text-sm">
                      תצוגה מקדימה של הקלפים שנוצרו ({customQuartets.length} סדרות)
                    </h4>
                  </div>
                  <span className="text-xs text-slate-400">בדיוק 4 קלפים לכל סדרה</span>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {customQuartets.map((group, idx) => (
                    <button
                      type="button"
                      key={group.id}
                      onClick={() => setPreviewQuartetIndex(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
                        idx === previewQuartetIndex
                          ? 'bg-indigo-600 border-indigo-400 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750 hover:text-white'
                      }`}
                    >
                      {group.title}
                    </button>
                  ))}
                </div>

                {customQuartets[previewQuartetIndex] && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
                    {customQuartets[previewQuartetIndex].cards.map((card, cIdx) => (
                      <div
                        key={card.id || cIdx}
                        className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-indigo-400 font-bold">
                              קלף {cIdx + 1}
                            </span>
                          </div>
                          <h5 className="font-bold text-white text-xs mb-1">{card.name}</h5>
                          <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                            {card.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Create */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-extrabold text-base flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-600/30"
              >
                <span>פתח חדר משחק והזמן שחקן נוסף</span>
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
            </form>
          ) : (
            /* Join Room Tab */
            <form onSubmit={handleJoinSubmit} className="space-y-6 max-w-md mx-auto py-4">
              <div>
                <label className="block text-sm font-bold text-white mb-2">שם השחקן שלך:</label>
                <input
                  type="text"
                  required
                  value={playerName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="למשל: תמר, איתי, יובל..."
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-white mb-2">קוד החדר שקיבלת מהחבר:</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="למשל: AB39X"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-4 text-center text-2xl font-mono font-bold tracking-widest text-amber-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500 uppercase"
                  />
                  <Key className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-xs text-slate-400 mt-2 text-center">
                  הקוד מכיל 5 תווים באנגלית או ספרות
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white font-extrabold text-base flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-600/30"
              >
                <span>הצטרף למשחק עכשיו</span>
                <Play className="w-4 h-4 fill-current rotate-180" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
