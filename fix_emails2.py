import os

with open('components/admin/members-table.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

if 'Ocultar Emails' not in text:
    old_btn = '''Exportar JSON
          </AdminButton>'''
    
    new_btn = '''Exportar JSON
          </AdminButton>
          <AdminButton type="button" variant="ghost" onClick={() => setShowEmails(!showEmails)}>
            {showEmails ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {showEmails ? "Ocultar Emails" : "Mostrar Emails"}
          </AdminButton>'''
    
    text = text.replace(old_btn, new_btn)

    with open('components/admin/members-table.tsx', 'w', encoding='utf-8') as f:
        f.write(text)

print('Button inserted')
