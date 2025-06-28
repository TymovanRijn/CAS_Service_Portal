import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

interface User {
  id: number;
  username: string;
  email: string;
  role_name: string;
  role_description: string;
  created_at: string;
  updated_at?: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
}

interface Category {
  id: number;
  name: string;
  description?: string;
  created_at: string;
}

interface Location {
  id: number;
  name: string;
  description?: string;
  created_at: string;
}

interface UserStats {
  role_name: string;
  user_count: string;
}

export const AdminManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'categories' | 'locations'>('users');
  
  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  // Locations state
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  
  // Common state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchUsers(),
        fetchRoles(),
        fetchUserStats(),
        fetchCategories(),
        fetchLocations()
      ]);
    } catch (err) {
      setError('Error loading admin data');
    } finally {
      setIsLoading(false);
    }
  };

  // User Management Functions
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/admin/roles`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setRoles(data.roles || []);
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  const fetchUserStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserStats(data.stats || []);
      }
    } catch (err) {
      console.error('Error fetching user stats:', err);
    }
  };

  // Category Management Functions
  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/categories`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      } else {
        const errorData = await response.json();
        setError(`Error loading categories: ${errorData.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Error fetching categories');
    }
  };

  // Location Management Functions
  const fetchLocations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/locations`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setLocations(data.locations || []);
      } else {
        const errorData = await response.json();
        setError(`Error loading locations: ${errorData.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error fetching locations:', err);
      setError('Error fetching locations');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Weet je zeker dat je deze gebruiker wilt verwijderen?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      
      if (response.ok) {
        setSuccessMessage('Gebruiker succesvol verwijderd');
        fetchUsers();
        fetchUserStats();
      } else {
        const data = await response.json();
        setError(data.message || 'Error deleting user');
      }
    } catch (err) {
      setError('Error deleting user');
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!window.confirm('Weet je zeker dat je deze categorie wilt verwijderen?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/categories/${categoryId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      
      if (response.ok) {
        setSuccessMessage('Categorie succesvol verwijderd');
        fetchCategories();
      } else {
        const data = await response.json();
        setError(data.message || 'Error deleting category');
      }
    } catch (err) {
      setError('Error deleting category');
    }
  };

  const handleDeleteLocation = async (locationId: number) => {
    if (!window.confirm('Weet je zeker dat je deze locatie wilt verwijderen?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/locations/${locationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      
      if (response.ok) {
        setSuccessMessage('Locatie succesvol verwijderd');
        fetchLocations();
      } else {
        const data = await response.json();
        setError(data.message || 'Error deleting location');
      }
    } catch (err) {
      setError('Error deleting location');
    }
  };

  const clearMessages = () => {
    setError('');
    setSuccessMessage('');
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🛠️ Admin Management</h1>
        <p className="text-gray-600">Beheer gebruikers, categorieën en locaties</p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button 
            onClick={clearMessages}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}
      
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {successMessage}
          <button 
            onClick={clearMessages}
            className="ml-2 text-green-500 hover:text-green-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'users', label: '👥 Gebruikers', count: users.length },
              { id: 'categories', label: '🏷️ Categorieën', count: categories.length },
              { id: 'locations', label: '📍 Locaties', count: locations.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* User Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {userStats.map((stat) => (
              <Card key={stat.role_name}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {stat.role_name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {stat.user_count}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>👥 Gebruikers Beheer</CardTitle>
                <Button 
                  onClick={() => {
                    setEditingUser(null);
                    setIsUserModalOpen(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  ➕ Nieuwe Gebruiker
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gebruiker
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rol
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aangemaakt
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acties
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.username}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role_name === 'Admin' ? 'bg-red-100 text-red-800' :
                            user.role_name === 'SAC' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString('nl-NL')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <Button
                            onClick={() => {
                              setEditingUser(user);
                              setIsUserModalOpen(true);
                            }}
                            variant="outline"
                            size="sm"
                          >
                            ✏️ Bewerken
                          </Button>
                          <Button
                            onClick={() => handleDeleteUser(user.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-800"
                          >
                            🗑️ Verwijderen
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>🏷️ Categorieën Beheer</CardTitle>
              <Button 
                onClick={() => {
                  setEditingCategory(null);
                  setIsCategoryModalOpen(true);
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                ➕ Nieuwe Categorie
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Naam
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Beschrijving
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aangemaakt
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acties
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categories.map((category) => (
                    <tr key={category.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {category.name}
                          {category.name === 'Overig' && (
                            <span className="ml-2 text-xs text-blue-600">(Standaard)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {category.description || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(category.created_at).toLocaleDateString('nl-NL')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <Button
                          onClick={() => {
                            setEditingCategory(category);
                            setIsCategoryModalOpen(true);
                          }}
                          variant="outline"
                          size="sm"
                        >
                          ✏️ Bewerken
                        </Button>
                        {category.name !== 'Overig' && (
                          <Button
                            onClick={() => handleDeleteCategory(category.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-800"
                          >
                            🗑️ Verwijderen
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Locations Tab */}
      {activeTab === 'locations' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>📍 Locaties Beheer</CardTitle>
              <Button 
                onClick={() => {
                  setEditingLocation(null);
                  setIsLocationModalOpen(true);
                }}
                className="bg-purple-600 hover:bg-purple-700"
              >
                ➕ Nieuwe Locatie
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Naam
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Beschrijving
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aangemaakt
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acties
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {locations.map((location) => (
                    <tr key={location.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {location.name}
                          {location.name === 'Overig' && (
                            <span className="ml-2 text-xs text-blue-600">(Standaard)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {location.description || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(location.created_at).toLocaleDateString('nl-NL')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <Button
                          onClick={() => {
                            setEditingLocation(location);
                            setIsLocationModalOpen(true);
                          }}
                          variant="outline"
                          size="sm"
                        >
                          ✏️ Bewerken
                        </Button>
                        {location.name !== 'Overig' && (
                          <Button
                            onClick={() => handleDeleteLocation(location.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-800"
                          >
                            🗑️ Verwijderen
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      {isUserModalOpen && (
        <UserModal
          user={editingUser}
          roles={roles}
          onClose={() => {
            setIsUserModalOpen(false);
            setEditingUser(null);
          }}
          onSuccess={() => {
            fetchUsers();
            fetchUserStats();
            setIsUserModalOpen(false);
            setEditingUser(null);
            setSuccessMessage(editingUser ? 'Gebruiker bijgewerkt' : 'Gebruiker aangemaakt');
          }}
          onError={setError}
        />
      )}

      {isCategoryModalOpen && (
        <CategoryModal
          category={editingCategory}
          onClose={() => {
            setIsCategoryModalOpen(false);
            setEditingCategory(null);
          }}
          onSuccess={() => {
            fetchCategories();
            setIsCategoryModalOpen(false);
            setEditingCategory(null);
            setSuccessMessage(editingCategory ? 'Categorie bijgewerkt' : 'Categorie aangemaakt');
          }}
          onError={setError}
        />
      )}

      {isLocationModalOpen && (
        <LocationModal
          location={editingLocation}
          onClose={() => {
            setIsLocationModalOpen(false);
            setEditingLocation(null);
          }}
          onSuccess={() => {
            fetchLocations();
            setIsLocationModalOpen(false);
            setEditingLocation(null);
            setSuccessMessage(editingLocation ? 'Locatie bijgewerkt' : 'Locatie aangemaakt');
          }}
          onError={setError}
        />
      )}
    </div>
  );
};

// User Modal Component
interface UserModalProps {
  user: User | null;
  roles: Role[];
  onClose: () => void;
  onSuccess: () => void;
  onError: (error: string) => void;
}

const UserModal: React.FC<UserModalProps> = ({ user, roles, onClose, onSuccess, onError }) => {
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    password: '',
    role_id: user ? roles.find(r => r.name === user.role_name)?.id || '' : ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const url = user 
        ? `${BACKEND_URL}/api/admin/users/${user.id}`
        : `${BACKEND_URL}/api/admin/users`;
      
      const method = user ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        onError(data.message || 'Error saving user');
      }
    } catch (err) {
      onError('Error saving user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {user ? '✏️ Gebruiker Bewerken' : '➕ Nieuwe Gebruiker'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gebruikersnaam *
            </label>
            <Input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              minLength={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {user ? 'Nieuw Wachtwoord (laat leeg om niet te wijzigen)' : 'Wachtwoord *'}
            </label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!user}
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rol *
            </label>
            <select
              value={formData.role_id}
              onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecteer een rol</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name} - {role.description}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              disabled={isSubmitting}
            >
              Annuleren
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Opslaan...' : user ? 'Bijwerken' : 'Aanmaken'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Category Modal Component
interface CategoryModalProps {
  category: Category | null;
  onClose: () => void;
  onSuccess: () => void;
  onError: (error: string) => void;
}

const CategoryModal: React.FC<CategoryModalProps> = ({ category, onClose, onSuccess, onError }) => {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const url = category 
        ? `${BACKEND_URL}/api/categories/${category.id}`
        : `${BACKEND_URL}/api/categories`;
      
      const method = category ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        onError(data.message || 'Error saving category');
      }
    } catch (err) {
      onError('Error saving category');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {category ? '✏️ Categorie Bewerken' : '➕ Nieuwe Categorie'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Naam *
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Beschrijving
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              disabled={isSubmitting}
            >
              Annuleren
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? 'Opslaan...' : category ? 'Bijwerken' : 'Aanmaken'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Location Modal Component
interface LocationModalProps {
  location: Location | null;
  onClose: () => void;
  onSuccess: () => void;
  onError: (error: string) => void;
}

const LocationModal: React.FC<LocationModalProps> = ({ location, onClose, onSuccess, onError }) => {
  const [formData, setFormData] = useState({
    name: location?.name || '',
    description: location?.description || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const url = location 
        ? `${BACKEND_URL}/api/locations/${location.id}`
        : `${BACKEND_URL}/api/locations`;
      
      const method = location ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        onError(data.message || 'Error saving location');
      }
    } catch (err) {
      onError('Error saving location');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {location ? '✏️ Locatie Bewerken' : '➕ Nieuwe Locatie'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Naam *
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Beschrijving
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              disabled={isSubmitting}
            >
              Annuleren
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSubmitting ? 'Opslaan...' : location ? 'Bijwerken' : 'Aanmaken'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}; 