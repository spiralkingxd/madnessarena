import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = content.replace(
        'new Intl.DateTimeFormat("pt-BR", {',
        'new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo",'
    )
    new_content = new_content.replace(
        '.toLocaleDateString("pt-BR")',
        '.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })'
    )

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print('Updated ' + filepath)

for root, dirs, files in os.walk('.'):
    if 'node_modules' in root or '.git' in root or '.next' in root:
        continue
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx') or file.endswith('.js'):
            process_file(os.path.join(root, file))
print('Done!')
