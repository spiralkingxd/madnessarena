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

if 'events' not in pt_dict:
    pt_dict['events'] = {
        "badge": "Competições Oficiais",
        "title": "Torneios da Arena",
        "desc": "Todos os torneios de Sea of Thieves organizados pela MadnessArena. Inscreva sua equipe e compita pela glória dos mares.",
        "stats": {
            "total": "Total",
            "active": "Em andamento",
            "published": "Publicados",
            "paused": "Pausados",
            "finished": "Finalizados"
        },
        "viewDetails": "Ver detalhes",
        "noTournament": "Nenhum torneio encontrado",
        "noEventStatus": "Nenhum evento com status encontrada.",
        "noEventYet": "Nenhum evento cadastrado ainda.",
        "clearFilter": "Limpar filtro"
    }

if 'events' not in en_dict:
    en_dict['events'] = {
        "badge": "Official Competitions",
        "title": "Arena Tournaments",
        "desc": "All Sea of Thieves tournaments organized by MadnessArena. Register your team and compete for the glory of the seas.",
        "stats": {
            "total": "Total",
            "active": "Active",
            "published": "Upcoming",
            "paused": "Paused",
            "finished": "Finished"
        },
        "viewDetails": "View details",
        "noTournament": "No tournaments found",
        "noEventStatus": "No events with this status found.",
        "noEventYet": "No events registered yet.",
        "clearFilter": "Clear filter"
    }

save_json(pt_dict, pt_path)
save_json(en_dict, en_path)
print("Updated JSON for Events")
