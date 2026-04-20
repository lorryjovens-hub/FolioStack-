import { createStore } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

class RequestManager {
  constructor() {
    this.pendingRequests = new Map();
    this.requestCache = new Map();
    this.cacheTTL = 5 * 60 * 1000;
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  async fetchWithCache(url, options = {}) {
    const cacheKey = `${url}:${JSON.stringify(options)}`;
    const cached = this.requestCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const requestPromise = fetch(url, options)
      .then(response => response.json())
      .then(data => {
        this.requestCache.set(cacheKey, { data, timestamp: Date.now() });
        this.pendingRequests.delete(cacheKey);
        return data;
      })
      .catch(error => {
        this.pendingRequests.delete(cacheKey);
        throw error;
      });

    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  abortRequest(key) {
    const controller = this.pendingRequests.get(key);
    if (controller) {
      controller.abort?.();
      this.pendingRequests.delete(key);
    }
  }

  clearCache() {
    this.requestCache.clear();
  }

  invalidateCache(pattern) {
    for (const key of this.requestCache.keys()) {
      if (key.includes(pattern)) {
        this.requestCache.delete(key);
      }
    }
  }
}

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoadTime: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      firstInputDelay: 0,
      cumulativeLayoutShift: 0,
      timeToInteractive: 0
    };
    this.observers = [];
  }

  init() {
    if (typeof window === 'undefined') return;

    this.measurePageLoad();
    this.observeCoreWebVitals();
    this.observePerformance();
  }

  measurePageLoad() {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation) {
        this.metrics.pageLoadTime = navigation.loadEventEnd - navigation.startTime;
        console.log('[Performance] Page load time:', this.metrics.pageLoadTime + 'ms');
      }
    });
  }

  observeCoreWebVitals() {
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.metrics.largestContentfulPaint = lastEntry.startTime;
          console.log('[Performance] LCP:', this.metrics.largestContentfulPaint + 'ms');
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);

        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          this.metrics.firstInputDelay = entries[0].processingStart - entries[0].startTime;
          console.log('[Performance] FID:', this.metrics.firstInputDelay + 'ms');
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);

        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              this.metrics.cumulativeLayoutShift += entry.value;
            }
          }
          console.log('[Performance] CLS:', this.metrics.cumulativeLayoutShift);
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (e) {
        console.warn('[Performance] PerformanceObserver not supported');
      }
    }
  }

  observePerformance() {
    const paintEntries = performance.getEntriesByType('paint');
    paintEntries.forEach(entry => {
      if (entry.name === 'first-contentful-paint') {
        this.metrics.firstContentfulPaint = entry.startTime;
        console.log('[Performance] FCP:', entry.startTime + 'ms');
      }
    });
  }

  getMetrics() {
    return { ...this.metrics };
  }

  report() {
    console.group('[Performance] Metrics');
    console.table(this.metrics);
    console.groupEnd();
    return this.metrics;
  }

  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

class ErrorBoundary {
  constructor(options = {}) {
    this.onError = options.onError || console.error;
    this.fallbackComponent = options.fallbackComponent;
    this.init();
  }

