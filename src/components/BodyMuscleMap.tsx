import { useEffect, useState } from 'react'
import { MAP_MUSCLES, type MapMuscle, type MuscleLoad } from '../data/muscleMap'

type MusclePaths = {
  vb: string
  p: Record<string, readonly string[]>
}

type BodyPaths = {
  front: MusclePaths
  back: MusclePaths
}

type MuscleLevels = Record<MapMuscle, number>

const SILHOUETTE_MUSCLES = ['head', 'hair', 'neck', 'hands', 'feet', 'knees', 'ankles']
let cachedPaths: BodyPaths | undefined
let pathsPromise: Promise<BodyPaths> | undefined

function getBodyPaths() {
  if (!pathsPromise) {
    pathsPromise = import('../data/bodyPaths')
      .then((module) => {
        cachedPaths = module.default as BodyPaths
        return cachedPaths
      })
      .catch((error: unknown) => {
        pathsPromise = undefined
        throw error
      })
  }
  return pathsPromise
}

function SvgView({ view, levels }: { view: MusclePaths; levels: MuscleLevels }) {
  return (
    <svg className="plan-muscle-svg" viewBox={view.vb} aria-hidden="true">
      {SILHOUETTE_MUSCLES.flatMap((muscle) =>
        (view.p[muscle] ?? []).map((path, index) => (
          <path className="plan-muscle-silhouette" d={path} key={`${muscle}-${index}`} />
        )),
      )}
      {MAP_MUSCLES.flatMap((muscle) =>
        (view.p[muscle] ?? []).map((path, index) => (
          <path
            className={`plan-muscle-shape level-${levels[muscle]}`}
            d={path}
            key={`${muscle}-${index}`}
          />
        )),
      )}
    </svg>
  )
}

type Props = {
  load: MuscleLoad
  compact?: boolean
}

export default function BodyMuscleMap({ load, compact = false }: Props) {
  const [paths, setPaths] = useState(cachedPaths)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    getBodyPaths()
      .then((loadedPaths) => {
        if (active) setPaths(loadedPaths)
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
    }
  }, [])

  const max = Math.max(0, ...MAP_MUSCLES.map((muscle) => load[muscle] ?? 0))
  const levels = Object.fromEntries(
    MAP_MUSCLES.map((muscle) => {
      const value = load[muscle] ?? 0
      return [muscle, value ? Math.max(1, Math.min(4, Math.ceil((value / max) * 4))) : 0]
    }),
  ) as MuscleLevels

  if (error) {
    return compact
      ? <span className="plan-muscle-map-error" role="img" aria-label="Mapa muscular indisponível">!</span>
      : <p className="plan-error" role="alert">Não foi possível carregar o mapa muscular.</p>
  }

  return (
    <div
      className={`plan-muscle-map${compact ? ' compacto' : ''}`}
      role={compact ? undefined : 'img'}
      aria-label={compact ? undefined : 'Mapa dos músculos trabalhados, vistas frontal e posterior'}
      aria-hidden={compact ? true : undefined}
    >
      {paths ? (
        <>
          <SvgView view={paths.front} levels={levels} />
          <SvgView view={paths.back} levels={levels} />
        </>
      ) : (
        <span className="plan-muscle-placeholder" />
      )}
    </div>
  )
}
