import re

with open('app/teams/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

if 'import { getDictionary }' not in text:
    text = text.replace('import { unstable_cache } from "next/cache";', 'import { unstable_cache } from "next/cache";\nimport { getDictionary } from "@/lib/i18n";')
    text = text.replace('export default async function TeamsPage() {', 'export default async function TeamsPage() {\n  const dict = await getDictionary();')
    
    text = text.replace('Equipes\n            </p>', '{dict.teams.badge}\n            </p>')
    text = re.sub(r'TripulaÃ§Ãµes da Arena|Tripulações da Arena', '{dict.teams.title}', text)
    
    # Just fix the header strings explicitly
    text = text.replace('Nenhuma equipe cadastrada ainda', '{dict.teams.empty}')
    
    text = re.sub(r'CapitÃ£o:|Capitão:', '{dict.teams.captain}:', text)
    text = re.sub(r'NÃ£o identificado|Não identificado', 'Unknown', text)
    
    text = text.replace('Sua equipe', 'Your team')
    text = text.replace('Solicitar entrada', 'Request Join')
    text = text.replace('Ver equipe', 'View Team')
    
    text = text.replace('Nenhuma equipe ainda. Seja o primeiro a fundar uma!', '{dict.teams.empty}')

    with open('app/teams/page.tsx', 'w', encoding='utf-8') as f:
        f.write(text)

print("done")
