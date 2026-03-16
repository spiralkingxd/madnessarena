import re

with open('components/admin/rankings-admin-panel.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

imports = '''import { globalSearchAction, type SearchResult } from "@/app/actions/search-actions";
import { User, Users } from "lucide-react";'''

text = text.replace('import { Trophy, Download, Image as ImageIcon } from "lucide-react";', 'import { Trophy, Download, Image as ImageIcon, User, Users } from "lucide-react";\nimport { globalSearchAction, type SearchResult } from "@/app/actions/search-actions";')
text = text.replace('import { useEffect, useState, useTransition } from "react";', 'import { useEffect, useState, useTransition, useRef } from "react";')

# add state
states = '''const [adjustEntityId, setAdjustEntityId] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (adjustEntityId.length >= 2 && !adjustEntityId.includes("-") && !adjustEntityId.match(/^[0-9a-f]{8}-/i)) {
        setIsSearching(true);
        const res = await globalSearchAction(adjustEntityId, activeTab === "players" ? "user" : "team");
        setSearchResults(res);
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [adjustEntityId, activeTab]);'''

text = text.replace('const [adjustEntityId, setAdjustEntityId] = useState("");', states)

# replace input
old_input = '''Entity ID (jogador/equipe)
            <input value={adjustEntityId} onChange={(event) => setAdjustEntityId(event.target.value)} className="rounded-xl border border-slate-300 dark:border-white/10 bg-transparent dark:bg-black/20 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none" />'''

new_input = '''Entity ID (jogador/equipe)
            <div className="relative">
              <input value={adjustEntityId} onChange={(event) => setAdjustEntityId(event.target.value)} onFocus={() => { if(adjustEntityId.length >= 2) setIsSearching(true) }} onBlur={() => setTimeout(() => setSearchResults([]), 200)} className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-transparent dark:bg-black/20 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none" placeholder="Digite UUID ou busque nome..." />
              {searchResults.length > 0 && !adjustEntityId.match(/^[0-9a-f]{8}-/i) && (
                <div className="absolute top-full left-0 z-50 mt-1 w-full max-w-[300px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden">
                  {searchResults.map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => {
                        setAdjustEntityId(res.id);
                        setSearchResults([]);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                    >
                      {res.type === "user" ? <User className="h-4 w-4 text-slate-500 dark:text-slate-400 flex-shrink-0" /> : <Users className="h-4 w-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />}
                      <div className="flex flex-col min-w-0">
                        <span className="truncate text-sm font-medium text-slate-800 dark:text-white">{res.title}</span>
                        {res.subtitle && <span className="truncate text-xs text-slate-500 dark:text-slate-400">{res.subtitle}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>'''

text = text.replace(old_input, new_input)

with open('components/admin/rankings-admin-panel.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated rankings search')
