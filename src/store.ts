import { useEffect, useReducer } from 'react'

// Cronômetro baseado em timestamps: sobrevive a reload e a tela bloqueada.
export type Clock = { acc: number; since: number | null }

export type State = {
  done: Record<string, boolean> // só guarda o que o usuário mexeu
  clocks: Record<string, Clock> // cronômetro de cada exercício
  main: Clock // cronômetro geral do treino
}

export type Action =
  | { type: 'toggle'; id: string; seed: boolean }
  | { type: 'startEx'; id: string }
  | { type: 'pauseEx'; id: string }
  | { type: 'resetEx'; id: string }
  | { type: 'mainToggle' }
  | { type: 'mainReset' }
  | { type: 'resetWeek' }

const KEY = 'treino-pwa:v1'
const EMPTY: Clock = { acc: 0, since: null }

export const elapsed = (c: Clock | undefined, now: number) =>
  c ? c.acc + (c.since ? Math.max(0, now - c.since) : 0) : 0

const pause = (c: Clock, now: number): Clock =>
  c.since ? { acc: c.acc + (now - c.since), since: null } : c

function reducer(s: State, a: Action): State {
  const now = Date.now()
  switch (a.type) {
    case 'toggle': {
      const current = s.done[a.id] ?? a.seed
      const clocks = { ...s.clocks }
      // ao marcar como feito, para o cronômetro daquele exercício
      if (!current && clocks[a.id]) clocks[a.id] = pause(clocks[a.id], now)
      return { ...s, done: { ...s.done, [a.id]: !current }, clocks }
    }
    case 'startEx': {
      const clocks: Record<string, Clock> = {}
      // só um exercício cronometrando por vez
      for (const [id, c] of Object.entries(s.clocks)) clocks[id] = pause(c, now)
      clocks[a.id] = { acc: clocks[a.id]?.acc ?? 0, since: now }
      // iniciar um exercício liga o cronômetro geral se estiver parado
      const main = s.main.since ? s.main : { acc: s.main.acc, since: now }
      return { ...s, clocks, main }
    }
    case 'pauseEx':
      return s.clocks[a.id]
        ? { ...s, clocks: { ...s.clocks, [a.id]: pause(s.clocks[a.id], now) } }
        : s
    case 'resetEx': {
      const clocks = { ...s.clocks }
      delete clocks[a.id]
      return { ...s, clocks }
    }
    case 'mainToggle':
      return {
        ...s,
        main: s.main.since ? pause(s.main, now) : { acc: s.main.acc, since: now },
      }
    case 'mainReset':
      return { ...s, main: EMPTY }
    case 'resetWeek':
      return { done: {}, clocks: {}, main: EMPTY }
  }
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<State>
      return { done: p.done ?? {}, clocks: p.clocks ?? {}, main: p.main ?? EMPTY }
    }
  } catch {
    /* ignora dados corrompidos */
  }
  return { done: {}, clocks: {}, main: EMPTY }
}

export function useTreinoStore() {
  const [state, dispatch] = useReducer(reducer, undefined, load)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* storage cheio/bloqueado: segue sem persistir */
    }
  }, [state])
  return [state, dispatch] as const
}

export function useNow(active: boolean) {
  const [now, tick] = useReducer(() => Date.now(), Date.now())
  useEffect(() => {
    if (!active) return
    tick()
    const t = setInterval(tick, 500)
    return () => clearInterval(t)
  }, [active])
  return now
}

export function fmt(ms: number, forceHours = false) {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const p = (n: number) => String(n).padStart(2, '0')
  return h > 0 || forceHours ? `${p(h)}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`
}
