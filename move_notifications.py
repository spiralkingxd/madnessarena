import os

with open('components/admin/notifications-center.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's cleanly separate the sections. We'll use a regex or split by `<article `
import re

# Find the Notificação personalizada article
# It starts with:
# <article className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
#           <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-white">
#             <BellRing className="h-5 w-5 text-cyan-300" />
#             Notificação personalizada (site)
start_tag = '<article className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">\n          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-white">\n            <BellRing className="h-5 w-5 text-cyan-300" />\n            Notifica'

start_idx = text.find('<article className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">\n          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-white">\n            <BellRing className="h-5 w-5 text-cyan-300" />\n            Notifica')

if start_idx == -1:
    print('Not found')
else:
    # Find the end of this article. It ends before 
    #         <article className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
    # or before </section>
    
    end_idx = text.find('</article>', start_idx) + 10
    
    custom_article = text[start_idx:end_idx]
    
    text = text[:start_idx] + text[end_idx:]
    
    # insert it right after <section className="space-y-6"> or similar
    # or right after return ( \n    <div className="space-y-6">
    insert_point = text.find('<div className="grid gap-6')
    if insert_point != -1:
        text = text[:insert_point] + custom_article + '\n\n        ' + text[insert_point:]
        with open('components/admin/notifications-center.tsx', 'w', encoding='utf-8') as f:
            f.write(text)
        print('Moved Notification to the top')
    else:
        print('Did not find insert point')
