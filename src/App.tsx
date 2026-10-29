import { useMemo, useState } from 'react'
import { GRUPOS, type Exercicio } from './data/treinos'
import Detalhes from './Detalhes'
import { elapsed, fmt, useNow, useTreinoStore } from './store'
import { IMAGENS_EXERCICIOS } from './data/imagens'

const R = 22
const CIRC = 2 * Math.PI * R

type IconName = 'play' | 'pause' | 'reset' | 'check' | 'info' | 'star' | 'chev'

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
    case 'star':
      return (
        <svg {...common}>
          <path
            d="M12 3.2l2.6 5.5 6 .8-4.4 4.2 1.1 6L12 16.8 6.7 19.7l1.1-6L3.4 9.5l6-.8z"
            fill="currentColor"
          />
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
    case 'chev':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      )
  }
}

export default function App() {
  const [state, dispatch] = useTreinoStore()
  const [aba, setAba] = useState(GRUPOS[0].letra)
  const [detalhe, setDetalhe] = useState<Exercicio | null>(null)
  const [abertos, setAbertos] = useState<Record<string, boolean>>({})
  const [soEssenciais, setSoEssenciais] = useState(() => {
    try {
      return localStorage.getItem('treino-pwa:filtro') === 'essenciais'
    } catch {
      return false
    }
  })
  const escolherFiltro = (v: boolean) => {
    setSoEssenciais(v)
    try {
      localStorage.setItem('treino-pwa:filtro', v ? 'essenciais' : 'todos')
    } catch {
      /* sem persistência, segue normal */
    }
  }

  const algumRodando =
    !!state.main.since || Object.values(state.clocks).some((c) => c.since)
  const now = useNow(algumRodando)

  const contagem = useMemo(
    () =>
      Object.fromEntries(
        GRUPOS.map((g) => [
          g.letra,
          g.exercicios.filter((e) => state.done[e.id] ?? e.inicial).length,
        ]),
      ),
    [state.done],
  )

  const totalFeitos = Object.values(contagem).reduce((a, b) => a + b, 0)
  const totalGeral = GRUPOS.reduce((a, g) => a + g.exercicios.length, 0)
  const grupo = GRUPOS.find((g) => g.letra === aba)!
  const feitos = contagem[grupo.letra]
  const total = grupo.exercicios.length
  const nEssenciais = grupo.exercicios.filter((e) => e.essencial).length
  const visiveis = soEssenciais ? grupo.exercicios.filter((e) => e.essencial) : grupo.exercicios
  const principal = elapsed(state.main, now)
  const principalRodando = !!state.main.since
  const imgGrupo = `/exercicios/${grupo.letra}.svg`

  const toggleAccordion = (id: string) => {
    setAbertos((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="app">
      <header className="topo">
        <section className="relogio" aria-label="Tempo de treino">
          <div className="relogio-tempo">
            <span className="rotulo">Tempo de treino</span>
            <output className="num grande">{fmt(principal, true)}</output>
          </div>
          <div className="relogio-acoes">
            {(principal > 0 || principalRodando) && (
              <button
                className="redondo suave"
                aria-label="Zerar tempo de treino"
                onClick={() =>
                  confirm('Zerar o tempo de treino?') && dispatch({ type: 'mainReset' })
                }
              >
                <Icon name="reset" />
              </button>
            )}
            <button
              className="redondo forte"
              aria-label={principalRodando ? 'Pausar treino' : 'Iniciar treino'}
              onClick={() => dispatch({ type: 'mainToggle' })}
            >
              <Icon name={principalRodando ? 'pause' : 'play'} />
            </button>
          </div>
        </section>

        <nav className="anilhas" aria-label="Grupos de treino">
          {GRUPOS.map((g) => {
            const n = contagem[g.letra]
            const frac = n / g.exercicios.length
            const ativa = g.letra === aba
            return (
              <button
                key={g.letra}
                className={ativa ? 'anilha ativa' : 'anilha'}
                data-g={g.letra}
                aria-current={ativa ? 'true' : undefined}
                aria-label={`${g.titulo} ${g.letra}, ${n} de ${g.exercicios.length} feitos`}
                onClick={() => {
                  setAba(g.letra)
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
                  <b className="num">{g.letra}</b>
                </span>
                <span className="cont num">
                  {n}/{g.exercicios.length}
                </span>
              </button>
            )
          })}
        </nav>
      </header>

      <main data-g={grupo.letra}>
        <div className="grupo-head">
          <span className="selo num" aria-hidden="true">
            {grupo.letra}
          </span>
          <div>
            <h1 className="num">{grupo.titulo}</h1>
            <p className="resumo">
              {feitos} de {total} feitos
            </p>
          </div>
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

        <div className="filtro" role="group" aria-label="Filtrar exercícios">
          <button aria-pressed={!soEssenciais} onClick={() => escolherFiltro(false)}>
            Todos <span className="num">{total}</span>
          </button>
          <button aria-pressed={soEssenciais} onClick={() => escolherFiltro(true)}>
            <Icon name="star" /> Essenciais <span className="num">{nEssenciais}</span>
          </button>
        </div>

        <ul className="lista">
          {visiveis.map((ex) => {
            const feito = state.done[ex.id] ?? ex.inicial
            const clock = state.clocks[ex.id]
            const rodando = !!clock?.since
            const tempo = elapsed(clock, now)
            const cls = ['item', feito ? 'feito' : '', rodando ? 'rodando' : '']
              .filter(Boolean)
              .join(' ')
            const aberto = !!abertos[ex.id]
            return (
              <li key={ex.id} className={cls}>
                <div className="item-topo">
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={feito}
                      onChange={() => dispatch({ type: 'toggle', id: ex.id, seed: ex.inicial })}
                    />
                    <span className="caixa">
                      <Icon name="check" />
                    </span>
                    <span className="nome">
                      {ex.essencial && (
                        <>
                          <span className="estrela" aria-hidden="true">
                            <Icon name="star" />
                          </span>
                          <span className="sr">Essencial: </span>
                        </>
                      )}
                      {ex.nome}
                    </span>
                  </label>
                  <div className="tempo">
                    {(tempo > 0 || rodando) && <span className="num marca">{fmt(tempo)}</span>}
                    {tempo > 0 && !rodando && (
                      <button
                        className="redondo suave pequeno"
                        aria-label={`Zerar tempo de ${ex.nome}`}
                        onClick={() => dispatch({ type: 'resetEx', id: ex.id })}
                      >
                        <Icon name="reset" />
                      </button>
                    )}
                    <button
                      className="redondo suave pequeno"
                      aria-label={`Como executar ${ex.nome}`}
                      onClick={() => setDetalhe(ex)}
                    >
                      <Icon name="info" />
                    </button>
                    <button
                      className={rodando ? 'redondo cor pequeno' : 'redondo contorno pequeno'}
                      aria-label={`${rodando ? 'Pausar' : 'Iniciar'} ${ex.nome}`}
                      onClick={() => dispatch({ type: rodando ? 'pauseEx' : 'startEx', id: ex.id })}
                    >
                      <Icon name={rodando ? 'pause' : 'play'} />
                    </button>
                  </div>
                </div>
                <button
                  className="acordeao-toggle"
                  aria-expanded={aberto}
                  onClick={() => toggleAccordion(ex.id)}
                >
                  <span>Ver imagem do exercício</span>
                  <span className={aberto ? 'chev aberto' : 'chev'}>
                    <Icon name="chev" />
                  </span>
                </button>
                {aberto && (
                  <div className="acordeao-conteudo">
                    <figure className="ex-img">
                      <img
                        src={IMAGENS_EXERCICIOS[ex.id] || imgGrupo}
                        alt={`Execução correta do exercício ${ex.nome}`}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </figure>
                  </div>
                )}
              </li>
            )
          })}
        </ul>

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
      </main>

      {detalhe && (
        <Detalhes grupo={grupo} exercicio={detalhe} onClose={() => setDetalhe(null)} />
      )}
    </div>
  )
}
