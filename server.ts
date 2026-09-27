import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { PREDEFINED_DECKS } from './src/data/defaultDecks.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface CardItem {
  id: string;
  name: string;
  description: string;
}

interface QuartetGroup {
  id: string;
  title: string;
  themeColor: string;
  icon?: string;
  cards: CardItem[];
}

interface Card {
  id: string;
  groupId: string;
  groupTitle: string;
  name: string;
  description: string;
  themeColor: string;
  allGroupCardNames: string[];
}

interface Player {
  id: string;
  name: string;
  isHost: boolean;
  hand: Card[];
  completedQuartets: QuartetGroup[];
  initialDrawnCount: number;
  connected: boolean;
  ws?: WebSocket;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  type: 'chat' | 'system' | 'action';
}

interface CardAskRequest {
  stage: 'category' | 'card';
  fromPlayerId: string;
  fromPlayerName: string;
  toPlayerId: string;
  toPlayerName: string;
  targetGroupId: string;
  targetGroupTitle: string;
  targetCardName?: string;
  status: 'pending_category' | 'pending_card_selection' | 'pending_card' | 'success' | 'failed';
  resultMessage?: string;
}

interface Room {
  code: string;
  hostId: string;
  status: 'lobby' | 'initial_draw' | 'playing' | 'game_over';
  quartets: QuartetGroup[];
  deck: Card[];
  players: Record<string, Player>;
  playerOrder: string[];
  turnPlayerId: string;
  cardsReceivedThisTurn: number;
  activeAsk: CardAskRequest | null;
  lastAction: string | null;
  winnerId: string | null;
  messages: ChatMessage[];
  createdAt: number;
}


const rooms = new Map<string, Room>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildDeckFromQuartets(quartets: QuartetGroup[]): Card[] {
  const cards: Card[] = [];
  quartets.forEach((group) => {
    const allNames = group.cards.map((c) => c.name);
    group.cards.forEach((cardItem) => {
      cards.push({
        id: `${group.id}_${cardItem.id}_${Math.random().toString(36).substring(2, 6)}`,
        groupId: group.id,
        groupTitle: group.title,
        name: cardItem.name,
        description: cardItem.description,
        themeColor: group.themeColor || 'blue',
        allGroupCardNames: allNames,
      });
    });
  });
  return shuffleArray(cards);
}

function checkForCompletedQuartets(player: Player, room: Room): QuartetGroup[] {
  const completedList: QuartetGroup[] = [];
  const groupCounts = new Map<string, Card[]>();

  player.hand.forEach((card) => {
    const list = groupCounts.get(card.groupId) || [];
    list.push(card);
    groupCounts.set(card.groupId, list);
  });

  for (const [groupId, cardsInGroup] of groupCounts.entries()) {
    if (cardsInGroup.length === 4) {
      // Find original group definition
      const quartetDef = room.quartets.find((q) => q.id === groupId);
      if (quartetDef) {
        // Remove 4 cards from hand
        player.hand = player.hand.filter((c) => c.groupId !== groupId);
        player.completedQuartets.push(quartetDef);
        completedList.push(quartetDef);

        // Add action message
        room.messages.push({
          id: `sys_${Date.now()}_${Math.random()}`,
          senderId: 'system',
          senderName: 'מערכת המשחק',
          text: `🎉 ${player.name} השלים רביעייה: "${quartetDef.title}"! (+1 נקודה)`,
          timestamp: Date.now(),
          type: 'action',
        });
      }
    }
  }

  return completedList;
}

function checkGameOver(room: Room): boolean {
  const totalQuartets = room.quartets.length;
  let collected = 0;
  for (const pid of room.playerOrder) {
    collected += (room.players[pid]?.completedQuartets || []).length;
  }

  // End if all quartets collected, or deck is empty and players have 0 cards
  const deckEmpty = room.deck.length === 0;
  const handsEmpty = room.playerOrder.every((pid) => (room.players[pid]?.hand.length || 0) === 0);

  if (collected >= totalQuartets || (deckEmpty && handsEmpty)) {
    room.status = 'game_over';
    // Decide winner
    const p1 = room.players[room.playerOrder[0]];
    const p2 = room.players[room.playerOrder[1]];
    if (p1 && p2) {
      if (p1.completedQuartets.length > p2.completedQuartets.length) {
        room.winnerId = p1.id;
      } else if (p2.completedQuartets.length > p1.completedQuartets.length) {
        room.winnerId = p2.id;
      } else {
        room.winnerId = 'tie';
      }
    }
    return true;
  }
  return false;
}

