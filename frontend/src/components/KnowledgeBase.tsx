import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import MobilePageWrapper from './MobilePageWrapper';
import MobilePageHeader from './MobilePageHeader';
import { 
  Search, 
  Plus, 
  BookOpen, 
  Tag, 
  User, 
  Calendar, 
  Eye, 
  Trash2, 
  MessageCircle,
  Sparkles,
  Filter,
  X,
  Image as ImageIcon,
  Send
} from 'lucide-react';

interface KnowledgeBaseEntry {
  id: number;
  title: string;
  content: string;
  image_path?: string;
  tags: string[] | string;
  category: string;
  author_name: string;
  email: string;
  view_count: number;
  created_at: string;
  updated_at: string;
  ai_summary?: string;
}

interface AIResponse {
  answer: string;
  sources: Array<{
    id: number;
    title: string;
    author: string;
  }>;
}

const KnowledgeBase: React.FC = () => {
  const [entries, setEntries] = useState<KnowledgeBaseEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper function to safely parse tags
  const parseTags = (tags: string[] | string): string[] => {
    if (Array.isArray(tags)) return tags;
    if (typeof tags === 'string') {
      try {
        const parsed = JSON.parse(tags);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeBaseEntry | null>(null);
  const [categories, setCategories] = useState<Array<{category: string, count: number}>>([]);
  const [popularTags, setPopularTags] = useState<Array<{tag: string, count: number}>>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Form state for creating/editing entries
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    tags: [] as string[],
    image: null as File | null
  });

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://sac.cas-nl.com/api';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const getAuthHeadersForFormData = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`
    };
  };

  useEffect(() => {
    fetchEntries();
    fetchCategories();
    fetchPopularTags();
  }, [currentPage, searchTerm, selectedCategory, selectedTags]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '9'
      });

      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedTags.length > 0) {
        selectedTags.forEach(tag => params.append('tags', tag));
      }

      const response = await fetch(`${API_BASE_URL}/knowledge-base?${params}`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setEntries(data.data);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/knowledge-base/meta/categories`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchPopularTags = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/knowledge-base/meta/tags`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setPopularTags(data.data);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const handleCreateEntry = async () => {
    try {
      setCreateLoading(true);
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('content', formData.content);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('tags', JSON.stringify(formData.tags));
      
      if (formData.image) {
        formDataToSend.append('image', formData.image);
      }

      const response = await fetch(`${API_BASE_URL}/knowledge-base`, {
        method: 'POST',
        headers: getAuthHeadersForFormData(),
        body: formDataToSend
      });

      if (response.ok) {
        setShowCreateModal(false);
        setFormData({ title: '', content: '', category: '', tags: [], image: null });
        fetchEntries();
        fetchCategories();
        fetchPopularTags();
      } else {
        const errorData = await response.json();
        console.error('Error creating entry:', errorData);
        alert('Fout bij het maken van artikel: ' + (errorData.message || 'Onbekende fout'));
      }
    } catch (error) {
      console.error('Error creating entry:', error);
      alert('Fout bij het maken van artikel: ' + (error as Error).message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteEntry = async (id: number) => {
    if (window.confirm('Weet je zeker dat je dit artikel wilt verwijderen?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/knowledge-base/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });

        if (response.ok) {
          fetchEntries();
          setShowDetailModal(false);
        }
      } catch (error) {
        console.error('Error deleting entry:', error);
      }
    }
  };

  const handleAISearch = async () => {
    if (!aiQuestion.trim()) return;

    try {
      setAiLoading(true);
      const response = await fetch(`${API_BASE_URL}/knowledge-base/ask`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ question: aiQuestion })
      });

      if (response.ok) {
        const data = await response.json();
        setAiResponse(data.data);
      }
    } catch (error) {
      console.error('Error asking AI:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const addTagToForm = (tag: string) => {
    if (!formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const removeTagFromForm = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const toggleTagFilter = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedTags([]);
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <MobilePageWrapper>
      <MobilePageHeader
        title="Kennisbank"
        subtitle="Deel en ontdek waardevolle security kennis"
        icon={<BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-gray-700" />}
        actions={
          <>
            <Button 
              onClick={() => setShowAIChat(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg mobile-btn-base w-full sm:w-auto"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI Assistent
            </Button>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg mobile-btn-base w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nieuw Artikel
            </Button>
          </>
        }
      />

      {/* Search and Filters - Mobile optimized */}
      <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100 mb-6 sm:mb-8">
        <div className="flex flex-col gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Zoek in de kennisbank..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl mobile-input"
              />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-blue-500 bg-white mobile-input"
            >
              <option value="">Alle categorieën</option>
              {categories.map(cat => (
                <option key={cat.category} value={cat.category}>
                  {cat.category} ({cat.count})
                </option>
              ))}
            </select>
            
            <Button 
              onClick={clearFilters}
              variant="outline"
              className="px-4 py-3 border-gray-200 hover:bg-gray-50 rounded-xl mobile-btn-base"
            >
              <Filter className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>

        {/* Tag Filters - Mobile optimized */}
        {popularTags.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Populaire tags:</p>
            <div className="flex flex-wrap gap-2">
              {popularTags.slice(0, 8).map(tag => (
                <button
                  key={tag.tag}
                  onClick={() => toggleTagFilter(tag.tag)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-all touch-manipulation ${
                    selectedTags.includes(tag.tag)
                      ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-500'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  #{tag.tag} ({tag.count})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active Filters - Mobile optimized */}
        {(selectedTags.length > 0 || selectedCategory || searchTerm) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-700">Actieve filters:</span>
              {searchTerm && (
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                  Zoekterm: "{searchTerm}"
                </span>
              )}
              {selectedCategory && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                  Categorie: {selectedCategory}
                </span>
              )}
              {selectedTags.map(tag => (
                <span key={tag} className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm flex items-center">
                  #{tag}
                  <X 
                    className="h-3 w-3 ml-1 cursor-pointer touch-manipulation" 
                    onClick={() => toggleTagFilter(tag)}
                  />
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content Grid - Mobile optimized */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-6 sm:mt-8">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-4 sm:p-6 animate-pulse mobile-card">
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-3 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded mb-4"></div>
              <div className="flex gap-2">
                <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
                <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
              </div>
            </Card>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 sm:py-12 mt-6 sm:mt-8">
          <BookOpen className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2">Geen artikelen gevonden</h3>
          <p className="text-sm sm:text-base text-gray-500 mb-6">
            {searchTerm || selectedCategory || selectedTags.length > 0 
              ? 'Probeer andere zoektermen of filters.'
              : 'Begin met het toevoegen van je eerste artikel aan de kennisbank.'}
          </p>
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white mobile-btn-base"
          >
            <Plus className="h-4 w-4 mr-2" />
            Eerste Artikel Toevoegen
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8 mt-6 sm:mt-8">
            {entries.map((entry) => (
              <Card 
                key={entry.id} 
                className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-0 shadow-lg hover:-translate-y-1 bg-white mobile-card touch-manipulation"
                onClick={() => {
                  setSelectedEntry(entry);
                  setShowDetailModal(true);
                }}
              >
                {entry.image_path && (
                  <div className="h-32 sm:h-48 bg-gradient-to-r from-blue-400 to-purple-500 rounded-t-xl relative overflow-hidden">
                    <img 
                      src={`${API_BASE_URL}/knowledge-base/images/${entry.image_path}`}
                      alt={entry.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        // Fallback to gradient if image fails to load
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.style.background = 'linear-gradient(to right, #3b82f6, #8b5cf6)';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  </div>
                )}
                
                <div className="p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-base sm:text-lg text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 flex-1 mr-2">
                      {entry.title}
                    </h3>
                    <div className="flex items-center text-sm text-gray-500 flex-shrink-0">
                      <Eye className="h-4 w-4 mr-1" />
                      {entry.view_count}
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {entry.content.substring(0, 120) + '...'}
                  </p>
                  
                  <div className="flex flex-wrap gap-1 mb-4">
                    {parseTags(entry.tags).slice(0, 2).map((tag) => (
                      <span 
                        key={tag} 
                        className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                    {parseTags(entry.tags).length > 2 && (
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                        +{parseTags(entry.tags).length - 2}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      {entry.author_name}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(entry.created_at)}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2">
              <Button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                variant="outline"
                className="rounded-xl"
              >
                Vorige
              </Button>
              
              <div className="flex space-x-1">
                {[...Array(totalPages)].map((_, i) => (
                  <Button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    variant={currentPage === i + 1 ? "default" : "outline"}
                    className={`w-10 h-10 rounded-xl ${
                      currentPage === i + 1 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' 
                        : ''
                    }`}
                  >
                    {i + 1}
                  </Button>
                ))}
              </div>
              
              <Button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                variant="outline"
                className="rounded-xl"
              >
                Volgende
              </Button>
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Nieuw Artikel Toevoegen</h2>
                <Button 
                  onClick={() => setShowCreateModal(false)}
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titel</label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Geef je artikel een duidelijke titel..."
                  className="rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categorie</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-blue-500 bg-white"
                >
                  <option value="">Selecteer een categorie</option>
                  <option value="Security">Security</option>
                  <option value="Network">Network</option>
                  <option value="Incident">Incident Response</option>
                  <option value="Asset">Asset Management</option>
                  <option value="Monitoring">Monitoring</option>
                  <option value="Best Practice">Best Practice</option>
                  <option value="Algemeen">Algemeen</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Deel je kennis en ervaringen..."
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Afbeelding (optioneel)</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.files?.[0] || null }))}
                    className="hidden"
                    id="image-upload"
                  />
                  <label 
                    htmlFor="image-upload"
                    className="flex items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 cursor-pointer transition-colors"
                  >
                    <div className="text-center">
                      <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        {formData.image ? formData.image.name : 'Klik om een afbeelding toe te voegen'}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                <div className="space-y-3">
                  <div>
                    <Input
                      type="text"
                      placeholder="Type een tag en druk Enter..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const value = (e.target as HTMLInputElement).value.trim();
                          if (value && !formData.tags.includes(value)) {
                            addTagToForm(value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                      className="rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span 
                        key={tag}
                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium flex items-center"
                      >
                        #{tag}
                        <X 
                          className="h-3 w-3 ml-2 cursor-pointer hover:text-blue-600" 
                          onClick={() => removeTagFromForm(tag)}
                        />
                      </span>
                    ))}
                  </div>
                  
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Veelgebruikte tags (klik om toe te voegen):</p>
                    <div className="flex flex-wrap gap-2">
                      {['security', 'firewall', 'incident', 'network', 'vpn', 'monitoring', 'asset', 'procedure'].map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => addTagToForm(tag)}
                          disabled={formData.tags.includes(tag)}
                          className={`px-2 py-1 rounded-full text-xs transition-all ${
                            formData.tags.includes(tag)
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700 cursor-pointer'
                          }`}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <Button 
                onClick={() => setShowCreateModal(false)}
                variant="outline"
                className="rounded-xl"
              >
                Annuleren
              </Button>
              <Button 
                onClick={handleCreateEntry}
                disabled={!formData.title || !formData.content || createLoading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl"
              >
                {createLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Artikel wordt opgeslagen...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Artikel Toevoegen
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedEntry.title}</h2>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      {selectedEntry.author_name}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(selectedEntry.created_at)}
                    </div>
                    <div className="flex items-center">
                      <Eye className="h-4 w-4 mr-1" />
                      {selectedEntry.view_count} weergaven
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    onClick={() => handleDeleteEntry(selectedEntry.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    onClick={() => setShowDetailModal(false)}
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {selectedEntry.image_path && (
                <div className="mb-6">
                  <img 
                    src={`${API_BASE_URL}/knowledge-base/images/${selectedEntry.image_path.split('/').pop()}`}
                    alt={selectedEntry.title}
                    className="w-full h-64 object-cover rounded-xl shadow-lg"
                  />
                </div>
              )}
              
              <div className="prose max-w-none mb-6">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {selectedEntry.content}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-6">
                {parseTags(selectedEntry.tags).map((tag) => (
                  <span 
                    key={tag} 
                    className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
              
              {selectedEntry.category && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center">
                    <Tag className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-sm font-medium text-gray-700">Categorie: </span>
                    <span className="text-sm text-gray-600 ml-1">{selectedEntry.category}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Chat Modal */}
      {showAIChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Sparkles className="h-6 w-6" />
                  <h2 className="text-xl font-bold">AI Kennisbank Assistent</h2>
                </div>
                <Button 
                  onClick={() => setShowAIChat(false)}
                  variant="outline"
                  size="sm"
                  className="rounded-full border-white/20 text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 h-96 overflow-y-auto">
              {!aiResponse ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Stel een vraag aan de AI</h3>
                  <p className="text-gray-500">
                    Ik kan je helpen met informatie uit de kennisbank. Stel gerust een vraag!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-800 whitespace-pre-wrap">{aiResponse.answer}</p>
                      </div>
                    </div>
                  </div>
                  
                  {aiResponse.sources.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Bronnen:</h4>
                      <div className="space-y-2">
                        {aiResponse.sources.map((source) => (
                          <div 
                            key={source.id}
                            className="bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => {
                              const entry = entries.find(e => e.id === source.id);
                              if (entry) {
                                setSelectedEntry(entry);
                                setShowDetailModal(true);
                                setShowAIChat(false);
                              }
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <h5 className="font-medium text-gray-900">{source.title}</h5>
                              <span className="text-sm text-gray-500">door {source.author}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200">
              <div className="flex space-x-3">
                <Input
                  type="text"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  placeholder="Stel je vraag over security, assets, procedures..."
                  className="flex-1 rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleAISearch()}
                />
                <Button 
                  onClick={handleAISearch}
                  disabled={!aiQuestion.trim() || aiLoading}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl px-6"
                >
                  {aiLoading ? (
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MobilePageWrapper>
  );
};

export default KnowledgeBase; 