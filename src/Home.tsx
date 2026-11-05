import { useEffect, useMemo, useState, type FormEvent } from 'react'
import BodyMuscleMap from './components/BodyMuscleMap'
import { readAllExercises } from './data/catalogueDb'
import type { Exercicio } from './data/treinos'
import { initializePlanRoutines, type PlanRoutine } from './data/planDb'
import {
  readHomeDays,
  readHomeProfile,
  readLatestBodyWeight,
  saveBodyWeight,
  saveHomeDay,
  saveHomeProfile,
  setHomeExerciseCompletion,
} from './data/homeDb'
import type { HomeDayRecord, HomeProfileRecord } from './data/catalogueDb'
import { muscleLoadsForRoutine } from './data/muscleMap'

type Props = {
  onOpenPlans: () => void
}

const DAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const DAY_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const EMPTY_DAY = (date: string): HomeDayRecord => ({ date, routineIds: [], completed: {} })

function dataISO(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseData(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function inicioDaSemana(date: Date) {
  const inicio = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  inicio.setDate(inicio.getDate() - ((inicio.getDay() + 6) % 7))
  return inicio
}

function formatarData(date: string, options: Intl.DateTimeFormatOptions = {}) {
  return parseData(date).toLocaleDateString('pt-BR', options)
}

function textoRelativoSemana(inicio: Date) {
  const hoje = inicioDaSemana(new Date())
  const diff = Math.round((inicio.getTime() - hoje.getTime()) / (7 * 86400000))
  if (diff === 0) return 'Esta semana'
  if (diff === 1) return 'Próxima semana'
  if (diff === -1) return 'Semana passada'
  return inicio.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
}

function IconeCalendario() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M7.5 3v4M16.5 3v4M3 10h18" />
    </svg>
  )
}

function IconePeso() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 8h14l2 12H3L5 8Z" />
      <path d="M9 8a3 3 0 0 1 6 0" />
      <path d="M12 12v3m-1.5-1.5h3" />
    </svg>
  )
}

function IconeCheck() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 4 4L19 6" />
    </svg>
  )
}

