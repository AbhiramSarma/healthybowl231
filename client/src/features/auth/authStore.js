import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../../lib/apiClient'

export const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isInitialized: false, // Track if we've checked the persisted token
            loading: false, // Loading state per slice
            error: null, // Error state per slice
            refreshing: false, // Track if refresh is in progress to prevent multiple calls
            
            login: async (phone, password) => {
                set({ loading: true, error: null });
                try {
                    const data = await api.post('/api/auth/login', { phone, password });
                    
                    if (data.success) {
                        set({
                            user: data.user,
                            token: data.token,
                            isAuthenticated: true,
                            isInitialized: true,
                            loading: false,
                            error: null
                        });
                        return { success: true };
                    } else {
                        set({ loading: false, error: data.error || 'Login failed' });
                        return { success: false, error: data.error || 'Login failed' };
                    }
                } catch (error) {
                    // Extract error message from response data if available
                    let errorMessage = error.message || 'Network error. Please try again.';
                    if (error.data?.error) {
                        errorMessage = error.data.error;
                    } else if (error.data?.errors && Array.isArray(error.data.errors) && error.data.errors.length > 0) {
                        // Show first validation error
                        errorMessage = error.data.errors[0].msg || errorMessage;
                    }
                    set({ loading: false, error: errorMessage });
                    return { success: false, error: errorMessage };
                }
            },
            
            register: async (name, phone, password, email = '', address = '') => {
                set({ loading: true, error: null });
                try {
                    const data = await api.post('/api/auth/register', { name, phone, password, email, address });
                    
                    if (data.success) {
                        set({
                            user: data.user,
                            token: data.token,
                            isAuthenticated: true,
                            isInitialized: true,
                            loading: false,
                            error: null
                        });
                        return { success: true };
                    } else {
                        set({ loading: false, error: data.error || 'Registration failed' });
                        return { success: false, error: data.error || 'Registration failed' };
                    }
                } catch (error) {
                    // Extract error message from response data if available
                    let errorMessage = error.message || 'Network error. Please try again.';
                    if (error.data?.error) {
                        errorMessage = error.data.error;
                    } else if (error.data?.errors && Array.isArray(error.data.errors) && error.data.errors.length > 0) {
                        // Show first validation error
                        errorMessage = error.data.errors[0].msg || errorMessage;
                    }
                    set({ loading: false, error: errorMessage });
                    return { success: false, error: errorMessage };
                }
            },
            
            logout: async () => {
                try {
                    // Call logout endpoint to clear refresh token cookie
                    await api.post('/api/auth/logout', {});
                } catch (error) {
                    // Continue with logout even if API call fails
                    console.error('Logout API call failed:', error);
                }
                
                // Reset state on logout
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    isInitialized: true,
                    loading: false,
                    error: null
                });
                // Clear persisted state
                localStorage.removeItem('auth-storage');
            },
            
            refresh: async () => {
                // Prevent multiple simultaneous refresh calls
                if (get().refreshing) {
                    return { success: false };
                }
                
                set({ refreshing: true });
                try {
                    const data = await api.post('/api/auth/refresh', {});
                    
                    if (data.success) {
                        set({
                            user: data.user,
                            token: data.token,
                            isAuthenticated: true,
                            isInitialized: true,
                            error: null,
                            refreshing: false
                        });
                        return { success: true };
                    } else {
                        set({ 
                            isAuthenticated: false, 
                            user: null, 
                            token: null, 
                            isInitialized: true,
                            refreshing: false 
                        });
                        return { success: false };
                    }
                } catch (error) {
                    set({ 
                        isAuthenticated: false, 
                        user: null, 
                        token: null, 
                        isInitialized: true,
                        refreshing: false 
                    });
                    return { success: false };
                }
            },
            
            verifyToken: async () => {
                const token = get().token;
                if (!token) {
                    // Try to refresh if no token but cookie exists (only if not already refreshing)
                    if (!get().refreshing) {
                        const refreshResult = await get().refresh();
                        return refreshResult.success;
                    }
                    return false;
                }
                
                try {
                    const data = await api.get('/api/auth/me');
                    
                    if (data.success) {
                        set({
                            user: data.user,
                            isAuthenticated: true,
                            isInitialized: true,
                            error: null
                        });
                        return true;
                    } else {
                        // Token is invalid, try refresh (only if not already refreshing)
                        if (!get().refreshing) {
                            const refreshResult = await get().refresh();
                            return refreshResult.success;
                        }
                        return false;
                    }
                } catch (error) {
                    // 401/403 means token is invalid - try refresh (only if not already refreshing)
                    if ((error.status === 401 || error.status === 403) && !get().refreshing) {
                        const refreshResult = await get().refresh();
                        return refreshResult.success;
                    } else if (error.status !== 401 && error.status !== 403) {
                        // Keep the token if it's just a network error
                        set({ isInitialized: true });
                    }
                    return false;
                }
            },
            
            // Initialize auth state on app load
            init: async () => {
                // If already initialized, don't re-initialize
                if (get().isInitialized) {
                    return;
                }
                
                const token = get().token;
                const user = get().user;
                
                // If we have a token and user from persistence, verify it
                if (token && user) {
                    // Optimistically set as authenticated (for better UX)
                    set({ isAuthenticated: true, isInitialized: false });
                    // Verify the token in the background (will try refresh if expired)
                    await get().verifyToken();
                } else {
                    // No token, try to refresh using cookie (only if not already refreshing)
                    if (!get().refreshing) {
                        const refreshResult = await get().refresh();
                        if (!refreshResult.success) {
                            set({ isAuthenticated: false, isInitialized: true });
                        }
                    } else {
                        set({ isAuthenticated: false, isInitialized: true });
                    }
                }
            }
        }),
        {
            name: 'auth-storage',
            version: 1, // Versioned persisted state
            // Only persist these fields
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                // Don't persist isAuthenticated - we'll verify on load
                // Don't persist isInitialized - always start fresh
                // Don't persist loading/error states
            }),
            // Handle state hydration
            onRehydrateStorage: () => (state) => {
                // State hydration handled - verify token on rehydrate
                if (state?.token) {
                    state.verifyToken();
                }
            },
        }
    )
)
