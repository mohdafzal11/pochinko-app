export interface Tile {
    id: number;
    position: number;
    bets: number;
    volume: number;
  }
  
  export interface Bet {
    id: string;
    userId: string;
    tile: number;
    amount: number;
    timestamp: number;
  }
  
  export interface Round {
    id: number;
    startTime: number;
    endTime: number;
    duration: number;
    tiles: Tile[];
    totalVolume: number;
    prizePool: number;
    playerCount: number;
    motherlodePool?: number;
    status: 'waiting' | 'active' | 'finalizing' | 'finalized' | 'completed';
    winner?: number;
    vrfProof?: string;
  }
  
  export interface GameState {
    currentRound: Round | null;
    userBets: Bet[];
    balance: number;
    isConnected: boolean;
  }
  
  export interface HistoryRound extends Round {
    userWon: boolean;
    userPrize: number;
  }
  
  export interface WebSocketMessage {
    event: string;
    data: any;
  }
  
  export interface BetRequest {
    tile: number;
    amount: number;
    wallet: string;
  }
  
  export interface BetResponse {
    success: boolean;
    bet?: Bet;
    error?: string;
  }
  