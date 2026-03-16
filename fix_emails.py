import os

with open('components/admin/members-table.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

if 'EyeOff' not in text:
    text = text.replace('import { Ban, Shield', 'import { Ban, Shield, Eye, EyeOff')

if 'showEmails' not in text:
    text = text.replace('const [search, setSearch] = useState("");', 'const [search, setSearch] = useState("");\n  const [showEmails, setShowEmails] = useState(false);')
    
    text = text.replace('render: (row) => <span className="text-xs text-slate-300">{row.email ?? "-"}</span>', 'render: (row) => <span className="text-xs text-slate-300">{row.email ? (showEmails ? row.email : row.email.substring(0,3) + "***@***.com") : "-"}</span>')
    
    btn = '''<AdminButton type="button" variant="ghost" onClick={exportJson}>
            Exportar JSON
          </AdminButton>
          <AdminButton type="button" variant="ghost" onClick={() => setShowEmails(!showEmails)}>
            {showEmails ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {showEmails ? "Ocultar Emails" : "Mostrar Emails"}
          </AdminButton>'''
    
    text = text.replace('<AdminButton type="button" variant="ghost" onClick={exportJson}>\n            Exportar JSON\n          </AdminButton>', btn)

with open('components/admin/members-table.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('Emails updated')
