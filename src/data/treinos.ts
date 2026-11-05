export type ExerciseRecord = {
  id: string
  name?: string
  namePtBr?: string
  bodyPart?: string
  equipment?: string
  target?: string
  secondaryMuscles?: string[]
  category?: string
  description?: string
  descriptionPtBr?: string
  instructions?: string[]
  instructionsPtBr?: string[]
  custom?: 1
  customMedia?: Blob
  customMediaType?: string
}

export type Exercicio = {
  id: string
  nome: string
  nomeOriginal: string
  nomeTraduzido: boolean
  parteCorporal: string
  equipamento: string
  alvo: string
  alvoOriginal: string
  musculosSecundarios: string[]
  musculosSecundariosOriginais: string[]
  categoria: string
  descricao: string
  descricaoTraduzida: boolean
  instrucoes: string[]
  instrucoesTraduzidas: boolean
  inicial: boolean
  custom: boolean
  midia?: Blob
  tipoMidia?: string
}

export type Grupo = {
  chave: string
  sigla: string
  titulo: string
  parteCorporal: string
  total: number
  ids: string[]
}

export const PARTES_CORPORAIS: Record<string, { titulo: string; sigla: string }> = {
  back: { titulo: 'Costas', sigla: 'CT' },
  cardio: { titulo: 'Cardio', sigla: 'CA' },
  chest: { titulo: 'Peito', sigla: 'PT' },
  'full body': { titulo: 'Corpo inteiro', sigla: 'CI' },
  'lower arms': { titulo: 'Antebraços', sigla: 'AB' },
  'lower legs': { titulo: 'Panturrilhas', sigla: 'PA' },
  neck: { titulo: 'Pescoço', sigla: 'PC' },
  shoulders: { titulo: 'Ombros', sigla: 'OM' },
  'upper arms': { titulo: 'Braços', sigla: 'BR' },
  'upper legs': { titulo: 'Pernas', sigla: 'PR' },
  waist: { titulo: 'Abdômen', sigla: 'AD' },
}

const TERMOS_PT_BR: Record<string, string> = {
  abductors: 'abdutores',
  abs: 'abdômen',
  adductors: 'adutores',
  assisted: 'assistência',
  band: 'faixa elástica',
  barbell: 'barra',
  'body weight': 'peso corporal',
  'bosu ball': 'bola bosu',
  biceps: 'bíceps',
  calves: 'panturrilhas',
  cable: 'polia',
  'cardiovascular system': 'sistema cardiovascular',
  delts: 'deltoides',
  dumbbell: 'halter',
  'elliptical machine': 'elíptico',
  'ez barbell': 'barra EZ',
  forearms: 'antebraços',
  glutes: 'glúteos',
  hammer: 'martelo',
  hamstrings: 'isquiotibiais',
  'hip flexors': 'flexores do quadril',
  kettlebell: 'kettlebell',
  landmine: 'landmine',
  lats: 'dorsais',
  'leverage machine': 'máquina de alavancas',
  'levator scapulae': 'levantador da escápula',
  macebell: 'macebell',
  'massage ball': 'bola de massagem',
  'medicine ball': 'bola medicinal',
  'olympic barbell': 'barra olímpica',
  obliques: 'oblíquos',
  pectorals: 'peitorais',
  quads: 'quadríceps',
  resistance: 'resistência',
  'resistance band': 'faixa de resistência',
  roller: 'rolo',
  rope: 'corda',
  sandbag: 'saco de areia',
  'serratus anterior': 'serrátil anterior',
  shins: 'canelas',
  'skierg machine': 'SkiErg',
  'sled machine': 'trenó',
  'smith machine': 'máquina Smith',
  spine: 'coluna',
  'stability ball': 'bola de estabilidade',
  'stationary bike': 'bicicleta ergométrica',
  'stepmill machine': 'simulador de escada',
  'suspension trainer': 'treinador de suspensão',
  traps: 'trapézio',
  tire: 'pneu',
  'trap bar': 'barra hexagonal',
  triceps: 'tríceps',
  'upper back': 'parte superior das costas',
  'upper body ergometer': 'ergômetro de membros superiores',
  weighted: 'com carga',
  'weight plate': 'anilha',
  'wheel roller': 'roda abdominal',
}

function capitalizar(texto: string) {
  const primeiraLetra = texto.charAt(0)
  return primeiraLetra ? primeiraLetra.toLocaleUpperCase('pt-BR') + texto.slice(1) : texto
}

export function criarExercicio(registro: ExerciseRecord): Exercicio {
  const nome = registro.namePtBr ?? registro.name ?? 'Exercício sem nome'

  return {
    id: registro.id,
    nome: capitalizar(nome),
    nomeOriginal: registro.name ?? nome,
    nomeTraduzido: Boolean(registro.namePtBr),
    parteCorporal: registro.bodyPart ?? '',
    equipamento: registro.equipment
      ? TERMOS_PT_BR[registro.equipment] ?? registro.equipment
      : 'Não informado',
    alvo: registro.target ? TERMOS_PT_BR[registro.target] ?? registro.target : 'Não informado',
    alvoOriginal: registro.target ?? '',
    musculosSecundarios:
      registro.secondaryMuscles?.map((musculo) => TERMOS_PT_BR[musculo] ?? musculo) ?? [],
    musculosSecundariosOriginais: registro.secondaryMuscles ?? [],
    categoria: registro.category ?? '',
    descricao: registro.descriptionPtBr ?? registro.description ?? '',
    descricaoTraduzida: Boolean(registro.descriptionPtBr),
    instrucoes: registro.instructionsPtBr?.length
      ? registro.instructionsPtBr
      : registro.instructions ?? [],
    instrucoesTraduzidas: Boolean(registro.instructionsPtBr?.length),
    inicial: false,
    custom: registro.custom === 1,
    midia: registro.customMedia,
    tipoMidia: registro.customMediaType,
  }
}

export function criarGrupo(parteCorporal: string, ids: string[]): Grupo {
  const parte = PARTES_CORPORAIS[parteCorporal]
  const titulo =
    parte?.titulo ??
    parteCorporal.replace(/\b\w/g, (letra) => letra.toLocaleUpperCase('pt-BR'))

  return {
    chave: parteCorporal.replaceAll(' ', '-'),
    sigla: parte?.sigla ?? parteCorporal.slice(0, 2).toLocaleUpperCase('pt-BR'),
    titulo,
    parteCorporal,
    total: ids.length,
    ids,
  }
}
