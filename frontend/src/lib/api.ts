const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://sac.cas-nl.com';

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  tenantId?: number;
}

// Get stored auth data
const getAuthData = () => {
  const token = localStorage.getItem('token');
  const currentTenant = localStorage.getItem('currentTenant');
  let tenant = currentTenant ? JSON.parse(currentTenant) : null;
  
  // If no tenant in localStorage but we have a token, try to extract tenant ID from JWT
  if (!tenant && token) {
    try {
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      if (tokenPayload.tenantId && !tokenPayload.isSuperAdmin) {
        // Create a minimal tenant object with just the ID
        tenant = { id: tokenPayload.tenantId };
      }
    } catch (error) {
      console.warn('Could not decode token for tenant ID:', error);
    }
  }
  
  return { token, tenant };
};

// Tenant-aware API fetch function
export const apiCall = async (endpoint: string, options: ApiOptions = {}) => {
  const { token, tenant } = getAuthData();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add tenant header if tenant exists or is specified
  let tenantId = options.tenantId || tenant?.id;
  
  // For testing, always use tenant ID 2 if no tenant is found
  if (!tenantId) {
    tenantId = 2;
  }
  
  if (tenantId) {
    headers['x-tenant-id'] = tenantId.toString();
  }

  const config: RequestInit = {
    method: options.method || 'GET',
    headers,
  };

  // Add body for non-GET requests
  if (options.body && options.method !== 'GET') {
    if (options.body instanceof FormData) {
      // For FormData, don't stringify and remove Content-Type header (browser will set it with boundary)
      config.body = options.body;
      delete headers['Content-Type'];
    } else {
      config.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    }
  }

  const response = await fetch(`${BACKEND_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP error! status: ${response.status}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  
  return response.text();
};

// Convenience methods
export const api = {
  get: (endpoint: string, options?: Omit<ApiOptions, 'method'>) => 
    apiCall(endpoint, { ...options, method: 'GET' }),
    
  post: (endpoint: string, body?: any, options?: Omit<ApiOptions, 'method' | 'body'>) => 
    apiCall(endpoint, { ...options, method: 'POST', body }),
    
  put: (endpoint: string, body?: any, options?: Omit<ApiOptions, 'method' | 'body'>) => 
    apiCall(endpoint, { ...options, method: 'PUT', body }),
    
  delete: (endpoint: string, options?: Omit<ApiOptions, 'method'>) => 
    apiCall(endpoint, { ...options, method: 'DELETE' }),
}; 