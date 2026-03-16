import re

def fix_dict(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        text = f.read()

    # The issue: text was replaced but it is rendered as string like:
    # label="{dict.profile.memberSince}" 
    # instead of:
    # label={dict.profile.memberSince}

    text = re.sub(r'="\{dict\.([a-zA-Z0-9_.]+)\}"', r'={\1}', text)

    # Some variables like teamsError were replaced like: teamsError = "{dict.profile.loadTeamsError}" 
    # Must be teamsError = dict.profile.loadTeamsError
    text = re.sub(r'=\{dict\.([a-zA-Z0-9_.]+)\}', r'= dict.\1', text)
    
    # Check for direct text replacements like >{dict...}<
    # that actually didn't need to be {dict...} if they were already inside JSX tags vs string literals.
    # We'll just change `"{dict.profile.loadTeamsError}"` -> `dict.profile.loadTeamsError`
    text = text.replace('"{dict.profile.loadTeamsError}"', 'dict.profile.loadTeamsError')

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(text)

fix_dict('app/profile/me/page.tsx')
fix_dict('app/profile/[id]/page.tsx')

print("done regex replacements")
