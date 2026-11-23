import { useEffect, useMemo, useState } from 'react'
import {
  initializeCatalogue,
  readExercisesByBodyPart,
  readAllExercises,
  type HomeDayRecord,
  type WeightMeasurement,
} from './data/catalogueDb'
import { initializePlanRoutines, type PlanRoutine } from './data/planDb'
import { readAllHomeDays, readBodyWeightHistory, readHomeProfile } from './data/homeDb'
import type { Exercicio, Grupo } from './data/treinos'
import Estatisticas from './Estatisticas'
import Detalhes from './Detalhes'
import Exercicios from './Exercicios'
import Home from './Home'
import Plano from './Plano'
import { elapsed, fmt, useNow, useTreinoStore } from './store'

const R = 22
const CIRC = 2 * Math.PI * R
const PAGINAS = new Set(['inicio', 'plano', 'estatisticas', 'exercicios'])

type IconName = 'play' | 'pause' | 'reset' | 'check' | 'info' | 'home' | 'calendar' | 'chart' | 'weights'

function Icon({ name }: { name: IconName }) {
  const common = { viewBox: '0 0 24 24', 'aria-hidden': true as const }
  switch (name) {
    case 'play':
      return (
        <svg {...common}>
          <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
        </svg>
      )
    case 'pause':
      return (
        <svg {...common}>
          <rect x="6.5" y="5.5" width="3.8" height="13" rx="1" fill="currentColor" />
          <rect x="13.7" y="5.5" width="3.8" height="13" rx="1" fill="currentColor" />
        </svg>
      )
    case 'reset':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5" />
          <path d="M4.5 4.5v4h4" />
        </svg>
      )
    case 'info':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5.5" />
          <circle cx="12" cy="7.6" r=".6" fill="currentColor" />
        </svg>
      )
    case 'check':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5.5 12.5l4.2 4.2L18.5 7.8" />
        </svg>
      )
    case 'home':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3.5 10 8.5-7 8.5 7" />
          <path d="M5.5 9v11h13V9M9.5 20v-6h5v6" />
        </svg>
      )
    case 'calendar':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
          <path d="M7.5 3v4M16.5 3v4M3.5 10h17" />
        </svg>
      )
    case 'chart':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 20V11M12 20V4M19 20v-7" />
        </svg>
      )
    case 'weights':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" />
        </svg>
      )
  }
}

function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
}

