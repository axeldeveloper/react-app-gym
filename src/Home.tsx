import { useEffect, useMemo, useState } from 'react'
import BodyMuscleMap from './components/BodyMuscleMap'
import { readAllExercises } from './data/catalogueDb'
import type { Exercicio } from './data/treinos'
import { formatReps, initializePlanRoutines, type PlanRoutine } from './data/planDb'
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
  onOpenDetails: (exercise: Exercicio) => void
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

function calcularIdade(birthDate: string): number | null {
  const [year, month, day] = birthDate.split('-').map(Number)
  if (!year || !month || !day) return null
  const nascimento = new Date(year, month - 1, day)
  const hoje = new Date()
  let anos = hoje.getFullYear() - nascimento.getFullYear()
  const mesDiff = hoje.getMonth() - nascimento.getMonth()
  if (mesDiff < 0 || (mesDiff === 0 && hoje.getDate() < nascimento.getDate())) anos -= 1
  return anos
}

const PAISES = [
  { chave: 'br', label: 'Brasil' },
  { chave: 'us', label: 'Estados Unidos' },
  { chave: 'py', label: 'Paraguai' },
  { chave: 'ar', label: 'Argentina' },
  { chave: 'cl', label: 'Chile' },
  { chave: 'es', label: 'Espanha' },
] as const

type Traducao = {
  perfil: string
  nome: string
  nascimento: string
  idade: string
  peso: string
  altura: string
  pais: string
  foto: string
  fotoAjuda: string
  selecionarFoto: string
  salvar: string
  cancelar: string
  fotoSelecionada: string
  erroNome: string
  erroPeso: string
  erroAltura: string
  erroData: string
}

