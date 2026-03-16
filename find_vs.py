import os, re

for root, dirs, files in os.walk('.'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if 'v${' in content or '}v{' in content or 'v'+'{team_size}' in content or '{team_size}v{team_size}' in content or 'event.team_size' in content:
                        print('Found in', path)
            except:
                pass
