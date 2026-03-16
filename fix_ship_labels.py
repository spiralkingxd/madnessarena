import os, re

files = [
    'app/events/page.tsx',
    'app/events/[id]/page.tsx',
    'app/admin/tournaments/[id]/page.tsx',
    'components/admin/event-form.tsx'
]

# Write function to lib/events.ts
with open('lib/events.ts', 'r', encoding='utf-8') as f:
    lib_text = f.read()

if 'export function getTeamSizeLabel' not in lib_text:
    lib_text += '''\n
export function getTeamSizeLabel(size: number): string {
  if (size === 1 || size === 2) return `Chalupa ${size}v${size}`;
  if (size === 3) return `Bergantim ${size}v${size}`;
  if (size === 4) return `Galeão ${size}v${size}`;
  return `${size}v${size}`;
}
'''
    with open('lib/events.ts', 'w', encoding='utf-8') as f:
        f.write(lib_text)

# Patch event-form.tsx
with open('components/admin/event-form.tsx', 'r', encoding='utf-8') as f:
    text = f.read()
    
if 'getTeamSizeLabel' not in text:
    text = text.replace('toDatetimeLocalValue,', 'toDatetimeLocalValue,\n  getTeamSizeLabel,')
    text = text.replace('{size}v{size}', '{getTeamSizeLabel(size)}')
    with open('components/admin/event-form.tsx', 'w', encoding='utf-8') as f:
        f.write(text)

# Patch admin/tournaments/[id]/page.tsx
with open('app/admin/tournaments/[id]/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

if 'getTeamSizeLabel' not in text:
    text = text.replace('import { getDictionary }', 'import { getTeamSizeLabel } from "@/lib/events";\nimport { getDictionary }')
    text = re.sub(r'\{tournament\.team_size\}v\{tournament\.team_size\}', '{getTeamSizeLabel(tournament.team_size)}', text)
    with open('app/admin/tournaments/[id]/page.tsx', 'w', encoding='utf-8') as f:
        f.write(text)

# Patch app/events/page.tsx
with open('app/events/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

if 'getTeamSizeLabel' not in text:
    text = text.replace('import { getDictionary }', 'import { getTeamSizeLabel } from "@/lib/events";\nimport { getDictionary }')
    text = re.sub(r'\{event\.team_size\}v\{event\.team_size\}', '{getTeamSizeLabel(event.team_size)}', text)
    with open('app/events/page.tsx', 'w', encoding='utf-8') as f:
        f.write(text)

# Patch app/events/[id]/page.tsx
with open('app/events/[id]/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

if 'getTeamSizeLabel' not in text:
    text = text.replace('import { getDictionary }', 'import { getTeamSizeLabel } from "@/lib/events";\nimport { getDictionary }')
    text = re.sub(r'\{event\.team_size\}v\{event\.team_size\}', '{getTeamSizeLabel(event.team_size)}', text)
    with open('app/events/[id]/page.tsx', 'w', encoding='utf-8') as f:
        f.write(text)

print('Updated ship labels in all files!')
