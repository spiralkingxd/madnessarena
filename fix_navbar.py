import re

with open('components/navbar.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Make navbar translated
if 'import { getDictionary }' not in text:
    text = text.replace('import { cookies } from "next/headers";', 'import { cookies } from "next/headers";\nimport { getDictionary } from "@/lib/i18n";')
    text = text.replace('export async function Navbar() {', 'export async function Navbar() {\n  const dict = await getDictionary();')
    
    # We replace "Login" and "Login com Discord" mapping it to {dict.nav.login} etc.
    text = text.replace('<span className="sm:hidden">Login</span>', '<span className="sm:hidden">{dict.nav.login}</span>')
    text = text.replace('<span className="hidden sm:inline">Login com Discord</span>', '<span className="hidden sm:inline">{dict.nav.loginDiscord}</span>')

with open('components/navbar.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("navbar fixed")
