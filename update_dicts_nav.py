import json

with open('app/dictionaries/pt.json', 'r', encoding='utf-8') as f:
    pt = json.load(f)

with open('app/dictionaries/en.json', 'r', encoding='utf-8') as f:
    en = json.load(f)

pt['navlinks'] = {
    'home': 'Início',
    'events': 'Torneios',
    'teams': 'Equipes',
    'viewTeams': 'Ver Equipes',
    'myTeams': 'Minhas Equipes',
    'rules': 'Regras',
    'ranking': 'Ranking',
    'streams': 'Transmissões'
}

en['navlinks'] = {
    'home': 'Home',
    'events': 'Tournaments',
    'teams': 'Teams',
    'viewTeams': 'View Teams',
    'myTeams': 'My Teams',
    'rules': 'Rules',
    'ranking': 'Ranking',
    'streams': 'Streams'
}

with open('app/dictionaries/pt.json', 'w', encoding='utf-8') as f:
    json.dump(pt, f, indent=2, ensure_ascii=False)

with open('app/dictionaries/en.json', 'w', encoding='utf-8') as f:
    json.dump(en, f, indent=2, ensure_ascii=False)

print('done dictionaries')
