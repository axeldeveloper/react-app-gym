import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addExerciseToPlanRoutine,
  createPlanRoutine,
  deletePlanRoutine,
  formatReps,
  initializePlanRoutines,
  savePlanRoutine,
  savePlanRoutines,
  type PlanRoutine,
  type ProgressionType,
} from './data/planDb'
import { readAllExercises } from './data/catalogueDb'
import BodyMuscleMap from './components/BodyMuscleMap'
import { muscleLoadsForRoutine, musclesInRoutine } from './data/muscleMap'
import { PARTES_CORPORAIS, type Exercicio } from './data/treinos'

type Props = {
  className?: string
}

function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
}

function IconePeso() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" />
    </svg>
  )
}

const PROGRESSOES: Array<{ value: ProgressionType; title: string; description: string }> = [
  {
    value: 'none',
    title: 'Sem progressão automática',
    description: 'As metas permanecem como você definir.',
  },
  {
    value: 'linear',
    title: 'Progressão linear',
    description: 'Conclua todas as repetições de todas as séries para aumentar o peso. Falhas repetidas acionam uma redução de carga.',
  },
  {
    value: 'greyskull-lp',
    title: 'Greyskull LP',
    description: 'Duas séries normais e uma série final até a falha. Supere a meta nessa série e o peso sobe (em dobro se você dobrar as repetições). Uma falha reduz 10 %.',
  },
  {
    value: 'double',
    title: 'Progressão dupla',
    description: 'Avance por uma faixa de repetições com o mesmo peso. Ao atingir o topo da faixa em todas as séries, o peso aumenta e as repetições voltam ao mínimo.',
  },
  {
    value: 'triple',
    title: 'Progressão tripla',
    description: 'As repetições sobem até o topo da faixa, depois entra mais uma série, até o seu máximo de séries. Todas no topo e o peso sobe, de volta às primeiras séries e repetições.',
  },
]

function atualizarRotina(
  rotina: PlanRoutine,
  update: (rotina: PlanRoutine) => PlanRoutine,
) {
  return update(rotina)
}

