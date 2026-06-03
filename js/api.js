/**
 * DerejFact Admin — API Wrapper
 * Fetch con Bearer JWT + auto-refresh si recibe 401
 */
const API = {
  async request(method, endpoint, data = null, raw = false) {
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
      let errObj = null;
      try { errObj = await res.json(); } catch { /* no JSON body */ }

      let errMsg = `Error ${res.status}`;
      if (errObj) {
        if (errObj.detail) errMsg = errObj.detail;
        else if (Array.isArray(errObj.non_field_errors) && errObj.non_field_errors[0]) errMsg = errObj.non_field_errors[0];
        else if (typeof errObj === 'object') {
          const firstKey = Object.keys(errObj)[0];
          const firstVal = errObj[firstKey];
          if (Array.isArray(firstVal)) errMsg = `${firstKey}: ${firstVal[0]}`;
          else if (typeof firstVal === 'string') errMsg = firstVal;
        }
      }

      const err = new Error(errMsg);
      err.status = res.status;
      err.fields = errObj || null;
      throw err;
    }

    // 204 No Content
    if (res.status === 204) return null;
    
    const responseData = await res.json();
    
    // raw=true → devuelve el objeto completo (para paginación manual)
    if (raw) return responseData;

    // Extraer automáticamente los resultados si la API usa paginación de DRF
    if (responseData && typeof responseData === 'object' && 'results' in responseData && Array.isArray(responseData.results)) {
        return responseData.results;
    }
    
    return responseData;
  },

  get(endpoint)            { return this.request('GET',    endpoint); },
  getFull(endpoint)        { return this.request('GET',    endpoint, null, true); },
  post(endpoint, data)     { return this.request('POST',   endpoint, data); },
  patch(endpoint, data)    { return this.request('PATCH',  endpoint, data); },
  put(endpoint, data)      { return this.request('PUT',    endpoint, data); },
  delete(endpoint)         { return this.request('DELETE', endpoint); },
};
