import json

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

if 'profile' not in pt_dict:
    pt_dict['profile'] = {
        "backHome": "\u2190 Voltar para o in\u00edcio",
        "username": "Username",
        "memberSince": "Membro desde",
        "lastActivity": "\u00daltima atividade",
        "leaguePoints": "Pontos de Liga",
        "tournamentsWon": "Torneios Ganhos",
        "loadTeamsError": "N\u00e3o foi poss\u00edvel carregar suas equipes agora."
    }

if 'profile' not in en_dict:
    en_dict['profile'] = {
        "backHome": "\u2190 Back to home",
        "username": "Username",
        "memberSince": "Member since",
        "lastActivity": "Last activity",
        "leaguePoints": "League Points",
        "tournamentsWon": "Tournaments Won",
        "loadTeamsError": "Could not load your teams right now."
    }

save_json(pt_dict, pt_path)
save_json(en_dict, en_path)
print("Updated JSON for Profile")
