import re

filepath = r'C:\Users\Administrator\Downloads\Madness Arena - Site\app\profile\me\page.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    'import { ShieldAlert, Trophy, ShieldHalf, Calendar, RefreshCcw, LogOut, CheckCircle2, ChevronRight, UserCircle2 } from "lucide-react";',
    'import { ShieldAlert, Trophy, Target, Clock, ShieldHalf, Calendar, RefreshCcw, LogOut, CheckCircle2, ChevronRight, UserCircle2 } from "lucide-react";'
)

text = text.replace(
    'type ProfileRow = {\n  id: string;\n  display_name: string;\n  username: string;\n  xbox_gamertag: string | null;\n  avatar_url: string | null;\n  created_at: string;\n};',
    'type ProfileRow = {\n  id: string;\n  display_name: string;\n  username: string;\n  xbox_gamertag: string | null;\n  avatar_url: string | null;\n  created_at: string;\n  updated_at: string;\n  rankings?: { wins: number; points: number; }[] | null;\n};'
)

text = text.replace(
    '"id, display_name, username, xbox_gamertag, avatar_url, created_at"',
    '"id, display_name, username, xbox_gamertag, avatar_url, created_at, updated_at, rankings(wins, points)"'
)

html_old = '''                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {profile.display_name}
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">@{profile.username}</p>
                  
                  {isOwner && (
                    <div className="mt-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 border border-purple-200 dark:border-purple-800/50">
                      <ShieldHalf className="h-3 w-3" />
                      Dono do Sistema
                    </div>
                  )}
                  {isAdmin && !isOwner && (
                    <div className="mt-2 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 border border-sky-200 dark:border-sky-800/50">
                      <ShieldAlert className="h-3 w-3" />
                      Administrador
                    </div>
                  )}

                  <div className="mt-4 flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      <span>Membro desde {memberSince}</span>
                    </div>
                  </div>
                </div>'''

html_new = '''                <div className="flex-1 w-full">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {profile.display_name}
                      </h1>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">@{profile.username}</p>
                      
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {isOwner && (
                          <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 border border-purple-200 dark:border-purple-800/50">
                            <ShieldHalf className="h-3 w-3" />
                            Dono do Sistema
                          </div>
                        )}
                        {isAdmin && !isOwner && (
                          <div className="bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 border border-sky-200 dark:border-sky-800/50">
                            <ShieldAlert className="h-3 w-3" />
                            Administrador
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          <span>Membro desde {memberSince}</span>
                        </div>
                        {profile.updated_at && (
                          <div className="flex items-center gap-1.5" title="Última atividade">
                            <Clock className="h-4 w-4" />
                            <span>Online: {new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date(profile.updated_at))}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 justify-start sm:justify-end shrink-0">
                      <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 min-w-[80px]">
                        <Trophy className="h-5 w-5 text-amber-500 mb-1" />
                        <span className="text-xl font-black text-slate-900 dark:text-white leading-none">{profile.rankings?.[0]?.wins || 0}</span>
                        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-1">Ganhos</span>
                      </div>
                      <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 min-w-[80px]">
                        <Target className="h-5 w-5 text-emerald-500 mb-1" />
                        <span className="text-xl font-black text-slate-900 dark:text-white leading-none">{profile.rankings?.[0]?.points || 0}</span>
                        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-1">Pontos</span>
                      </div>
                    </div>
                  </div>
                </div>'''

text = text.replace(html_old, html_new)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)
print("replaced me page!")