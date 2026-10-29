// O "+" identifica itens que estavam marcados na lista original; ele não define
// o estado inicial do app, que começa com todos os exercícios desmarcados.

export type Exercicio = { id: string; nome: string; inicial: boolean; essencial: boolean; imagem?: string }
export type Grupo = { letra: string; titulo: string; exercicios: Exercicio[] }

// Exercícios recomendados (critério: movimentos completos, boa relação estímulo/desgaste,
// segurança para ombro, lombar e joelho, e cobertura de todas as porções do músculo).
// O motivo de cada um está em MOTIVOS (src/data/detalhes.ts).
const ESSENCIAIS = new Set([
  // A · Pernas
  'A01', 'A02', 'A03', 'A04', 'A08', 'A12', 'A15', 'A16', 'A17',
  // B · Costas
  'B01', 'B03', 'B08', 'B09', 'B11',
  // C · Ombros (posterior e tríceps)
  'C07', 'C08', 'C11', 'C12',
  // D · Peito
  'D01', 'D02', 'D04', 'D08', 'D12',
  // E · Ombros
  'E01', 'E05', 'E09',
  // F · Trapézio
  'F01', 'F05', 'F08', 'F09',
  // G · Braço
  'G05', 'G06', 'G10', 'G11',
  // H · Costas
  'H06', 'H09',
])

function grupo(letra: string, titulo: string, itens: string[]): Grupo {
  return {
    letra,
    titulo,
    exercicios: itens.map((raw, i) => {
      const nome = raw.startsWith('+') ? raw.slice(1) : raw
      const id = `${letra}${String(i + 1).padStart(2, '0')}`
      return {
        id,
        nome,
        inicial: false,
        essencial: ESSENCIAIS.has(id),
      }
    }),
  }
}

export const GRUPOS: Grupo[] = [
  grupo('A', 'Pernas', [
    '+Agachamento Barra Smith',
    'Agachamento hatch Quat',
    'Leg 45 200k',
    'Cadeira Extensora (comun)',
    'Cadeira Flexora',
    'Cadeira Adutora',
    'Cadeira Abdutora',
    '+Mesa Flexora (Deita)',
    'Agacha Empurra',
    'Levantamento Sumô',
    'Passada com Pesos',
    'Panturrilha Individual loop Cavalinho',
    'Agachamento Máquina',
    'Agachamento Frontal Halteres',
    'Panturrilha Individual Mesa',
    'Stiff',
    'Bulgaro',
  ]),
  grupo('B', 'Costas', [
    'Puxador Aberto',
    'Puxador Aberto Atraz da nuca',
    'Puxador Triângulo Baixa',
    'Puxador Triângulo Alta',
    'Remada Pronada Baixa (puxador baixo)',
    'Remada Pronada Alta (trapézio)',
    'Remada Baixa unilateral',
    'Remada Pronada Máquina (base peito)',
    'Remada Neutra Articulada (base peito)',
    'Landmine Row',
    'Levantamento Terra',
  ]),
  grupo('C', 'Ombros', [
    'Elevação Lateral em Pé',
    'Elevação Frontal com Barra',
    'Elevação Frontal em Pé',
    'Elevação Posterior Corda Cross puxar ate o pescoço',
    'Bíceps Unilateral Polia Alta',
    'Bíceps Máquina unilateral',
    'Tríceps Francês Cross',
    'Tríceps Corda (Corda v)',
    'Tríceps Barra Reta Baixa',
    'Tríceps Corda Coice Polia',
    'Face Pull Corda Cross (Testa)',
    'Voador Inverso Manter Escapula Neutralizada',
    'Crucifixo Corda Cross',
  ]),
  grupo('D', 'Peito', [
    'Supino Reto Barra',
    'Supino Reto Halteres',
    'Supino Reto Halteres Peito',
    'Supino inclinado Banco Halteres',
    'Supino inclinado Banco Barra',
    'Supino Inclinado Baixa Mesa Halt',
    'Supino Inclinado Baixa Mesa Barra',
    'Supino Inclinado Máquina Articulado',
    'Supino Inclinado Máquina',
    'Crucifixo corda Crossover Alta',
    'Crucifixo corda Crossover Baixa',
    'Crucifixo corda Crossover Peitoral',
    'Voador (crucifixo Maquina)',
    'Dumbel Press Reto',
    'Dumbel Press Inclinado',
  ]),
  grupo('E', 'Ombros', [
    '+Elevação Lateral Cross Polia Média (metade do ombro)',
    'Elevação Lateral Cross Polia Baixa (torto)',
    '+Elevação Frontal Sent Halter',
    '+Elevação Frontal Cruzada',
    '+Elevação Lateral Sentado',
    '+Elevação Posterior Corda puxar ate pescoço',
    '+Elevação Frontal Cross (corda embaixo do joelho)',
    'Elevação Posterior Corda Cross face)',
    '+Desenvolvimento Halter',
    '+Desenvolvimento Arnold',
    '+Posterior no cabo unilateral',
    'Tríceps Francês com Halt. Ou atrás',
  ]),
  grupo('F', 'Trapézio', [
    '+Remada alta polia Trapezio',
    '+Trapezio costas corda',
    'Trapezio barra aberta smith',
    'Remada alta com barra W (trapézio encolhido )',
    'Encolhximento Halter 3x12',
    'Pullover com Halter',
    'Rosca martelo sentado',
    'Barra fixa',
    'Remada Unilateral serrote',
    'Rosca scott unilateral 3x12',
    'Levantamento terra 3x12',
  ]),
  grupo('G', 'Braço', [
    '+Rosca Halt. simultâneo',
    '+Rosca Halt. Sentado individual',
    'Rosca em pé polia',
    '+Rosca Halt. Individual em pé',
    '+Rosca Martelo Halt. em pé',
    '+Rosca inclinado halt.',
    '+Rosca Invertida (puxar )',
    '+Rosca Neutra 45 banco',
    '+Rosca Martelo 45 banco',
    'Rosca spider',
    'Rosca barra w',
    'Rosca barra reta',
    'Rosca Invertida barra W',
    'Rosca banco 45 Cross (polia ou banco)',
  ]),
  grupo('H', 'Costas', [
    '+Remada curvada c/b supinad',
    'Remada curvada c/b tronada',
    'Remada curvada s/b halteres',
    'Remada curvada c/b pegada invertida',
    'Remada curvada no smith',
    'Remada unilateral com halter (banco serrote)',
    'Voador Crucifixo inverso',
    '+Crucifixo inverso com halteres (sentado nuca)',
    'Pull Dow Cross Corda (G)',
    '+Pull Dow Cross Barra Lg',
    'Pull Dow máquina/ Cuross',
    'ISO lateral low row',
    'ISO lateral high row',
  ]),
]
