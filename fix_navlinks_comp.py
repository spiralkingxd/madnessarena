with open('components/nav-links.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('export function NavLinks() {\n  const [open, setOpen] = useState(false);', 'export function NavLinks({ dict }: { dict: any }) {\n  const [open, setOpen] = useState(false);')

text = text.replace('''const LINKS = [
  { href: "/", label: "Início" },
  { href: "/events", label: "Torneios" },
  {
    label: "Equipes",
    isDropdown: true,
    children: [
      { href: "/teams", label: "Ver Equipes" },
      { href: "/profile/me#teams", label: "Minhas Equipes" },
      { href: "/regras", label: "Regras" },
    ],
  },
  { href: "/ranking", label: "Ranking" },
  { href: "/transmissoes", label: "Transmissões" },
];''', '')

text = text.replace('const [open, setOpen] = useState(false);\n  const pathname = usePathname();', '''const [open, setOpen] = useState(false);\n  const pathname = usePathname();\n\n  const LINKS = [
    { href: "/", label: dict.navlinks.home },
    { href: "/events", label: dict.navlinks.events },
    {
      label: dict.navlinks.teams,
      isDropdown: true,
      children: [
        { href: "/teams", label: dict.navlinks.viewTeams },
        { href: "/profile/me#teams", label: dict.navlinks.myTeams },
        { href: "/regras", label: dict.navlinks.rules },
      ],
    },
    { href: "/ranking", label: dict.navlinks.ranking },
    { href: "/transmissoes", label: dict.navlinks.streams },
  ];''')

with open('components/nav-links.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

with open('components/navbar.tsx', 'r', encoding='utf-8') as f:
    nav = f.read()

nav = nav.replace('<NavLinks />', '<NavLinks dict={dict} />')

with open('components/navbar.tsx', 'w', encoding='utf-8') as f:
    f.write(nav)

print('done')
