class ClipboardAPI {
  static async writeText(text) {
    if (!navigator.clipboard) {
      return this.fallbackCopy(text);
    }
    
    try {
      await navigator.clipboard.writeText(text);
      return { success: true };
    } catch (error) {
      console.error('Clipboard write failed:', error);
      return this.fallbackCopy(text);
    }
  }
  
  static async readText() {
    if (!navigator.clipboard) {
      throw new Error('Clipboard API not supported');
    }
    
    try {
      const text = await navigator.clipboard.readText();
      return { success: true, text };
    } catch (error) {
      console.error('Clipboard read failed:', error);
      throw error;
    }
  }
  
  static fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return { success: true };
    } catch (error) {
      document.body.removeChild(textarea);
      return { success: false, error: error.message };
    }
  }
}

class NotificationAPI {
  static async requestPermission() {
    if (!('Notification' in window)) {
      return { granted: false, message: '此浏览器不支持通知功能' };
    }
    
    if (Notification.permission === 'granted') {
      return { granted: true, message: '已授权通知权限' };
    }
    
    if (Notification.permission === 'denied') {
      return { 
        granted: false, 
        message: '通知权限被拒绝，请在浏览器设置中开启',
        action: 'settings'
      };
    }
    
    try {
      const permission = await Notification.requestPermission();
      return {
        granted: permission === 'granted',
        message: permission === 'granted' ? '通知权限已授予' : '通知权限未授予'
      };
    } catch (error) {
      return { granted: false, error: error.message };
    }
  }
  
  static show(title, options = {}) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      console.warn('Notification not available or not permitted');
      return null;
    }
    
    const notification = new Notification(title, {
      icon: '/icons/notification-icon.png',
      badge: '/icons/badge-icon.png',
      ...options
    });
    
    notification.onclick = () => {
      window.focus();
      if (options.onClick) options.onClick(notification);
      notification.close();
    };
    
    return notification;
  }
  
  static getPermissionStatus() {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }
}

class GeolocationAPI {
  static getCurrentPosition(options = {}) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation API not supported'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            success: true,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp
          });
        },
        (error) => {
          let errorMessage = '位置获取失败';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = '用户拒绝了位置请求';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = '位置信息不可用';
              break;
            case error.TIMEOUT:
              errorMessage = '获取位置超时';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
          ...options
        }
      );
    });
  }
  
  static watchPosition(onSuccess, onError, options = {}) {
    if (!navigator.geolocation) {
      if (onError) onError(new Error('Geolocation API not supported'));
      return null;
    }
    
    return navigator.geolocation.watchPosition(
      onSuccess,
      onError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
        ...options
      }
    );
  }
  
  static clearWatch(watchId) {
    if (watchId && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  }
}

class StorageAPI {
  constructor(prefix = 'foliostack_') {
    this.prefix = prefix;
  }
  
  set(key, value, ttl = null) {
    try {
      const data = {
        value,
        timestamp: Date.now(),
        ttl: ttl ? Date.now() + ttl * 1000 : null
      };
      
      localStorage.setItem(`${this.prefix}${key}`, JSON.stringify(data));
      return { success: true };
    } catch (error) {
      console.error('Storage set failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  get(key) {
    try {
      const item = localStorage.getItem(`${this.prefix}${key}`);
      
      if (!item) {
        return { success: true, value: null };
      }
      
      const data = JSON.parse(item);
      
      if (data.ttl && Date.now() > data.ttl) {
        localStorage.removeItem(`${this.prefix}${key}`);
        return { success: true, value: null, expired: true };
      }
      
      return { success: true, value: data.value };
    } catch (error) {
      console.error('Storage get failed:', error);
      return { success: false, error: error.message, value: null };
    }
  }
  
  remove(key) {
    try {
      localStorage.removeItem(`${this.prefix}${key}`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  clear() {
    try {
      const keysToRemove = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      return { success: true, clearedCount: keysToRemove.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  getAll() {
    const items = {};
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(this.prefix)) {
        const actualKey = key.replace(this.prefix, '');
        items[actualKey] = this.get(actualKey).value;
      }
    }
    
    return items;
  }
  
  get size() {
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      if (localStorage.key(i).startsWith(this.prefix)) {
        count++;
      }
    }
    return count;
  }
  
  static getSessionStorage(prefix = 'foliostack_session_') {
    return {
      set: (key, value) => {
        try {
          sessionStorage.setItem(`${prefix}${key}`, JSON.stringify(value));
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      
      get: (key) => {
        try {
          const item = sessionStorage.getItem(`${prefix}${key}`);
          return { success: true, value: item ? JSON.parse(item) : null };
        } catch (error) {
          return { success: false, error: error.message, value: null };
        }
      },
      
      remove: (key) => {
        sessionStorage.removeItem(`${prefix}${key}`);
        return { success: true };
      },
      
      clear: () => {
        const keysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key.startsWith(prefix)) keysToRemove.push(key);
        }
        keysToRemove.forEach(key => sessionStorage.removeItem(key));
        return { success: true };
      }
    };
  }
}

class BrowserAPIs {
  static clipboard = ClipboardAPI;
  static notification = NotificationAPI;
  static geolocation = GeolocationAPI;
  static storage = new StorageAPI();
  static session = StorageAPI.getSessionStorage();
  
  static checkSupport() {
    return {
      clipboard: !!navigator.clipboard,
      notifications: 'Notification' in window,
      geolocation: !!navigator.geolocation,
      localStorage: typeof Storage !== 'undefined',
      sessionStorage: typeof Storage !== 'undefined',
      serviceWorker: 'serviceWorker' in navigator,
      webWorkers: typeof Worker !== 'undefined',
      webSocket: 'WebSocket' in window,
      fetch: 'fetch' in window
    };
  }
  
  static isOnline() {
    return navigator.onLine;
  }
  
  static onOnline(callback) {
    window.addEventListener('online', callback);
    return () => window.removeEventListener('online', callback);
  }
  
  static onOffline(callback) {
    window.addEventListener('offline', callback);
    return () => window.removeEventListener('offline', callback);
  }
  
  static async share(data) {
    if (!navigator.share) {
      throw new Error('Web Share API not supported');
    }
    
    try {
      await navigator.share({
        title: data.title || document.title,
        text: data.text || '',
        url: data.url || window.location.href
      });
      return { success: true };
    } catch (error) {
      if (error.name === 'AbortError') {
        return { success: false, cancelled: true };
      }
      throw error;
    }
  }
  
  static async download(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
    }, 100);
    
    return { success: true };
  }
  
  static print(elementId = null) {
    if (elementId) {
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error(`Element with id ${elementId} not found`);
      }
      
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>Print</title>
            <style>
              body { margin: 20px; font-family: Arial, sans-serif; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>${element.innerHTML}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    } else {
      window.print();
    }
    
    return { success: true };
  }
  
  static addToHomeScreen() {
    const deferredPrompt = window.deferredPrompt;
    
    if (!deferredPrompt) {
      return { 
        canInstall: false, 
        message: '应用暂不支持安装到主屏幕' 
      };
    }
    
    deferredPrompt.prompt();
    
    return deferredPrompt.userChoice.then(choiceResult => ({
      outcome: choiceResult.outcome,
      installed: choiceResult.outcome === 'accepted'
    }));
  }
}

export default BrowserAPIs;
export { ClipboardAPI, NotificationAPI, GeolocationAPI, StorageAPI };