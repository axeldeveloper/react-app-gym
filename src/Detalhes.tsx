import { useEffect, useRef } from 'react'
import type { Exercicio, Grupo } from './data/treinos'
import { DETALHES, MOTIVOS, VIDEOS, buscaNoYoutube, idDoYoutube } from './data/detalhes'

type Props = { grupo: Grupo; exercicio: Exercicio; onClose: () => void }

export default function Detalhes({ grupo, exercicio, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const d = DETALHES[exercicio.id]
  const videoUrl = VIDEOS[exercicio.id]
  const videoId = videoUrl ? idDoYoutube(videoUrl) : null

  useEffect(() => {
    const el = ref.current
    if (el && !el.open) el.showModal()
  }, [])

  const fechar = () => ref.current?.close()

  return (
    <dialog
      ref={ref}
      className="modal"
      data-g={grupo.letra}
      aria-labelledby="modal-titulo"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && fechar()}
    >
      <div className="modal-corpo">
        <header className="modal-topo">
          <span className="selo num" aria-hidden="true">
            {grupo.letra}
          </span>
          <div className="modal-titulos">
            <h2 id="modal-titulo">{exercicio.nome}</h2>
            <p className="resumo">{grupo.titulo}</p>
          </div>
          <button className="redondo suave" aria-label="Fechar" autoFocus onClick={fechar}>
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        {d ? (
          <>
            {exercicio.essencial && (
              <section className="essencial">
                <h3>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M12 3.2l2.6 5.5 6 .8-4.4 4.2 1.1 6L12 16.8 6.7 19.7l1.1-6L3.4 9.5l6-.8z"
                      fill="currentColor"
                    />
                  </svg>
                  Exercício essencial
                </h3>
                <p>{MOTIVOS[exercicio.id]}</p>
              </section>
            )}

            <section>
              <h3>Músculos trabalhados</h3>
              <p>{d.musculos}</p>
            </section>

            <section>
              <h3>Como executar</h3>
              <ol className="passos">
                {d.passos.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ol>
            </section>

            <section>
              <h3>Dica técnica</h3>
              <p>{d.dica}</p>
            </section>

            <section>
              <h3>Vídeo</h3>
              {videoId ? (
                <iframe
                  className="video"
                  src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                  title={`Vídeo: ${exercicio.nome}`}
                  loading="lazy"
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : null}
              <a
                className="link-video"
                href={videoUrl || buscaNoYoutube(d.busca)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
                </svg>
                {videoId ? 'Abrir no YouTube' : 'Ver vídeos no YouTube'}
              </a>
            </section>

            <p className="aviso">
              Ajuste a carga à sua capacidade. Se sentir dor aguda, interrompa o exercício e procure
              um profissional.
            </p>
          </>
        ) : (
          <p>Ainda não há detalhes para este exercício.</p>
        )}
      </div>
    </dialog>
  )
}
