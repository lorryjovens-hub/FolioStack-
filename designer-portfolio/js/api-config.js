// API配置 - 前后端一体化配置
const API_CONFIG = {
    // 根据环境自动选择API地址
    BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3003/api'
        : `${window.location.origin}/api`,
    
    // 获取存储的token
    getToken() {
        return localStorage.getItem('auth_token');
    },
    
    // 设置token
    setToken(token) {
        localStorage.setItem('auth_token', token);
    },
    
    // 清除token
    clearToken() {
        localStorage.removeItem('auth_token');
    },
    
    // 带认证的fetch请求
    async fetchWithAuth(url, options = {}) {
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        try {
            const response = await fetch(`${this.BASE_URL}${url}`, {
                ...options,
                headers
            });
            
            // 处理401错误
            if (response.status === 401) {
                this.clearToken();
                window.location.href = '/landing.html';
                return null;
            }
            
            return response;
        } catch (err) {
            console.error('API请求错误:', err);
            throw err;
        }
    },
    
    // GET请求
    async get(url) {
        return this.fetchWithAuth(url, { method: 'GET' });
    },
    
    // POST请求
    async post(url, data) {
        return this.fetchWithAuth(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    // PUT请求
    async put(url, data) {
        return this.fetchWithAuth(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    
    // PATCH请求
    async patch(url, data) {
        return this.fetchWithAuth(url, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    },
    
    // DELETE请求
    async delete(url) {
        return this.fetchWithAuth(url, { method: 'DELETE' });
    }
};

// 导出配置
window.API_CONFIG = API_CONFIG;