  init() {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      this.handleError({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        message: 'Unhandled Promise Rejection',
        reason: event.reason
      });
    });

    console.log('[ErrorBoundary] Initialized');
  }

  handleError(error) {
    console.error('[ErrorBoundary] Caught error:', error);
    
    this.onError(error);

    if (this.fallbackComponent) {
      this.showFallback(error);
    }
  }

  showFallback(error) {
    const container = document.getElementById('app') || document.body;
    container.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: 20px;
        text-align: center;
      ">
        <h1>Something went wrong</h1>
        <p>${error.message || 'An unexpected error occurred'}</p>
        <button onclick="location.reload()" style="
          padding: 10px 20px;
          font-size: 16px;
          cursor: pointer;
        ">
          Reload Page
        </button>
      </div>
    `;
  }
}

const requestManager = new RequestManager();
const performanceMonitor = new PerformanceMonitor();

class LazyLoadManager {
  constructor(options = {}) {
    this.options = {
      rootMargin: options.rootMargin || '200px 0px',
      threshold: options.threshold || 0.01,
      placeholder: options.placeholder || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==',
      ...options
    };
    this.observer = null;
    this.loadedImages = new Set();
  }

  init() {
    if (!('IntersectionObserver' in window)) {
      this.loadAllImages();
      return;
    }

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this loadImage(entry.target);
          this.observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: this.options.rootMargin,
      threshold: this.options.threshold
    });

    this.observeImages();
    
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => this.observeImages(), 100);
    });
  }

  observeImages() {
    const images = document.querySelectorAll('img[data-src], img[data-lazy]');
    images.forEach(img => {
      if (!this.loadedImages.has(img)) {
        this.observer.observe(img);
      }
    });
  }

  loadImage(img) {
    const src = img.dataset.src || img.dataset.lazy;
    
    if (this.loadedImages.has(img) || !src) return;

    img.src = this.options.placeholder;
    
    const imageLoader = new Image();
    imageLoader.onload = () => {
      img.src = src;
      img.classList.add('loaded');
      img.removeAttribute('data-src');
      img.removeAttribute('data-lazy');
      this.loadedImages.add(img);
      
      if (this.options.onLoad) {
        this.options.onLoad(img, src);
      }
    };
    
    imageLoader.onerror = () => {
      img.classList.add('error');
      if (this.options.onError) {
        this.options.onError(img, src);
      }
    };
    
    imageLoader.src = src;
  }

  loadAllImages() {
    const images = document.querySelectorAll('img[data-src], img[data-lazy]');
    images.forEach(img => this.loadImage(img));
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

class PreloadManager {
  constructor() {
    this.preloadedResources = new Map();
    this.prefetchedPages = new Set();
  }

  preloadImage(src) {
    if (this.preloadedResources.has(src)) return;
    
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      
      link.onload = () => {
        this.preloadedResources.set(src, true);
        resolve();
      };
      
      link.onerror = reject;
      document.head.appendChild(link);
    });
  }

  prefetchPage(url) {
    if (this.prefetchedPages.has(url)) return;
    
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
    
    this.prefetchedPages.add(url);
  }

  preconnectTo(origin) {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    document.head.appendChild(link);
  }

  dnsPrefetch(domain) {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = domain;
    document.head.appendChild(link);
  }

  preloadCriticalResources(resources = []) {
    resources.forEach(resource => {
      switch (resource.type) {
        case 'image':
          this.preloadImage(resource.src);
          break;
        case 'script':
          this.preloadScript(resource.src);
          break;
        case 'style':
          this.preloadStyle(resource.src);
          break;
        case 'font':
          this.preloadFont(resource.src);
          break;
      }
    });
  }

  preloadScript(src) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'script';
    link.href = src;
    document.head.appendChild(link);
  }

  preloadStyle(src) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = src;
    document.head.appendChild(link);
  }

  preloadFont(src) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.href = src;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }
}

class CodeSplitter {
  constructor() {
    this.loadedModules = new Map();
    this.loadingPromises = new Map();
  }

  async loadModule(name, loader) {
    if (this.loadedModules.has(name)) {
      return this.loadedModules.get(name);
    }

    if (this.loadingPromises.has(name)) {
      return this.loadingPromises.get(name);
    }

    const loadingPromise = loader()
      .then(module => {
        this.loadedModules.set(name, module);
        this.loadingPromises.delete(name);
        return module;
      })
      .catch(error => {
        this.loadingPromises.delete(name);
        throw error;
      });

    this.loadingPromises.set(name, loadingPromise);
    return loadingPromise;
  }

  async loadComponent(name, importFn) {
    return this.loadModule(name, importFn);
  }

  async loadRoute(path, componentLoader) {
    const moduleName = `route:${path}`;
    return this.loadModule(moduleName, componentLoader);
  }

  unloadModule(name) {
    this.loadedModules.delete(name);
  }

  clearCache() {
    this.loadedModules.clear();
    this.loadingPromises.clear();
  }
}

class CacheStrategy {
  constructor(options = {}) {
    this.cacheName = options.cacheName || 'foliostack-v1';
    this.maxAge = options.maxAge || 24 * 60 * 60 * 1000;
    this.maxSize = options.maxSize || 50 * 1024 * 1024;
  }

  async openCache() {
    return caches.open(this.cacheName);
  }

  async get(url) {
    const cache = await this.openCache();
    const cached = await cache.match(url);
    
    if (!cached) return null;

    const cacheDate = cached.headers.get('cache-date');
    if (cacheDate && Date.now() - parseInt(cacheDate) > this.maxAge) {
      await cache.delete(url);
      return null;
    }

    return cached;
  }

  async put(url, response) {
    const cache = await this.openCache();
    
    const size = await this.getCacheSize(cache);
    if (size > this.maxSize) {
      await this.evictOldEntries(cache);
    }

    const clonedResponse = response.clone();
    const headers = new Headers(clonedResponse.headers);
    headers.set('cache-date', Date.now().toString());
    
    const modifiedResponse = new Response(clonedResponse.body, { headers });
    await cache.put(url, modifiedResponse);
  }

  async getCacheSize(cache) {
    let size = 0;
    const keys = await cache.keys();
    
    for (const key of keys) {
      const response = await cache.match(key);
      if (response) {
        const blob = await response.blob();
        size += blob.size;
      }
    }
    
    return size;
  }

  async evictOldEntries(cache) {
    const keys = await cache.keys();
    const entries = [];
    
    for (const key of keys) {
      const response = await cache.match(key);
      if (response) {
        const date = parseInt(response.headers.get('cache-date') || '0');
        entries.push({ key, date });
      }
    }
    
    entries.sort((a, b) => a.date - b.date);
    
    const toRemove = Math.ceil(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      await cache.delete(entries[i].key);
    }
  }

  async clear() {
    const cache = await this.openCache();
    await cache.keys().then(keys => {
      keys.forEach(key => cache.delete(key));
    });
  }

  static networkFirst(url, options = {}) {
    const strategy = new CacheStrategy(options);
    
    return fetch(url)
      .then(async response => {
        if (response.ok) {
          await strategy.put(url, response.clone());
        }
        return response;
      })
      .catch(async () => {
        const cached = await strategy.get(url);
        if (cached) {
          return cached;
        }
        throw new Error('Network failed and no cache available');
      });
  }

  static cacheFirst(url, options = {}) {
    const strategy = new CacheStrategy(options);
    
    return strategy.get(url).then(cached => {
      if (cached) {
        fetch(url).then(response => {
          if (response.ok) strategy.put(url, response);
        }).catch(() => {});
        
        return cached;
      }
      
      return fetch(url).then(async response => {
        if (response.ok) {
          await strategy.put(url, response);
        }
        return response;
      });
    });
  }

  static staleWhileRevalidate(url, options = {}) {
    const strategy = new CacheStrategy(options);
    
    return strategy.get(url).then(cached => {
      fetch(url).then(response => {
        if (response.ok) strategy.put(url, response);
      }).catch(() => {});
      
      return cached || fetch(url);
    });
  }
}

const lazyLoadManager = new LazyLoadManager();
const preloadManager = new PreloadManager();
const codeSplitter = new CodeSplitter();

export { 
  RequestManager, 
  PerformanceMonitor, 
  ErrorBoundary,
  LazyLoadManager,
  PreloadManager,
  CodeSplitter,
  CacheStrategy,
  requestManager,
  performanceMonitor,
  lazyLoadManager,
  preloadManager,
  codeSplitter
};