import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface Tenant {
  id: number;
  name: string;
  subdomain: string;
  logo_path?: string;
  primary_color: string;
  secondary_color: string;
  is_active: boolean;
}

const Login: React.FC = () => {
  const { login, loginSuperAdmin, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<number | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [loginType, setLoginType] = useState<'tenant' | 'superadmin'>('tenant');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tenantsLoading, setTenantsLoading] = useState(false);

  // Fetch available tenants on component mount
  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    setTenantsLoading(true);
    try {
      // Use a public endpoint to get active tenants for login selection
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'https://sac.cas-nl.com'}/api/public/tenants`);
      if (response.ok) {
        const data = await response.json();
        setAvailableTenants(data.tenants || []);
      } else {
        console.error('Failed to fetch tenants');
        setAvailableTenants([]);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
      setAvailableTenants([]);
    } finally {
      setTenantsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      let result;
      
      if (loginType === 'superadmin') {
        result = await loginSuperAdmin(email, password);
      } else {
        if (!selectedTenant) {
          setError('Please select a tenant to login to.');
          setIsSubmitting(false);
          return;
        }
        result = await login(email, password, selectedTenant);
      }

      if (!result.success) {
        setError(result.message);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTenantData = availableTenants.find(t => t.id === selectedTenant);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            SecureHub Portal
          </h1>
          <p className="text-gray-600">
            {loginType === 'superadmin' ? 'Super Admin Access' : 'Sign in to your account'}
          </p>
        </div>

        {/* Login Type Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setLoginType('tenant')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              loginType === 'tenant'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Tenant Login
          </button>
          <button
            type="button"
            onClick={() => setLoginType('superadmin')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              loginType === 'superadmin'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Super Admin
          </button>
        </div>

        {/* Tenant Selection */}
        {loginType === 'tenant' && (
          <div className="space-y-2">
            <label htmlFor="tenant" className="block text-sm font-medium text-gray-700">
              Select Organization
            </label>
            {tenantsLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-500">Loading organizations...</span>
              </div>
            ) : (
              <div className="grid gap-2 max-h-48 overflow-y-auto">
                {availableTenants.map((tenant) => (
                  <div
                    key={tenant.id}
                    onClick={() => setSelectedTenant(tenant.id)}
                    className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      selectedTenant === tenant.id
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{
                      borderColor: selectedTenant === tenant.id ? tenant.primary_color : undefined
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      {tenant.logo_path ? (
                        <img
                          src={`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001'}/${tenant.logo_path}`}
                          alt={`${tenant.name} logo`}
                          className="w-8 h-8 rounded object-cover"
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: tenant.primary_color }}
                        >
                          {tenant.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{tenant.name}</p>
                        <p className="text-sm text-gray-500">@{tenant.subdomain}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {availableTenants.length === 0 && !tenantsLoading && (
              <p className="text-sm text-gray-500 text-center py-4">
                No organizations available. Contact your administrator.
              </p>
            )}
          </div>
        )}

        {/* Selected Tenant Preview */}
        {loginType === 'tenant' && selectedTenantData && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600 mb-1">Signing in to:</p>
            <div className="flex items-center space-x-2">
              {selectedTenantData.logo_path ? (
                <img
                  src={`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001'}/${selectedTenantData.logo_path}`}
                  alt={`${selectedTenantData.name} logo`}
                  className="w-6 h-6 rounded object-cover"
                />
              ) : (
                <div
                  className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: selectedTenantData.primary_color }}
                >
                  {selectedTenantData.name.charAt(0)}
                </div>
              )}
              <span className="font-medium text-gray-900">{selectedTenantData.name}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={loginType === 'superadmin' ? 'admin@cas-portal.com' : 'your.email@company.com'}
              required
              className="w-full"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="w-full"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting || isLoading || (loginType === 'tenant' && !selectedTenant)}
            className="w-full"
            style={{
              backgroundColor: selectedTenantData?.primary_color || '#3B82F6',
              borderColor: selectedTenantData?.primary_color || '#3B82F6'
            }}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Signing In...
              </div>
            ) : (
              `Sign In${loginType === 'superadmin' ? ' as Super Admin' : ''}`
            )}
          </Button>
        </form>


      </Card>
    </div>
  );
};

export default Login; 