import os

with open('components/notifications-bell.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('bg-[#0b141e]/95', 'bg-white/95 dark:bg-[#0b141e]/95')
text = text.replace('border-white/10', 'border-slate-200 dark:border-white/10')
text = text.replace('text-white', 'text-slate-900 dark:text-white')
text = text.replace('hover:bg-white/10', 'hover:bg-slate-100 dark:hover:bg-white/10')
text = text.replace('"bg-white/5"', '"bg-slate-100 dark:bg-white/5"')
text = text.replace('bg-white/5 p-2', 'bg-slate-100 dark:bg-white/5 p-2')
# fix double text-slate-900 if ran twice (idk)

with open('components/notifications-bell.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated notifications')
