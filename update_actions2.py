import os

with open('app/actions/profile-actions.ts', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('const boatRole = formData.get("boat_role");', 'const boatRoleArray = formData.getAll("boat_role_array");\n  const boatRole = boatRoleArray.length > 0 ? boatRoleArray.join(", ") : formData.get("boat_role");')

with open('app/actions/profile-actions.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print('done roles action')