import json
import os
import re

def load_json(filepath):
    with open(filepath, 'r', encoding='utf-8-sig') as f:
        return json.load(f)

def save_json(data, filepath):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

pt_path = 'lib/i18n/dictionaries/pt.json'
en_path = 'lib/i18n/dictionaries/en.json'

pt_dict = load_json(pt_path)
en_dict = load_json(en_path)

# Updates for Ranking
if 'ranking' not in pt_dict:
    pt_dict['ranking'] = {
        "badge": "Ranking Geral",
        "title": "Classificação dos Piratas",
        "desc": "Ordenado por pontos e vitórias em cada categoria.",
        "tabs": {
            "all": "Geral",
            "sloop": "Sloop (Duo)",
            "brigantine": "Brigantine (Trio)",
            "galleon": "Galleon (Squad)"
        },
        "empty": "Ainda não há pontuação registrada para esta categoria.",
        "table": {
            "pos": "Posição",
            "pirate": "Pirata",
            "xbox": "Xbox",
            "points": "Pontos",
            "winLoss": "V / D"
        },
        "unlinked": "Não vinculado",
        "player": "Jogador",
        "position1": "1º",
        "position2": "2º",
        "position3": "3º"
    }

if 'ranking' not in en_dict:
    en_dict['ranking'] = {
        "badge": "Global Ranking",
        "title": "Pirates Leaderboard",
        "desc": "Ordered by points and wins in each category.",
        "tabs": {
            "all": "Overall",
            "sloop": "Sloop (Duo)",
            "brigantine": "Brigantine (Trio)",
            "galleon": "Galleon (Squad)"
        },
        "empty": "No scores registered for this category yet.",
        "table": {
            "pos": "Position",
            "pirate": "Pirate",
            "xbox": "Xbox",
            "points": "Points",
            "winLoss": "W / L"
        },
        "unlinked": "Not linked",
        "player": "Player",
        "position1": "1st",
        "position2": "2nd",
        "position3": "3rd"
    }

# Updates for Teams
if 'teams' not in pt_dict:
    pt_dict['teams'] = {
        "badge": "Central de Equipes",
        "title": "Guildas e Tripulações",
        "desc": "Encontre equipes ativas, veja seus membros ou crie sua própria história nos mares.",
        "createBtn": "Criar Equipe",
        "unnamed": "Equipe sem nome",
        "empty": "Nenhuma equipe registrada ainda.",
        "members": "membros",
        "captain": "Capitão",
        "search": "Buscar equipe por nome ou tag...",
        "noResults": "Nenhuma equipe encontrada com essa busca."
    }

if 'teams' not in en_dict:
    en_dict['teams'] = {
        "badge": "Teams Hub",
        "title": "Guilds & Crews",
        "desc": "Find active teams, check their members, or start your own journey across the seas.",
        "createBtn": "Create Team",
        "unnamed": "Unnamed Team",
        "empty": "No teams registered yet.",
        "members": "members",
        "captain": "Captain",
        "search": "Search team by name or tag...",
        "noResults": "No teams found with this search."
    }

# Updates for Transmissoes
if 'streams' not in pt_dict:
    pt_dict['streams'] = {
        "badge": "Ao Vivo",
        "title": "Transmissões e VODs",
        "desc": "Acompanhe as partidas ao vivo ou assista aos melhores momentos dos últimos torneios.",
        "liveNow": "Canais da Comunidade Ao Vivo",
        "noStreams": "Nenhuma transmissão online no momento.",
        "recentVods": "Últimos VODs Oficiais",
        "noVods": "Nenhum VOD disponível no momento.",
        "vod": "VOD"
    }

if 'streams' not in en_dict:
    en_dict['streams'] = {
        "badge": "Live",
        "title": "Broadcasts & VODs",
        "desc": "Watch live games or catch the highlights from the latest tournaments.",
        "liveNow": "Live Community Channels",
        "noStreams": "No online streams right now.",
        "recentVods": "Recent Official VODs",
        "noVods": "No VODs available at the moment.",
        "vod": "VOD"
    }

# Updates for Rules
if 'rules' not in pt_dict:
    pt_dict['rules'] = {
        "badge": "Documentação Oficial",
        "title": "Regras e Conduta",
        "desc": "Leia atentamente as diretrizes que mantêm a Madness Arena justa e competitiva para todos."
    }

if 'rules' not in en_dict:
    en_dict['rules'] = {
        "badge": "Official Documentation",
        "title": "Rules & Conduct",
        "desc": "Carefully read the guidelines that keep Madness Arena fair and competitive for everyone."
    }


save_json(pt_dict, pt_path)
save_json(en_dict, en_path)
print("Dictionaries updated successfully!")
