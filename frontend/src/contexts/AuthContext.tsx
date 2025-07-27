import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

interface Tenant {
  id: number;
  name: string;
  subdomain: string;
  settings: {
    primaryColor: string;
    secondaryColor: string;
    logoPath?: string;
  };
}

interface User {
  id: number;
  username: string;
  email: string;
  role_name?: string;
  role_description?: string;
  permissions?: string[];
  created_at: string;
  updated_at?: string;
  isSuperAdmin?: boolean;
  tenant?: Tenant;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  currentTenant: Tenant | null;
  availableTenants: Tenant[];
  login: (email: string, password: string, tenantId?: number) => Promise<{ success: boolean; message: string }>;
  loginSuperAdmin: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  setCurrentTenant: (tenant: Tenant | null) => void;
  fetchTenants: () => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(
    localStorage.getItem('currentTenant') ? JSON.parse(localStorage.getItem('currentTenant')!) : null
  );
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!token && !!user;
  const isSuperAdmin = !!user?.isSuperAdmin;

  // Fetch user profile when token exists
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        let profileUrl = `${BACKEND_URL}/api/auth/profile`;
        let headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        };

        // Check if it's a super admin token by decoding JWT
        let isSuperAdmin = false;
        try {
          const tokenPayload = JSON.parse(atob(token.split('.')[1]));
          isSuperAdmin = tokenPayload.isSuperAdmin === true;
        } catch (decodeError) {
          console.warn('Could not decode token:', decodeError);
        }

        if (isSuperAdmin) {
          try {
            const superAdminResponse = await fetch(`${BACKEND_URL}/api/super-admin/profile`, {
              method: 'GET',
              headers,
              credentials: 'include',
            });

            if (superAdminResponse.ok) {
              const data = await superAdminResponse.json();
              setUser(data.user);
              setIsLoading(false);
              return;
            }
          } catch (superAdminError) {
            console.error('Super admin profile fetch error:', superAdminError);
          }
        }

        // For tenant users, we need tenant context
        if (currentTenant) {
          headers['x-tenant-id'] = currentTenant.id.toString();
          profileUrl = `${BACKEND_URL}/api/tenant/profile`;
        }

        const response = await fetch(profileUrl, {
          method: 'GET',
          headers,
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          
          // Update tenant info if provided
          if (data.user.tenant) {
            setCurrentTenant(data.user.tenant);
            localStorage.setItem('currentTenant', JSON.stringify(data.user.tenant));
          }
        } else {
          // Token is invalid, remove it
          localStorage.removeItem('token');
          localStorage.removeItem('currentTenant');
          setToken(null);
          setUser(null);
          setCurrentTenant(null);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('currentTenant');
        setToken(null);
        setUser(null);
        setCurrentTenant(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [token, currentTenant?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch available tenants for tenant selection
  const fetchTenants = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/super-admin/tenants`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableTenants(data.tenants || []);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  // Super Admin login
  const loginSuperAdmin = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/super-admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.removeItem('currentTenant'); // Clear tenant for super admin
        setToken(data.token);
        setUser(data.user);
        setCurrentTenant(null);
        return { success: true, message: data.message || 'Super Admin login successful' };
      } else {
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Super Admin login error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  // Tenant user login
  const login = async (email: string, password: string, tenantId?: number): Promise<{ success: boolean; message: string }> => {
    try {
      if (!tenantId) {
        return { success: false, message: 'Please select a tenant to login to.' };
      }

      const response = await fetch(`${BACKEND_URL}/api/tenant/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId.toString(),
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('currentTenant', JSON.stringify(data.user.tenant));
        setToken(data.token);
        setUser(data.user);
        setCurrentTenant(data.user.tenant);
        return { success: true, message: data.message || 'Login successful' };
      } else {
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentTenant');
    setToken(null);
    setUser(null);
    setCurrentTenant(null);
    setAvailableTenants([]);
  };

  const handleSetCurrentTenant = (tenant: Tenant | null) => {
    setCurrentTenant(tenant);
    if (tenant) {
      localStorage.setItem('currentTenant', JSON.stringify(tenant));
    } else {
      localStorage.removeItem('currentTenant');
    }
  };

  const value: AuthContextType = {
    user,
    token,
    currentTenant,
    availableTenants,
    login,
    loginSuperAdmin,
    logout,
    setCurrentTenant: handleSetCurrentTenant,
    fetchTenants,
    isLoading,
    isAuthenticated,
    isSuperAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 