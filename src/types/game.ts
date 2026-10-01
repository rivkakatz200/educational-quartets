export interface CardItem {
  id: string;
  name: string; // שם הקלף (למשל "דוד בן-גוריון")
  description: string; // עובדה לימודית/הסבר על הקלף
}

export interface QuartetGroup {
  id: string;
  title: string; // שם הנושא/הסדרה (למשל "ראשי ממשלה בישראל")
  themeColor: string; // צבע עיצובי (למשל 'blue', 'amber', 'emerald', 'purple', 'rose', 'cyan', 'indigo', 'orange')
  icon?: string;
  cards: CardItem[]; // בדיוק 4 קלפים
}

export interface Card {
  id: string; // מזהה ייחודי של מופע הקלף
  groupId: string;
  groupTitle: string;
  name: string;
  description: string;
  themeColor: string;
  allGroupCardNames: string[]; // שמות כל 4 הקלפים בסדרה
}

export interface PlayerPublic {
  id: string;
  name: string;
  isHost: boolean;
  cardsCount: number;
  completedQuartets: QuartetGroup[];
  initialDrawnCount: number;
  connected: boolean;
}

export interface PlayerSelf extends PlayerPublic {
  hand: Card[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  type: 'chat' | 'system' | 'action';
}

export interface CardAskRequest {
  stage: 'category' | 'card'; // שלב 1: שאלת סדרה כללית, שלב 2: שאלת קלף ספציפי
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

export interface RoomState {
  code: string;
  hostId: string;
  status: 'lobby' | 'initial_draw' | 'playing' | 'game_over';
  quartets: QuartetGroup[];
  deckCount: number;
  turnPlayerId: string;
  playerOrder: string[];
  cardsReceivedThisTurn: number;
  lockedGroupId: string | null;
  activeAsk: CardAskRequest | null;
  lastAction: string | null;
  winnerId: string | null;
  messages: ChatMessage[];
  opponent: PlayerPublic | null;
  self: PlayerSelf | null;
  createdAt: number;
}
