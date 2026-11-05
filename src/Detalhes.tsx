import { useEffect, useRef } from 'react'
import type { Exercicio, Grupo } from './data/treinos'

type Props = { grupo: Grupo; exercicio: Exercicio; onClose: () => void }

export default function Detalhes({ grupo, exercicio, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (el && !el.open) el.showModal()
  }, [])

  const fechar = () => ref.current?.close()

  return (
    <dialog
      ref={ref}
      className="modal"
      data-g={grupo.chave}
      aria-labelledby="modal-titulo"
      onClose={onClose}
      onClick={(event) => event.target === event.currentTarget && fechar()}
    >
      <div className="modal-corpo">
        <header className="modal-topo">
          <span className="selo num" aria-hidden="true">{grupo.sigla}</span>
          <div className="modal-titulos">
            <h2 id="modal-titulo">{exercicio.nome}</h2>
            <p className="resumo">{grupo.titulo} · {exercicio.equipamento}</p>
          </div>
          <button className="redondo suave" aria-label="Fechar" autoFocus onClick={fechar}>
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        {exercicio.descricao && (
          <section>
            <h3>{exercicio.descricaoTraduzida ? 'Descrição' : 'Descrição original (inglês)'}</h3>
            <p>{exercicio.descricao}</p>
          </section>
        )}

        <section>
          <h3>Músculos trabalhados</h3>
          <p>
            Principal: {exercicio.alvo}
            {exercicio.musculosSecundarios.length > 0 &&
              ` · Secundários: ${exercicio.musculosSecundarios.join(', ')}`}
          </p>
        </section>

        <section>
          <h3>
            {exercicio.instrucoesTraduzidas ? 'Como executar' : 'Instruções originais (inglês)'}
          </h3>
          <ol className="passos">
            {exercicio.instrucoes.map((passo, indice) => (
              <li key={indice}>{passo}</li>
            ))}
          </ol>
        </section>

        <p className="aviso">
          Ajuste a carga à sua capacidade. Se sentir dor aguda, interrompa o exercício e procure
          um profissional.
        </p>
      </div>
    </dialog>
  )
}
