import { useMemo, useState } from 'react'
import BodyMuscleMap from './components/BodyMuscleMap'
import type { HomeDayRecord, WeightMeasurement } from './data/catalogueDb'
import { MAP_MUSCLES, MAP_MUSCLE_NAMES, muscleLoadsForRoutine, type MapMuscle, type MuscleLoad } from './data/muscleMap'
import type { PlanRoutine } from './data/planDb'
import type { Exercicio } from './data/treinos'

type Props = {
  days: HomeDayRecord[]
  routines: PlanRoutine[]
  exercises: Exercicio[]
  bodyWeights: WeightMeasurement[]
  currentStreak: number
  bestStreak: number
  points: number
}

type MainTab = 'Overview' | 'Body' | 'Lifts' | 'Effort'
type LiftTab = 'Sets' | 'Fatigue' | 'Strength'
type SessionMode = 'Completed' | 'Planned'
type Period = 'Week' | 'Month'

const STREAK_MILESTONES = [4, 12, 26, 52, 104]
const MUSCLE_NAMES: Record<MapMuscle, string> = {
  trapezius: 'Traps',
  deltoids: 'Shoulders',
  chest: 'Chest',
  'upper-back': 'Back',
  serratus: 'Serratus',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearm: 'Forearms',
  abs: 'Abs',
  obliques: 'Obliques',
  'lower-back': 'Lower back',
  gluteal: 'Glutes',
  quadriceps: 'Quads',
  hamstring: 'Hamstrings',
  adductors: 'Adductors',
  'hip-flexors': 'Hip flexors',
  calves: 'Calves',
  tibialis: 'Tibialis',
}

