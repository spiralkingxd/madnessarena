import json

pt_path = 'lib/i18n/dictionaries/pt.json'
en_path = 'lib/i18n/dictionaries/en.json'

with open(pt_path, 'r', encoding='utf-8') as f:
    pt_dict = json.load(f)
with open(en_path, 'r', encoding='utf-8') as f:
    en_dict = json.load(f)

if 'navlinks' not in pt_dict:
    pt_dict['navlinks'] = {
        "home": "Início",
        "events": "Torneios",
        "teams": "Equipes",
        "viewTeams": "Ver Equipes",
        "myTeams": "Minhas Equipes",
        "rules": "Regras",
        "ranking": "Ranking",
        "streams": "Transmissões"
    }

if 'navlinks' not in en_dict:
    en_dict['navlinks'] = {
        "home": "Home",
        "events": "Events",
        "teams": "Teams",
        "viewTeams": "View Teams",
        "myTeams": "My Teams",
        "rules": "Rules",
        "ranking": "Ranking",
        "streams": "Streams"
    }

with open(pt_path, 'w', encoding='utf-8') as f:
    json.dump(pt_dict, f, ensure_ascii=False, indent=2)
with open(en_path, 'w', encoding='utf-8') as f:
    json.dump(en_dict, f, ensure_ascii=False, indent=2)

print("done navlinks dict")
