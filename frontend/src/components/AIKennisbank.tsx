import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { SelectField } from './ui/select-field';
import { SegmentedControl } from './ui/segmented-control';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

/** Geauthenticeerde cover (zelfde idee als IncidentDetailModal: static /uploads/ faalt achter veel proxy’s). */
function ArticleCoverImage({ articleId }: { articleId: number }) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);

    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setSrc(null);

    (async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${BACKEND_URL}/api/kennisbank/articles/${articleId}/cover`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
        });
        if (cancelled) return;
        if (!res.ok) throw new Error('bad');
        const blob = await res.blob();
        if (cancelled) return;
        const u = URL.createObjectURL(blob);
        urlRef.current = u;
        setSrc(u);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [articleId]);

  if (loading) {
    return (
      <div
        className="mx-auto mt-8 h-52 max-w-2xl animate-pulse rounded-2xl bg-muted/50"
        aria-hidden
      />
    );
  }
  if (failed || !src) {
    return (
      <p className="mx-auto mt-8 max-w-2xl text-sm text-muted-foreground">
        Afbeelding kon niet worden geladen.
      </p>
    );
  }

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-3">
      <div className="overflow-hidden rounded-2xl border border-border/40 bg-muted/15 p-2 shadow-sm">
        <img
          src={src}
          alt=""
          className="mx-auto max-h-[min(70vh,28rem)] w-full rounded-xl object-contain"
        />
      </div>
      <div className="flex justify-center">
        <button
          type="button"
          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          onClick={() => window.open(src, '_blank', 'noopener,noreferrer')}
        >
          Open in nieuw tabblad
        </button>
      </div>
    </div>
  );
}

function ArticleIllustrationHintIcon(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

interface Article {
  id: number;
  title: string;
  content: string;
  role: string;
  author_id: number | null;
  author_name: string;
  created_at: string;
  image_filename?: string | null;
}

interface RelevantArticle {
  id: number;
  title: string;
  role: string;
  content: string;
}

interface ChatMessage {
  role: 'user' | 'oracle';
  content: string;
  relevantArticles?: RelevantArticle[];
}

export const AIKennisbank: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'oracle' | 'articles'>('oracle');
  const [articles, setArticles] = useState<Article[]>([]);
  const [isAddingArticle, setIsAddingArticle] = useState(false);
  const [newArticle, setNewArticle] = useState({ title: '', content: '', role: 'Algemeen' });
  const [oracleQuery, setOracleQuery] = useState('');
  const [isOracleLoading, setIsOracleLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [deleteKbLoading, setDeleteKbLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const roles = ['Algemeen', 'Billing', 'Technisch', 'Retentie', 'Zakelijk'];

  const coverPreviewUrl = useMemo(() => {
    if (!coverFile) return null;
    return URL.createObjectURL(coverFile);
  }, [coverFile]);

  useEffect(() => {
    return () => {
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    };
  }, [coverPreviewUrl]);

  const resetAddArticleForm = () => {
    setNewArticle({ title: '', content: '', role: 'Algemeen' });
    setCoverFile(null);
    setError('');
  };

  const openAddArticle = () => {
    resetAddArticleForm();
    setIsAddingArticle(true);
  };

  const closeAddArticle = () => {
    resetAddArticleForm();
    setIsAddingArticle(false);
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isOracleLoading]);

  const fetchArticles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/kennisbank/articles`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setArticles(data.data.articles || []);
      }
    } catch (err) {
      console.error('Error fetching articles:', err);
    }
  };

  const handleAddArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArticle.title.trim() || !newArticle.content.trim()) {
      setError('Titel en inhoud zijn verplicht');
      return;
    }

    try {
      setError('');
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('title', newArticle.title.trim());
      formData.append('content', newArticle.content.trim());
      formData.append('role', newArticle.role);
      if (coverFile) {
        formData.append('cover', coverFile);
      }

      const response = await fetch(`${BACKEND_URL}/api/kennisbank/articles`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: formData
      });

      if (response.ok) {
        await fetchArticles();
        closeAddArticle();
      } else {
        let message = 'Fout bij toevoegen van artikel';
        try {
          const errorData = await response.json();
          message = errorData.message || message;
        } catch {
          // ignore JSON parse failure
        }
        setError(message);
      }
    } catch (err) {
      console.error('Error adding article:', err);
      setError('Netwerkfout bij toevoegen van artikel');
    }
  };

  const deleteKnowledgeArticle = async (article: Article) => {
    const ok = window.confirm(
      `"${article.title}" definitief uit de kennisbank verwijderen? Dit kan niet ongedaan worden gemaakt.`
    );
    if (!ok) return;

    try {
      setDeleteKbLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/kennisbank/articles/${article.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });

      let message = 'Verwijderen mislukt';
      try {
        const body = await response.json();
        if (body.message) message = body.message;
      } catch {
        /* empty */
      }

      if (!response.ok) {
        window.alert(message);
        return;
      }

      setIsArticleModalOpen(false);
      setSelectedArticle(null);
      await fetchArticles();
    } catch (err) {
      console.error('deleteKnowledgeArticle:', err);
      window.alert('Netwerkfout bij verwijderen');
    } finally {
      setDeleteKbLoading(false);
    }
  };

  const askOracle = async () => {
    if (!oracleQuery.trim() || isOracleLoading) return;

    const currentQuery = oracleQuery;
    setOracleQuery('');
    setChatHistory(prev => [...prev, { role: 'user', content: currentQuery }]);
    setIsOracleLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/kennisbank/oracle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ question: currentQuery })
      });

      if (response.ok) {
        const data = await response.json();
        setChatHistory(prev => [...prev, { 
          role: 'oracle', 
          content: data.data.answer,
          relevantArticles: data.data.relevantArticles || []
        }]);
      } else {
        const errorData = await response.json();
        setChatHistory(prev => [...prev, { 
          role: 'oracle', 
          content: errorData.message || 'Er ging iets mis bij het raadplegen van het Orakel.' 
        }]);
      }
    } catch (err) {
      console.error('Error asking oracle:', err);
      setChatHistory(prev => [...prev, { 
        role: 'oracle', 
        content: 'Er ging iets mis bij het raadplegen van de kennisbank. Probeer het later opnieuw.' 
      }]);
    } finally {
      setIsOracleLoading(false);
    }
  };

  // Enhanced markdown renderer for better formatting
  const renderMarkdown = (text: string) => {
    if (!text) return '';
    
    // Split by lines to handle line breaks
    const lines = text.split('\n');
    
    return lines.map((line, lineIndex) => {
      // Skip empty lines
      if (!line.trim()) {
        return <br key={lineIndex} />;
      }
      
      // Process bold (**text**)
      const parts: (string | React.ReactElement)[] = [];
      let processedLine = line;
      let key = 0;
      
      // Replace **text** with bold
      const boldRegex = /\*\*(.+?)\*\*/g;
      let match;
      let lastIndex = 0;
      
      while ((match = boldRegex.exec(processedLine)) !== null) {
        // Add text before the match
        if (match.index > lastIndex) {
          const beforeText = processedLine.substring(lastIndex, match.index);
          if (beforeText) {
            parts.push(<span key={`text-${key++}`}>{beforeText}</span>);
          }
        }
        // Add bold text with better styling
        parts.push(
          <strong key={`bold-${key++}`} className="font-bold text-foreground">
            {match[1]}
          </strong>
        );
        lastIndex = match.index + match[0].length;
      }
      
      // Add remaining text
      if (lastIndex < processedLine.length) {
        const remainingText = processedLine.substring(lastIndex);
        if (remainingText) {
          parts.push(<span key={`text-${key++}`}>{remainingText}</span>);
        }
      }
      
      // If no bold found, return original line
      if (parts.length === 0) {
        parts.push(<span key={`text-${key++}`}>{line}</span>);
      }
      
      return (
        <React.Fragment key={lineIndex}>
          <div className="mb-2 last:mb-0 leading-relaxed">
            {parts}
          </div>
        </React.Fragment>
      );
    });
  };

  const filteredArticles = articles.filter(article => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return article.title.toLowerCase().includes(query) || 
           article.content.toLowerCase().includes(query) ||
           article.role.toLowerCase().includes(query);
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
        <div className="hidden lg:block">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">AI Kennisbank</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Orakel en bibliotheek uit één bron</p>
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={openAddArticle}
          className="h-11 w-full shrink-0 shadow-sm transition-colors duration-200 lg:h-10 lg:w-auto"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Artikel toevoegen
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-800 transition-colors duration-200">
          <div className="flex items-center justify-between gap-2">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} className="rounded-lg p-1 text-red-600 hover:bg-red-100/80">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <SegmentedControl
        aria-label="Weergave"
        value={activeTab}
        onChange={(tab) => setActiveTab(tab as typeof activeTab)}
        options={[
          { value: 'oracle', label: 'Het Orakel' },
          { value: 'articles', label: `Bibliotheek (${articles.length})` },
        ]}
        className="w-full [&>button]:min-w-0 [&>button]:flex-1 sm:w-auto sm:[&>button]:flex-none"
      />

      {/* Main Content */}
      {activeTab === 'oracle' ? (
        <div className="rounded-2xl border border-border/80 bg-card shadow-sm ring-1 ring-black/[0.03]">
          <div className="p-4 sm:p-5">
            {/* Chat */}
            <div
              ref={scrollRef}
              className="mb-4 max-h-[min(24rem,55svh)] min-h-[13rem] space-y-3 overflow-y-auto overscroll-contain rounded-xl border border-border/60 bg-muted/30 p-3 sm:min-h-[14rem] sm:p-4"
            >
              {chatHistory.length === 0 ? (
                <div className="flex h-full min-h-[12rem] flex-col items-center justify-center px-2 text-center">
                  <p className="max-w-xs text-sm text-muted-foreground">
                    Antwoorden zijn gebaseerd op artikelen in de bibliotheek. Stel hieronder je vraag.
                  </p>
                </div>
              ) : (
                chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-full ${
                        msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        {msg.role === 'user' ? (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        )}
                      </div>
                      <div className={`rounded-2xl px-4 py-3 shadow-sm transition-transform duration-150 sm:px-5 sm:py-4 ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border bg-background text-foreground'
                      }`}>
                        <div className="text-sm leading-relaxed">
                          {msg.role === 'oracle' ? renderMarkdown(msg.content) : (
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                          )}
                        </div>
                        
                        {/* Show the article that was used for this answer */}
                        {msg.role === 'oracle' && msg.relevantArticles && msg.relevantArticles.length > 0 && (
                          <div className="mt-3 border-t border-border pt-3">
                            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                              {msg.relevantArticles.length === 1 ? 'Bron' : 'Bronnen'}
                            </p>
                            <div className="space-y-2">
                              {msg.relevantArticles.map((article) => {
                                const fullArticle = articles.find(a => a.id === article.id);
                                return (
                                  <button
                                    type="button"
                                    key={article.id}
                                    onClick={() => {
                                      if (fullArticle) {
                                        setSelectedArticle(fullArticle);
                                        setIsArticleModalOpen(true);
                                      }
                                    }}
                                    className="relative flex w-full gap-3 rounded-xl border border-border bg-muted/40 p-3 text-left transition-colors hover:bg-muted active:scale-[0.99]"
                                  >
                                    {fullArticle?.image_filename ? (
                                      <span className="absolute right-3 top-3 text-muted-foreground/[0.18]" title="Met illustratie">
                                        <ArticleIllustrationHintIcon className="h-4 w-4" />
                                      </span>
                                    ) : null}
                                    <span className="min-w-0 flex-1 pr-6">
                                      <span className="block text-xs font-semibold text-foreground">{article.title}</span>
                                      <span className="mt-1 block text-[11px] text-muted-foreground line-clamp-2">{article.content}</span>
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isOracleLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm">
                    <svg className="h-4 w-4 animate-spin text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-xs text-muted-foreground">Zoekt in artikelen…</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="flex items-center gap-2 rounded-full border border-gray-300 bg-white py-1.5 pl-4 pr-1.5 shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              <input
                type="text"
                value={oracleQuery}
                onChange={(e) => setOracleQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    askOracle();
                  }
                }}
                placeholder="Stel een vraag…"
                className="min-h-10 min-w-0 flex-1 border-0 bg-transparent py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={askOracle}
                disabled={!oracleQuery.trim() || isOracleLoading}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                  oracleQuery.trim()
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'cursor-not-allowed bg-muted text-muted-foreground'
                }`}
                aria-label="Verstuur vraag"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="hidden lg:block lg:min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">Bibliotheek</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">Zoek en open een artikel</p>
            </div>
            <div className="relative w-full lg:max-w-sm">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Zoek titel of rol…"
                className="w-full rounded-full border border-input bg-background py-2.5 pl-10 pr-4 text-sm text-foreground shadow-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Articles Grid */}
          {filteredArticles.length === 0 ? (
            <Card className="border-border/80 shadow-sm">
              <CardContent className="py-12 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h3 className="text-lg font-bold text-gray-700 mb-2">
                  {searchQuery ? 'Geen artikelen gevonden' : 'Nog geen kennis gedeeld'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchQuery 
                    ? 'Probeer een andere zoekterm' 
                    : 'Wees de eerste en voeg een nieuw artikel toe!'}
                </p>
                {!searchQuery && (
                  <Button
                    onClick={openAddArticle}
                    variant="primary"
                  >
                    Start de kennisbank
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
              {filteredArticles.map((article) => (
                <Card 
                  key={article.id}
                  className="cursor-pointer overflow-hidden border-border/80 bg-card shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  onClick={() => {
                    setSelectedArticle(article);
                    setIsArticleModalOpen(true);
                  }}
                >
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-bold uppercase rounded-md">
                        {article.role}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-medium text-slate-600">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatDate(article.created_at)}
                      </span>
                      {article.image_filename ? (
                        <span className="ml-auto text-muted-foreground/[0.22]" title="Artikel heeft een illustratie">
                          <ArticleIllustrationHintIcon className="h-[18px] w-[18px]" />
                        </span>
                      ) : null}
                    </div>
                    <CardTitle className="text-lg leading-tight transition-colors">{article.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 line-clamp-3 mb-4 leading-relaxed">
                      {article.content}
                    </p>
                    <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <span className="text-xs font-bold text-gray-500">Gedeeld door {article.author_name}</span>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">Openen</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Article Modal */}
      {isAddingArticle && (
        <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden">
          <button
            type="button"
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            aria-label="Sluiten"
            onClick={closeAddArticle}
          />
          <div className="relative mx-auto flex min-h-full justify-center px-3 py-[max(0.75rem,env(safe-area-inset-top,0px))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:p-4">
            <Card
            className="relative my-auto w-full max-w-2xl flex max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem))] flex-col overflow-hidden rounded-2xl border-border shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
            <CardHeader className="shrink-0 flex flex-row items-center justify-between border-b border-border bg-muted/40">
              <div className="flex items-center gap-3">
                <div className="bg-primary p-2 rounded-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <CardTitle>Nieuwe Kennis Toevoegen</CardTitle>
              </div>
              <button 
                type="button"
                onClick={closeAddArticle}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </CardHeader>
            
            <form onSubmit={handleAddArticle} className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-6">
              {error ? (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
              ) : null}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                    Titel van Artikel
                  </label>
                  <input 
                    autoFocus
                    required
                    type="text" 
                    value={newArticle.title}
                    onChange={(e) => setNewArticle({...newArticle, title: e.target.value})}
                    placeholder="Bijv. Troubleshooting Glasvezel ONT"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                    Relevant voor Rol
                  </label>
                  <SelectField
                    value={newArticle.role}
                    onChange={(e) => setNewArticle({ ...newArticle, role: e.target.value })}
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </SelectField>
                </div>
              </div>

              <div>
                <label
                  htmlFor="kb-cover-image"
                  className="mb-1.5 ml-1 block text-xs font-bold uppercase tracking-widest text-gray-400"
                >
                  Illustratie (optioneel)
                </label>
                <input
                  id="kb-cover-image"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setCoverFile(f);
                  }}
                />
                <p className="mt-1 ml-1 text-[11px] text-muted-foreground">JPEG, PNG, GIF of WebP, tot 5&nbsp;MB.</p>
                {coverPreviewUrl ? (
                  <img
                    src={coverPreviewUrl}
                    alt="Voorbeeld omslag"
                    className="mt-3 max-h-48 w-auto rounded-xl border border-border object-contain shadow-sm"
                  />
                ) : null}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                  De Kennis (Uitleg)
                </label>
                <textarea 
                  required
                  rows={8}
                  value={newArticle.content}
                  onChange={(e) => setNewArticle({...newArticle, content: e.target.value})}
                  placeholder="Leg hier in je eigen woorden uit wat je hebt geleerd of hoe een proces werkt..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                />
              </div>

              </div>

              <div className="flex shrink-0 gap-3 border-t border-border bg-muted/30 px-4 py-3 sm:p-6">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={closeAddArticle}
                  className="flex-1"
                >
                  Annuleren
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-[2]"
                >
                  Kennis Publiceren
                </Button>
              </div>
            </form>
            </Card>
          </div>
        </div>
      )}

      {/* Article Detail Modal */}
      {isArticleModalOpen && selectedArticle && (
        <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden">
          <button
            type="button"
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            aria-label="Sluiten"
            onClick={() => {
              setIsArticleModalOpen(false);
              setSelectedArticle(null);
            }}
          />
          <div className="relative mx-auto flex min-h-full justify-center px-3 py-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:p-4">
          <Card
            className="relative my-auto w-full max-w-3xl max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem))] flex flex-col overflow-hidden rounded-2xl border-border shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="shrink-0 flex flex-row items-start justify-between gap-3 border-b border-border bg-muted/40 pb-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-bold uppercase rounded-md">
                    {selectedArticle.role}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-medium text-slate-600">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatDate(selectedArticle.created_at)}
                  </span>
                </div>
                <CardTitle className="text-2xl">{selectedArticle.title}</CardTitle>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-start">
                {user &&
                selectedArticle &&
                (user.role_name === 'Admin' ||
                  Number(user.id) === Number(selectedArticle.author_id)) ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={deleteKbLoading}
                    className="h-9 touch-manipulation whitespace-nowrap text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => deleteKnowledgeArticle(selectedArticle)}
                  >
                    {deleteKbLoading ? 'Verwijderen…' : 'Verwijderen'}
                  </Button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setIsArticleModalOpen(false);
                    setSelectedArticle(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-all"
                  aria-label="Sluiten"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6">
              <div className="prose prose-sm max-w-none">
                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {selectedArticle.content}
                </div>
              </div>

              {selectedArticle.image_filename ? (
                <ArticleCoverImage articleId={selectedArticle.id} />
              ) : null}
              
              <div className="mt-6 pt-6 border-t border-gray-200 flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Gedeeld door</p>
                  <p className="text-sm text-gray-600">{selectedArticle.author_name}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      )}
    </div>
  );
};