function broadcastRoomState(room: Room) {
  for (const playerId of room.playerOrder) {
    const player = room.players[playerId];
    if (!player || !player.ws || player.ws.readyState !== WebSocket.OPEN) continue;

    const opponentId = room.playerOrder.find((id) => id !== playerId);
    const opponent = opponentId ? room.players[opponentId] : null;

    const payload = {
      type: 'room:state',
      room: {
        code: room.code,
        hostId: room.hostId,
        status: room.status,
        quartets: room.quartets,
        deckCount: room.deck.length,
        turnPlayerId: room.turnPlayerId,
        playerOrder: room.playerOrder,
        cardsReceivedThisTurn: room.cardsReceivedThisTurn || 0,
        activeAsk: room.activeAsk,
        lastAction: room.lastAction,
        winnerId: room.winnerId,
        messages: room.messages,
        createdAt: room.createdAt,
        self: {
          id: player.id,
          name: player.name,
          isHost: player.isHost,
          cardsCount: player.hand.length,
          hand: player.hand,
          completedQuartets: player.completedQuartets,
          initialDrawnCount: player.initialDrawnCount,
          connected: player.connected,
        },
        opponent: opponent
          ? {
              id: opponent.id,
              name: opponent.name,
              isHost: opponent.isHost,
              cardsCount: opponent.hand.length,
              completedQuartets: opponent.completedQuartets,
              initialDrawnCount: opponent.initialDrawnCount,
              connected: opponent.connected,
            }
          : null,
      },
    };

    player.ws.send(JSON.stringify(payload));
  }
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  app.use(express.json());

  // API to generate quartets from custom study material using Gemini
  app.post('/api/generate-quartets', async (req, res) => {
    try {
      const { topicOrText, count = 4 } = req.body;
      if (!topicOrText || typeof topicOrText !== 'string' || topicOrText.trim().length === 0) {
        return res.status(400).json({ error: 'נא להזין נושא או חומר לימוד' });
      }

      const prompt = `אתה מומחה פדגוגי ויוצר משחקי קלפים לימודיים.
המשתמש הזין חומר לימוד או נושא ללמידה:
"""
${topicOrText.trim()}
"""

עליך לנתח את חומר הלימוד וליצור ממנו בדיוק ${Math.min(Math.max(count, 3), 6)} רביעיות לימודיות (Quartets) בעברית צחה.
כללי המשחק:
1. כל רביעייה (group) מייצגת קטגוריה או נושא משותף ברור (למשל: "איברי נשימה", "קרבות הכרעה", "מבני נתונים לינאריים", "שפות תכנות עיליות").
2. כל רביעייה חייבת להכיל בדיוק 4 פריטים/קלפים (cards).
3. לכל פריט יש:
   - name: שם קצר וברור של הפריט (למשל "ריאות", "מבצע קדש", "מחסנית LIFO", "פייתון").
   - description: הסבר לימודי תמציתי ומדויק בן משפט אחד עד שניים (עובדה חשובה, הגדרה או תפקיד).
4. בחר לכל רביעייה צבע מתוך: blue, emerald, amber, purple, rose, cyan, indigo, orange.`;

      const hasValidKey =
        Boolean(process.env.GEMINI_API_KEY &&
        process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
        process.env.GEMINI_API_KEY.length > 5);

      if (hasValidKey) {
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Gemini generation timeout')), 10000)
          );

          const geminiPromise = ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.ARRAY,
                description: 'רשימת רביעיות לימודיות',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: {
                      type: Type.STRING,
                      description: 'שם הנושא או הקטגוריה של הרביעייה',
                    },
                    themeColor: {
                      type: Type.STRING,
                      description: 'צבע הנושא: blue, emerald, amber, purple, rose, cyan, indigo, orange',
                    },
                    cards: {
                      type: Type.ARRAY,
                      description: 'בדיוק 4 קלפים ברביעייה',
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: {
                            type: Type.STRING,
                            description: 'שם הפריט/הקלף',
                          },
                          description: {
                            type: Type.STRING,
                            description: 'הסבר תמציתי ומחכים על הפריט',
                          },
                        },
                        required: ['name', 'description'],
                      },
                    },
                  },
                  required: ['title', 'themeColor', 'cards'],
                },
              },
            },
          });

          const response = await Promise.race([geminiPromise, timeoutPromise]);
          const rawJson = response.text?.trim() || '[]';
          const parsed = JSON.parse(rawJson);

          const formatted: QuartetGroup[] = parsed.map((grp: any, gIdx: number) => ({
            id: `grp_${Date.now()}_${gIdx}`,
            title: grp.title || `סדרה ${gIdx + 1}`,
            themeColor: grp.themeColor || 'blue',
            cards: (grp.cards || []).slice(0, 4).map((c: any, cIdx: number) => ({
              id: `c_${gIdx}_${cIdx}`,
              name: c.name || `פריט ${cIdx + 1}`,
              description: c.description || 'הסבר לימודי',
            })),
          }));

          const validGroups = formatted.filter((g) => g.cards.length === 4);
          if (validGroups.length >= 2) {
            return res.json({ quartets: validGroups });
          }
        } catch (geminiErr) {
          console.warn('Gemini request bypassed or failed, using contextual generator:', geminiErr);
        }
      }

      // Contextual Smart Fallback: generate quartets from the user's input topic
      const colors = ['blue', 'emerald', 'amber', 'purple', 'rose', 'cyan', 'indigo', 'orange'];
      const lines = topicOrText
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 1);

      // Match against predefined keywords or create dynamic groups
      const matchedPreset = PREDEFINED_DECKS.find((d) =>
        topicOrText.includes(d.name) || topicOrText.includes(d.category)
      );

      if (matchedPreset) {
        return res.json({ quartets: matchedPreset.quartets });
      }

      // Generate dynamic quartets based on user's topic words
      const topicName = topicOrText.slice(0, 30).trim();
      const generatedQuartets: QuartetGroup[] = [
        {
          id: `dyn_g1_${Date.now()}`,
          title: `יסודות ומושגי מפתח: ${topicName}`,
          themeColor: colors[0],
          cards: [
            { id: 'dc_1_1', name: lines[0] || 'מושג יסוד 1', description: `עקרון מרכזי וחשוב מתוך חומר הלימוד: ${lines[0] || topicName}` },
            { id: 'dc_1_2', name: lines[1] || 'מושג יסוד 2', description: `הגדרה מקיפה ותפקיד ראשי בנושא הנלמד.` },
            { id: 'dc_1_3', name: lines[2] || 'מושג יסוד 3', description: `מאפיין מהותי המשמש להבנת התחום.` },
            { id: 'dc_1_4', name: lines[3] || 'מושג יסוד 4', description: `דוגמה מעשית ויישום מרכזי של החומר.` },
          ],
        },
        {
          id: `dyn_g2_${Date.now()}`,
          title: `עקרונות מתקדמים ויישומים`,
          themeColor: colors[1],
          cards: [
            { id: 'dc_2_1', name: lines[4] || 'עיקרון פעולה', description: `הסבר מעמיק על אופן הפעולה והשלכותיו.` },
            { id: 'dc_2_2', name: lines[5] || 'מנגנון מרכזי', description: `תהליך עיקרי או נוסחה המאפיינת את הנושא.` },
            { id: 'dc_2_3', name: lines[6] || 'גורם משפיע', description: `משתנה קריטי המשפיע על תוצאות המערכת.` },
            { id: 'dc_2_4', name: lines[7] || 'מסקנה לימודית', description: `תובנה מרכזית הנדרשת לבחינה או ליישום.` },
          ],
        },
        {
          id: `dyn_g3_${Date.now()}`,
          title: `היבטים משלימים וחקר`,
          themeColor: colors[2],
          cards: [
            { id: 'dc_3_1', name: lines[8] || 'שלב ראשוני', description: `התפתחות מוקדמת או רקע היסטורי חשוב.` },
            { id: 'dc_3_2', name: lines[9] || 'גורם מקשר', description: `הקשר בין מושג זה לשאר פרקי הלימוד.` },
            { id: 'dc_3_3', name: lines[10] || 'דוגמת בוחן', description: `שאלה אופיינית ונקודת מפתח שכדאי לזכור.` },
            { id: 'dc_3_4', name: lines[11] || 'סיכום מסגרת', description: `ריכוז כלל המרכיבים לפתרון תרגילים בנושא.` },
          ],
        },
      ];

      return res.json({ quartets: generatedQuartets });
    } catch (err: any) {
      console.error('Server generate error:', err);
      res.status(500).json({ error: 'שגיאה בעיבוד חומר הלימוד' });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', activeRooms: rooms.size });
  });

  // WebSocket handling
  wss.on('connection', (ws) => {
    let currentRoomCode: string | null = null;
    let currentPlayerId: string | null = null;

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        const { type } = message;

        // 1. Create room
        if (type === 'room:create') {
          const { playerName, quartets, presetId } = message;
          let selectedQuartets: QuartetGroup[] = quartets;
          if (!selectedQuartets || selectedQuartets.length < 2) {
            const foundPreset = PREDEFINED_DECKS.find((p) => p.id === presetId) || PREDEFINED_DECKS[0];
            selectedQuartets = foundPreset.quartets;
          }

          const roomCode = generateRoomCode();
          const playerId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

          const newPlayer: Player = {
            id: playerId,
            name: (playerName || 'שחקן 1').trim(),
            isHost: true,
            hand: [],
            completedQuartets: [],
            initialDrawnCount: 0,
            connected: true,
            ws,
          };

          const room: Room = {
            code: roomCode,
            hostId: playerId,
            status: 'lobby',
            quartets: selectedQuartets,
            deck: [],
            players: { [playerId]: newPlayer },
            playerOrder: [playerId],
            turnPlayerId: playerId,
            cardsReceivedThisTurn: 0,
            activeAsk: null,
            lastAction: 'חדר המשחק נוצר',
            winnerId: null,
            messages: [
              {
                id: `msg_${Date.now()}`,
                senderId: 'system',
                senderName: 'מערכת המשחק',
                text: `ברוכים הבאים לחדר ${roomCode}! ממתינים לשחקן השני שיצטרף...`,
                timestamp: Date.now(),
                type: 'system',
              },
            ],
            createdAt: Date.now(),
          };

          rooms.set(roomCode, room);
          currentRoomCode = roomCode;
          currentPlayerId = playerId;

          ws.send(JSON.stringify({ type: 'room:created', roomCode, playerId }));
          broadcastRoomState(room);
          return;
        }

        // 2. Join room
        if (type === 'room:join') {
          const { roomCode, playerName } = message;
          const cleanCode = (roomCode || '').toUpperCase().trim();
          const room = rooms.get(cleanCode);

          if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: 'קוד חדר לא נמצא. אנא ודא שהקוד נכון.' }));
            return;
          }

          // Check if reconnecting
          const existingPlayer = Object.values(room.players).find(
            (p) => p.name === playerName || (!p.connected && room.playerOrder.includes(p.id))
          );

          if (existingPlayer) {
            existingPlayer.connected = true;
            existingPlayer.ws = ws;
            currentRoomCode = cleanCode;
            currentPlayerId = existingPlayer.id;

            room.messages.push({
              id: `msg_${Date.now()}`,
              senderId: 'system',
              senderName: 'מערכת המשחק',
              text: `${existingPlayer.name} התחבר מחדש למשחק.`,
              timestamp: Date.now(),
              type: 'system',
            });

            broadcastRoomState(room);
            return;
          }

          if (room.playerOrder.length >= 2) {
            ws.send(JSON.stringify({ type: 'error', message: 'החדר מלא (מקסימום 2 שחקנים במשחק).' }));
            return;
          }

          const playerId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const newPlayer: Player = {
            id: playerId,
            name: (playerName || 'שחקן 2').trim(),
            isHost: false,
            hand: [],
            completedQuartets: [],
            initialDrawnCount: 0,
            connected: true,
            ws,
          };

          room.players[playerId] = newPlayer;
          room.playerOrder.push(playerId);
          currentRoomCode = cleanCode;
          currentPlayerId = playerId;

          room.messages.push({
            id: `msg_${Date.now()}`,
            senderId: 'system',
            senderName: 'מערכת המשחק',
            text: `🎉 ${newPlayer.name} הצטרף למשחק! שני השחקנים מוכנים.`,
            timestamp: Date.now(),
            type: 'system',
          });

          broadcastRoomState(room);
          return;
        }

        // Must have room and player for rest of actions
        if (!currentRoomCode || !currentPlayerId) return;
        const room = rooms.get(currentRoomCode);
        if (!room) return;
        const player = room.players[currentPlayerId];
        if (!player) return;

        // 3. Update quartets (in lobby)
        if (type === 'room:update_quartets') {
          if (!player.isHost || room.status !== 'lobby') return;
          const { quartets } = message;
          if (Array.isArray(quartets) && quartets.length >= 2) {
            room.quartets = quartets;
            room.messages.push({
              id: `msg_${Date.now()}`,
              senderId: 'system',
              senderName: 'מערכת המשחק',
              text: 'חומר הלימוד והרביעיות עודכנו על ידי המנהל.',
              timestamp: Date.now(),
              type: 'system',
            });
            broadcastRoomState(room);
          }
          return;
        }

        // 4. Start Game
        if (type === 'game:start') {
          if (!player.isHost) return;
          if (room.playerOrder.length < 2) {
            ws.send(JSON.stringify({ type: 'error', message: 'נדרשים 2 שחקנים כדי להתחיל את המשחק.' }));
            return;
          }

          // Build and shuffle deck
          room.deck = buildDeckFromQuartets(room.quartets);

          // Reset players' hands
          for (const pid of room.playerOrder) {
            room.players[pid].hand = [];
            room.players[pid].completedQuartets = [];
            room.players[pid].initialDrawnCount = 0;
          }

          room.status = 'initial_draw';
          room.winnerId = null;
          room.activeAsk = null;
          room.turnPlayerId = room.playerOrder[0];
          room.cardsReceivedThisTurn = 0;
          room.lastAction = 'המשחק החל! כל שחקן מושך 4 קלפים ראשוניים מהקופה.';

          room.messages.push({
            id: `msg_${Date.now()}`,
            senderId: 'system',
            senderName: 'מערכת המשחק',
            text: '🃏 המשחק התחיל! לחצו על הקופה שבמרכז השולחן כדי למשוך את 4 קלפי הפתיחה שלכם.',
            timestamp: Date.now(),
            type: 'system',
          });

          broadcastRoomState(room);
          return;
        }

        // 5. Draw initial card (Requirement 3: "At the start, players draw 4 initial cards from the central deck by clicking it")
        if (type === 'game:draw_initial') {
          if (room.status !== 'initial_draw') return;
          if (player.initialDrawnCount >= 4) return;
          if (room.deck.length === 0) return;

          const card = room.deck.pop();
          if (card) {
            player.hand.push(card);
            player.initialDrawnCount += 1;
            room.lastAction = `${player.name} משך קלף פתיחה (${player.initialDrawnCount}/4)`;

            // Check if player completed a quartet right away
            checkForCompletedQuartets(player, room);

            // Check if both players drew their 4 initial cards
            const allDrawn = room.playerOrder.every((pid) => room.players[pid].initialDrawnCount >= 4);
            if (allDrawn) {
              room.status = 'playing';
              room.lastAction = `כל השחקנים משכו 4 קלפים! תורו של ${room.players[room.turnPlayerId].name} לשאול קלף.`;
              room.messages.push({
                id: `msg_${Date.now()}`,
                senderId: 'system',
                senderName: 'מערכת המשחק',
                text: `✅ כולם מוכנים! תורו של ${room.players[room.turnPlayerId].name} לשאול את היריב.`,
                timestamp: Date.now(),
                type: 'system',
              });
            }

            broadcastRoomState(room);
          }
          return;
        }

        // 5.5 Fast draw all initial cards helper
        if (type === 'game:draw_all_initial') {
          if (room.status !== 'initial_draw') return;
          while (player.initialDrawnCount < 4 && room.deck.length > 0) {
            const card = room.deck.pop();
            if (card) {
              player.hand.push(card);
              player.initialDrawnCount += 1;
            }
          }
          checkForCompletedQuartets(player, room);

          const allDrawn = room.playerOrder.every((pid) => room.players[pid].initialDrawnCount >= 4);
          if (allDrawn) {
            room.status = 'playing';
            room.lastAction = `כל השחקנים משכו 4 קלפים! תורו של ${room.players[room.turnPlayerId].name}.`;
            room.messages.push({
              id: `msg_${Date.now()}`,
              senderId: 'system',
              senderName: 'מערכת המשחק',
              text: `✅ כולם מוכנים! תורו של ${room.players[room.turnPlayerId].name} לשאול את היריב.`,
              timestamp: Date.now(),
              type: 'system',
            });
          }
          broadcastRoomState(room);
          return;
        }

        // 6. Step 1: Ask about General Category/Theme (Two-step mechanism)
        if (type === 'game:ask_category') {
          if (room.status !== 'playing') return;
          if (room.turnPlayerId !== player.id) {
            ws.send(JSON.stringify({ type: 'error', message: 'זה אינו תורך כרגע.' }));
            return;
          }

          const { targetGroupId } = message;
          const opponentId = room.playerOrder.find((id) => id !== player.id);
          if (!opponentId) return;
          const opponent = room.players[opponentId];
          if (!opponent) return;

          const group = room.quartets.find((q) => q.id === targetGroupId);
          if (!group) return;

          // Rule: To ask for a category, player must hold at least 1 card in that category
          const ownsCardInGroup = player.hand.some((c) => c.groupId === targetGroupId);
          if (!ownsCardInGroup) {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: 'לפי חוקי הרביעיות, ניתן לשאול רק על סדרה שיש לך לפחות קלף אחד ממנה ביד!',
              })
            );
            return;
          }

          // Set activeAsk to Category Stage
          room.activeAsk = {
            stage: 'category',
            fromPlayerId: player.id,
            fromPlayerName: player.name,
            toPlayerId: opponent.id,
            toPlayerName: opponent.name,
            targetGroupId,
            targetGroupTitle: group.title,
            status: 'pending_category',
          };

          room.lastAction = `${player.name} שאל את ${opponent.name}: "האם יש לך קלפים מסדרת '${group.title}'?"`;

          room.messages.push({
            id: `msg_${Date.now()}`,
            senderId: player.id,
            senderName: player.name,
            text: `❓ [שלב 1/2] שואל את ${opponent.name}: "האם יש לך קלפים מסדרת '${group.title}'?"`,
            timestamp: Date.now(),
            type: 'action',
          });

          broadcastRoomState(room);
          return;
        }

        // 7. Step 1 Response: Opponent confirms or denies having cards in requested category
        if (type === 'game:respond_category') {
          if (room.status !== 'playing' || !room.activeAsk) return;
          if (room.activeAsk.toPlayerId !== player.id || room.activeAsk.stage !== 'category') return;

          const { hasCategory } = message;
          const askerId = room.activeAsk.fromPlayerId;
          const asker = room.players[askerId];
          if (!asker) return;

          const groupTitle = room.activeAsk.targetGroupTitle;
          const targetGroupId = room.activeAsk.targetGroupId;
          const respondentActuallyHas = player.hand.some((c) => c.groupId === targetGroupId);

          if (hasCategory && respondentActuallyHas) {
            // Stage 1 Succeeded! Opponent confirms having cards belonging to this category.
            // Move to Stage 2: Asker will now pick a specific card from this category.
            room.activeAsk.stage = 'card';
            room.activeAsk.status = 'pending_card_selection';
            room.activeAsk.resultMessage = `${player.name} אישר: יש לו קלפים מסדרת "${groupTitle}"! כעת בחר איזה קלף לבקש.`;
            room.lastAction = `✅ ${player.name} אישר שיש לו קלפים מסדרת '${groupTitle}'. כעת ${asker.name} בוחר קלף ספציפי מהסדרה.`;

            room.messages.push({
              id: `msg_${Date.now()}`,
              senderId: player.id,
              senderName: player.name,
              text: `✅ "כן, יש לי קלפים מסדרת '${groupTitle}'!" (ממתין לבחירת קלף ספציפי)`,
              timestamp: Date.now(),
              type: 'action',
            });

            broadcastRoomState(room);
          } else {
            // Stage 1 Failed: Opponent has no cards belonging to this category.
            room.activeAsk.status = 'failed';
            room.activeAsk.resultMessage = `ליריב אין קלפים מסדרת "${groupTitle}".`;

            let drawNote = '';
            // Requirement 4: Deck Draw Rule at End of Turn:
            // Drawing cards from the central deck happens at the end of a turn ONLY IF the player did NOT receive any cards from the opponent during that entire turn.
            if (room.cardsReceivedThisTurn === 0) {
              if (room.deck.length > 0) {
                const drawn = room.deck.pop();
                if (drawn) {
                  asker.hand.push(drawn);
                  drawNote = ` ${asker.name} לא קיבל קלפים בתור זה ומשך קלף מהקופה.`;
                  checkForCompletedQuartets(asker, room);
                }
              } else {
                drawNote = ' הקופה ריקה.';
              }
            } else {
              drawNote = ` ${asker.name} קיבל קלפים בתור זה ולכן אינו מושך מהקופה.`;
            }

            // Turn passes to opponent! Reset cardsReceivedThisTurn for next turn.
            room.turnPlayerId = player.id;
            room.cardsReceivedThisTurn = 0;
            room.lastAction = `❌ ל-${player.name} אין קלפים מסדרת '${groupTitle}'.${drawNote} התור עבר ל-${player.name}.`;

            room.messages.push({
              id: `msg_${Date.now()}`,
              senderId: player.id,
              senderName: player.name,
              text: `❌ "אין לי קלפים מסדרה זו!" -${drawNote} התור עובר ל-${player.name}.`,
              timestamp: Date.now(),
              type: 'action',
            });

            setTimeout(() => {
              if (room.activeAsk?.status === 'failed') {
                room.activeAsk = null;
                broadcastRoomState(room);
              }
            }, 3000);

            checkGameOver(room);
            broadcastRoomState(room);
          }
          return;
        }

        // 8. Step 2: Ask for Specific Card (Sub-category/Card)
        if (type === 'game:ask_card' || type === 'game:ask_specific_card') {
          if (room.status !== 'playing') return;
          if (room.turnPlayerId !== player.id) {
            ws.send(JSON.stringify({ type: 'error', message: 'זה אינו תורך כרגע.' }));
            return;
          }

          const { targetGroupId, targetCardName } = message;
          const opponentId = room.playerOrder.find((id) => id !== player.id);
          if (!opponentId) return;
          const opponent = room.players[opponentId];
          if (!opponent) return;

          const group = room.quartets.find((q) => q.id === targetGroupId);
          if (!group) return;

          room.activeAsk = {
            stage: 'card',
            fromPlayerId: player.id,
            fromPlayerName: player.name,
            toPlayerId: opponent.id,
            toPlayerName: opponent.name,
            targetGroupId,
            targetGroupTitle: group.title,
            targetCardName,
            status: 'pending_card',
          };

          room.lastAction = `${player.name} שאל את ${opponent.name}: "האם יש לך את '${targetCardName}' מסדרת '${group.title}'?"`;

          room.messages.push({
            id: `msg_${Date.now()}`,
            senderId: player.id,
            senderName: player.name,
            text: `❓ [שלב 2/2] שואל את ${opponent.name}: "האם יש לך את הקלף '${targetCardName}' מסדרת '${group.title}'?"`,
            timestamp: Date.now(),
            type: 'action',
          });

          broadcastRoomState(room);
          return;
        }

        // 9. Step 2 Response: Opponent transfers card or declares they don't have it
        if (type === 'game:respond_card') {
          if (room.status !== 'playing' || !room.activeAsk) return;
          if (room.activeAsk.toPlayerId !== player.id || room.activeAsk.stage !== 'card') return;

          const { hasCard } = message;
          const askerId = room.activeAsk.fromPlayerId;
          const asker = room.players[askerId];
          if (!asker) return;

          const cardIndex = player.hand.findIndex(
            (c) => c.groupId === room.activeAsk!.targetGroupId && c.name === room.activeAsk!.targetCardName
          );

          if (hasCard && cardIndex !== -1) {
            // Transfer card from respondent to asker!
            const [transferredCard] = player.hand.splice(cardIndex, 1);
            asker.hand.push(transferredCard);

            // Requirement 3: Consecutive Asking Rule on Success:
            // "If the opponent successfully has and transfers the requested card, the asking player's turn continues.
            // The player can then choose to ask again (either for another sub-category in the same category or a new one) and continue taking turns as long as they successfully receive cards."
            room.cardsReceivedThisTurn = (room.cardsReceivedThisTurn || 0) + 1;

            room.activeAsk.status = 'success';
            room.activeAsk.resultMessage = `הקלף '${transferredCard.name}' נמסר בהצלחה! ${asker.name} ממשיך בתורו.`;
            room.lastAction = `🎯 ${player.name} מסר את '${transferredCard.name}' ל-${asker.name}! ${asker.name} ממשיך בתורו ויכול לשאול שוב.`;

            room.messages.push({
              id: `msg_${Date.now()}`,
              senderId: player.id,
              senderName: player.name,
              text: `✅ "כן, יש לי!" - מסר את '${transferredCard.name}' ל-${asker.name}. ${asker.name} ממשיך בתורו!`,
              timestamp: Date.now(),
              type: 'action',
            });

            // Check if asker completed a quartet!
            checkForCompletedQuartets(asker, room);

            // Clear the success ask overlay after a brief moment so the player can take their next turn
            setTimeout(() => {
              if (room.activeAsk?.status === 'success') {
                room.activeAsk = null;
                broadcastRoomState(room);
              }
            }, 2500);

            checkGameOver(room);
            broadcastRoomState(room);
          } else {
            // Opponent does not have this specific card
            room.activeAsk.status = 'failed';
            room.activeAsk.resultMessage = `אין ליריב את הקלף "${room.activeAsk.targetCardName}".`;

            let drawnCardInfo = '';
            // Requirement 4: Deck Draw Rule at End of Turn:
            // "Drawing cards from the central deck happens at the end of a turn ONLY IF the player did NOT receive any cards from the opponent during that entire turn.
            // If the player successfully received even one card from the opponent during their turn, they do NOT draw from the deck at the end of the turn."
            if ((room.cardsReceivedThisTurn || 0) === 0) {
              if (room.deck.length > 0) {
                const drawnCard = room.deck.pop();
                if (drawnCard) {
                  asker.hand.push(drawnCard);
                  drawnCardInfo = ` ${asker.name} לא קיבל קלפים בתור זה ומשך קלף מהקופה.`;
                  checkForCompletedQuartets(asker, room);
                }
              } else {
                drawnCardInfo = ' הקופה ריקה.';
              }
            } else {
              drawnCardInfo = ` ${asker.name} כבר קיבל ${room.cardsReceivedThisTurn} קלפים בתור זה ולכן אינו מושך מהקופה.`;
            }

            // Turn switches to opponent! Reset cardsReceivedThisTurn for opponent's fresh turn.
            room.turnPlayerId = player.id;
            room.cardsReceivedThisTurn = 0;
            room.lastAction = `❌ ל-${player.name} אין את הקלף המבוקש.${drawnCardInfo} התור עבר ל-${player.name}.`;

            room.messages.push({
              id: `msg_${Date.now()}`,
              senderId: player.id,
              senderName: player.name,
              text: `❌ "אין לי את הקלף!" -${drawnCardInfo} התור עובר ל-${player.name}.`,
              timestamp: Date.now(),
              type: 'action',
            });

            setTimeout(() => {
              if (room.activeAsk?.status === 'failed') {
                room.activeAsk = null;
                broadcastRoomState(room);
              }
            }, 3000);

            checkGameOver(room);
            broadcastRoomState(room);
          }
          return;
        }

        // 10. Manual Draw Card directly (e.g. if player has no cards or wishes to draw)
        if (type === 'game:draw_turn') {
          if (room.status !== 'playing') return;
          if (room.turnPlayerId !== player.id) return;
          if (room.deck.length === 0) return;

          const card = room.deck.pop();
          if (card) {
            player.hand.push(card);
            checkForCompletedQuartets(player, room);

            // Turn switches after manual draw
            const nextPlayerId = room.playerOrder.find((id) => id !== player.id);
            if (nextPlayerId) {
              room.turnPlayerId = nextPlayerId;
              room.cardsReceivedThisTurn = 0;
            }

            room.lastAction = `${player.name} משך קלף מהקופה. התור עובר.`;
            room.messages.push({
              id: `msg_${Date.now()}`,
              senderId: player.id,
              senderName: player.name,
              text: `🃏 משך קלף מהקופה. התור עובר.`,
              timestamp: Date.now(),
              type: 'action',
            });

            checkGameOver(room);
            broadcastRoomState(room);
          }
          return;
        }



        // 9. Send Chat Message
        if (type === 'chat:send') {
          const { text } = message;
          if (!text || typeof text !== 'string' || !text.trim()) return;

          room.messages.push({
            id: `msg_${Date.now()}_${Math.random()}`,
            senderId: player.id,
            senderName: player.name,
            text: text.trim().slice(0, 300),
            timestamp: Date.now(),
            type: 'chat',
          });

          broadcastRoomState(room);
          return;
        }

        // 11. Restart Game
        if (type === 'game:restart') {
          if (!player.isHost) return;
          room.deck = buildDeckFromQuartets(room.quartets);
          for (const pid of room.playerOrder) {
            room.players[pid].hand = [];
            room.players[pid].completedQuartets = [];
            room.players[pid].initialDrawnCount = 0;
          }
          room.status = 'initial_draw';
          room.winnerId = null;
          room.activeAsk = null;
          room.turnPlayerId = room.playerOrder[0];
          room.cardsReceivedThisTurn = 0;
          room.lastAction = 'המשחק אותחל מחדש! לחצו על הקופה למשיכת 4 קלפים.';

          room.messages.push({
            id: `msg_${Date.now()}`,
            senderId: 'system',
            senderName: 'מערכת המשחק',
            text: '🔄 משחק חדש התחיל! כולם מושכים 4 קלפים מהקופה.',
            timestamp: Date.now(),
            type: 'system',
          });

          broadcastRoomState(room);
          return;
        }
      } catch (err) {
        console.error('WebSocket message handling error:', err);
      }
    });

    ws.on('close', () => {
      if (currentRoomCode && currentPlayerId) {
        const room = rooms.get(currentRoomCode);
        if (room && room.players[currentPlayerId]) {
          room.players[currentPlayerId].connected = false;
          broadcastRoomState(room);
        }
      }
    });
  });

  // Serve Vite in dev, static dist in prod
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT} (${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
