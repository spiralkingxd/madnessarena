import re

# PATCH RANKING
with open('app/ranking/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

if 'import { getDictionary }' not in text:
    text = text.replace('import { cn } from "@/lib/utils";', 'import { cn } from "@/lib/utils";\nimport { getDictionary } from "@/lib/i18n";')
    text = text.replace('export default async function RankingPage({ searchParams }: { searchParams: Promise<{ boat?: string }> }) {', 'export default async function RankingPage({ searchParams }: { searchParams: Promise<{ boat?: string }> }) {\n  const dict = await getDictionary();')
    text = text.replace('Ranking Geral', '{dict.ranking.badge}')
    text = text.replace('Classificação dos Piratas', '{dict.ranking.title}')
    text = text.replace('Ordenado por pontos e vitórias em cada categoria.', '{dict.ranking.desc}')
    text = text.replace('label: "Geral"', 'label: dict.ranking.tabs.all')
    text = text.replace('label: "Sloop (Duo)"', 'label: dict.ranking.tabs.sloop')
    text = text.replace('label: "Brigantine (Trio)"', 'label: dict.ranking.tabs.brigantine')
    text = text.replace('label: "Galleon (Squad)"', 'label: dict.ranking.tabs.galleon')
    text = text.replace('Ainda não há pontuação registrada para esta categoria.', '{dict.ranking.empty}')
    text = text.replace('>Posição<', '>{dict.ranking.table.pos}<')
    text = text.replace('>Pirata<', '>{dict.ranking.table.pirate}<')
    text = text.replace('>Xbox<', '>{dict.ranking.table.xbox}<')
    text = text.replace('>Pontos<', '>{dict.ranking.table.points}<')
    text = text.replace('>V / D<', '>{dict.ranking.table.winLoss}<')
    text = text.replace('?? "Jogador"', '?? dict.ranking.player')
    text = text.replace('?? "Não vinculado"', '?? dict.ranking.unlinked')
    text = text.replace('function PositionBadge({ position }: { position: number }) {', 'function PositionBadge({ position, dict }: { position: number, dict: any }) {')
    text = text.replace('<PositionBadge position={index + 1} />', '<PositionBadge position={index + 1} dict={dict} />')
    text = text.replace('1º\n', '{dict.ranking.position1}\n')
    text = text.replace('2º<', '{dict.ranking.position2}<')
    text = text.replace('3º<', '{dict.ranking.position3}<')

    with open('app/ranking/page.tsx', 'w', encoding='utf-8') as f:
        f.write(text)

# PATCH REGRAS
with open('app/regras/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

if 'import { getDictionary }' not in text:
    text = text.replace('import { Book } from "lucide-react";', 'import { Book } from "lucide-react";\nimport { getDictionary } from "@/lib/i18n";')
    text = text.replace('export default function RegrasPage() {', 'export default async function RegrasPage() {\n  const dict = await getDictionary();')
    text = text.replace('>Geral<', '>{dict.rules.badge}<')
    text = text.replace('Regras Oficiais\n', '{dict.rules.title}\n')
    text = text.replace('Estude o manual antes de entrar no mar.', '{dict.rules.desc}')
    with open('app/regras/page.tsx', 'w', encoding='utf-8') as f:
        f.write(text)

# PATCH TRANSMISSOES
with open('app/transmissoes/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

if 'import { getDictionary }' not in text:
    text = text.replace('import { PlaySquare } from "lucide-react";', 'import { PlaySquare } from "lucide-react";\nimport { getDictionary } from "@/lib/i18n";')
    text = text.replace('export default function TransmissoesPage() {', 'export default async function TransmissoesPage() {\n  const dict = await getDictionary();')
    text = text.replace('Ao Vivo', '{dict.streams.badge}')
    text = text.replace('Transmissões e VODs', '{dict.streams.title}')
    text = text.replace('Acompanhe as partidas ao vivo ou assista aos melhores momentos dos últimos torneios.', '{dict.streams.desc}')
    text = text.replace('Canais da Comunidade Ao Vivo', '{dict.streams.liveNow}')
    text = text.replace('Nenhuma transmissão online no momento.', '{dict.streams.noStreams}')
    text = text.replace('Últimos VODs Oficiais', '{dict.streams.recentVods}')
    text = text.replace('Nenhum VOD disponível no momento.', '{dict.streams.noVods}')
    with open('app/transmissoes/page.tsx', 'w', encoding='utf-8') as f:
        f.write(text)

print("done")