const TRADUCOES: Record<string, Traducao> = {
  br: {
    perfil: 'Seu perfil',
    nome: 'Nome',
    nascimento: 'Data de nascimento',
    idade: 'Idade',
    peso: 'Peso (kg)',
    altura: 'Altura (cm)',
    pais: 'País de origem',
    foto: 'Sua foto de perfil',
    fotoAjuda: 'Escolha uma imagem para deixar seu perfil mais pessoal. Tamanho máximo: 5 MB.',
    selecionarFoto: 'Escolher foto',
    salvar: 'Salvar perfil',
    cancelar: 'Cancelar',
    fotoSelecionada: 'Nova foto selecionada; ela será salva ao confirmar.',
    erroNome: 'Informe o nome do perfil.',
    erroPeso: 'Informe um peso entre 20 e 500 kg.',
    erroAltura: 'Informe uma altura entre 80 e 250 cm.',
    erroData: 'A data de nascimento não pode ser futura.',
  },
  us: {
    perfil: 'Your profile',
    nome: 'Name',
    nascimento: 'Date of birth',
    idade: 'Age',
    peso: 'Weight (kg)',
    altura: 'Height (cm)',
    pais: 'Country of origin',
    foto: 'Your profile photo',
    fotoAjuda: 'Choose an image to personalize your profile. Maximum size: 5 MB.',
    selecionarFoto: 'Choose photo',
    salvar: 'Save profile',
    cancelar: 'Cancel',
    fotoSelecionada: 'New photo selected; it will be saved when you confirm.',
    erroNome: 'Please enter your profile name.',
    erroPeso: 'Please enter a weight between 20 and 500 kg.',
    erroAltura: 'Please enter a height between 80 and 250 cm.',
    erroData: 'The birth date cannot be in the future.',
  },
  py: {
    perfil: 'Su perfil',
    nome: 'Nombre',
    nascimento: 'Fecha de nacimiento',
    idade: 'Edad',
    peso: 'Peso (kg)',
    altura: 'Altura (cm)',
    pais: 'País de origen',
    foto: 'Tu foto de perfil',
    fotoAjuda: 'Elige una imagen para personalizar tu perfil. Tamaño máximo: 5 MB.',
    selecionarFoto: 'Elegir foto',
    salvar: 'Guardar perfil',
    cancelar: 'Cancelar',
    fotoSelecionada: 'Nueva foto seleccionada; se guardará al confirmar.',
    erroNome: 'Ingrese el nombre del perfil.',
    erroPeso: 'Ingrese un peso entre 20 y 500 kg.',
    erroAltura: 'Ingrese una altura entre 80 y 250 cm.',
    erroData: 'La fecha de nacimiento no puede ser futura.',
  },
  ar: {
    perfil: 'Su perfil',
    nome: 'Nombre',
    nascimento: 'Fecha de nacimiento',
    idade: 'Edad',
    peso: 'Peso (kg)',
    altura: 'Altura (cm)',
    pais: 'País de origen',
    foto: 'Tu foto de perfil',
    fotoAjuda: 'Elige una imagen para personalizar tu perfil. Tamaño máximo: 5 MB.',
    selecionarFoto: 'Elegir foto',
    salvar: 'Guardar perfil',
    cancelar: 'Cancelar',
    fotoSelecionada: 'Nueva foto seleccionada; se guardará al confirmar.',
    erroNome: 'Ingrese el nombre del perfil.',
    erroPeso: 'Ingrese un peso entre 20 y 500 kg.',
    erroAltura: 'Ingrese una altura entre 80 y 250 cm.',
    erroData: 'La fecha de nacimiento no puede ser futura.',
  },
  cl: {
    perfil: 'Su perfil',
    nome: 'Nombre',
    nascimento: 'Fecha de nacimiento',
    idade: 'Edad',
    peso: 'Peso (kg)',
    altura: 'Altura (cm)',
    pais: 'País de origen',
    foto: 'Tu foto de perfil',
    fotoAjuda: 'Elige una imagen para personalizar tu perfil. Tamaño máximo: 5 MB.',
    selecionarFoto: 'Elegir foto',
    salvar: 'Guardar perfil',
    cancelar: 'Cancelar',
    fotoSelecionada: 'Nueva foto seleccionada; se guardará al confirmar.',
    erroNome: 'Ingrese el nombre del perfil.',
    erroPeso: 'Ingrese un peso entre 20 y 500 kg.',
    erroAltura: 'Ingrese una altura entre 80 y 250 cm.',
    erroData: 'La fecha de nacimiento no puede ser futura.',
  },
  es: {
    perfil: 'Su perfil',
    nome: 'Nombre',
    nascimento: 'Fecha de nacimiento',
    idade: 'Edad',
    peso: 'Peso (kg)',
    altura: 'Altura (cm)',
    pais: 'País de origen',
    foto: 'Tu foto de perfil',
    fotoAjuda: 'Elige una imagen para personalizar tu perfil. Tamaño máximo: 5 MB.',
    selecionarFoto: 'Elegir foto',
    salvar: 'Guardar perfil',
    cancelar: 'Cancelar',
    fotoSelecionada: 'Nueva foto seleccionada; se guardará al confirmar.',
    erroNome: 'Ingrese el nombre del perfil.',
    erroPeso: 'Ingrese un peso entre 20 y 500 kg.',
    erroAltura: 'Ingrese una altura entre 80 y 250 cm.',
    erroData: 'La fecha de nacimiento no puede ser futura.',
  },
}

function traduzir(country: HomeProfileRecord['country'] | null, chave: keyof Traducao) {
  return TRADUCOES[country ?? 'br'][chave]
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

function IconeCheck() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 4 4L19 6" />
    </svg>
  )
}

