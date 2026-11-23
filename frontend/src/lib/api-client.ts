/**
 * Admatrix Property - Enterprise API Client
 * 
 * Features:
 * - Credentials included on all requests (HTTP-only cookies)
 * - In-memory access token management (Zero localStorage exposure)
 * - Automatic 401 interception and single-flight refresh token rotation
 * - Request retry on refreshed session
 */

let inMemoryAccessToken: string | null = null;
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

export function setAccessToken(token: string | null) {
  inMemoryAccessToken = token;
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const url = endpoint.startsWith('http') || endpoint.startsWith('/api')
    ? endpoint
    : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach in-memory access token if available
  if (inMemoryAccessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${inMemoryAccessToken}`);
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Ensure HTTP-only cookies are always attached
  };

  try {
    const response = await fetch(url, config);

    // If 401 Unauthorized, attempt token refresh (unless this is already a refresh or login call)
    if (response.status === 401 && !isRetry && !url.includes('/auth/login') && !url.includes('/auth/refresh')) {
      if (!isRefreshing) {
        isRefreshing = true;

        try {
          // Call refresh endpoint (browser attaches HTTP-only refresh cookie)
          const refreshRes = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          });

          if (!refreshRes.ok) {
            setAccessToken(null);
            isRefreshing = false;
            // Notify application that session has expired
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('admatrix:session-expired'));
            }
            throw new ApiError('Session expired. Please log in again.', 401);
          }

          const refreshData = await refreshRes.json();
          const newToken = refreshData.accessToken;
          setAccessToken(newToken);
          isRefreshing = false;
          onRefreshed(newToken);

          // Retry the original request with the new access token
          headers.set('Authorization', `Bearer ${newToken}`);
          return apiClient<T>(endpoint, { ...options, headers }, true);
        } catch (err) {
          isRefreshing = false;
          refreshSubscribers = [];
          setAccessToken(null);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('admatrix:session-expired'));
          }
          throw err;
        }
      } else {
        // Another request is already refreshing tokens; queue this request
        return new Promise<T>((resolve, reject) => {
          addRefreshSubscriber(async (newToken: string) => {
            try {
              headers.set('Authorization', `Bearer ${newToken}`);
              const res = await apiClient<T>(endpoint, { ...options, headers }, true);
              resolve(res);
            } catch (err) {
              reject(err);
            }
          });
        });
      }
    }

    const contentType = response.headers.get('content-type');
    let data: any;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMessage = data?.error || data?.message || `Request failed with status ${response.status}`;
      throw new ApiError(errorMessage, response.status, data);
    }

    return data as T;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(error.message || 'Network request failed', 0);
  }
}

// Convenience helpers
apiClient.get = <T = any>(endpoint: string, options?: RequestInit) =>
  apiClient<T>(endpoint, { ...options, method: 'GET' });

apiClient.post = <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
  apiClient<T>(endpoint, {
    ...options,
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body),
  });

apiClient.put = <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
  apiClient<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: body instanceof FormData ? body : JSON.stringify(body),
  });

apiClient.patch = <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
  apiClient<T>(endpoint, {
    ...options,
    method: 'PATCH',
    body: body instanceof FormData ? body : JSON.stringify(body),
  });

apiClient.delete = <T = any>(endpoint: string, options?: RequestInit) =>
  apiClient<T>(endpoint, { ...options, method: 'DELETE' });

