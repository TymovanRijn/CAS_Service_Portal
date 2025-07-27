import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { api } from '../lib/api';

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
  permissions?: string[];
  created_at?: string;
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

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export const AdminManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'categories' | 'locations' | 'roles'>('users');
  
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
  
  // Roles state
  const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([]);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  
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
        fetchLocations(),
        fetchAvailablePermissions()
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
      const data = await api.get('/api/tenant/users');
      setUsers(data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchRoles = async () => {
    try {
      const data = await api.get('/api/tenant/roles');
      setRoles(data.roles || []);
    } catch (err) {
      console.error('Error fetching roles:', err);
      setError('Error fetching roles');
    }
  };

  const fetchUserStats = async () => {
    try {
      // For now, generate stats from the users data
      // TODO: Implement proper tenant-aware user stats endpoint
      const roleStats = users.reduce((acc, user) => {
        const roleName = user.role_name || 'Unknown';
        acc[roleName] = (acc[roleName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const statsArray = Object.entries(roleStats).map(([role_name, count]) => ({
        role_name,
        user_count: count.toString()
      }));
      
      setUserStats(statsArray);
    } catch (err) {
      console.error('Error generating user stats:', err);
    }
  };

  // Category Management Functions
  const fetchCategories = async () => {
    try {
      const data = await api.get('/api/categories');
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Error fetching categories');
    }
  };

  // Location Management Functions
  const fetchLocations = async () => {
    try {
      const data = await api.get('/api/locations');
      setLocations(data.locations || []);
    } catch (err) {
      console.error('Error fetching locations:', err);
      setError('Error fetching locations');
    }
  };

  // Role Management Functions
  const fetchAvailablePermissions = async () => {
    try {
      const data = await api.get('/api/tenant/permissions');
      setAvailablePermissions(data.permissions || []);
    } catch (err) {
      console.error('Error fetching permissions:', err);
      setError('Error fetching permissions');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Weet je zeker dat je deze gebruiker wilt verwijderen?')) return;
    
    try {
      await api.delete(`/api/tenant/users/${userId}`);
      setSuccessMessage('Gebruiker succesvol verwijderd');
      fetchUsers();
      fetchUserStats();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error deleting user');
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    if (!window.confirm('Weet je zeker dat je deze rol wilt verwijderen?')) return;
    
    try {
      await api.delete(`/api/tenant/roles/${roleId}`);
      setSuccessMessage('Rol succesvol verwijderd');
      fetchRoles();
      fetchUserStats();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error deleting role');
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
              { id: 'locations', label: '📍 Locaties', count: locations.length },
              { id: 'roles', label: '🔐 Rollen', count: roles.length }
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
                            user.role_name === 'Security Officer' ? 'bg-blue-100 text-blue-800' :
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

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold">🔐 Rollen Beheer</CardTitle>
              <CardDescription>
                Beheer gebruikersrollen en hun permissies
              </CardDescription>
            </div>
            <Button 
              onClick={() => {
                setEditingRole(null);
                setIsRoleModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              ➕ Nieuwe Rol
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-3 font-medium text-gray-700">Naam</th>
                    <th className="text-left p-3 font-medium text-gray-700">Beschrijving</th>
                    <th className="text-left p-3 font-medium text-gray-700">Permissies</th>
                    <th className="text-left p-3 font-medium text-gray-700">Gebruikers</th>
                    <th className="text-left p-3 font-medium text-gray-700">Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <tr key={role.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-medium text-gray-900">{role.name}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm text-gray-600">{role.description}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {role.permissions?.slice(0, 3).map((permission, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {permission}
                            </span>
                          ))}
                          {role.permissions && role.permissions.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              +{role.permissions.length - 3} meer
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm text-gray-600">
                          {userStats.find(stat => stat.role_name === role.name)?.user_count || '0'} gebruikers
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => {
                              setEditingRole(role);
                              setIsRoleModalOpen(true);
                            }}
                            variant="outline"
                            size="sm"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            ✏️ Bewerken
                          </Button>
                          {role.name !== 'Tenant Admin' && (
                            <Button
                              onClick={() => handleDeleteRole(role.id)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-800"
                            >
                              🗑️ Verwijderen
                            </Button>
                          )}
                        </div>
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

      {isRoleModalOpen && (
        <RoleModal
          role={editingRole}
          availablePermissions={availablePermissions}
          onClose={() => {
            setIsRoleModalOpen(false);
            setEditingRole(null);
          }}
          onSuccess={() => {
            fetchRoles();
            fetchUserStats();
            setIsRoleModalOpen(false);
            setEditingRole(null);
            setSuccessMessage(editingRole ? 'Rol bijgewerkt' : 'Rol aangemaakt');
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
      if (user) {
        // Update existing user
        await api.put(`/api/tenant/users/${user.id}`, formData);
      } else {
        // Create new user
        await api.post('/api/tenant/register', formData);
      }
      onSuccess();
    } catch (err: any) {
      onError(err.response?.data?.message || err.message || 'Error saving user');
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

// Role Modal Component
interface RoleModalProps {
  role: Role | null;
  availablePermissions: Permission[];
  onClose: () => void;
  onSuccess: () => void;
  onError: (error: string) => void;
}

const RoleModal: React.FC<RoleModalProps> = ({ role, availablePermissions, onClose, onSuccess, onError }) => {
  const [formData, setFormData] = useState({
    name: role?.name || '',
    description: role?.description || '',
    permissions: role?.permissions || []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (role) {
        await api.put(`/api/tenant/roles/${role.id}`, formData);
      } else {
        await api.post('/api/tenant/roles', formData);
      }
      onSuccess();
    } catch (err: any) {
      onError(err.response?.data?.message || err.message || 'Error saving role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const handleCategoryToggle = (category: string, permissions: Permission[]) => {
    const categoryPermissionIds = permissions.map(p => p.id);
    const allSelected = categoryPermissionIds.every(id => formData.permissions.includes(id));
    
    setFormData(prev => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter(p => !categoryPermissionIds.includes(p))
        : Array.from(new Set([...prev.permissions, ...categoryPermissionIds]))
    }));
  };

  const isCategoryFullySelected = (permissions: Permission[]) => {
    return permissions.every(p => formData.permissions.includes(p.id));
  };

  const isCategoryPartiallySelected = (permissions: Permission[]) => {
    return permissions.some(p => formData.permissions.includes(p.id)) && 
           !permissions.every(p => formData.permissions.includes(p.id));
  };

  const groupedPermissions = availablePermissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {role ? '✏️ Rol Bewerken' : '➕ Nieuwe Rol'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rol Naam *
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Bijv. Content Manager"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beschrijving
              </label>
              <Input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Korte beschrijving van de rol"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Permissies * <span className="text-sm font-normal text-gray-500">({formData.permissions.length} geselecteerd)</span>
            </label>
            
            {/* Selected Permissions Summary */}
            {formData.permissions.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm font-medium text-blue-900 mb-2">✅ Geselecteerde rechten:</div>
                <div className="flex flex-wrap gap-1">
                  {formData.permissions.map((permId) => {
                    const perm = availablePermissions.find(p => p.id === permId);
                    return perm ? (
                      <span key={permId} className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {perm.name}
                        <button
                          type="button"
                          onClick={() => handlePermissionToggle(permId)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {Object.entries(groupedPermissions).map(([category, permissions]) => {
                const isFullySelected = isCategoryFullySelected(permissions);
                const isPartiallySelected = isCategoryPartiallySelected(permissions);
                
                return (
                  <div key={category} className="border-b border-gray-200 last:border-b-0">
                    {/* Category Header with Select All */}
                    <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isFullySelected}
                            ref={(el) => {
                              if (el) el.indeterminate = isPartiallySelected && !isFullySelected;
                            }}
                            onChange={() => handleCategoryToggle(category, permissions)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm font-medium text-gray-900">
                            {category}
                          </span>
                        </label>
                      </div>
                      <div className="text-xs text-gray-500">
                        {permissions.filter(p => formData.permissions.includes(p.id)).length}/{permissions.length} geselecteerd
                      </div>
                    </div>
                    
                    {/* Permissions in Category */}
                    <div className="p-4 space-y-2">
                      {permissions.map((permission) => {
                        const isSelected = formData.permissions.includes(permission.id);
                        const isSpecial = (permission as any).isSpecial;
                        const isGrouped = (permission as any).isGrouped;
                        
                        return (
                          <label 
                            key={permission.id} 
                            className={`flex items-start space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                              isSelected 
                                ? (isSpecial ? 'bg-red-50 border-2 border-red-200' : 'bg-green-50 border-2 border-green-200') 
                                : 'hover:bg-gray-50 border-2 border-transparent'
                            } ${isGrouped ? 'bg-blue-50' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handlePermissionToggle(permission.id)}
                              className={`mt-1 h-4 w-4 border-gray-300 rounded focus:ring-blue-500 ${
                                isSelected ? 'text-blue-600' : 'text-gray-400'
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm font-medium ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                                {permission.name}
                                {isGrouped && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Groep</span>}
                                {isSpecial && <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Systeem</span>}
                              </div>
                              <div className={`text-xs ${isSelected ? 'text-gray-600' : 'text-gray-500'}`}>
                                {permission.description}
                              </div>
                            </div>
                            {isSelected && (
                              <div className="text-green-600">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {formData.permissions.length === 0 && (
              <div className="mt-2 text-sm text-red-600">
                ⚠️ Selecteer minimaal één permissie voor deze rol
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Annuleren
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.name.trim() || formData.permissions.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Opslaan...' : (role ? 'Bijwerken' : 'Aanmaken')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}; 