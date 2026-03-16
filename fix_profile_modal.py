import re

def fix_dict(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        text = f.read()

    # The issue: ProfileSettingsForm renders out of bounds because it is inside an absolute container on desktop
    text = text.replace('className="absolute top-4 right-4 z-10"', 'className="absolute top-4 right-4 z-[60]"')
    text = text.replace('z-[60]', 'z-50')
    text = text.replace('z-10', 'z-50')

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(text)

fix_dict('app/profile/me/page.tsx')
print("Profile settings z-index fixed")
