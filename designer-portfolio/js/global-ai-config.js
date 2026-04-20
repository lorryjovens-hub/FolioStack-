class GlobalAIConfig {
    constructor() {
        this.configKey = 'global_ai_config';
        this.defaultConfig = {
            provider: 'volcengine',
            apiKey: 'b7055639-09d4-415e-8d11-0b528aec77af',
            baseUrl: 'https://ark.cn-beijing.volces.com/api/coding/v1/messages',
            modelId: 'doubao-seed-2.0-code',
            maxTokens: 10000
        };
        this.init();
    }

    init() {
        if (!localStorage.getItem(this.configKey)) {
            this.save(this.defaultConfig);
        }
    }

    get() {
        const stored = localStorage.getItem(this.configKey);
        return stored ? JSON.parse(stored) : this.defaultConfig;
    }

    save(config) {
        localStorage.setItem(this.configKey, JSON.stringify({
            ...this.defaultConfig,
            ...config
        }));
        this.broadcast(config);
    }

    broadcast(config) {
        const event = new CustomEvent('aiConfigChanged', { detail: config });
        window.dispatchEvent(event);
    }

    subscribe(callback) {
        const handler = (e) => callback(e.detail);
        window.addEventListener('aiConfigChanged', handler);
        return () => window.removeEventListener('aiConfigChanged', handler);
    }

    getProviderConfig(provider) {
        const configs = {
            openai: {
                endpoint: 'https://api.openai.com/v1/chat/completions',
                model: 'gpt-4',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer {apiKey}'
                }
            },
            anthropic: {
                endpoint: 'https://api.anthropic.com/v1/messages',
                model: 'claude-3-opus-20240229',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': '{apiKey}',
                    'anthropic-version': '2023-06-01'
                }
            },
            google: {
                endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{modelId}:generateContent',
                model: 'gemini-pro',
                headers: {
                    'Content-Type': 'application/json'
                }
            },
            zhipu: {
                endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
                model: 'glm-4',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer {apiKey}'
                }
            },
            volcengine: {
                endpoint: 'https://ark.cn-beijing.volces.com/api/coding/v1/messages',
                model: 'doubao-seed-2.0-code',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer {apiKey}'
                }
            },
            minimax: {
                endpoint: 'https://api.minimax.chat/v1/text/chatcompletion_pro',
                model: 'abab6-chat',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer {apiKey}'
                }
            },
            kimi: {
                endpoint: 'https://api.moonshot.cn/v1/chat/completions',
                model: 'moonshot-v1-8k',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer {apiKey}'
                }
            },
            aliyun: {
                endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
                model: 'qwen-max',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer {apiKey}'
                }
            }
        };
        return configs[provider] || configs.volcengine;
    }
}

const globalAIConfig = new GlobalAIConfig();

if (typeof window !== 'undefined') {
    window.GlobalAIConfig = GlobalAIConfig;
    window.globalAIConfig = globalAIConfig;
}
