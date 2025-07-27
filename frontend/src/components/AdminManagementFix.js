// Fix for AdminManagement.tsx - replace the fetchRoles and fetchLocations functions

const fetchRoles = async () => {
  try {
    const data = await api.get('/api/tenant/roles');
    setRoles(data.roles || []);
  } catch (err) {
    console.error('Error fetching roles:', err);
    setError('Error fetching roles');
  }
};

const fetchLocations = async () => {
  try {
    const data = await api.get('/api/locations');
    setLocations(data.locations || []);
  } catch (err) {
    console.error('Error fetching locations:', err);
    setError('Error fetching locations');
  }
};

// Also update other location-related functions to use api.get, api.post, etc.
// instead of manual fetch calls with tenant headers
