import re
with open('components/nav-links.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace block
old_block = '''{ href: "/teams", label: dict?.navlinks?.viewTeams ?? "Ver Equipes" },
        { href: "/profile/me#teams", label: dict?.navlinks?.myTeams ?? "Minhas Equipes" },
        { href: "/regras", label: dict?.navlinks?.rules ?? "Regras" },
      ],
    },
    { href: "/ranking", label: dict?.navlinks?.ranking ?? "Ranking" },'''

new_block = '''{ href: "/teams", label: dict?.navlinks?.viewTeams ?? "Ver Equipes" },
        { href: "/profile/me#teams", label: dict?.navlinks?.myTeams ?? "Minhas Equipes" },
      ],
    },
    { href: "/regras", label: dict?.navlinks?.rules ?? "Regras" },
    { href: "/ranking", label: dict?.navlinks?.ranking ?? "Ranking" },'''

text = text.replace(old_block, new_block)

with open('components/nav-links.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('Done moving Regras to the navbar')
