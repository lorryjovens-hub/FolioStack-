import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

const useAppStore = create(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        theme: 'light',
        language: 'en',
        notifications: [],
        
        setUser: (user) => set({ user, isAuthenticated: !!user }),
        
        logout: () => set({ user: null, isAuthenticated: false }),
        
        setLoading: (isLoading) => set({ isLoading }),
        
        setError: (error) => set({ error }),
        
        clearError: () => set({ error: null }),
        
        toggleTheme: () => set((state) => ({ 
          theme: state.theme === 'light' ? 'dark' : 'light' 
        })),
        
        setTheme: (theme) => set({ theme }),
        
        setLanguage: (language) => set({ language }),
        
        addNotification: (notification) => set((state) => ({
          notifications: [...state.notifications, {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            ...notification
          }]
        })),
        
        removeNotification: (id) => set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        })),
        
        clearNotifications: () => set({ notifications: [] })
      }),
      {
        name: 'app-storage',
        partialize: (state) => ({
          theme: state.theme,
          language: state.language
        })
      }
    )
  )
);

const useApiStore = create(
  devtools(
    persist(
      (set, get) => ({
        apiConfig: {
          baseUrl: '/api',
          timeout: 30000,
          retries: 3
        },
        cache: new Map(),
        pendingRequests: new Map(),
        
        setApiConfig: (config) => set((state) => ({
          apiConfig: { ...state.apiConfig, ...config }
        })),
        
        setCache: (key, value) => set((state) => {
          const newCache = new Map(state.cache);
          newCache.set(key, { value, timestamp: Date.now() });
          return { cache: newCache };
        }),
        
        getCache: (key, ttl = 300000) => {
          const state = get();
          const cached = state.cache.get(key);
          if (cached && Date.now() - cached.timestamp < ttl) {
            return cached.value;
          }
          return null;
        },
        
        clearCache: () => set({ cache: new Map() }),
        
        addPendingRequest: (key, controller) => set((state) => {
          const newPending = new Map(state.pendingRequests);
          newPending.set(key, controller);
          return { pendingRequests: newPending };
        }),
        
        removePendingRequest: (key) => set((state) => {
          const newPending = new Map(state.pendingRequests);
          newPending.delete(key);
          return { pendingRequests: newPending };
        }),
        
        abortPendingRequests: () => {
          const state = get();
          state.pendingRequests.forEach((controller, key) => {
            controller?.abort?.();
          });
          set({ pendingRequests: new Map() });
        }
      }),
      {
        name: 'api-storage',
        partialize: (state) => ({
          apiConfig: state.apiConfig
        })
      }
    )
  )
);

const useAIStore = create(
  devtools(
    persist(
      (set, get) => ({
        aiConfig: {
          provider: 'volcengine',
          apiKey: '',
          baseUrl: 'https://ark.cn-beijing.volces.com/api/coding/v1/messages',
          modelId: 'doubao-seed-2.0-code',
          maxTokens: 10000,
          temperature: 0.7
        },
        isConfigured: false,
        chatHistory: [],
        isGenerating: false,
        
        setAIConfig: (config) => set((state) => ({
          aiConfig: { ...state.aiConfig, ...config },
          isConfigured: !!(config.apiKey || state.aiConfig.apiKey)
        })),
        
        clearAIConfig: () => set({
          aiConfig: {
            provider: 'volcengine',
            apiKey: '',
            baseUrl: 'https://ark.cn-beijing.volces.com/api/coding/v1/messages',
            modelId: 'doubao-seed-2.0-code',
            maxTokens: 10000,
            temperature: 0.7
          },
          isConfigured: false
        }),
        
        addChatMessage: (message) => set((state) => ({
          chatHistory: [...state.chatHistory, {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            ...message
          }]
        })),
        
        clearChatHistory: () => set({ chatHistory: [] }),
        
        setGenerating: (isGenerating) => set({ isGenerating })
      }),
      {
        name: 'ai-storage'
      }
    )
  )
);

const useUIStore = create(
  devtools(
    (set, get) => ({
      sidebarOpen: true,
      mobileMenuOpen: false,
      modalOpen: false,
      currentModal: null,
      modalProps: {},
      
      toggleSidebar: () => set((state) => ({ 
        sidebarOpen: !state.sidebarOpen 
      })),
      
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      
      toggleMobileMenu: () => set((state) => ({ 
        mobileMenuOpen: !state.mobileMenuOpen 
      })),
      
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
      
      openModal: (modal, props = {}) => set({
        modalOpen: true,
        currentModal: modal,
        modalProps: props
      }),
      
      closeModal: () => set({
        modalOpen: false,
        currentModal: null,
        modalProps: {}
      })
    })
  )
);

export {
  useAppStore,
  useApiStore,
  useAIStore,
  useUIStore
};