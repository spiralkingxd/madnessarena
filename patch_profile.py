import re

# `app/profile/me/page.tsx`
with open('app/profile/me/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

if 'import { getDictionary }' not in text:
    text = text.replace('import { ProfileSettingsForm } from "@/components/profile-settings-form";', 'import { ProfileSettingsForm } from "@/components/profile-settings-form";\nimport { getDictionary } from "@/lib/i18n";')
    text = text.replace('export default async function MyProfilePage() {', 'export default async function MyProfilePage() {\n  const dict = await getDictionary();')
    
    text = re.sub(r'NÃ£o foi possÃvel carregar suas equipes agora\.|Não foi possível carregar suas equipes agora\.', '{dict.profile.loadTeamsError}', text)
    text = text.replace('Membro desde', '{dict.profile.memberSince}')
    text = re.sub(r'Ãšltima atividade|Última atividade', '{dict.profile.lastActivity}', text)
    text = text.replace('Pontos de Liga', '{dict.profile.leaguePoints}')
    text = text.replace('Torneios Ganhos', '{dict.profile.tournamentsWon}')
    
    with open('app/profile/me/page.tsx', 'w', encoding='utf-8') as f:
        f.write(text)

# `app/profile/[id]/page.tsx`
with open('app/profile/[id]/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

if 'import { getDictionary }' not in text:
    text = text.replace('import { XboxStatusTag } from "@/components/xbox-status-tag";', 'import { XboxStatusTag } from "@/components/xbox-status-tag";\nimport { getDictionary } from "@/lib/i18n";')
    text = text.replace('export default async function PublicProfilePage({ params }: Props) {', 'export default async function PublicProfilePage({ params }: Props) {\n  const dict = await getDictionary();')
    
    text = re.sub(r'â† Voltar para o inÃcio|← Voltar para o início', '{dict.profile.backHome}', text)
    text = text.replace('Membro desde', '{dict.profile.memberSince}')
    text = re.sub(r'Ãšltima atividade|Última atividade', '{dict.profile.lastActivity}', text)
    text = text.replace('Pontos de Liga', '{dict.profile.leaguePoints}')
    text = text.replace('Torneios Ganhos', '{dict.profile.tournamentsWon}')

    with open('app/profile/[id]/page.tsx', 'w', encoding='utf-8') as f:
        f.write(text)

print("done profile patch")
