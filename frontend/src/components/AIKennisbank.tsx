import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

interface Article {
  id: number;
  title: string;
  content: string;
  role: string;
  author_name: string;
  created_at: string;
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const roles = ['Algemeen', 'Billing', 'Technisch', 'Retentie', 'Zakelijk'];

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
    if (!newArticle.title || !newArticle.content) {
      setError('Titel en inhoud zijn verplicht');
      return;
    }

    try {
      setError('');
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/kennisbank/articles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(newArticle)
      });

      if (response.ok) {
        setIsAddingArticle(false);
        setNewArticle({ title: '', content: '', role: 'Algemeen' });
        await fetchArticles();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Fout bij toevoegen van artikel');
      }
    } catch (err) {
      console.error('Error adding article:', err);
      setError('Netwerkfout bij toevoegen van artikel');
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
          <strong key={`bold-${key++}`} className="font-bold text-gray-900">
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📚 AI Kennisbank</h1>
          <p className="text-gray-600">Deel kennis en stel vragen aan het Orakel</p>
        </div>
        <Button
          onClick={() => setIsAddingArticle(true)}
          className="bg-primary hover:bg-primary/90"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Artikel Toevoegen
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('oracle')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'oracle'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Het Orakel
          </button>
          <button
            onClick={() => setActiveTab('articles')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'articles'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Bibliotheek ({articles.length})
          </button>
        </nav>
      </div>

      {/* Main Content */}
      {activeTab === 'oracle' ? (
        <Card>
          <CardHeader>
            <CardTitle>Het Orakel</CardTitle>
            <CardDescription>
              Stel vragen aan het AI Orakel. Het antwoordt op basis van alle artikelen in de kennisbank.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Chat History */}
            <div 
              ref={scrollRef}
              className="h-96 overflow-y-auto space-y-4 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              {chatHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-75">
                  <div className="bg-primary/10 p-6 rounded-full">
                    <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="max-w-md">
                    <h3 className="text-xl font-bold text-gray-800">Stel een vraag aan het Orakel</h3>
                    <p className="text-gray-500 mt-2">
                      Ik ken alle artikelen die jij en je collega's hebben geschreven. Hoe kan ik je vandaag helpen?
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 mt-6">
                      {['Hoe werkt de nieuwe billing flow?', 'Wat is de procedure voor retentie?', 'Problemen met glasvezel?'].map((q, i) => (
                        <button 
                          key={i} 
                          onClick={() => { setOracleQuery(q); }}
                          className="bg-white border border-gray-200 hover:border-primary px-4 py-2 rounded-lg text-sm text-gray-600 transition-all hover:shadow-sm"
                        >
                          "{q}"
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        msg.role === 'user' ? 'bg-gray-700' : 'bg-primary'
                      }`}>
                        {msg.role === 'user' ? (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        )}
                      </div>
                      <div className={`rounded-2xl px-5 py-4 shadow-sm ${
                        msg.role === 'user' 
                          ? 'bg-primary text-primary-foreground rounded-tr-none' 
                          : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                      }`}>
                        <div className="text-sm leading-relaxed">
                          {msg.role === 'oracle' ? renderMarkdown(msg.content) : (
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                          )}
                        </div>
                        
                        {/* Show the article that was used for this answer */}
                        {msg.role === 'oracle' && msg.relevantArticles && msg.relevantArticles.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2 mb-3">
                              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                {msg.relevantArticles.length === 1 ? 'Gebruikt Artikel' : 'Gebruikte Artikelen'}
                              </span>
                            </div>
                            <div className="space-y-2">
                              {msg.relevantArticles.map((article) => {
                                // Find full article from articles list
                                const fullArticle = articles.find(a => a.id === article.id);
                                
                                return (
                                  <button
                                    key={article.id}
                                    onClick={() => {
                                      if (fullArticle) {
                                        setSelectedArticle(fullArticle);
                                        setIsArticleModalOpen(true);
                                      }
                                    }}
                                    className="w-full text-left bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-4 border-2 border-primary/20 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                          <h4 className="font-bold text-sm text-gray-900 group-hover:text-primary transition-colors">
                                            {article.title}
                                          </h4>
                                          <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                          </svg>
                                        </div>
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="px-2.5 py-1 bg-primary text-white text-xs font-bold uppercase rounded-md">
                                            {article.role}
                                          </span>
                                        </div>
                                        <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed mb-2">
                                          {article.content}
                                        </p>
                                        <span className="text-xs text-primary font-semibold inline-flex items-center gap-1 group-hover:underline">
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                          </svg>
                                          Klik om volledig artikel te bekijken
                                        </span>
                                      </div>
                                    </div>
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
                  <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-3">
                    <svg className="animate-spin w-4 h-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm font-medium text-gray-500 italic">Het Orakel raadpleegt de bronnen...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="relative">
              <input 
                type="text" 
                value={oracleQuery}
                onChange={(e) => setOracleQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && askOracle()}
                placeholder="Vraag het Orakel..."
                className="w-full bg-white border-2 border-gray-200 focus:border-primary rounded-2xl py-4 pl-6 pr-16 shadow-lg transition-all outline-none text-gray-800 placeholder:text-gray-400"
              />
              <button 
                onClick={askOracle}
                disabled={!oracleQuery.trim() || isOracleLoading}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${
                  oracleQuery.trim() ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-center text-gray-400 mt-2">
              Het Orakel baseert antwoorden uitsluitend op de artikelen in de Bibliotheek.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Kennis Bibliotheek</h2>
              <p className="text-gray-500">Doorzoek en beheer de collectieve SAC kennis.</p>
            </div>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Zoek op titel of rol..."
                className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-full text-sm outline-none focus:ring-2 focus:ring-primary/20 w-64 transition-all"
              />
            </div>
          </div>

          {/* Articles Grid */}
          {filteredArticles.length === 0 ? (
            <Card>
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
                    onClick={() => setIsAddingArticle(true)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Start de kennisbank
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article) => (
                <Card 
                  key={article.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
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
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatDate(article.created_at)}
                      </span>
                    </div>
                    <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">{article.title}</CardTitle>
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
                      <span className="text-xs text-primary font-medium">Klik om te lezen →</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <div className="flex items-center gap-3">
                <div className="bg-primary p-2 rounded-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <CardTitle>Nieuwe Kennis Toevoegen</CardTitle>
              </div>
              <button 
                onClick={() => {
                  setIsAddingArticle(false);
                  setNewArticle({ title: '', content: '', role: 'Algemeen' });
                  setError('');
                }} 
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </CardHeader>
            
            <form onSubmit={handleAddArticle} className="p-6 space-y-5">
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
                  <select 
                    value={newArticle.role}
                    onChange={(e) => setNewArticle({...newArticle, role: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                  >
                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
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

              <div className="flex gap-3 pt-4 border-t border-gray-50">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddingArticle(false);
                    setNewArticle({ title: '', content: '', role: 'Algemeen' });
                    setError('');
                  }}
                  className="flex-1"
                >
                  Annuleren
                </Button>
                <Button 
                  type="submit"
                  className="flex-[2] bg-primary hover:bg-primary/90"
                >
                  Kennis Publiceren
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Article Detail Modal */}
      {isArticleModalOpen && selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between border-b sticky top-0 bg-white z-10">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-bold uppercase rounded-md">
                    {selectedArticle.role}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatDate(selectedArticle.created_at)}
                  </span>
                </div>
                <CardTitle className="text-2xl">{selectedArticle.title}</CardTitle>
              </div>
              <button 
                onClick={() => {
                  setIsArticleModalOpen(false);
                  setSelectedArticle(null);
                }} 
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-all ml-4 flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </CardHeader>
            
            <CardContent className="p-6">
              <div className="prose prose-sm max-w-none">
                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {selectedArticle.content}
                </div>
              </div>
              
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
      )}
    </div>
  );
};
