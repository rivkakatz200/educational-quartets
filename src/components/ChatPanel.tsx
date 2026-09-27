import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types/game';
import { Send, MessageSquare, ChevronDown, ChevronUp, Sparkles, Smile } from 'lucide-react';
import { sounds } from '../utils/sound';

interface ChatPanelProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (text: string) => void;
  isOpen?: boolean;
  onToggleOpen?: () => void;
}

const QUICK_REACTIONS = [
  'יש לי! 😉',
  'אין לי, קח מהקופה! ❌',
  'כל הכבוד! 🎉',
  'משחק מצוין! 👏',
  'מחכה לתורך ⏳',
  'כמעט השלמתי רביעייה! 🃏',
];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  currentUserId,
  onSendMessage,
  isOpen = true,
  onToggleOpen,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMsgCount = useRef(messages.length);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (messages.length > lastMsgCount.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.senderId !== currentUserId && lastMsg.type === 'chat') {
        sounds.playChat();
      }
      lastMsgCount.current = messages.length;
    }
  }, [messages, currentUserId]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const handleQuickReaction = (reaction: string) => {
    onSendMessage(reaction);
  };

  return (
    <div
      dir="rtl"
      className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl flex flex-col overflow-hidden backdrop-blur-md h-full min-h-0"
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-800 bg-slate-850/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-xs">צ'אט המשחק</h3>
          </div>
        </div>

        {onToggleOpen && (
          <button
            onClick={onToggleOpen}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {isOpen && (
        <>
          {/* Messages Body */}
          <div className="flex-1 min-h-0 p-2.5 overflow-y-auto space-y-2 text-xs scrollbar-thin scrollbar-thumb-slate-700">
            {messages.length === 0 && (
              <div className="text-center py-6 text-slate-500 text-xs">
                אין הודעות עדיין. שלחו הודעה או תגובה מהירה ליריב!
              </div>
            )}

            {messages.map((msg) => {
              const isMe = msg.senderId === currentUserId;
              const isSystem = msg.type === 'system';
              const isAction = msg.type === 'action';

              if (isSystem) {
                return (
                  <div
                    key={msg.id}
                    className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-750 text-center text-slate-300 text-[10px] leading-tight"
                  >
                    {msg.text}
                  </div>
                );
              }

              if (isAction) {
                return (
                  <div
                    key={msg.id}
                    className="p-1.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 text-[11px] leading-tight"
                  >
                    <span className="font-bold text-white block mb-0.5">{msg.senderName}:</span>
                    <span>{msg.text}</span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-start' : 'items-end'}`}
                >
                  <div className="flex items-center gap-1 mb-0.5 px-1">
                    <span className="text-[10px] font-bold text-slate-400">
                      {isMe ? 'אני' : msg.senderName}
                    </span>
                    <span className="text-[9px] text-slate-500">
                      {new Date(msg.timestamp).toLocaleTimeString('he-IL', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div
                    className={`px-2.5 py-1.5 rounded-xl max-w-[88%] break-words text-xs shadow-xs ${
                      isMe
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-slate-800 border border-slate-700 text-slate-100 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Reaction Pills */}
          <div className="px-2 py-1 border-t border-slate-800 bg-slate-900/60 shrink-0">
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
              {QUICK_REACTIONS.map((reaction, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickReaction(reaction)}
                  className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-[10px] whitespace-nowrap transition-colors"
                >
                  {reaction}
                </button>
              ))}
            </div>
          </div>

          {/* Input Box */}
          <form
            onSubmit={handleSend}
            className="p-2 border-t border-slate-800 bg-slate-850/80 flex items-center gap-1.5 shrink-0"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="כתבו הודעה..."
              maxLength={200}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
              title="שלח"
            >
              <Send className="w-3.5 h-3.5 rotate-180" />
            </button>
          </form>
        </>
      )}
    </div>
  );
};