function dataISO(date: Date) {
  const ano = date.getFullYear()
  const mes = String(date.getMonth() + 1).padStart(2, '0')
  const dia = String(date.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function inicioDaSemana(date: Date) {
  const inicio = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  inicio.setDate(inicio.getDate() - ((inicio.getDay() + 6) % 7))
  return inicio
}

export default function App() {
  const [state, dispatch] = useTreinoStore()
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [carregandoCatalogo, setCarregandoCatalogo] = useState(true)
  const [erroCatalogo, setErroCatalogo] = useState<string | null>(null)
  const [tentativaCatalogo, setTentativaCatalogo] = useState(0)
  const [exercicios, setExercicios] = useState<Exercicio[]>([])
  const [carregandoExercicios, setCarregandoExercicios] = useState(false)
  const [erroExercicios, setErroExercicios] = useState<string | null>(null)
  const [tentativaExercicios, setTentativaExercicios] = useState(0)
  const [aba, setAba] = useState('')
  const [routines, setRoutines] = useState<PlanRoutine[]>([])
  const [statsExercises, setStatsExercises] = useState<Exercicio[]>([])
  const [homeDays, setHomeDays] = useState<Record<string, HomeDayRecord>>({})
  const [bodyWeights, setBodyWeights] = useState<WeightMeasurement[]>([])
  const [menuAtivo, setMenuAtivo] = useState(() => {
    const pagina = new URLSearchParams(window.location.search).get('pagina')
    return pagina && PAGINAS.has(pagina) ? pagina : 'inicio'
  })
  const [detalhe, setDetalhe] = useState<Exercicio | null>(null)
  const [busca, setBusca] = useState('')
  const [limite, setLimite] = useState(50)

  useEffect(() => {
    const sincronizarPagina = () => {
      const pagina = new URLSearchParams(window.location.search).get('pagina')
      if (pagina && PAGINAS.has(pagina)) {
        setMenuAtivo(pagina)
      } else {
        setMenuAtivo('inicio')
      }
    }
    window.addEventListener('popstate', sincronizarPagina)
    return () => window.removeEventListener('popstate', sincronizarPagina)
  }, [])

  useEffect(() => {
    let ativo = true
    setCarregandoCatalogo(true)
    setErroCatalogo(null)
    initializeCatalogue()
      .then((catalogo) => {
        if (ativo) setGrupos(catalogo)
      })
      .catch((error: unknown) => {
        if (ativo) {
          setErroCatalogo(error instanceof Error ? error.message : 'Erro inesperado ao carregar o catálogo.')
        }
      })
      .finally(() => {
        if (ativo) setCarregandoCatalogo(false)
      })
    return () => {
      ativo = false
    }
  }, [tentativaCatalogo])

  const grupo = grupos.find((item) => item.chave === aba) ?? grupos[0]

  useEffect(() => {
    if (!grupo) return
    let ativo = true
    setExercicios([])
    setCarregandoExercicios(true)
    setErroExercicios(null)
    readExercisesByBodyPart(grupo.parteCorporal)
      .then((resultado) => {
        if (ativo) setExercicios(resultado)
      })
      .catch((error: unknown) => {
        if (ativo) {
          setErroExercicios(
            error instanceof Error ? error.message : 'Erro inesperado ao consultar os exercícios.',
          )
        }
      })
      .finally(() => {
        if (ativo) setCarregandoExercicios(false)
      })
    return () => {
      ativo = false
    }
  }, [grupo?.parteCorporal, tentativaExercicios])

  useEffect(() => {
    let ativo = true
    Promise.all([
      initializePlanRoutines(),
      readAllExercises(),
      readHomeProfile(),
      readBodyWeightHistory(),
      readAllHomeDays(),
    ])
      .then(([rotinas, exerciciosCompletos, , pesos, dias]) => {
        if (!ativo) return
        setRoutines(rotinas)
        setStatsExercises(exerciciosCompletos)
        setBodyWeights(pesos)
        setHomeDays(Object.fromEntries(dias.map((dia) => [dia.date, dia])))
      })
      .catch(() => {
        if (ativo) {
          setRoutines([])
          setHomeDays({})
        }
      })
    return () => {
      ativo = false
    }
  }, [])

  const algumRodando = !!state.main.since || Object.values(state.clocks).some((c) => c.since)
  const now = useNow(algumRodando)

  const contagem = useMemo(
    () =>
      Object.fromEntries(
        grupos.map((grupo) => [
          grupo.chave,
          grupo.ids.filter((id) => state.done[id] ?? false).length,
        ]),
      ),
    [grupos, state.done],
  )

  const totalFeitos = Object.values(contagem).reduce((a, b) => a + b, 0)
  const totalGeral = grupos.reduce((a, item) => a + item.total, 0)
  const feitos = grupo ? contagem[grupo.chave] ?? 0 : 0
  const total = grupo?.total ?? 0
  const principal = elapsed(state.main, now)
  const principalRodando = !!state.main.since
  const consulta = useMemo(() => normalizar(busca), [busca])

  const resultados = useMemo(
    () =>
      exercicios.filter((exercicio) => {
        if (!consulta) return true
        const texto = normalizar(
          [
            exercicio.nome,
            exercicio.nomeOriginal,
            exercicio.equipamento,
            exercicio.alvo,
            exercicio.categoria,
            ...exercicio.musculosSecundarios,
          ].join(' '),
        )
        return texto.includes(consulta)
      }),
    [consulta, exercicios],
  )
  const visiveis = resultados.slice(0, limite)

  const routinesPorId = useMemo(() => new Map(routines.map((rotina) => [rotina.id, rotina])), [routines])

  const semanasComTreino = new Set<string>()
  Object.keys(homeDays).forEach((data) => {
    const dia = homeDays[data]
    const temTreino = dia.routineIds.some((rid) =>
      routinesPorId.get(rid)?.exercises.some((item) => dia.completed[`${rid}::${item.exerciseId}`])
    )
    if (temTreino) {
      const inicio = inicioDaSemana(new Date(`${data}T00:00:00`))
      semanasComTreino.add(dataISO(inicio))
    }
  })

  // streak atual: semanas consecutivas com treino terminando na semana de hoje
  let streak = 0
  let dataCheck = new Date()
  for (;;) {
    const inicio = inicioDaSemana(dataCheck)
    if (semanasComTreino.has(dataISO(inicio))) {
      streak += 1
      dataCheck = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() - 1)
    } else break
  }

  // melhor streak histórica
  const inicioSemanas = Array.from(semanasComTreino)
    .map((s) => new Date(`${s}T00:00:00`))
    .sort((a, b) => a.getTime() - b.getTime())
  let melhorStreak = 0
  let atual = 1
  for (let i = 1; i < inicioSemanas.length; i++) {
    const diffDias = Math.round(
      (inicioSemanas[i].getTime() - inicioSemanas[i - 1].getTime()) / 86400000
    )
    if (diffDias === 7) atual += 1
    else {
      if (atual > melhorStreak) melhorStreak = atual
      atual = 1
    }
  }
  if (atual > melhorStreak) melhorStreak = atual
  if (inicioSemanas.length === 0) melhorStreak = 0

  const navegar = (destino: string, elemento: string) => {
    setMenuAtivo(destino)
    const url = new URL(window.location.href)
    url.searchParams.set('pagina', destino)
    window.history.pushState({ pagina: destino }, '', url)
    if (destino === 'exercicios') return
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        document.getElementById(elemento)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      ),
    )
  }

  if (carregandoCatalogo) {
    return <main className="estado-catalogo">Carregando o catálogo de exercícios...</main>
  }
  if (erroCatalogo) {
    return (
      <main className="estado-catalogo" role="alert">
        <p>Não foi possível preparar o catálogo offline: {erroCatalogo}</p>
        <button className="mais-resultados" onClick={() => setTentativaCatalogo((n) => n + 1)}>
          Tentar novamente
        </button>
      </main>
    )
  }
  if (!grupo) {
    return <main className="estado-catalogo" role="alert">O catálogo não contém categorias de exercícios disponíveis.</main>
  }

  return (
    <div className="app">
      {menuAtivo === 'exercicios' ? (
        <Exercicios
          onDetails={(exercise) => setDetalhe(exercise)}
        />
      ) : menuAtivo === 'inicio' ? (
        <Home
          onOpenPlans={() => navegar('plano', 'plano')}
          onOpenDetails={(exercise) => setDetalhe(exercise)}
        />
      ) : menuAtivo === 'plano' ? (
        <Plano onOpenDetails={(exercise) => setDetalhe(exercise)} />
      ) : (
      <>
      {menuAtivo !== 'estatisticas' ? (
        <header className="topo" id="inicio">
          <nav className="anilhas" aria-label="Grupos de treino">
            {grupos.map((item) => {
              const n = contagem[item.chave] ?? 0
              const frac = n / item.total
              const ativa = item.chave === grupo.chave
              return (
                <button
                  key={item.chave}
                  className={ativa ? 'anilha ativa' : 'anilha'}
                  data-g={item.chave}
                  aria-current={ativa ? 'true' : undefined}
                  aria-label={`${item.titulo}, ${n} de ${item.total} feitos`}
                  onClick={() => {
                    setAba(item.chave)
                    setBusca('')
                    setLimite(50)
                    window.scrollTo({ top: 0 })
                  }}
                >
                  <span className="disco">
                    <svg viewBox="0 0 52 52" aria-hidden="true">
                      <circle className="trilho" cx="26" cy="26" r={R} />
                      <circle
                        className="avanco"
                        cx="26"
                        cy="26"
                        r={R}
                        strokeDasharray={CIRC}
                        strokeDashoffset={CIRC * (1 - frac)}
                      />
                    </svg>
                    <b className="num">{item.sigla}</b>
                  </span>
                  <span className="anilha-titulo">{item.titulo}</span>
                  <span className="cont num">
                    {n}/{item.total}
                  </span>
                </button>
              )
            })}
          </nav>
        </header>
      ) : null}

      <main
        className={menuAtivo === 'estatisticas' ? 'estatisticas-main' : undefined}
        data-g={grupo.chave}
      >
        {menuAtivo === 'estatisticas' ? (
          <Estatisticas
            days={Object.values(homeDays)}
            routines={routines}
            exercises={statsExercises}
            bodyWeights={bodyWeights}
            currentStreak={streak}
            bestStreak={melhorStreak}
            points={totalFeitos}
          />
        ) : (
        <>
        <div className="grupo-head ancora-menu" id="plano">
          <span className="selo num" aria-hidden="true">{grupo.sigla}</span>
          <div>
            <h1 className="num">{grupo.titulo}</h1>
            <p className="resumo">{feitos} de {total} feitos</p>
          </div>
          {(principal > 0 || principalRodando) && (
            <button
              className="reset-treino"
              aria-label="Zerar tempo de treino"
              title="Zerar tempo de treino"
              onClick={() =>
                confirm('Zerar o tempo de treino?') && dispatch({ type: 'mainReset' })
              }
            >
              <Icon name="reset" />
            </button>
          )}
        </div>
        <div
          className="barra"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={feitos}
          aria-label={`Progresso de ${grupo.titulo}`}
        >
          <div style={{ width: `${(feitos / total) * 100}%` }} />
        </div>

        <div className="busca ancora-menu" id="exercicios">
          <label className="sr" htmlFor="buscar-exercicios">Buscar exercícios</label>
          <input
            id="buscar-exercicios"
            type="search"
            placeholder={`Buscar em ${grupo.titulo.toLocaleLowerCase('pt-BR')}`}
            value={busca}
            onChange={(event) => {
              setBusca(event.target.value)
              setLimite(50)
            }}
          />
        </div>

        {erroExercicios ? (
          <div className="estado-catalogo" role="alert">
            <p>Não foi possível consultar os exercícios: {erroExercicios}</p>
            <button
              className="mais-resultados"
              onClick={() => setTentativaExercicios((n) => n + 1)}
            >
              Tentar novamente
            </button>
          </div>
        ) : carregandoExercicios ? (
          <p className="estado-catalogo" role="status">Consultando o IndexedDB...</p>
        ) : (
        <ul className="lista">
          {visiveis.map((exercicio) => {
            const feito = state.done[exercicio.id] ?? exercicio.inicial
            const clock = state.clocks[exercicio.id]
            const rodando = !!clock?.since
            const tempo = elapsed(clock, now)
            const cls = ['item', feito ? 'feito' : '', rodando ? 'rodando' : '']
              .filter(Boolean)
              .join(' ')
            return (
              <li key={exercicio.id} className={cls}>
                <div className="item-topo">
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={feito}
                      onChange={() =>
                        dispatch({ type: 'toggle', id: exercicio.id, seed: exercicio.inicial })
                      }
                    />
                    <span className="caixa">
                      <Icon name="check" />
                    </span>
                    <span className="texto-exercicio">
                      <span className="nome">{exercicio.nome}</span>
                      <span className="catalogo-meta">{exercicio.equipamento}</span>
                    </span>
                  </label>
                  <div className="tempo">
                    {(tempo > 0 || rodando) && <span className="num marca">{fmt(tempo)}</span>}
                    {tempo > 0 && !rodando && (
                      <button
                        className="redondo suave pequeno"
                        aria-label={`Zerar tempo de ${exercicio.nome}`}
                        onClick={() => dispatch({ type: 'resetEx', id: exercicio.id })}
                      >
                        <Icon name="reset" />
                      </button>
                    )}
                    <button
                      className="redondo suave pequeno"
                      aria-label={`Ver detalhes de ${exercicio.nome}`}
                      onClick={() => setDetalhe(exercicio)}
                    >
                      <Icon name="info" />
                    </button>
                    <button
                      className={rodando ? 'redondo cor pequeno' : 'redondo contorno pequeno'}
                      aria-label={`${rodando ? 'Pausar' : 'Iniciar'} ${exercicio.nome}`}
                      onClick={() =>
                        dispatch({ type: rodando ? 'pauseEx' : 'startEx', id: exercicio.id })
                      }
                    >
                      <Icon name={rodando ? 'pause' : 'play'} />
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
        )}

        {!carregandoExercicios && !erroExercicios && (
          <p className="resultado-contagem" aria-live="polite">
            {consulta
              ? `Exibindo ${visiveis.length} de ${resultados.length} resultado${resultados.length === 1 ? '' : 's'}`
              : `Exibindo ${visiveis.length} de ${exercicios.length} exercícios`}
          </p>
        )}
        {resultados.length > limite && (
          <button className="mais-resultados" onClick={() => setLimite((atual) => atual + 50)}>
            Mostrar mais exercícios
          </button>
        )}

        <footer className="rodape">
          <p>
            Semana: <b className="num">{totalFeitos}</b> de {totalGeral} exercícios
          </p>
          <button
            className="texto"
            onClick={() =>
              confirm('Começar nova semana? Isso desmarca tudo e zera todos os tempos.') &&
              dispatch({ type: 'resetWeek' })
            }
          >
            Começar nova semana
          </button>
        </footer>
        </>
        )}
      </main>
      </>
      )}

      <div className="dock-wrap">
        <nav className="dock-nav" aria-label="Navegação principal">
          <button
            className={menuAtivo === 'inicio' ? 'dock-item ativo' : 'dock-item'}
            aria-current={menuAtivo === 'inicio' ? 'page' : undefined}
            onClick={() => navegar('inicio', 'inicio')}
          >
            <Icon name="home" />
            <span>Início</span>
          </button>
          <button
            className={menuAtivo === 'plano' ? 'dock-item ativo' : 'dock-item'}
            aria-current={menuAtivo === 'plano' ? 'page' : undefined}
            onClick={() => navegar('plano', 'plano')}
          >
            <Icon name="calendar" />
            <span>Plano</span>
          </button>
          <span className="dock-centro">
            <button
              className={principalRodando ? 'dock-play rodando' : 'dock-play'}
              aria-label={principalRodando ? 'Pausar treino' : 'Iniciar treino'}
              onClick={() => dispatch({ type: 'mainToggle' })}
            >
              <Icon name={principalRodando ? 'pause' : 'play'} />
            </button>
            <output className="dock-cronometro num" aria-label="Tempo de treino">
              {fmt(principal)}
            </output>
          </span>
          <button
            className={menuAtivo === 'estatisticas' ? 'dock-item ativo' : 'dock-item'}
            aria-current={menuAtivo === 'estatisticas' ? 'page' : undefined}
            onClick={() => navegar('estatisticas', 'estatisticas')}
          >
            <Icon name="chart" />
            <span>Estatísticas</span>
          </button>
          <button
            className={menuAtivo === 'exercicios' ? 'dock-item ativo' : 'dock-item'}
            aria-current={menuAtivo === 'exercicios' ? 'page' : undefined}
            onClick={() => navegar('exercicios', 'exercicios')}
          >
            <Icon name="weights" />
            <span>Exercícios</span>
          </button>
        </nav>
      </div>

      {detalhe && (
        <Detalhes
          grupo={grupos.find(
            (item) => item.chave === detalhe.parteCorporal.replaceAll(' ', '-'),
          ) ?? grupo}
          exercicio={detalhe}
          onClose={() => setDetalhe(null)}
        />
      )}
    </div>
  )
}
