/**
 * uploadEngine - Unified file upload engine with WASM/JS fallback
 * Automatically selects the best available implementation
 */

import { UploadWasm, ChunkedUploader as ChunkedUploaderWasm, BatchProcessor as BatchProcessorWasm } from './uploadWasm.js';
import { UploadJS, ChunkedUploaderJS } from './uploadJS.js';

const USE_WASM_KEY = 'upload_engine_use_wasm';

class UploadEngine {
    constructor(options = {}) {
        this.options = {
            useWasm: true,
            chunkSize: options.chunkSize || 5 * 1024 * 1024,
            maxConcurrent: options.maxConcurrent || 3,
            apiBase: options.apiBase || 'http://localhost:3002/api/media',
            ...options
        };

        this.uploadWasm = null;
        this.uploadJS = null;
        this.currentEngine = null;
        this.isInitialized = false;
        this.wasmAvailable = false;
    }

    async init() {
        if (this.isInitialized) return this.currentEngine !== null;

        if (this.options.useWasm) {
            try {
                this.uploadWasm = new ChunkedUploaderWasm({
                    chunkSize: this.options.chunkSize,
                    maxConcurrent: this.options.maxConcurrent,
                    apiBase: this.options.apiBase,
                    onProgress: this.options.onProgress,
                    onComplete: this.options.onComplete,
                    onError: this.options.onError
                });

                const wasmInitialized = await this.uploadWasm.init();
                if (wasmInitialized) {
                    this.currentEngine = this.uploadWasm;
                    this.wasmAvailable = true;
                    localStorage.setItem(USE_WASM_KEY, 'true');
                    console.log('[UploadEngine] Using WebAssembly engine');
                    this.isInitialized = true;
                    return true;
                }
            } catch (error) {
                console.warn('[UploadEngine] WASM initialization failed, falling back to JS:', error);
            }
        }

        console.log('[UploadEngine] Using JavaScript engine');
        this.uploadJS = new ChunkedUploaderJS({
            chunkSize: this.options.chunkSize,
            maxConcurrent: this.options.maxConcurrent,
            apiBase: this.options.apiBase,
            onProgress: this.options.onProgress,
            onComplete: this.options.onComplete,
            onError: this.options.onError
        });

        await this.uploadJS.init();
        this.currentEngine = this.uploadJS;
        this.wasmAvailable = false;
        this.isInitialized = true;
        return true;
    }

    async uploadFile(file, fileId = null) {
        if (!this.isInitialized) {
            await this.init();
        }
        return await this.currentEngine.uploadFile(file, fileId);
    }

    async uploadFiles(files, onFileProgress = null) {
        if (!this.isInitialized) {
            await this.init();
        }
        return await this.currentEngine.uploadFiles(files, onFileProgress);
    }

    isUsingWasm() {
        return this.wasmAvailable;
    }

    getEngineInfo() {
        return {
            usingWasm: this.wasmAvailable,
            engine: this.wasmAvailable ? 'WebAssembly' : 'JavaScript',
            chunkSize: this.options.chunkSize,
            maxConcurrent: this.options.maxConcurrent
        };
    }
}

export { UploadEngine, UploadWasm, ChunkedUploaderWasm, BatchProcessorWasm, UploadJS, ChunkedUploaderJS };