export default function Home({ onOpenPlans, onOpenDetails }: Props) {
  const today = dataISO(new Date())
  const [selectedDate, setSelectedDate] = useState(today)
  const [weekStart, setWeekStart] = useState(() => inicioDaSemana(new Date()))
  const [days, setDays] = useState<Record<string, HomeDayRecord>>({})
  const [routines, setRoutines] = useState<PlanRoutine[]>([])
  const [exercises, setExercises] = useState<Exercicio[]>([])
  const [profile, setProfile] = useState<HomeProfileRecord>({ id: 'local', name: 'Atleta', heightCm: null, weightKg: null, birthDate: null, country: null })
  const [latestWeight, setLatestWeight] = useState<{ date: string; weightKg: number } | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [modalParabens, setModalParabens] = useState(false)
  const [pickerRoutineIds, setPickerRoutineIds] = useState<string[]>([])
  const [profileOpen, setProfileOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftAvatar, setDraftAvatar] = useState<Blob | undefined>()
  const [heightInput, setHeightInput] = useState('')
  const [draftWeight, setDraftWeight] = useState('')
  const [draftBirthDate, setDraftBirthDate] = useState('')
  const [draftCountry, setDraftCountry] = useState<HomeProfileRecord['country']>(null)
  const [idade, setIdade] = useState<number | null>(null)
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
  const previewHeightM = (heightInput ? Number(heightInput.replace(',', '.')) : profile.heightCm ?? 0) / 100
  const previewBmi = previewHeightM && latestWeight ? latestWeight.weightKg / (previewHeightM * previewHeightM) : undefined
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
        setDraftWeight(loadedProfile.weightKg ? String(loadedProfile.weightKg).replace('.', ',') : '')
        setDraftBirthDate(loadedProfile.birthDate ?? '')
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

  useEffect(() => {
    setIdade(draftBirthDate ? calcularIdade(draftBirthDate) : null)
  }, [draftBirthDate])

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
    setDraftWeight(profile.weightKg ? String(profile.weightKg).replace('.', ',') : '')
    setDraftAvatar(undefined)
    setDraftBirthDate(profile.birthDate ?? '')
    setDraftCountry(profile.country ?? null)
    setIdade(profile.birthDate ? calcularIdade(profile.birthDate) : null)
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
      if (done) {
        const rotinasDoDia = updated.routineIds
          .map((id) => routinesById.get(id))
          .filter((rotina): rotina is PlanRoutine => Boolean(rotina))
        const treinoCompleto =
          rotinasDoDia.length > 0 &&
          rotinasDoDia.every((rotina) => {
            const lista = rotina.exercises
              .map((item) => exerciseById.get(item.exerciseId))
              .filter((exercicio): exercicio is Exercicio => Boolean(exercicio))
            return (
              lista.length > 0 &&
              lista.every((exercicio) => updated.completed[`${rotina.id}::${exercicio.id}`])
            )
          })
        if (treinoCompleto) setModalParabens(true)
      }
      setError(null)
    } catch (cause) {
      setDays((current) => ({ ...current, [selectedDate]: selectedDay }))
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar o exercício.')
    }
  }

  const salvarPerfil = async () => {
    const name = draftName.trim()
    if (!name) {
      setError(traduzir(draftCountry, 'erroNome'))
      return
    }
    const weightKg = draftWeight ? Number(draftWeight.replace(',', '.')) : null
    const heightCm = heightInput ? Number(heightInput.replace(',', '.')) : null
    if (weightKg !== null && (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 500)) {
      setError(traduzir(draftCountry, 'erroPeso'))
      return
    }
    if (heightCm !== null && (!Number.isFinite(heightCm) || heightCm < 80 || heightCm > 250)) {
      setError(traduzir(draftCountry, 'erroAltura'))
      return
    }
    if (draftBirthDate && new Date(draftBirthDate) > new Date()) {
      setError(traduzir(draftCountry, 'erroData'))
      return
    }
    setSavingProfile(true)
    const updated: HomeProfileRecord = {
      ...profile,
      name,
      heightCm,
      weightKg,
      birthDate: draftBirthDate || null,
      country: draftCountry,
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
      if (weightKg !== null && weightKg !== profile.weightKg) {
        await saveBodyWeight(updated, { date: today, weightKg })
        setLatestWeight({ date: today, weightKg })
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o perfil.')
    } finally {
      setSavingProfile(false)
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
                            <button
                              className="home-exercise-copy"
                              onClick={() => onOpenDetails(exercise)}
                            >
                              <strong>{exercise.nome}</strong>
                              <small>{item.sets} séries × {formatReps(item)} reps</small>
                            </button>
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
          <section className="home-dialog home-dialog-profile" role="dialog" aria-modal="true" aria-labelledby="home-profile-title">
            <header><h2 id="home-profile-title">{traduzir(draftCountry, 'perfil')}</h2><button aria-label="Fechar" onClick={() => setProfileOpen(false)}>×</button></header>
            <div className="home-profile">
              <div className="home-profile-photo">
                <div className="home-profile-avatar">
                  {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{profile.name.trim().charAt(0).toLocaleUpperCase('pt-BR') || 'A'}</span>}
                </div>
                <div className="home-profile-photo-copy">
                  <strong>{traduzir(draftCountry, 'foto')}</strong>
                  <p>{traduzir(draftCountry, 'fotoAjuda')}</p>
                  <label className="home-profile-upload">
                    <span>{traduzir(draftCountry, 'selecionarFoto')}</span>
                    <input type="file" accept="image/*" onChange={(event) => escolherFoto(event.target.files?.[0])} />
                  </label>
                  {draftAvatar && <p className="home-dialog-hint" role="status">{traduzir(draftCountry, 'fotoSelecionada')}</p>}
                </div>
              </div>
              <div className="home-profile-fields">
                <label className="home-form-field"><span>{traduzir(draftCountry, 'nome')}</span><input value={draftName} maxLength={60} onChange={(event) => setDraftName(event.target.value)} placeholder="Seu nome" /></label>
                <div className="home-form-row">
                  <label className="home-form-field"><span>{traduzir(draftCountry, 'nascimento')}</span><input type="date" value={draftBirthDate} onChange={(event) => setDraftBirthDate(event.target.value)} /></label>
                  {idade !== null && (
                    <div className="home-profile-kpi">
                      <span className="home-profile-kpi-label">{traduzir(draftCountry, 'idade')}</span>
                      <strong className="home-profile-kpi-valor">{idade} {idade === 1 ? 'ano' : 'anos'}</strong>
                    </div>
                  )}
                </div>
                <div className="home-form-row">
                  <label className="home-form-field home-form-field-country"><span>{traduzir(draftCountry, 'pais')}</span><select value={draftCountry ?? ''} onChange={(event) => setDraftCountry(event.target.value || null)}><option value="">{traduzir(draftCountry, 'pais')}</option>{PAISES.map((pais) => <option key={pais.chave} value={pais.chave}>{pais.label}</option>)}</select></label>
                </div>
                <div className="home-form-row">
                  <label className="home-form-field"><span>{traduzir(draftCountry, 'peso')}</span><input inputMode="decimal" type="text" placeholder="Ex.: 75,5" value={draftWeight} onChange={(event) => setDraftWeight(event.target.value)} /></label>
                  <label className="home-form-field"><span>{traduzir(draftCountry, 'altura')}</span><input inputMode="decimal" type="text" placeholder="Ex.: 175" value={heightInput} onChange={(event) => setHeightInput(event.target.value)} /></label>
                </div>
                {previewBmi !== undefined && (
                  <div className="home-profile-kpi">
                    <span className="home-profile-kpi-label">IMC</span>
                    <strong className="home-profile-kpi-valor">{previewBmi.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong>
                  </div>
                )}
              </div>
            </div>
            {error && <p className="home-dialog-error" role="alert">{error}</p>}
            <footer>
              <button className="home-secondary-button" onClick={() => setProfileOpen(false)}>{traduzir(draftCountry, 'cancelar')}</button>
              <button className="home-primary-button" disabled={savingProfile} onClick={() => void salvarPerfil()}>{savingProfile ? 'Salvando...' : traduzir(draftCountry, 'salvar')}</button>
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

      {modalParabens && (
        <div className="home-dialog-backdrop">
          <section className="home-dialog" role="dialog" aria-modal="true" aria-labelledby="home-parabens-title">
            <header>
              <h2 id="home-parabens-title">Treino concluído</h2>
              <button aria-label="Fechar" onClick={() => setModalParabens(false)}>×</button>
            </header>
            <p className="home-parabens-texto">Parabéns! Treino do dia concluído. 🎉</p>
            <footer>
              <button className="home-primary-button" onClick={() => setModalParabens(false)}>Fechar</button>
            </footer>
          </section>
        </div>
      )}
    </main>
  )
}