export default function Home({ onOpenPlans }: Props) {
  const today = dataISO(new Date())
  const [selectedDate, setSelectedDate] = useState(today)
  const [weekStart, setWeekStart] = useState(() => inicioDaSemana(new Date()))
  const [days, setDays] = useState<Record<string, HomeDayRecord>>({})
  const [routines, setRoutines] = useState<PlanRoutine[]>([])
  const [exercises, setExercises] = useState<Exercicio[]>([])
  const [profile, setProfile] = useState<HomeProfileRecord>({ id: 'local', name: 'Atleta', heightCm: null })
  const [latestWeight, setLatestWeight] = useState<{ date: string; weightKg: number } | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerRoutineIds, setPickerRoutineIds] = useState<string[]>([])
  const [profileOpen, setProfileOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftAvatar, setDraftAvatar] = useState<Blob | undefined>()
  const [weightInput, setWeightInput] = useState('')
  const [heightInput, setHeightInput] = useState('')
  const [savingWeight, setSavingWeight] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string>()

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => dataISO(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index))),
    [weekStart],
  )
  const exerciseById = useMemo(() => new Map(exercises.map((exercise) => [exercise.id, exercise])), [exercises])
  const routinesById = useMemo(() => new Map(routines.map((routine) => [routine.id, routine])), [routines])
  const selectedDay = days[selectedDate] ?? EMPTY_DAY(selectedDate)
  const selectedRoutines = selectedDay.routineIds
    .map((id) => routinesById.get(id))
    .filter((routine): routine is PlanRoutine => Boolean(routine))
  const heightM = profile.heightCm ? profile.heightCm / 100 : 0
  const bmi = heightM && latestWeight ? latestWeight.weightKg / (heightM * heightM) : undefined
  const weeklyProgress = useMemo(() => {
    let planned = 0
    let completed = 0
    weekDates.forEach((date) => {
      const day = days[date]
      day?.routineIds.forEach((routineId) => {
        const routine = routinesById.get(routineId)
        routine?.exercises.forEach((exercise) => {
          planned += 1
          if (day.completed[`${routineId}::${exercise.exerciseId}`]) completed += 1
        })
      })
    })
    return { planned, completed }
  }, [days, routinesById, weekDates])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    const start = weekDates[0]
    const end = weekDates[6]
    Promise.all([
      initializePlanRoutines(),
      readAllExercises(),
      readHomeProfile(),
      readLatestBodyWeight(),
      readHomeDays(start, end),
    ])
      .then(([loadedRoutines, loadedExercises, loadedProfile, loadedWeight, loadedDays]) => {
        if (!active) return
        const exerciseIds = new Set(loadedExercises.map((exercise) => exercise.id))
        const missingIds = loadedRoutines.flatMap((routine) =>
          routine.exercises
            .filter((item) => !exerciseIds.has(item.exerciseId))
            .map((item) => item.exerciseId),
        )
        if (missingIds.length) throw new Error(`Exercícios das rotinas não encontrados no IndexedDB: ${missingIds.join(', ')}`)
        setRoutines(loadedRoutines)
        setExercises(loadedExercises)
        setProfile(loadedProfile)
        setDraftName(loadedProfile.name)
        setHeightInput(loadedProfile.heightCm ? String(loadedProfile.heightCm) : '')
        setLatestWeight(loadedWeight)
        setWeightInput(loadedWeight ? String(loadedWeight.weightKg).replace('.', ',') : '')
        setDays(Object.fromEntries(loadedDays.map((day) => [day.date, day])))
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar sua Home.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [weekDates])

  useEffect(() => {
    if (!profile.avatar || !profile.avatarType?.startsWith('image/')) {
      setAvatarUrl(undefined)
      return
    }
    const url = URL.createObjectURL(profile.avatar)
    setAvatarUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [profile.avatar, profile.avatarType])

  const selecionarSemana = (weeks: number) => {
    const nextStart = new Date(weekStart)
    nextStart.setDate(nextStart.getDate() + weeks * 7)
    setWeekStart(nextStart)
    setSelectedDate(dataISO(nextStart))
  }

  const abrirSeletor = () => {
    setPickerRoutineIds([...selectedDay.routineIds])
    setError(null)
    setPickerOpen(true)
  }

  const abrirPerfil = () => {
    setDraftName(profile.name)
    setDraftAvatar(undefined)
    setError(null)
    setProfileOpen(true)
  }

  const salvarAgenda = async () => {
    setSavingSchedule(true)
    const updated = { ...selectedDay, routineIds: [...new Set(pickerRoutineIds)] }
    try {
      await saveHomeDay(updated)
      setDays((current) => ({ ...current, [selectedDate]: updated }))
      setPickerOpen(false)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o treino do dia.')
    } finally {
      setSavingSchedule(false)
    }
  }

  const marcarExercicio = async (routineId: string, exerciseId: string) => {
    const key = `${routineId}::${exerciseId}`
    const done = !selectedDay.completed[key]
    const updated = {
      ...selectedDay,
      completed: { ...selectedDay.completed },
    }
    if (done) updated.completed[key] = true
    else delete updated.completed[key]
    setDays((current) => ({ ...current, [selectedDate]: updated }))
    try {
      await setHomeExerciseCompletion(selectedDate, key, done)
      setError(null)
    } catch (cause) {
      setDays((current) => ({ ...current, [selectedDate]: selectedDay }))
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar o exercício.')
    }
  }

  const salvarPerfil = async () => {
    const name = draftName.trim()
    if (!name) {
      setError('Informe o nome do perfil.')
      return
    }
    setSavingProfile(true)
    const updated: HomeProfileRecord = {
      ...profile,
      name,
    }
    if (draftAvatar) {
      updated.avatar = draftAvatar
      updated.avatarType = draftAvatar.type
    }
    try {
      await saveHomeProfile(updated)
      setProfile(updated)
      setProfileOpen(false)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o perfil.')
    } finally {
      setSavingProfile(false)
    }
  }

  const salvarMedicao = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const weightKg = Number(weightInput.replace(',', '.'))
    const heightCm = Number(heightInput.replace(',', '.'))
    if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 500) {
      setError('Informe um peso entre 20 e 500 kg.')
      return
    }
    if (!Number.isFinite(heightCm) || heightCm < 80 || heightCm > 250) {
      setError('Informe uma altura entre 80 e 250 cm.')
      return
    }
    setSavingWeight(true)
    const updatedProfile = { ...profile, heightCm }
    const measurement = { date: today, weightKg }
    try {
      await saveBodyWeight(updatedProfile, measurement)
      setProfile(updatedProfile)
      setHeightInput(String(heightCm))
      setLatestWeight(measurement)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar as medidas.')
    } finally {
      setSavingWeight(false)
    }
  }

  const escolherFoto = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Escolha um arquivo de imagem para a foto do perfil.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('A foto deve ter no máximo 5 MB.')
      return
    }
    setDraftAvatar(file)
    setError(null)
  }

  if (loading) return <main className="home-page" role="status">Carregando sua semana de treino...</main>
  if (error && !routines.length && !exercises.length) {
    return (
      <main className="home-page" role="alert">
        <p>Não foi possível carregar sua Home: {error}</p>
        <button className="home-primary-button" onClick={() => window.location.reload()}>Tentar novamente</button>
      </main>
    )
  }

  return (
    <main className="home-page">
      <header className="home-header">
        <div className="home-greeting">
          <div className="home-user-avatar" aria-hidden="true">
            {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{profile.name.trim().charAt(0).toLocaleUpperCase('pt-BR') || 'A'}</span>}
          </div>
          <div>
            <h1>Olá{profile.name ? `, ${profile.name}` : ''}</h1>
            <p>{formatarData(today, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
        </div>
        <div className="home-header-actions">
          <button className="home-icon-button" aria-label="Editar perfil" title="Editar perfil" onClick={abrirPerfil}>⚙</button>
          <button className="home-logout-button" onClick={() => setLogoutOpen(true)}>Sair</button>
        </div>
      </header>

      <section className="home-week-card" aria-label="Calendário semanal de treinos">
        <header className="home-week-heading">
          <button aria-label="Semana anterior" onClick={() => selecionarSemana(-1)}>‹</button>
          <strong>{textoRelativoSemana(weekStart)}</strong>
          <button aria-label="Próxima semana" onClick={() => selecionarSemana(1)}>›</button>
        </header>
        <div className="home-week-days">
          {weekDates.map((date) => {
            const day = parseData(date)
            const record = days[date]
            const assigned = Boolean(record?.routineIds.length)
            const completed = assigned && record!.routineIds.every((routineId) => {
              const routine = routinesById.get(routineId)
              return Boolean(routine?.exercises.length) && routine!.exercises.every((exercise) => record!.completed[`${routineId}::${exercise.exerciseId}`])
            })
            return (
              <button
                className={`home-week-day${selectedDate === date ? ' selecionado' : ''}${date === today ? ' hoje' : ''}`}
                key={date}
                aria-label={`${DAY_NAMES[day.getDay()]}, ${formatarData(date, { day: 'numeric', month: 'long' })}${assigned ? ', treino planejado' : ''}${completed ? ', treino concluído' : ''}`}
                aria-pressed={selectedDate === date}
                onClick={() => setSelectedDate(date)}
              >
                <span>{DAY_SHORT[day.getDay()]}</span>
                <strong>{day.getDate()}</strong>
                <i className={completed ? 'feito' : assigned ? 'planejado' : ''} />
              </button>
            )
          })}
        </div>
        <p className={`home-week-status${weeklyProgress.planned > 0 && weeklyProgress.completed === weeklyProgress.planned ? ' concluido' : ''}`}>
          {weeklyProgress.planned > 0
            ? weeklyProgress.completed === weeklyProgress.planned
              ? 'Tudo feito nesta semana. Mandou bem!'
              : `${weeklyProgress.completed} de ${weeklyProgress.planned} exercícios concluídos nesta semana.`
            : 'Organize sua semana adicionando treinos aos dias.'}
        </p>
        {selectedRoutines.length > 0 && (
          <button className="home-today-summary" onClick={() => document.getElementById('home-day-plans')?.scrollIntoView({ behavior: 'smooth' })}>
            <span className="home-summary-play">▶</span>
            <span><small>{selectedDate === today ? 'Hoje' : formatarData(selectedDate, { weekday: 'long', day: 'numeric', month: 'short' })}</small><strong>{selectedRoutines.map((routine) => routine.name).join(' · ')}</strong></span>
            <span className="home-resume">Ver treino</span>
          </button>
        )}
      </section>

      <section className="home-day-section" id="home-day-plans" aria-labelledby="home-day-title">
        <header className="home-section-heading">
          <div>
            <h2 id="home-day-title">{selectedDate === today ? 'Treinos de hoje' : `Treinos de ${formatarData(selectedDate, { weekday: 'long' })}`}</h2>
            <p>{formatarData(selectedDate, { day: 'numeric', month: 'long' })}</p>
          </div>
          <button className="home-primary-button" onClick={abrirSeletor}>＋ Adicionar treino</button>
        </header>

        {selectedRoutines.length ? (
          <div className="home-routine-list">
            {selectedRoutines.map((routine) => {
              const exerciseList = routine.exercises
                .map((item) => ({ item, exercise: exerciseById.get(item.exerciseId) }))
                .filter((entry): entry is { item: PlanRoutine['exercises'][number]; exercise: Exercicio } => Boolean(entry.exercise))
              const doneCount = exerciseList.filter(({ item }) => selectedDay.completed[`${routine.id}::${item.exerciseId}`]).length
              return (
                <article className="home-routine-card" key={routine.id}>
                  <header className="home-routine-heading">
                    <BodyMuscleMap compact load={muscleLoadsForRoutine(routine, exerciseById)} />
                    <div className="home-routine-title">
                      <strong>{routine.name}</strong>
                      <small>{doneCount} de {exerciseList.length} exercícios feitos</small>
                    </div>
                    <button className="home-edit-routine" onClick={onOpenPlans} aria-label={`Editar ${routine.name}`}>›</button>
                  </header>
                  {exerciseList.length ? (
                    <ul className="home-exercise-list">
                      {exerciseList.map(({ item, exercise }) => {
                        const key = `${routine.id}::${item.exerciseId}`
                        const done = Boolean(selectedDay.completed[key])
                        return (
                          <li className={done ? 'concluido' : ''} key={key}>
                            <span className="home-exercise-copy">
                              <strong>{exercise.nome}</strong>
                              <small>{item.sets} séries × {item.reps} reps</small>
                            </span>
                            <button
                              className={`home-exercise-check${done ? ' feito' : ''}`}
                              aria-label={`${done ? 'Marcar como não feito' : 'Marcar como feito'}: ${exercise.nome}`}
                              aria-pressed={done}
                              onClick={() => void marcarExercicio(routine.id, item.exerciseId)}
                            >
                              {done && <IconeCheck />}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <p className="home-empty-routine">Esta rotina ainda não tem exercícios. <button onClick={onOpenPlans}>Adicionar exercícios</button></p>
                  )}
                  {exerciseList.length > 0 && doneCount === exerciseList.length && (
                    <p className="home-routine-complete">Treino concluído. Muito bem!</p>
                  )}
                </article>
              )
            })}
          </div>
        ) : (
          <div className="home-empty-day">
            <span className="home-empty-icon"><IconeCalendario /></span>
            <strong>Nenhum treino planejado para este dia</strong>
            <p>Adicione uma das suas rotinas ao calendário da semana.</p>
            <button className="home-primary-button" onClick={abrirSeletor}>＋ Incluir rotina</button>
          </div>
        )}
      </section>

      <section className="home-weight-card" aria-labelledby="home-weight-title">
        <header className="home-weight-heading">
          <span className="home-weight-icon"><IconePeso /></span>
          <div>
            <h2 id="home-weight-title">Peso corporal</h2>
            <small>{latestWeight ? `Último registro · ${formatarData(latestWeight.date, { day: 'numeric', month: 'short' })}` : 'Registre seu peso e altura'}</small>
          </div>
        </header>
        <div className="home-weight-summary">
          <strong>{latestWeight ? latestWeight.weightKg.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '—'} <small>kg</small></strong>
          <span>{bmi ? <>IMC <b>{bmi.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</b></> : 'IMC aparecerá após informar altura e peso'}</span>
        </div>
        <form className="home-measure-form" onSubmit={(event) => void salvarMedicao(event)}>
          <label>
            <span>Peso (kg)</span>
            <input inputMode="decimal" type="text" placeholder="Ex.: 75,5" value={weightInput} onChange={(event) => setWeightInput(event.target.value)} />
          </label>
          <label>
            <span>Altura (cm)</span>
            <input inputMode="decimal" type="text" placeholder="Ex.: 175" value={heightInput} onChange={(event) => setHeightInput(event.target.value)} />
          </label>
          <button className="home-primary-button" type="submit" disabled={savingWeight}>{savingWeight ? 'Salvando...' : 'Registrar'}</button>
        </form>
      </section>

      {error && <p className="home-error" role="alert">{error}</p>}

      {pickerOpen && (
        <div className="home-dialog-backdrop" onClick={(event) => event.target === event.currentTarget && setPickerOpen(false)}>
          <section className="home-dialog" role="dialog" aria-modal="true" aria-labelledby="home-picker-title">
            <header><h2 id="home-picker-title">Treinos de {formatarData(selectedDate, { day: 'numeric', month: 'long' })}</h2><button aria-label="Fechar" onClick={() => setPickerOpen(false)}>×</button></header>
            <p>Selecione as rotinas que deseja incluir neste dia.</p>
            {error && <p className="home-dialog-error" role="alert">{error}</p>}
            {routines.length ? (
              <div className="home-routine-options">
                {routines.map((routine) => {
                  const checked = pickerRoutineIds.includes(routine.id)
                  return (
                    <button
                      className={checked ? 'selecionado' : ''}
                      aria-pressed={checked}
                      key={routine.id}
                      onClick={() => setPickerRoutineIds((current) => checked ? current.filter((id) => id !== routine.id) : [...current, routine.id])}
                    >
                      <span className={`home-option-check${checked ? ' feito' : ''}`}>{checked && <IconeCheck />}</span>
                      <span><strong>{routine.name}</strong><small>{routine.exercises.length} exercícios · {routine.focus}</small></span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="home-empty-routine">Crie primeiro uma rotina na página Plano.</p>
            )}
            <footer>
              <button className="home-secondary-button" onClick={() => setPickerOpen(false)}>Cancelar</button>
              <button className="home-primary-button" disabled={savingSchedule || !routines.length} onClick={() => void salvarAgenda()}>{savingSchedule ? 'Salvando...' : 'Salvar dia'}</button>
              <button className="home-text-button" onClick={onOpenPlans}>Criar nova rotina</button>
            </footer>
          </section>
        </div>
      )}

      {profileOpen && (
        <div className="home-dialog-backdrop" onClick={(event) => event.target === event.currentTarget && setProfileOpen(false)}>
          <section className="home-dialog" role="dialog" aria-modal="true" aria-labelledby="home-profile-title">
            <header><h2 id="home-profile-title">Seu perfil</h2><button aria-label="Fechar" onClick={() => setProfileOpen(false)}>×</button></header>
            <label className="home-form-field"><span>Nome</span><input value={draftName} maxLength={60} onChange={(event) => setDraftName(event.target.value)} placeholder="Seu nome" /></label>
            <label className="home-form-field"><span>Foto de perfil</span><input type="file" accept="image/*" onChange={(event) => escolherFoto(event.target.files?.[0])} /></label>
            {error && <p className="home-dialog-error" role="alert">{error}</p>}
            {draftAvatar && <p className="home-dialog-hint">Nova foto selecionada; ela será salva ao confirmar.</p>}
            <footer>
              <button className="home-secondary-button" onClick={() => setProfileOpen(false)}>Cancelar</button>
              <button className="home-primary-button" disabled={savingProfile} onClick={() => void salvarPerfil()}>{savingProfile ? 'Salvando...' : 'Salvar perfil'}</button>
            </footer>
          </section>
        </div>
      )}

      {logoutOpen && (
        <div className="home-dialog-backdrop" onClick={(event) => event.target === event.currentTarget && setLogoutOpen(false)}>
          <section className="home-dialog" role="dialog" aria-modal="true" aria-labelledby="home-logout-title">
            <header><h2 id="home-logout-title">Perfil local</h2><button aria-label="Fechar" onClick={() => setLogoutOpen(false)}>×</button></header>
            <p>Este app ainda não usa contas ou autenticação. Seu perfil, treinos e medidas ficam salvos neste dispositivo; não há uma sessão de conta para encerrar.</p>
            <footer><button className="home-primary-button" onClick={() => setLogoutOpen(false)}>Entendi</button></footer>
          </section>
        </div>
      )}
    </main>
  )
}
