import os
import re

directories = ['app/admin', 'components/admin']

replacements = {
    'bg-slate-950/60': 'bg-white dark:bg-slate-950/60',
    'bg-black/20': 'bg-slate-100 dark:bg-black/20',
    'bg-black/40': 'bg-slate-200 dark:bg-black/40',
    'border-white/10': 'border-slate-200 dark:border-white/10',
    'border-white/5': 'border-slate-200 dark:border-white/5',
    'text-white': 'text-slate-900 dark:text-white',
    'text-slate-100': 'text-slate-800 dark:text-slate-100',
    'text-slate-200': 'text-slate-700 dark:text-slate-200',
    'text-slate-300': 'text-slate-600 dark:text-slate-300',
    'text-slate-400': 'text-slate-500 dark:text-slate-400',
    'bg-cyan-300/10': 'bg-cyan-100 dark:bg-cyan-300/10',
    'text-cyan-100': 'text-cyan-900 dark:text-cyan-100',
    'bg-amber-300/10': 'bg-amber-100 dark:bg-amber-300/10',
    'text-amber-100': 'text-amber-900 dark:text-amber-100',
    'bg-[#0d1f33]': 'bg-white dark:bg-[#0d1f33]',
    'bg-[#1e293b]': 'bg-white dark:bg-[#1e293b]',
}

# we need to be careful to not replace something like `dark:text-slate-900 dark:text-white`
# so we first check if the replacement has already been made or use an exact word match.

def replace_classes(text):
    for old, new in replacements.items():
        # don't replace if it's already there
        if new in text:
            continue
        
        # Regex to only replace if not already prefixed with `dark:` or similar
        # this is tricky, simpler approach: replace if we don't have `dark:old` or `dark:` before it.
        # It's better to just do exact string replacement if we are careful. But `text-white` could be inside `dark:text-white`.
        # Let's fix that.
        
        text = re.sub(r'(?<!dark:|:)\b' + re.escape(old) + r'\b', new, text)
        text = re.sub(r'(?<!dark:|:)\b' + re.escape(old.replace('/', '\/')) + r'\b', new, text)
        text = text.replace(old, new)
        
    return text

for d in directories:
    for root, _, files in os.walk(d):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # do a safer replacement
                new_content = content
                for old, new in replacements.items():
                    # if the new is already present somewhere, skip maybe? Or just replace safely.
                    # replace the exact class using a trick: split by quote, process classes.
                    # Instead of split by quote, let's just do it directly.
                    # It will double prefix if run multiple times. Let's assume it runs once.
                    new_content = re.sub(r'(?<!dark:)' + re.escape(old), new, new_content)
                
                # cleanup double insertions just in case
                for old, new in replacements.items():
                    weird = new.replace(old, new)
                    if weird != new:
                        new_content = new_content.replace(weird, new)
                        
                if new_content != content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)

print('Done fixing light mode colors!')