export default function Plano({ className = '' }: Props) {
  const [rotinas, setRotinas] = useState<PlanRoutine[]>([])
  const [exercicios, setExercicios] = useState<Exercicio[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [tentativa, setTentativa] = useState(0)
  const [rotinaAtivaId, setRotinaAtivaId] = useState<string | null>(null)
  const [aba, setAba] = useState<'horario' | 'rotinas'>('rotinas')
  const [modoEdicao, setModoEdicao] = useState(false)
  const [progressoesAberto, setProgressoesAberto] = useState(false)
  const [seletorAberto, setSeletorAberto] = useState(false)
  const [adicionandoId, setAdicionandoId] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [parteSelecionada, setParteSelecionada] = useState('')
  const [limite, setLimite] = useState(60)
  const [nomeRascunho, setNomeRascunho] = useState('')
  const listaSeletorRef = useRef<HTMLDivElement>(null)
  const fimListaSeletorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    setErro(null)
    Promise.all([initializePlanRoutines(), readAllExercises()])
      .then(([resultadoRotinas, resultadoExercicios]) => {
        const idsDisponiveis = new Set(resultadoExercicios.map((exercicio) => exercicio.id))
        const idsAusentes = resultadoRotinas
          .flatMap((rotina) => rotina.exercises.map((item) => item.exerciseId))
          .filter((id) => !idsDisponiveis.has(id))
        if (idsAusentes.length) {
          throw new Error(`Exercícios das rotinas não encontrados no IndexedDB: ${idsAusentes.join(', ')}`)
        }
        if (ativo) {
          setRotinas(resultadoRotinas)
          setExercicios(resultadoExercicios)
        }
      })
      .catch((error: unknown) => {
        if (ativo) setErro(error instanceof Error ? error.message : 'Erro inesperado ao carregar o plano.')
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [tentativa])

  const rotinaAtiva = rotinas.find((rotina) => rotina.id === rotinaAtivaId)
  const exerciciosPorId = useMemo(
    () => new Map(exercicios.map((exercicio) => [exercicio.id, exercicio])),
    [exercicios],
  )
  const cargasMusculares = useMemo(
    () =>
      new Map(
        rotinas.map((rotina) => [
          rotina.id,
          muscleLoadsForRoutine(rotina, exerciciosPorId),
        ]),
      ),
    [exerciciosPorId, rotinas],
  )
  const urlsMidia = useMemo(() => {
    const urls = new Map<string, string>()
    exercicios.forEach((exercicio) => {
      if (exercicio.midia && exercicio.tipoMidia?.startsWith('image/')) {
        urls.set(exercicio.id, URL.createObjectURL(exercicio.midia))
      }
    })
    return urls
  }, [exercicios])

  useEffect(
    () => () => urlsMidia.forEach((url) => URL.revokeObjectURL(url)),
    [urlsMidia],
  )

  useEffect(() => {
    setNomeRascunho(rotinaAtiva?.name ?? '')
  }, [rotinaAtiva?.id, rotinaAtiva?.name])

  useEffect(() => {
    if (!seletorAberto && !progressoesAberto) return
    const fecharComEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSeletorAberto(false)
        setProgressoesAberto(false)
      }
    }
    document.addEventListener('keydown', fecharComEscape)
    return () => document.removeEventListener('keydown', fecharComEscape)
  }, [progressoesAberto, seletorAberto])

  const consulta = useMemo(() => normalizar(busca), [busca])
  const exerciciosFiltrados = useMemo(
    () =>
      exercicios.filter((exercicio) => {
        if (parteSelecionada && exercicio.parteCorporal !== parteSelecionada) return false
        if (!consulta) return true
        return normalizar(
          [
            exercicio.nome,
            exercicio.nomeOriginal,
            exercicio.alvo,
            exercicio.equipamento,
            exercicio.categoria,
            ...exercicio.musculosSecundarios,
          ].join(' '),
        ).includes(consulta)
      }),
    [consulta, exercicios, parteSelecionada],
  )
  const exerciciosAdicionaveis = useMemo(
    () =>
      rotinaAtiva
        ? exerciciosFiltrados.filter(
            (exercicio) =>
              !rotinaAtiva.exercises.some((item) => item.exerciseId === exercicio.id),
          )
        : exerciciosFiltrados,
    [exerciciosFiltrados, rotinaAtiva],
  )

  useEffect(() => {
    const root = listaSeletorRef.current
    const sentinel = fimListaSeletorRef.current
    if (!seletorAberto || !root || !sentinel || limite >= exerciciosAdicionaveis.length) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLimite((atual) =>
            Math.min(atual + 60, exerciciosAdicionaveis.length),
          )
        }
      },
      { root, rootMargin: '0px 0px 160px 0px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [exerciciosAdicionaveis.length, limite, seletorAberto])

  const compartilhar = async () => {
    const texto = rotinas
      .map((rotina) => `${rotina.name}\n${rotina.exercises.map((item) => {
        const exercicio = exerciciosPorId.get(item.exerciseId)
        return exercicio ? `- ${exercicio.nome}: ${item.sets} × ${formatReps(item)}` : ''
      }).filter(Boolean).join('\n')}`)
      .join('\n\n')
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Plano de treino', text: texto })
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(texto)
      } else {
        throw new Error('Compartilhamento não disponível neste navegador.')
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setErro(error instanceof Error ? error.message : 'Não foi possível compartilhar o plano.')
    }
  }

  const salvar = async (rotina: PlanRoutine) => {
    try {
      await savePlanRoutine(rotina)
      setRotinas((atuais) =>
        [...atuais.filter((item) => item.id !== rotina.id), rotina].sort(
          (a, b) => a.position - b.position,
        ),
      )
      setErro(null)
      return true
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível salvar a rotina no IndexedDB.')
      return false
    }
  }

  const criarRotina = async () => {
    try {
      const rotina = await createPlanRoutine()
      setRotinas((atuais) => [...atuais, rotina].sort((a, b) => a.position - b.position))
      setRotinaAtivaId(rotina.id)
      setErro(null)
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível criar a rotina.')
    }
  }

  const removerRotina = async () => {
    if (!rotinaAtiva || !confirm(`Excluir a rotina "${rotinaAtiva.name}"?`)) return
    const restantes = rotinas
      .filter((rotina) => rotina.id !== rotinaAtiva.id)
      .map((rotina, position) => ({ ...rotina, position }))
    try {
      await deletePlanRoutine(rotinaAtiva.id, restantes)
      setRotinas(restantes)
      setRotinaAtivaId(null)
      setErro(null)
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível excluir a rotina do IndexedDB.')
    }
  }

  const moverRotina = async (indice: number, direcao: -1 | 1) => {
    const destino = indice + direcao
    if (destino < 0 || destino >= rotinas.length) return
    const proximas = [...rotinas]
    ;[proximas[indice], proximas[destino]] = [proximas[destino], proximas[indice]]
    const ordenadas = proximas.map((rotina, position) => ({ ...rotina, position }))
    try {
      await savePlanRoutines(ordenadas)
      setRotinas(ordenadas)
      setErro(null)
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível reordenar as rotinas no IndexedDB.')
    }
  }

  const abrirSeletor = () => {
    setBusca('')
    setParteSelecionada('')
    setLimite(60)
    setErro(null)
    setSeletorAberto(true)
  }

  const adicionarExercicio = async (exerciseId: string) => {
    if (!rotinaAtiva || adicionandoId) return
    setAdicionandoId(exerciseId)
    setErro(null)
    try {
      const atualizada = await addExerciseToPlanRoutine(rotinaAtiva.id, exerciseId)
      setRotinas((atuais) =>
        atuais
          .map((rotina) => (rotina.id === atualizada.id ? atualizada : rotina))
          .sort((a, b) => a.position - b.position),
      )
      setSeletorAberto(false)
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível adicionar o exercício ao IndexedDB.')
    } finally {
      setAdicionandoId(null)
    }
  }

  const atualizarExercicio = async (
    indice: number,
    update: (exercicio: PlanRoutine['exercises'][number]) => PlanRoutine['exercises'][number],
  ) => {
    if (!rotinaAtiva) return
    const atualizada = atualizarRotina(rotinaAtiva, (rotina) => ({
      ...rotina,
      exercises: rotina.exercises.map((exercicio, atual) =>
        atual === indice ? update(exercicio) : exercicio,
      ),
    }))
    await salvar(atualizada)
  }

  const moverExercicio = async (indice: number, direcao: -1 | 1) => {
    if (!rotinaAtiva) return
    const destino = indice + direcao
    if (destino < 0 || destino >= rotinaAtiva.exercises.length) return
    const exerciciosOrdenados = [...rotinaAtiva.exercises]
    ;[exerciciosOrdenados[indice], exerciciosOrdenados[destino]] = [
      exerciciosOrdenados[destino],
      exerciciosOrdenados[indice],
    ]
    await salvar(atualizarRotina(rotinaAtiva, (rotina) => ({ ...rotina, exercises: exerciciosOrdenados })))
  }

  const switchName = async () => {
    const name = nomeRascunho.trim()
    if (!rotinaAtiva) return
    if (!name) {
      setNomeRascunho(rotinaAtiva.name)
      return
    }
    if (name === rotinaAtiva.name) return
    await salvar(atualizarRotina(rotinaAtiva, (rotina) => ({ ...rotina, name })))
  }

  if (carregando) {
    return <main className={`plan-page ${className}`} role="status">Carregando seu plano...</main>
  }

  if (erro && rotinas.length === 0) {
    return (
      <main className={`plan-page ${className}`} role="alert">
        <p>Não foi possível carregar o plano: {erro}</p>
        <button className="plan-primary-button" onClick={() => setTentativa((valor) => valor + 1)}>
          Tentar novamente
        </button>
      </main>
    )
  }

  if (rotinaAtiva) {
    const progressoSelecionado =
      PROGRESSOES.find((progresso) => progresso.value === rotinaAtiva.progression) ??
      PROGRESSOES[1]
    const cargaMuscular = cargasMusculares.get(rotinaAtiva.id) ?? {}
    const musculosTrabalhados = musclesInRoutine(cargaMuscular)
    return (
      <main className={`plan-page ${className}`}>
        <header className="plan-editor-header">
          <button className="plan-round-button" aria-label="Voltar às rotinas" onClick={() => setRotinaAtivaId(null)}>
            ‹
          </button>
          <input
            className="plan-name-input"
            aria-label="Nome da rotina"
            value={nomeRascunho}
            maxLength={60}
            onChange={(event) => setNomeRascunho(event.target.value)}
            onBlur={switchName}
            onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
          />
          <button className="plan-round-button" aria-label="Excluir rotina" onClick={removerRotina}>
            ×
          </button>
        </header>

        <section className="plan-settings" aria-label="Configurações da rotina">
          <div className="plan-setting-row">
            <span className="plan-setting-icon progresso" aria-hidden="true">↗</span>
            <button
              className="plan-progression-trigger"
              aria-haspopup="dialog"
              aria-expanded={progressoesAberto}
              onClick={() => setProgressoesAberto(true)}
            >
              <span>Progressão</span>
              <span className="plan-progression-value">{progressoSelecionado.title}</span>
            </button>
            <span aria-hidden="true">›</span>
          </div>
          <label className="plan-setting-row deload">
            <span className="plan-setting-icon deload-icon" aria-hidden="true">↘</span>
            <span className="plan-setting-copy">
              <strong>Rotina de deload</strong>
              <small>Os treinos dela não contam para a progressão.</small>
            </span>
            <input
              type="checkbox"
              checked={rotinaAtiva.deload}
              onChange={(event) => {
                const deload = event.target.checked
                void salvar(atualizarRotina(rotinaAtiva, (rotina) => ({ ...rotina, deload })))
              }}
            />
          </label>
        </section>
        <p className="plan-hint">
          {progressoSelecionado.description}
        </p>

        <div className="plan-exercises-heading">
          <span>Exercícios</span>
          <button className="plan-primary-button" onClick={abrirSeletor}>＋ Adicionar exercício</button>
        </div>
        {rotinaAtiva.exercises.length ? (
          <ol className="plan-exercise-list">
            {rotinaAtiva.exercises.map((item, indice) => {
              const exercicio = exerciciosPorId.get(item.exerciseId)
              if (!exercicio) return null
              return (
                <li className="plan-exercise-card" key={`${rotinaAtiva.id}-${item.exerciseId}-${indice}`}>
                  <span className="plan-drag-handle" aria-hidden="true">⠿</span>
                  <span className="plan-thumbnail">
                    {(urlsMidia.get(exercicio.id) ?? exercicio.imagem) ? (
                      <img
                        src={urlsMidia.get(exercicio.id) ?? exercicio.imagem}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <IconePeso />
                    )}
                  </span>
                  <span className="plan-exercise-copy">
                    <strong>{exercicio.nome}</strong>
                    <small>{exercicio.equipamento}</small>
                    <span className="plan-prescription">
                      <label>
                        <span className="sr">Séries de {exercicio.nome}</span>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={item.sets}
                          onChange={(event) => {
                            const sets = Math.min(20, Math.max(1, Number.parseInt(event.target.value, 10) || 1))
                            void atualizarExercicio(indice, (atual) => ({ ...atual, sets }))
                          }}
                        />
                      </label>
                      <span>×</span>
                      <label>
                        <span className="sr">Mínimo de repetições de {exercicio.nome}</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={item.reps}
                          onChange={(event) => {
                            const reps = Math.min(100, Math.max(1, Number.parseInt(event.target.value, 10) || 1))
                            void atualizarExercicio(indice, (atual) => ({
                              ...atual,
                              reps,
                              ...(atual.repsMax === undefined
                                ? {}
                                : { repsMax: Math.max(reps, atual.repsMax) }),
                            }))
                          }}
                        />
                      </label>
                      {item.repsMax !== undefined && (
                        <>
                          <span aria-hidden="true">–</span>
                          <label>
                            <span className="sr">Máximo de repetições de {exercicio.nome}</span>
                            <input
                              type="number"
                              min={item.reps}
                              max={100}
                              value={item.repsMax}
                              onChange={(event) => {
                                const repsMax = Math.min(
                                  100,
                                  Math.max(
                                    item.reps,
                                    Number.parseInt(event.target.value, 10) || item.reps,
                                  ),
                                )
                                void atualizarExercicio(indice, (atual) => ({ ...atual, repsMax }))
                              }}
                            />
                          </label>
                        </>
                      )}
                      <span>reps</span>
                    </span>
                  </span>
                  <span className="plan-reorder">
                    <button
                      aria-label={`Mover ${exercicio.nome} para cima`}
                      disabled={indice === 0}
                      onClick={() => void moverExercicio(indice, -1)}
                    >⌃</button>
                    <button
                      aria-label={`Mover ${exercicio.nome} para baixo`}
                      disabled={indice === rotinaAtiva.exercises.length - 1}
                      onClick={() => void moverExercicio(indice, 1)}
                    >⌄</button>
                    <button
                      className="plan-remove-exercise"
                      aria-label={`Remover ${exercicio.nome}`}
                      onClick={() => {
                        const atualizada = atualizarRotina(rotinaAtiva, (rotina) => ({
                          ...rotina,
                          exercises: rotina.exercises.filter((_, atual) => atual !== indice),
                        }))
                        void salvar(atualizada)
                      }}
                    >×</button>
                  </span>
                </li>
              )
            })}
          </ol>
        ) : (
          <p className="plan-empty">Esta rotina ainda não tem exercícios. Adicione um para começar.</p>
        )}

        <section className="plan-muscle-panel" aria-label="Músculos trabalhados na rotina">
          <h2>Músculos trabalhados</h2>
          <BodyMuscleMap load={cargaMuscular} />
          {musculosTrabalhados.length ? (
            <ul className="plan-muscle-names">
              {musculosTrabalhados.map((musculo) => (
                <li key={musculo.id}>{musculo.name}</li>
              ))}
            </ul>
          ) : (
            <p className="plan-empty">Adicione exercícios para ver os músculos trabalhados.</p>
          )}
          <div className="plan-muscle-legend" aria-label="Menos para mais séries">
            <span>Menos</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <span className={`plan-muscle-legend-step level-${level}`} key={level} />
            ))}
            <span>Mais</span>
          </div>
        </section>

        {erro && <p className="plan-error" role="alert">{erro}</p>}

        {seletorAberto && (
          <div className="plan-picker-backdrop" onClick={(event) => event.target === event.currentTarget && setSeletorAberto(false)}>
            <section className="plan-picker" role="dialog" aria-modal="true" aria-labelledby="plan-picker-title">
              <div className="plan-picker-grip" aria-hidden="true" />
              <header className="plan-picker-header">
                <h2 id="plan-picker-title">Adicionar exercício</h2>
                <button
                  className="plan-round-button"
                  aria-label="Fechar seleção de exercícios"
                  onClick={() => setSeletorAberto(false)}
                >
                  ×
                </button>
              </header>
              {erro && <p className="plan-error" role="alert">{erro}</p>}
              <label className="plan-search">
                <span aria-hidden="true">⌕</span>
                <span className="sr">Buscar exercícios</span>
                <input
                  type="search"
                  placeholder={`Buscar entre ${exercicios.length.toLocaleString('pt-BR')} exercícios...`}
                  value={busca}
                  onChange={(event) => {
                    setBusca(event.target.value)
                    setLimite(60)
                    if (listaSeletorRef.current) listaSeletorRef.current.scrollTop = 0
                  }}
                  autoFocus
                />
              </label>
              <div className="plan-muscle-filters" aria-label="Filtrar exercícios por músculo">
                <button
                  className={!parteSelecionada ? 'selecionado' : ''}
                  aria-pressed={!parteSelecionada}
                  onClick={() => {
                    setParteSelecionada('')
                    setLimite(60)
                    if (listaSeletorRef.current) listaSeletorRef.current.scrollTop = 0
                  }}
                >Todos</button>
                {Object.entries(PARTES_CORPORAIS).map(([parte, info]) => (
                  <button
                    key={parte}
                    className={parteSelecionada === parte ? 'selecionado' : ''}
                    aria-pressed={parteSelecionada === parte}
                    onClick={() => {
                      setParteSelecionada(parteSelecionada === parte ? '' : parte)
                      setLimite(60)
                      if (listaSeletorRef.current) listaSeletorRef.current.scrollTop = 0
                    }}
                  >{info.titulo}</button>
                ))}
              </div>
              <div className="plan-picker-list" ref={listaSeletorRef}>
                {exerciciosAdicionaveis
                  .slice(0, limite)
                  .map((exercicio) => {
                    const adicionando = adicionandoId === exercicio.id
                    return (
                      <button
                        key={exercicio.id}
                        className="plan-picker-exercise"
                        aria-label={`Adicionar ${exercicio.nome} à rotina`}
                        disabled={adicionandoId !== null}
                        onClick={() => void adicionarExercicio(exercicio.id)}
                      >
                        <span className="plan-thumbnail">
                          {(urlsMidia.get(exercicio.id) ?? exercicio.imagem) ? (
                            <img
                              src={urlsMidia.get(exercicio.id) ?? exercicio.imagem}
                              alt=""
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <IconePeso />
                          )}
                        </span>
                        <span className="plan-exercise-copy">
                          <strong>{exercicio.nome}</strong>
                          <small>{exercicio.alvo} · {exercicio.equipamento}</small>
                        </span>
                        <span className="plan-picker-plus" aria-hidden="true">{adicionando ? '…' : '+'}</span>
                      </button>
                    )
                  })}
                {exerciciosAdicionaveis.length === 0 && (
                  <p className="plan-empty">Nenhum exercício encontrado para estes filtros.</p>
                )}
                {exerciciosAdicionaveis.length > limite && (
                  <div className="plan-picker-sentinel" ref={fimListaSeletorRef} aria-hidden="true" />
                )}
              </div>
            </section>
          </div>
        )}
        {progressoesAberto && (
          <div
            className="plan-picker-backdrop plan-progression-backdrop"
            onClick={(event) => event.target === event.currentTarget && setProgressoesAberto(false)}
          >
            <section
              className="plan-progression-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="plan-progression-title"
            >
              <div className="plan-picker-grip" aria-hidden="true" />
              <h2 id="plan-progression-title">Progressão</h2>
              <div className="plan-progression-options">
                {PROGRESSOES.map((progresso) => {
                  const selecionado = progresso.value === rotinaAtiva.progression
                  return (
                    <button
                      key={progresso.value}
                      className="plan-progression-option"
                      aria-pressed={selecionado}
                      onClick={async () => {
                        const atualizado = atualizarRotina(rotinaAtiva, (rotina) => ({
                          ...rotina,
                          progression: progresso.value,
                        }))
                        if (await salvar(atualizado)) setProgressoesAberto(false)
                      }}
                    >
                      <span className="plan-progression-copy">
                        <strong>{progresso.title}</strong>
                        <small>{progresso.description}</small>
                      </span>
                      {selecionado && <span className="plan-progression-check" aria-label="Selecionada">✓</span>}
                    </button>
                  )
                })}
              </div>
            </section>
          </div>
        )}
      </main>
    )
  }

  return (
    <main className={`plan-page ${className}`} id="plano">
      <header className="plan-header">
        <div>
          <h1>Plano</h1>
          <p>Suas rotinas em ciclo</p>
        </div>
        <button className="plan-share-button" aria-label="Compartilhar plano" title="Compartilhar plano" onClick={() => void compartilhar()}>
          ↥
        </button>
      </header>
      <div className="plan-tabs" role="tablist" aria-label="Visualização do plano">
        <button
          role="tab"
          aria-selected={aba === 'horario'}
          className={aba === 'horario' ? 'selecionado' : ''}
          onClick={() => setAba('horario')}
        >Horário</button>
        <button
          role="tab"
          aria-selected={aba === 'rotinas'}
          className={aba === 'rotinas' ? 'selecionado' : ''}
          onClick={() => setAba('rotinas')}
        >Rotinas</button>
      </div>
      {aba === 'rotinas' ? (
        <div className="plan-list-actions">
          <button className="plan-edit-link" onClick={() => setModoEdicao((ativo) => !ativo)}>
            {modoEdicao ? 'Concluir' : 'Editar'}
          </button>
          <button className="plan-primary-button" onClick={() => void criarRotina()}>
            ＋ Nova rotina
          </button>
        </div>
      ) : (
        <div className="plan-cycle-heading">
          <strong>Seu ciclo de treinos</strong>
          <span>A sequência das suas rotinas</span>
        </div>
      )}
      {rotinas.length === 0 ? (
        <p className="plan-empty">Nenhuma rotina criada. Crie uma para começar seu plano.</p>
      ) : (
        <ol className={aba === 'horario' ? 'plan-routine-list horario' : 'plan-routine-list'}>
          {rotinas.map((rotina, indice) => (
            <li key={rotina.id}>
              <button
                className="plan-routine-card"
                onClick={() => setRotinaAtivaId(rotina.id)}
                aria-label={`Editar ${rotina.name}, ${rotina.exercises.length} exercícios`}
              >
                {aba === 'horario' && <span className="plan-cycle-number">{indice + 1}</span>}
                <BodyMuscleMap
                  compact
                  load={cargasMusculares.get(rotina.id) ?? {}}
                />
                <span className="plan-routine-copy">
                  <strong>{rotina.name}</strong>
                  <small>{rotina.exercises.length} exercícios · {rotina.focus}</small>
                </span>
                {aba === 'rotinas' && (
                  <span className="plan-routine-order" aria-label={`Rotina ${indice + 1} no ciclo`}>
                    {indice < rotinas.length - 1 ? '↗' : '↻'}
                  </span>
                )}
                <span className="plan-chevron" aria-hidden="true">›</span>
              </button>
              {aba === 'rotinas' && modoEdicao && (
                <span className="plan-card-actions">
                  <button
                    aria-label={`Mover ${rotina.name} para cima`}
                    disabled={indice === 0}
                    onClick={() => void moverRotina(indice, -1)}
                  >⌃</button>
                  <button
                    aria-label={`Mover ${rotina.name} para baixo`}
                    disabled={indice === rotinas.length - 1}
                    onClick={() => void moverRotina(indice, 1)}
                  >⌄</button>
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
      {aba === 'rotinas' && (
        <p className="plan-footnote">
          Toque em uma rotina para editar.{modoEdicao ? ' Reordene o ciclo pelos controles ao lado.' : ''}
        </p>
      )}
      {erro && <p className="plan-error" role="alert">{erro}</p>}
    </main>
  )
}
