"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2, User, Trophy, Users, MoveRight } from "lucide-react";
import { globalSearchAction, SearchResult } from "@/app/actions/search-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type SearchFilter = "all" | "user" | "tournament" | "team";

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<SearchFilter>("all");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Keyboard shortcut Ctrl+K to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Focus input when opened
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    const handleSearch = () => {
      const trimmedQuery = query.trim();
      if (trimmedQuery.length < 2) {
        setResults([]);
        return;
      }
      
      startTransition(async () => {
        const data = await globalSearchAction(trimmedQuery, filter);
        setResults(data);
      });
    };

    const debounceId = setTimeout(handleSearch, 300);
    return () => clearTimeout(debounceId);
  }, [query, filter]);

  const handleResultClick = (url: string) => {
    setIsOpen(false);
    setQuery("");
    router.push(url);
  };

  const parseQueryForFilter = (text: string) => {
    if (text.startsWith("user:")) {
      setFilter("user");
      setQuery(text.replace("user:", ""));
    } else if (text.startsWith("torneio:")) {
      setFilter("tournament");
      setQuery(text.replace("torneio:", ""));
    } else if (text.startsWith("equipe:")) {
      setFilter("team");
      setQuery(text.replace("equipe:", ""));
    } else {
      setQuery(text);
    }
  };

  return (
    <div className="relative z-50">
      {/* Search Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
        }}
        className="hidden md:flex h-9 items-center gap-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 px-3 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition w-56 lg:w-64"
      >
        <Search className="h-4 w-4" />
        <span>Buscar...</span>
        <kbd className="ml-auto hidden rounded border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-1.5 font-mono text-[10px] sm:inline-block">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Mobile Icon */}
      <button 
        className="md:hidden flex p-2 items-center justify-center text-slate-600 dark:text-slate-400"
        onClick={() => setIsOpen(true)}
      >
        <Search className="h-5 w-5" />
      </button>

      {/* Fullscreen Overlay / Dropdown */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 backdrop-blur-sm sm:pt-24 pt-16">
          <div 
            ref={containerRef}
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl mx-4 sm:mx-0 animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Input Header */}
            <div className="relative flex items-center border-b border-slate-200 dark:border-slate-800 px-4 py-4">
              <Search className="h-5 w-5 text-slate-400 mr-3" />
              <div className="flex-1 flex items-center">
                {filter !== "all" && (
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-sm font-medium mr-2 flex items-center gap-1">
                    {filter === "user" && <User className="h-3 w-3" />}
                    {filter === "tournament" && <Trophy className="h-3 w-3" />}
                    {filter === "team" && <Users className="h-3 w-3" />}
                    {filter === "user" ? "Usuário" : filter === "tournament" ? "Torneio" : "Equipe"}
                    <button 
                      onClick={(e) => { e.stopPropagation(); setFilter("all"); }}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={filter === "all" ? "Buscar por usuários, torneios, equipes... (dica: digite user:, torneio:, equipe:)" : "Digite para buscar..."}
                  className="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
                  value={query}
                  onChange={(e) => parseQueryForFilter(e.target.value)}
                />
              </div>
              {isPending && <Loader2 className="h-5 w-5 text-slate-400 animate-spin ml-2" />}
              <button 
                onClick={() => setIsOpen(false)}
                className="ml-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
              >
                <kbd className="hidden sm:inline-block rounded border border-slate-200 dark:border-slate-800 px-1 font-mono text-[10px] mr-2">ESC</kbd>
                <X className="h-5 w-5 sm:hidden" />
              </button>
            </div>

            {/* Content Area */}
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {query.trim().length > 0 && query.trim().length < 2 && (
                <div className="p-4 text-center text-sm text-slate-500">
                  Digite pelo menos 2 caracteres...
                </div>
              )}
              
              {query.trim().length >= 2 && results.length === 0 && !isPending && (
                <div className="p-8 text-center text-slate-500">
                  Nenhum resultado encontrado para &quot;{query}&quot;
                </div>
              )}

              {results.length > 0 && (
                <div className="space-y-1">
                  {results.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleResultClick(result.url)}
                      className="w-full flex items-center text-left gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition group"
                    >
                      <Avatar className="h-10 w-10 border border-slate-200 dark:border-slate-800 shadow-sm bg-slate-100 dark:bg-slate-900">
                        <AvatarImage src={result.imageUrl || ""} className="object-cover" />
                        <AvatarFallback className="bg-transparent text-slate-500">
                          {result.type === "user" && <User className="h-5 w-5" />}
                          {result.type === "tournament" && <Trophy className="h-5 w-5" />}
                          {result.type === "team" && <Users className="h-5 w-5" />}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 overflow-hidden">
                        <div className="font-medium text-slate-900 dark:text-slate-200 truncate">
                          {result.title}
                        </div>
                        {result.subtitle && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {result.subtitle}
                          </div>
                        )}
                      </div>

                      <div className="opacity-0 group-hover:opacity-100 transition-opacity pr-2 text-slate-400">
                        <MoveRight className="h-4 w-4" />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Suggestions / Filters (only show when empty) */}
              {query.length === 0 && filter === "all" && (
                <div className="p-4">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Filtros Rápidos
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button 
                      onClick={() => setFilter("user")}
                      className="flex items-center gap-2 p-3 text-sm text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition border border-transparent dark:hover:border-slate-700"
                    >
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                        <User className="h-4 w-4" />
                      </div>
                      Usuários
                    </button>
                    <button 
                      onClick={() => setFilter("tournament")}
                      className="flex items-center gap-2 p-3 text-sm text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition border border-transparent dark:hover:border-slate-700"
                    >
                      <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg text-orange-600 dark:text-orange-400">
                        <Trophy className="h-4 w-4" />
                      </div>
                      Torneios
                    </button>
                    <button 
                      onClick={() => setFilter("team")}
                      className="flex items-center gap-2 p-3 text-sm text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition border border-transparent dark:hover:border-slate-700"
                    >
                      <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg text-purple-600 dark:text-purple-400">
                        <Users className="h-4 w-4" />
                      </div>
                      Equipes
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
