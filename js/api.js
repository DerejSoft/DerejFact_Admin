/**
 * DerejFact Admin — API Wrapper
 * Fetch con Bearer JWT + auto-refresh si recibe 401
 */
const API = {
  async request(method, endpoint, data = null) {
    const makeRequest = async (token) => {
      const opts = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      };
      if (data) opts.body = JSON.stringify(data);
      return fetch(`${CONFIG.API_BASE_URL}${endpoint}`, opts);
    };

    let token = AUTH.getAccessToken();
    let res = await makeRequest(token);

    // Si 401: intentar refresh automático
    if (res.status === 401) {
      const refreshed = await AUTH.refreshToken();
      if (refreshed) {
        token = AUTH.getAccessToken();
        res = await makeRequest(token);
      } else {
        AUTH.logout();
        return;
      }
    }

    if (!res.ok) {
      let errMsg = `Error ${res.status}`;
      try {
        const err = await res.json();
        errMsg = err.detail || err.non_field_errors?.[0] || JSON.stringify(err);
      } catch { /* usar mensaje genérico */ }
      throw new Error(errMsg);
    }

    // 204 No Content
    if (res.status === 204) return null;
    
    const responseData = await res.json();
    
    // Extraer automáticamente los resultados si la API usa paginación de DRF
    if (responseData && typeof responseData === 'object' && 'results' in responseData && Array.isArray(responseData.results)) {
        return responseData.results;
    }
    
    return responseData;
  },

  get(endpoint)            { return this.request('GET',    endpoint); },
  post(endpoint, data)     { return this.request('POST',   endpoint, data); },
  patch(endpoint, data)    { return this.request('PATCH',  endpoint, data); },
  put(endpoint, data)      { return this.request('PUT',    endpoint, data); },
  delete(endpoint)         { return this.request('DELETE', endpoint); },
};
