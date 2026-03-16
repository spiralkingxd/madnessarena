import re

with open('app/events/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

if 'import { getDictionary }' not in text:
    text = text.replace('import { cn } from "@/lib/utils";', 'import { cn } from "@/lib/utils";\nimport { getDictionary } from "@/lib/i18n";')
    text = text.replace('export default async function EventsPage({ searchParams }: Props) {', 'export default async function EventsPage({ searchParams }: Props) {\n  const dict = await getDictionary();')
    
    text = re.sub(r'CompetiÃ§Ãµes Oficiais|Competições Oficiais', '{dict.events.badge}', text)
    text = text.replace('Torneios da Arena', '{dict.events.title}')
    text = re.sub(r'Todos os torneios.*mares\.', '{dict.events.desc}', text, flags=re.DOTALL)
    
    text = text.replace('label: "Total"', 'label: dict.events.stats.total')
    text = text.replace('label: "Em andamento"', 'label: dict.events.stats.active')
    text = text.replace('label: "Publicados"', 'label: dict.events.stats.published')
    text = text.replace('label: "Pausados"', 'label: dict.events.stats.paused')
    text = text.replace('label: "Finalizados"', 'label: dict.events.stats.finished')
    
    # We must fix "atÃ© " or "até "
    text = re.sub(r'atÃ© |até ', 'until ', text)

    text = re.sub(r'Ver detalhes â†’', '{dict.events.viewDetails} \u2192', text)
    
    text = text.replace('Nenhum torneio encontrado', '{dict.events.noTournament}')
    text = text.replace('Nenhum evento cadastrado ainda.', '{dict.events.noEventYet}')
    text = text.replace('Limpar filtro', '{dict.events.clearFilter}')

    with open('app/events/page.tsx', 'w', encoding='utf-8') as f:
        f.write(text)

print("done events page")
