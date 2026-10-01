/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { RulesModal } from './components/RulesModal';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { RoomState, QuartetGroup } from './types/game';
import { sounds } from './utils/sound';
import confetti from 'canvas-confetti';
import { AlertCircle, CheckCircle2, LogIn, User } from 'lucide-react';

export default function App() {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);

  const [linkRoomCode, setLinkRoomCode] = useState<string | null>(null);
  const [linkNameInput, setLinkNameInput] = useState('');
  const [linkNameError, setLinkNameError] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevQuartetsCount = useRef<number>(0);

  const showToast = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  }, []);

  // Initialize and maintain WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      console.log('Connected to real-time game server');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'room:state') {
          const newRoom: RoomState = data.room;
          // Update URL to reflect current room
          const url = new URL(window.location.href);
          if (newRoom.code && url.searchParams.get('room') !== newRoom.code) {
            url.searchParams.set('room', newRoom.code);
            window.history.replaceState({}, '', url.toString());
          }

          // Sound triggers on game events
          if (newRoom.self) {
            const currentQuartetsCount = newRoom.self.completedQuartets.length;
            if (currentQuartetsCount > prevQuartetsCount.current) {
              sounds.playQuartet();
              confetti({
                particleCount: 80,
                spread: 60,
                origin: { y: 0.7 },
              });
              showToast('🎉 כל הכבוד! השלמת רביעייה חדשה!', 'success');
              prevQuartetsCount.current = currentQuartetsCount;
            }
          }

          setRoomState(newRoom);
        } else if (data.type === 'error') {
          showToast(data.message, 'error');
        }
      } catch (err) {
        console.error('Error parsing message from server:', err);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      // Auto-reconnect after 2 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 2000);
    };

    socket.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
  }, [showToast]);

  useEffect(() => {
    connectWebSocket();

    // Detect ?room=CODE in URL — show name prompt instead of auto-joining
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
      const savedName = (() => { try { return localStorage.getItem('reviyot_player_name') || ''; } catch { return ''; } })();
      setLinkRoomCode(roomParam.toUpperCase());
      setLinkNameInput(savedName);
    }

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectWebSocket]);

  // Send message helper
  const sendSocketMessage = useCallback((payload: Record<string, any>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    } else {
      showToast('מתחבר מחדש לשרת, אנא נסו שוב בעוד רגע...', 'error');
    }
  }, [showToast]);

  // Action handlers
  const handleCreateRoom = (playerName: string, quartets: QuartetGroup[]) => {
    sendSocketMessage({
      type: 'room:create',
      playerName,
      quartets,
    });
  };

  const handleJoinRoom = (roomCode: string, playerName: string) => {
    sendSocketMessage({
      type: 'room:join',
      roomCode,
      playerName,
    });
  };

  const handleStartGame = () => {
    sendSocketMessage({ type: 'game:start' });
  };

  const handleDrawInitial = () => {
    sendSocketMessage({ type: 'game:draw_initial' });
  };

  const handleDrawAllInitial = () => {
    sendSocketMessage({ type: 'game:draw_all_initial' });
  };

  const handleDrawCard = () => {
    sendSocketMessage({ type: 'game:draw_turn' });
  };

  // Two-Step Asking Handlers
  const handleAskCategory = (targetGroupId: string) => {
    sendSocketMessage({
      type: 'game:ask_category',
      targetGroupId,
    });
  };

  const handleAskSpecificCard = (targetGroupId: string, targetCardName: string) => {
    sendSocketMessage({
      type: 'game:ask_specific_card',
      targetGroupId,
      targetCardName,
    });
  };

  const handleRespondCategory = (hasCategory: boolean) => {
    sendSocketMessage({
      type: 'game:respond_category',
      hasCategory,
    });
  };

  const handleRespondCard = (hasCard: boolean) => {
    sendSocketMessage({
      type: 'game:respond_card',
      hasCard,
    });
  };

  const handleSendMessage = (text: string) => {
    sendSocketMessage({
      type: 'chat:send',
      text,
    });
  };

  const handleRestartGame = () => {
    sendSocketMessage({ type: 'game:restart' });
  };

  const handleLeaveRoom = () => {
    setRoomState(null);
    setLinkRoomCode(null);
    prevQuartetsCount.current = 0;
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.pushState({}, '', url.toString());
  };

  const handleLinkJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = linkNameInput.trim();
    if (!name) { setLinkNameError('נא להזין שם לפני הכניסה'); return; }
    try { localStorage.setItem('reviyot_player_name', name); } catch {}
    setLinkNameError('');
    sendSocketMessage({ type: 'room:join', roomCode: linkRoomCode!, playerName: name });
    setLinkRoomCode(null);
  };

  return (
    <div className="h-screen max-h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-['Assistant',sans-serif]">
      {/* Rules Modal */}
      <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />

      {/* Global Toast */}
      {toast && (
        <div
          dir="rtl"
          className="fixed top-14 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200"
        >
          <div
            className={`px-4 py-2 rounded-xl shadow-2xl border flex items-center gap-2 text-xs sm:text-sm font-bold backdrop-blur-md ${
              toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                : toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                : 'bg-indigo-950/90 border-indigo-500/50 text-indigo-200'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        roomCode={roomState?.code}
        playerName={roomState?.self?.name}
        isHost={roomState?.self?.isHost}
        isConnected={isConnected}
        onOpenRules={() => setRulesOpen(true)}
        onLeaveRoom={roomState ? handleLeaveRoom : undefined}
      />

      {/* Direct-link name prompt — shown when ?room=CODE is in URL and user hasn't joined yet */}
      {linkRoomCode && !roomState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-sm p-4" dir="rtl">
          <form
            onSubmit={handleLinkJoinSubmit}
            className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30">
                <LogIn className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="font-extrabold text-white text-base">הצטרפות לחדר משחק</h2>
                <p className="text-xs text-slate-400">קוד חדר: <span className="font-mono font-bold text-amber-300">{linkRoomCode}</span></p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">השם שלך במשחק:</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  maxLength={20}
                  value={linkNameInput}
                  onChange={(e) => { setLinkNameInput(e.target.value); setLinkNameError(''); }}
                  placeholder="למשל: נועה, דניאל, רועי..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-9 pl-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                />
              </div>
              {linkNameError && <p className="text-rose-400 text-xs mt-1.5 font-semibold">{linkNameError}</p>}
            </div>

            <button
              type="submit"
              disabled={!isConnected}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/30 active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              {isConnected ? 'כניסה לחדר המשחק' : 'מתחבר לשרת...'}
            </button>
          </form>
        </div>
      )}

      {/* Main View: Single screen layout (Lobby or GameBoard) */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {!roomState || roomState.status === 'lobby' ? (
          <div className="h-full overflow-y-auto">
            <Lobby
              onCreateRoom={handleCreateRoom}
              onJoinRoom={handleJoinRoom}
              roomCode={roomState?.code}
              isHost={roomState?.self?.isHost}
              playersCount={roomState?.playerOrder.length || 0}
              opponentName={roomState?.opponent?.name}
              quartets={roomState?.quartets || []}
              onStartGame={handleStartGame}
            />
          </div>
        ) : (
          <GameBoard
            roomState={roomState}
            onDrawInitial={handleDrawInitial}
            onDrawAllInitial={handleDrawAllInitial}
            onDrawCard={handleDrawCard}
            onAskCategory={handleAskCategory}
            onAskSpecificCard={handleAskSpecificCard}
            onRespondCategory={handleRespondCategory}
            onRespondCard={handleRespondCard}
            onSendMessage={handleSendMessage}
            onRestartGame={handleRestartGame}
            onExitGame={handleLeaveRoom}
          />
        )}
      </main>
    </div>
  );
}
