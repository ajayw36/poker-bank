export type UUID = string

export interface Player {
  id: UUID
  user_id: UUID
  name: string
  created_at: string
}

export type SessionStatus = 'active' | 'completed'

export interface Session {
  id: UUID
  user_id: UUID
  name: string | null
  status: SessionStatus
  created_at: string
  completed_at: string | null
}

export interface SessionPlayer {
  id: UUID
  session_id: UUID
  player_id: UUID
  buy_out: number | null
  created_at: string
}

export interface BuyIn {
  id: UUID
  session_player_id: UUID
  amount: number
  created_at: string
}

/** A session_player row joined with its player and buy-ins, used across the UI. */
export interface SeatRow {
  seat: SessionPlayer
  player: Player
  buyIns: BuyIn[]
}

export interface Net {
  playerId: UUID
  name: string
  net: number
}

export interface Payment {
  fromId: UUID
  from: string
  toId: UUID
  to: string
  amount: number
}
