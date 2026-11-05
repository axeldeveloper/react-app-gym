import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { readAllExercises, saveCustomExercise } from './data/catalogueDb'
import { PARTES_CORPORAIS, type Exercicio } from './data/treinos'

type Props = {
  onDetails: (exercise: Exercicio) => void
}

function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
}

function capitalizar(texto: string) {
  const inicial = texto.charAt(0)
  return inicial ? inicial.toLocaleUpperCase('pt-BR') + texto.slice(1) : texto
}

function PlusIcon({ added = false }: { added?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      {added ? <path d="m5 12 4.5 4.5L19 7" /> : <path d="M12 5v14M5 12h14" />}
    </svg>
  )
}

function DumbbellIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 24h18M8 17v14M13 13v22M35 13v22M40 17v14" />
    </svg>
  )
}

export default function Exercicios({ onDetails }: Props) {
  const [exercicios, setExercicios] = useState<Exercicio[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [tentativa, setTentativa] = useState(0)
  const [busca, setBusca] = useState('')
  const [parteSelecionada, setParteSelecionada] = useState('')
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState('')
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const [porMusculo, setPorMusculo] = useState(false)
  const [modoLista, setModoLista] = useState(false)
  const [limite, setLimite] = useState(50)
  const [selecionados, setSelecionados] = useState<Set<string>>(() => new Set())
  const [criacaoAberta, setCriacaoAberta] = useState(false)
  const [nomeNovo, setNomeNovo] = useState('')
  const [parteNova, setParteNova] = useState('chest')
  const [equipamentoNovo, setEquipamentoNovo] = useState('')
  const [midiaNova, setMidiaNova] = useState<File | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erroCriacao, setErroCriacao] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    setErro(null)
    readAllExercises()
      .then((resultado) => {
        if (ativo) setExercicios(resultado)
      })
      .catch((error: unknown) => {
        if (ativo) {
          setErro(error instanceof Error ? error.message : 'Erro inesperado ao consultar o catálogo.')
        }
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [tentativa])

  const equipamentos = useMemo(
    () =>
      [...new Set(exercicios.map((exercicio) => exercicio.equipamento))]
        .filter((equipamento) => equipamento !== 'Não informado')
        .sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [exercicios],
  )
  const consulta = useMemo(() => normalizar(busca), [busca])
  const filtrados = useMemo(() => {
    const resultado = exercicios.filter((exercicio) => {
      if (parteSelecionada && exercicio.parteCorporal !== parteSelecionada) return false
      if (equipamentoSelecionado && exercicio.equipamento !== equipamentoSelecionado) return false
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
    })

    return resultado.sort((a, b) => {
      if (porMusculo) {
        const parte = a.parteCorporal.localeCompare(b.parteCorporal, 'pt-BR')
        if (parte) return parte
      }
      return a.nome.localeCompare(b.nome, 'pt-BR')
    })
  }, [consulta, equipamentoSelecionado, exercicios, parteSelecionada, porMusculo])
  const urlsMidia = useMemo(
    () => {
      const urls = new Map<string, string>()
      exercicios.forEach((exercicio) => {
        if (exercicio.midia && exercicio.tipoMidia?.startsWith('image/')) {
          urls.set(exercicio.id, URL.createObjectURL(exercicio.midia))
        }
      })
      return urls
    },
    [exercicios],
  )

  useEffect(
    () => () => {
      urlsMidia.forEach((url) => URL.revokeObjectURL(url))
    },
    [urlsMidia],
  )

  const enviarNovoExercicio = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSalvando(true)
    setErroCriacao(null)
    try {
      const novo = await saveCustomExercise({
        name: nomeNovo.trim(),
        namePtBr: nomeNovo.trim(),
        bodyPart: parteNova,
        equipment: equipamentoNovo.trim() || 'body weight',
        category: 'strength',
        customMedia: midiaNova ?? undefined,
        customMediaType: midiaNova?.type,
      })
      setExercicios((atuais) =>
        [...atuais, novo].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      )
      setParteSelecionada('')
      setBusca(novo.nome)
      setNomeNovo('')
      setEquipamentoNovo('')
      setMidiaNova(null)
      setCriacaoAberta(false)
    } catch (error) {
      setErroCriacao(
        error instanceof Error ? error.message : 'Não foi possível salvar o exercício.',
      )
    } finally {
      setSalvando(false)
    }
  }

  return (
    <main className="exercise-browser">
      <header className="exercise-header">
        <div>
          <h1>Exercícios</h1>
          <p>
            {carregando ? 'Carregando catálogo...' : `${exercicios.length.toLocaleString('pt-BR')} exercícios no catálogo`}
            {selecionados.size > 0 && ` · ${selecionados.size} selecionados`}
          </p>
        </div>
        <button
          className={porMusculo ? 'muscle-mode ativo' : 'muscle-mode'}
          aria-pressed={porMusculo}
          onClick={() => setPorMusculo((ativo) => !ativo)}
        >
          <span className="muscle-mode-icon" aria-hidden="true"><DumbbellIcon /></span>
          {porMusculo ? 'Ordem alfabética' : 'Por músculo'}
        </button>
      </header>

      <div className="exercise-search-row">
        <label className="exercise-search">
          <span aria-hidden="true">⌕</span>
          <span className="sr">Buscar exercícios</span>
          <input
            type="search"
            placeholder="Buscar..."
            value={busca}
            onChange={(event) => {
            setBusca(event.target.value)
            setLimite(50)
            }}
          />
        </label>
        <button
          className={modoLista ? 'view-toggle ativo' : 'view-toggle'}
          aria-label={modoLista ? 'Mostrar grade' : 'Mostrar lista'}
          title={modoLista ? 'Mostrar grade' : 'Mostrar lista'}
          onClick={() => setModoLista((lista) => !lista)}
        >
          {modoLista ? (
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      <div className="exercise-filters">
        <button
          className={filtrosAbertos ? 'filter-chip ativo' : 'filter-chip'}
          aria-expanded={filtrosAbertos}
          onClick={() => setFiltrosAbertos((aberto) => !aberto)}
        >
          <span aria-hidden="true">☷</span> Filtros
        </button>
        <div className="muscle-chips" aria-label="Filtrar por parte do corpo">
          <button
            className={!parteSelecionada ? 'muscle-chip selecionado' : 'muscle-chip'}
            aria-pressed={!parteSelecionada}
            onClick={() => setParteSelecionada('')}
          >
            Todos
          </button>
          {Object.entries(PARTES_CORPORAIS).map(([parte, info]) => (
            <button
              key={parte}
              className={parteSelecionada === parte ? 'muscle-chip selecionado' : 'muscle-chip'}
              aria-pressed={parteSelecionada === parte}
              onClick={() => {
                setParteSelecionada(parteSelecionada === parte ? '' : parte)
                setLimite(50)
              }}
            >
              {info.titulo}
            </button>
          ))}
        </div>
      </div>

      {filtrosAbertos && (
        <div className="filter-panel">
          <label>
            Equipamento
            <select
              value={equipamentoSelecionado}
              onChange={(event) => setEquipamentoSelecionado(event.target.value)}
            >
              <option value="">Todos os equipamentos</option>
              {equipamentos.map((equipamento) => (
                <option key={equipamento} value={equipamento}>{equipamento}</option>
              ))}
            </select>
          </label>
          <button
            className="filter-clear"
            onClick={() => {
              setParteSelecionada('')
              setEquipamentoSelecionado('')
              setBusca('')
            }}
          >
            Limpar filtros
          </button>
        </div>
      )}

      <button
        className="create-exercise-card"
        aria-expanded={criacaoAberta}
        onClick={() => setCriacaoAberta((aberta) => !aberta)}
      >
        <span className="create-exercise-icon" aria-hidden="true"><PlusIcon /></span>
        <span className="create-exercise-copy">
          <strong>Crie seu próprio exercício</strong>
          <small>Nome + parte do corpo, com foto ou vídeo se quiser</small>
        </span>
        <span className="create-exercise-plus" aria-hidden="true">{criacaoAberta ? '−' : '+'}</span>
      </button>

      {criacaoAberta && (
        <form className="create-exercise-form" onSubmit={enviarNovoExercicio}>
          <label>
            Nome do exercício
            <input required maxLength={100} value={nomeNovo} onChange={(event) => setNomeNovo(event.target.value)} />
          </label>
          <div className="create-exercise-fields">
            <label>
              Parte do corpo
              <select value={parteNova} onChange={(event) => setParteNova(event.target.value)}>
                {Object.entries(PARTES_CORPORAIS).map(([parte, info]) => (
                  <option key={parte} value={parte}>{info.titulo}</option>
                ))}
              </select>
            </label>
            <label>
              Equipamento (opcional)
              <input value={equipamentoNovo} onChange={(event) => setEquipamentoNovo(event.target.value)} />
            </label>
          </div>
          <label>
            Foto ou vídeo (opcional)
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(event) => setMidiaNova(event.target.files?.[0] ?? null)}
            />
          </label>
          {erroCriacao && <p className="form-error" role="alert">{erroCriacao}</p>}
          <button className="create-submit" type="submit" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar exercício neste dispositivo'}
          </button>
        </form>
      )}

      {erro ? (
        <div className="exercise-state" role="alert">
          <p>Não foi possível carregar o catálogo: {erro}</p>
          <button className="create-submit" onClick={() => setTentativa((valor) => valor + 1)}>
            Tentar novamente
          </button>
        </div>
      ) : carregando ? (
        <p className="exercise-state" role="status">Consultando exercícios no IndexedDB...</p>
      ) : (
        <>
          <div className={modoLista ? 'exercise-cards lista' : 'exercise-cards'}>
            {filtrados.slice(0, limite).map((exercicio) => {
              const musculo =
                exercicio.alvo !== 'Não informado'
                  ? capitalizar(exercicio.alvo)
                  : PARTES_CORPORAIS[exercicio.parteCorporal]?.titulo ?? 'Músculo não informado'
              const adicionado = selecionados.has(exercicio.id)
              return (
                <article className="exercise-card" key={exercicio.id}>
                  <button
                    className="exercise-card-main"
                    aria-label={`Detalhes de ${exercicio.nome}`}
                    onClick={() => onDetails(exercicio)}
                  >
                    <span className="exercise-thumbnail" aria-hidden="true">
                      {urlsMidia.has(exercicio.id) ? (
                        exercicio.tipoMidia?.startsWith('video/') ? (
                          <span className="exercise-video-placeholder"><DumbbellIcon /></span>
                        ) : (
                          <img src={urlsMidia.get(exercicio.id)} alt="" />
                        )
                      ) : (
                        <DumbbellIcon />
                      )}
                    </span>
                    <span className="exercise-card-copy">
                      <strong>{exercicio.nome}</strong>
                      <small>{musculo} · {capitalizar(exercicio.equipamento)}</small>
                    </span>
                  </button>
                  <button
                    className={adicionado ? 'exercise-add adicionado' : 'exercise-add'}
                    aria-label={`${adicionado ? 'Remover' : 'Adicionar'} ${exercicio.nome} ${adicionado ? 'do' : 'ao'} treino`}
                    aria-pressed={adicionado}
                    onClick={() =>
                      setSelecionados((atuais) => {
                        const proximos = new Set(atuais)
                        if (proximos.has(exercicio.id)) proximos.delete(exercicio.id)
                        else proximos.add(exercicio.id)
                        return proximos
                      })
                    }
                  >
                    <PlusIcon added={adicionado} />
                  </button>
                </article>
              )
            })}
          </div>
          <p className="exercise-result-count" aria-live="polite">
            Exibindo {Math.min(filtrados.length, limite)} de {filtrados.length} exercícios
          </p>
          {filtrados.length > limite && (
            <button className="show-more-exercises" onClick={() => setLimite((valor) => valor + 50)}>
              Mostrar mais exercícios
            </button>
          )}
          {filtrados.length === 0 && <p className="exercise-state">Nenhum exercício encontrado para estes filtros.</p>}
        </>
      )}
    </main>
  )
}