function dateISO(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function startOfWeek(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return start
}

function hasCompletedWorkout(day: HomeDayRecord, routines: ReadonlyMap<string, PlanRoutine>) {
  return day.routineIds.some((routineId) => {
    const routine = routines.get(routineId)
    return routine?.exercises.some((item) => day.completed[`${routineId}::${item.exerciseId}`]) ?? false
  })
}

function completedSets(day: HomeDayRecord, routines: ReadonlyMap<string, PlanRoutine>) {
  return day.routineIds.reduce((total, routineId) => {
    const routine = routines.get(routineId)
    if (!routine) return total
    return total + routine.exercises.reduce(
      (sum, item) => sum + (day.completed[`${routineId}::${item.exerciseId}`] ? item.sets : 0),
      0,
    )
  }, 0)
}

function loadForRange(
  days: HomeDayRecord[],
  routines: ReadonlyMap<string, PlanRoutine>,
  exercises: ReadonlyMap<string, Exercicio>,
  start: string,
  end: string,
  mode: SessionMode,
): MuscleLoad {
  const load: MuscleLoad = {}
  days.forEach((day) => {
    if (day.date < start || day.date > end) return
    day.routineIds.forEach((routineId) => {
      const routine = routines.get(routineId)
      if (!routine) return
      const exercisesForRange = routine.exercises.filter(
        (item) => mode === 'Planned' || day.completed[`${routineId}::${item.exerciseId}`],
      )
      if (!exercisesForRange.length) return
      const routineLoad = muscleLoadsForRoutine(
        { ...routine, exercises: exercisesForRange },
        exercises,
      )
      MAP_MUSCLES.forEach((muscle) => {
        load[muscle] = (load[muscle] ?? 0) + (routineLoad[muscle] ?? 0)
      })
    })
  })
  return load
}

function muscleTarget(muscle: MapMuscle) {
  if (muscle === 'chest' || muscle === 'deltoids' || muscle === 'upper-back') return [10, 20]
  return [8, 18]
}

function Arrow({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={direction === 'left' ? 'm15 5-7 7 7 7' : 'm9 5 7 7-7 7'}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MuscleRows({ load }: { load: MuscleLoad }) {
  const muscles = MAP_MUSCLES
    .map((id) => ({ id, sets: load[id] ?? 0 }))
    .filter(({ sets }) => sets > 0)
    .sort((a, b) => b.sets - a.sets)
    .slice(0, 8)

  if (!muscles.length) {
    return <p className="stats-empty">Complete planned exercises to see muscle-set statistics.</p>
  }

  return (
    <div className="stats-muscle-rows">
      {muscles.map(({ id, sets }) => {
        const [minimum, maximum] = muscleTarget(id)
        const width = Math.min(100, (sets / maximum) * 100)
        return (
          <div className="stats-muscle-row" key={id}>
            <div className="stats-muscle-row-heading">
              <span>{MUSCLE_NAMES[id]}</span>
              <strong>{sets.toFixed(1)} <small>/ {minimum}–{maximum}</small></strong>
            </div>
            <div
              className="stats-muscle-track"
              role="img"
              aria-label={`${MAP_MUSCLE_NAMES[id]}: ${sets.toFixed(1)} sets, meta ${minimum} a ${maximum}`}
            >
              <span style={{ width: `${width}%` }} />
              <i style={{ left: `${(minimum / maximum) * 100}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function WeightChart({ weights }: { weights: WeightMeasurement[] }) {
  const values = weights.slice(-12)
  if (!values.length) {
    return <p className="stats-empty">Add body-weight measurements to see your progress.</p>
  }

  const minimum = Math.min(...values.map((item) => item.weightKg))
  const maximum = Math.max(...values.map((item) => item.weightKg))
  const range = maximum - minimum || 1
  const points = values.map((item, index) => {
    const x = values.length === 1 ? 180 : 10 + (index / (values.length - 1)) * 340
    const y = 130 - ((item.weightKg - minimum) / range) * 100
    return `${x},${y}`
  }).join(' ')

  return (
    <svg
      className="stats-weight-chart"
      viewBox="0 0 360 150"
      role="img"
      aria-label={`Body weight history from ${values[0].weightKg} to ${values[values.length - 1].weightKg} kilograms`}
    >
      <line x1="0" y1="140" x2="360" y2="140" />
      {values.length > 1 && <polyline points={points} />}
      {values.map((item, index) => {
        const x = values.length === 1 ? 180 : 10 + (index / (values.length - 1)) * 340
        const y = 130 - ((item.weightKg - minimum) / range) * 100
        return <circle cx={x} cy={y} r="4" key={item.date} />
      })}
    </svg>
  )
}

export default function Estatisticas({
  days,
  routines,
  exercises,
  bodyWeights,
  currentStreak,
  bestStreak,
  points,
}: Props) {
  const [mainTab, setMainTab] = useState<MainTab>('Overview')
  const [liftTab, setLiftTab] = useState<LiftTab>('Sets')
  const [sessionMode, setSessionMode] = useState<SessionMode>('Completed')
  const [period, setPeriod] = useState<Period>('Week')
  const [periodDate, setPeriodDate] = useState(() => new Date())
  const [historyOpen, setHistoryOpen] = useState(false)
  const [streakHelpOpen, setStreakHelpOpen] = useState(false)

  const routinesById = useMemo(
    () => new Map(routines.map((routine) => [routine.id, routine])),
    [routines],
  )
  const exercisesById = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises],
  )
  const workoutDays = useMemo(
    () => days.filter((day) => hasCompletedWorkout(day, routinesById)),
    [days, routinesById],
  )
  const workoutCount = workoutDays.length
  const currentMonth = dateISO(new Date()).slice(0, 7)
  const monthWorkoutCount = workoutDays.filter((day) => day.date.startsWith(currentMonth)).length
  const setCount = useMemo(
    () => days.reduce((total, day) => total + completedSets(day, routinesById), 0),
    [days, routinesById],
  )
  const currentWeekStart = startOfWeek(new Date())
  const currentWeekStartISO = dateISO(currentWeekStart)
  const currentWeekEndISO = dateISO(new Date(
    currentWeekStart.getFullYear(),
    currentWeekStart.getMonth(),
    currentWeekStart.getDate() + 6,
  ))
  const thisWeekWorkouts = workoutDays.filter(
    (day) => day.date >= currentWeekStartISO && day.date <= currentWeekEndISO,
  ).length

  const sortedWeights = useMemo(
    () => [...bodyWeights].sort((a, b) => a.date.localeCompare(b.date)),
    [bodyWeights],
  )
  const latestWeight = sortedWeights[sortedWeights.length - 1]
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentWeights = sortedWeights.filter(
    (item) => item.date >= dateISO(thirtyDaysAgo) && item.date <= dateISO(new Date()),
  )
  const weightChange = recentWeights.length > 1
    ? recentWeights[recentWeights.length - 1].weightKg - recentWeights[0].weightKg
    : undefined

  const rangeStart = period === 'Week'
    ? startOfWeek(periodDate)
    : new Date(periodDate.getFullYear(), periodDate.getMonth(), 1)
  const rangeEnd = period === 'Week'
    ? new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate() + 6)
    : new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0)
  const rangeStartISO = dateISO(rangeStart)
  const rangeEndISO = dateISO(rangeEnd)
  const selectedLoad = useMemo(
    () => loadForRange(
      days,
      routinesById,
      exercisesById,
      rangeStartISO,
      rangeEndISO,
      sessionMode,
    ),
    [days, routinesById, exercisesById, rangeStartISO, rangeEndISO, sessionMode],
  )
  const allTimeLoad = useMemo(
    () => loadForRange(days, routinesById, exercisesById, '0000-01-01', '9999-12-31', 'Completed'),
    [days, routinesById, exercisesById],
  )

  const level = Math.floor(points / 40) + 1
  const pointsToNextLevel = level * 40 - points
  const levelProgress = Math.min(100, Math.round(((points % 40) / 40) * 100))
  const nextMilestone = STREAK_MILESTONES.find((milestone) => currentStreak < milestone)
    ?? STREAK_MILESTONES[STREAK_MILESTONES.length - 1]
  const sortedHistory = [...workoutDays].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)

  function movePeriod(direction: -1 | 1) {
    setPeriodDate((date) => period === 'Week'
      ? new Date(date.getFullYear(), date.getMonth(), date.getDate() + direction * 7)
      : new Date(date.getFullYear(), date.getMonth() + direction, 1))
  }

  function exportHistory() {
    const rows = [
      ['Date', 'Workout', 'Completed sets'],
      ...[...workoutDays]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((day) => [day.date, day.routineIds.map((id) => routinesById.get(id)?.name).filter(Boolean).join(' / '), String(completedSets(day, routinesById))]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'workout-history.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function showHistory() {
    setMainTab('Overview')
    const shouldOpen = !historyOpen
    setHistoryOpen(shouldOpen)
    if (shouldOpen) {
      requestAnimationFrame(() =>
        document.getElementById('stats-history')?.scrollIntoView({ behavior: 'smooth' }),
      )
    }
  }

  const periodLabel = period === 'Week'
    ? `Week of ${rangeStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
    : rangeStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const currentBodyWeightChange = weightChange === undefined
    ? '—'
    : `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} kg`

  return (
    <div className="home-page estatisticas-page stats-page">
      <header className="stats-header">
        <div>
          <h2 id="estatisticas-titulo">Stats</h2>
          <p>Progress &amp; history</p>
        </div>
        <div className="stats-header-actions">
          <button className="stats-icon-button" aria-label="Export workout history" onClick={exportHistory}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 3.75h8l3 3v13.5H7a2 2 0 0 1-2-2v-12.5a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.7" />
              <path d="M9 11h7M9 14h7M9 17h4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
          <button
            className={`stats-icon-button${historyOpen ? ' active' : ''}`}
            aria-label="Toggle workout history"
            aria-pressed={historyOpen}
            onClick={showHistory}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4.5 8A8 8 0 1 1 4 12M4.5 4.5V8H8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 7.5V12l3 1.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      <nav className="stats-tabs" aria-label="Statistics sections">
        {(['Overview', 'Body', 'Lifts', 'Effort'] as const).map((tab) => (
          <button
            key={tab}
            className={mainTab === tab ? 'active' : ''}
            aria-pressed={mainTab === tab}
            onClick={() => setMainTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      {mainTab === 'Overview' && (
        <div className="stats-content">
          <section className="stats-overview-card" aria-label="Workout overview">
            <div className="stats-kpis">
              <div><span>Workouts</span><strong>{workoutCount}</strong></div>
              <div><span>This month</span><strong>{monthWorkoutCount}</strong></div>
              <div>
                <span>Weight 30d</span>
                <strong className={weightChange === undefined ? '' : weightChange <= 0 ? 'positive' : 'negative'}>
                  {currentBodyWeightChange}
                </strong>
              </div>
            </div>
            <div className="stats-total">
              <span>Lifted in total</span>
              <strong>— kg</strong>
              <p>{workoutCount} workouts · {setCount} sets · — h</p>
              <small>Log lifted weights and workout duration to track total volume.</small>
            </div>
          </section>

          <section className="stats-streak-card" aria-label="Workout streak">
            <div className="stats-streak-heading">
              <div className="stats-current-streak">
                <span>Week streak</span>
                <strong><i aria-hidden="true">🔥</i>{currentStreak}</strong>
                <p>Weeks in a row with at least one workout.</p>
              </div>
              <div className="stats-best-streak">
                <span>Best:</span>
                <strong>{bestStreak}</strong>
              </div>
            </div>
            <div className="stats-badges" aria-label="Streak milestones">
              {STREAK_MILESTONES.map((milestone) => {
                const achieved = bestStreak >= milestone
                return (
                  <div className={achieved ? 'stats-badge achieved' : 'stats-badge'} key={milestone}>
                    <span aria-hidden="true">{achieved ? '🏅' : '🔒'}</span>
                    <strong>{milestone}</strong>
                    <small>weeks</small>
                  </div>
                )
              })}
            </div>
            <div className="stats-level">
              <div className="stats-level-copy">
                <span>Level</span>
                <strong>{level}</strong>
              </div>
              <div className="stats-level-progress">
                <span>{pointsToNextLevel} points to level {level + 1}</span>
                <div className="stats-progress-track"><i style={{ width: `${levelProgress}%` }} /></div>
              </div>
            </div>
            <div className="stats-next-badge">
              <div><span>Next badge at {nextMilestone} weeks.</span><strong>{currentStreak} / {nextMilestone}</strong></div>
              <div className="stats-progress-track"><i style={{ width: `${Math.min(100, (currentStreak / nextMilestone) * 100)}%` }} /></div>
            </div>
            <p className="stats-freeze-note">Keep training each week to protect your streak.</p>
            <button className="stats-help-link" onClick={() => setStreakHelpOpen((open) => !open)}>
              <span aria-hidden="true">▦</span> How streaks work <span aria-hidden="true">›</span>
            </button>
            {streakHelpOpen && (
              <p className="stats-help-copy">A streak grows when you complete at least one workout in consecutive weeks.</p>
            )}
          </section>

          <details className="stats-challenges">
            <summary><strong>Challenges</strong><span aria-hidden="true">⌄</span></summary>
            <p>No active challenges yet.</p>
          </details>

          {historyOpen && (
            <section className="stats-history" id="stats-history">
              <h3>Workout history</h3>
              {sortedHistory.length ? sortedHistory.map((day) => (
                <div className="stats-history-row" key={day.date}>
                  <time dateTime={day.date}>{new Date(`${day.date}T12:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</time>
                  <span>{completedSets(day, routinesById)} sets</span>
                </div>
              )) : <p className="stats-empty">Completed workouts will appear here.</p>}
            </section>
          )}
        </div>
      )}

      {mainTab === 'Body' && (
        <div className="stats-content">
          <section className="stats-body-summary">
            <div><span>Current weight</span><strong>{latestWeight ? `${latestWeight.weightKg.toFixed(1)} kg` : '—'}</strong></div>
            <div><span>Change · 30 days</span><strong className={weightChange === undefined ? '' : weightChange <= 0 ? 'positive' : 'negative'}>{currentBodyWeightChange}</strong></div>
          </section>
          <section className="stats-panel">
            <header><h3>Weight history</h3><span>Last 12 entries</span></header>
            <WeightChart weights={sortedWeights} />
            {!!sortedWeights.length && (
              <div className="stats-weight-list">
                {sortedWeights.slice(-5).reverse().map((item) => (
                  <div className="stats-history-row" key={item.date}>
                    <time dateTime={item.date}>{new Date(`${item.date}T12:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</time>
                    <strong>{item.weightKg.toFixed(1)} kg</strong>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="stats-panel">
            <header><h3>Muscle distribution</h3><span>All completed workouts</span></header>
            <div className="stats-muscle-map"><BodyMuscleMap load={allTimeLoad} /></div>
            <MuscleRows load={allTimeLoad} />
          </section>
        </div>
      )}

      {mainTab === 'Lifts' && (
        <div className="stats-content">
          <nav className="stats-subtabs" aria-label="Lift statistics">
            {(['Sets', 'Fatigue', 'Strength'] as const).map((tab) => (
              <button key={tab} className={liftTab === tab ? 'active' : ''} aria-pressed={liftTab === tab} onClick={() => setLiftTab(tab)}>
                {tab}
              </button>
            ))}
          </nav>
          <section className="stats-panel stats-lifts-panel">
            <div className="stats-lift-controls">
              <div className="stats-segmented" aria-label="Workout status">
                {(['Completed', 'Planned'] as const).map((mode) => (
                  <button key={mode} className={sessionMode === mode ? 'active' : ''} aria-pressed={sessionMode === mode} onClick={() => setSessionMode(mode)}>
                    {mode}
                  </button>
                ))}
              </div>
              <label className="stats-period-select">
                <span className="sr">Statistics period</span>
                <select value={period} onChange={(event) => setPeriod(event.target.value as Period)}>
                  <option>Week</option>
                  <option>Month</option>
                </select>
              </label>
            </div>
            <div className="stats-period-heading">
              <button aria-label="Previous period" onClick={() => movePeriod(-1)}><Arrow direction="left" /></button>
              <strong>{periodLabel}</strong>
              <button aria-label="Next period" onClick={() => movePeriod(1)}><Arrow direction="right" /></button>
            </div>
            {liftTab === 'Strength' ? (
              <div className="stats-unavailable">
                <strong>Strength tracking</strong>
                <p>Exercise loads are not recorded yet, so strength trends cannot be calculated from your workout history.</p>
              </div>
            ) : (
              <>
                {liftTab === 'Fatigue' && (
                  <p className="stats-data-note">Muscle sets are shown as training volume; this app does not record effort ratings or recovery.</p>
                )}
                <div className="stats-muscle-map stats-lift-map"><BodyMuscleMap load={selectedLoad} /></div>
                <div className="stats-map-legend"><span>Less</span>{[1, 2, 3, 4].map((level) => <i className={`level-${level}`} key={level} />)}<span>More</span></div>
                <MuscleRows load={selectedLoad} />
              </>
            )}
          </section>
        </div>
      )}

      {mainTab === 'Effort' && (
        <div className="stats-content">
          <section className="stats-body-summary">
            <div><span>Workouts</span><strong>{workoutCount}</strong></div>
            <div><span>Completed sets</span><strong>{setCount}</strong></div>
            <div><span>Sets / workout</span><strong>{workoutCount ? (setCount / workoutCount).toFixed(1) : '—'}</strong></div>
          </section>
          <section className="stats-panel">
            <header><h3>Training effort</h3><span>Muscle sets · all time</span></header>
            <MuscleRows load={allTimeLoad} />
            <p className="stats-data-note">Effort ratings and lifted loads are not recorded, so this view uses completed exercise sets only.</p>
          </section>
          <section className="stats-panel">
            <header><h3>Recent workouts</h3><span>This week: {thisWeekWorkouts}</span></header>
            {sortedHistory.length ? sortedHistory.slice(0, 5).map((day) => (
              <div className="stats-history-row" key={day.date}>
                <time dateTime={day.date}>{new Date(`${day.date}T12:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</time>
                <span>{completedSets(day, routinesById)} sets</span>
              </div>
            )) : <p className="stats-empty">Complete a workout to start tracking effort.</p>}
          </section>
        </div>
      )}
    </div>
  )
}
