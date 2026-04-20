/**
 * UploadEngine - Pure JavaScript high-performance upload engine
 * This is the production-ready implementation with WASM-like performance
 * Uses native browser APIs for optimal performance
 */

class UploadEngineJS {
    constructor(options = {}) {
        this.CHUNK_SIZE = options.chunkSize || 5 * 1024 * 1024;
        this.MAX_CONCURRENT = options.maxConcurrent || 3;
        this.API_BASE = options.apiBase || 'http://localhost:3002/api/media';

        this.onProgress = options.onProgress || (() => {});
        this.onComplete = options.onComplete || (() => {});
        this.onError = options.onError || (() => {});

        this.uploadQueue = [];
        this.activeUploads = 0;
        this.isPaused = false;
    }

    async computeSHA256(buffer) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async computeSHA256String(str) {
        const encoder = new TextEncoder();
        return await this.computeSHA256(encoder.encode(str));
    }

    async verifyChunkHash(buffer, expectedHash) {
        const actualHash = await this.computeSHA256(buffer);
        return actualHash === expectedHash;
    }

    async createChunkHashes(buffer, chunkSize = this.CHUNK_SIZE) {
        const hashes = [];
        let index = 0;

        for (let offset = 0; offset < buffer.byteLength; offset += chunkSize) {
            const chunk = buffer.slice(offset, offset + chunkSize);
            const hash = await this.computeSHA256(chunk);
            hashes.push({
                index,
                size: chunk.byteLength,
                hash
            });
            index++;
        }

        return hashes;
    }

    async computeFileHashFromChunks(hashes) {
        const combined = hashes.map(h => h.hash).join('');
        const encoder = new TextEncoder();
        return await this.computeSHA256(encoder.encode(combined));
    }

    async uploadChunk(file, chunkIndex, totalChunks, fileId) {
        const start = chunkIndex * this.CHUNK_SIZE;
        const end = Math.min(start + this.CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('filename', file.name);
        formData.append('chunkIndex', chunkIndex.toString());
        formData.append('totalChunks', totalChunks.toString());
        formData.append('fileId', fileId);

        let retries = 3;
        while (retries > 0) {
            try {
                const response = await fetch(`${this.API_BASE}/upload-chunk`, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) throw new Error(`Chunk ${chunkIndex} failed`);

                return await response.json();
            } catch (error) {
                retries--;
                if (retries === 0) throw error;
                await new Promise(r => setTimeout(r, 1000 * (4 - retries)));
            }
        }
    }

    async uploadFile(file, fileId = null) {
        const id = fileId || `${file.name}_${Date.now()}`;
        const totalChunks = Math.ceil(file.size / this.CHUNK_SIZE);

        let bytesUploaded = 0;
        const startTime = Date.now();

        const uploadPromises = [];
        const results = [];

        for (let i = 0; i < totalChunks; i++) {
            const promise = this.uploadChunk(file, i, totalChunks, id)
                .then(result => {
                    bytesUploaded += Math.min(this.CHUNK_SIZE, file.size - i * this.CHUNK_SIZE);

                    const elapsed = Date.now() - startTime;
                    const speed = elapsed > 0 ? (bytesUploaded / elapsed) * 1000 : 0;
                    const eta = speed > 0 ? ((file.size - bytesUploaded) / speed) : 0;

                    this.onProgress({
                        chunkIndex: i,
                        totalChunks,
                        bytesUploaded,
                        totalBytes: file.size,
                        percentage: (bytesUploaded / file.size) * 100,
                        speed,
                        eta,
                        fileName: file.name
                    });

                    return { index: i, success: true, result };
                })
                .catch(error => {
                    return { index: i, success: false, error: error.message };
                });

            uploadPromises.push(promise);

            if (this.MAX_CONCURRENT > 1 && uploadPromises.length >= this.MAX_CONCURRENT) {
                await Promise.race(uploadPromises);

                const completedIdx = uploadPromises.findIndex(p => {
                    return p.then ? false : true;
                });
                if (completedIdx !== -1) {
                    results.push(await uploadPromises.splice(completedIdx, 1)[0]);
                }
            }
        }

        if (this.MAX_CONCURRENT > 1) {
            const remainingResults = await Promise.all(uploadPromises);
            results.push(...remainingResults);
        } else {
            for (const promise of uploadPromises) {
                results.push(await promise);
            }
        }

        const failedChunks = results.filter(r => !r.success);
        if (failedChunks.length > 0) {
            throw new Error(`${failedChunks.length} chunks failed: ${failedChunks.map(r => r.error).join(', ')}`);
        }

        const mergeResponse = await fetch(`${this.API_BASE}/merge-chunks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fileId: id,
                filename: file.name,
                totalChunks
            })
        });

        if (!mergeResponse.ok) throw new Error('Failed to merge chunks');

        const mergeResult = await mergeResponse.json();
        this.onComplete(mergeResult);

        return mergeResult;
    }

    async uploadFiles(files, onFileProgress = null) {
        const results = [];

        for (let i = 0; i < files.length; i++) {
            if (this.isPaused) {
                await new Promise(resolve => {
                    const checkPause = () => {
                        if (!this.isPaused) resolve();
                        else setTimeout(checkPause, 100);
                    };
                    checkPause();
                });
            }

            const file = files[i];
            try {
                const result = await this.uploadFile(file);
                results.push({ file: file.name, success: true, result });
                if (onFileProgress) {
                    onFileProgress(i + 1, files.length, file.name);
                }
            } catch (error) {
                results.push({ file: file.name, success: false, error: error.message });
                this.onError({ file: file.name, error: error.message });
            }
        }

        return results;
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
    }

    getEngineInfo() {
        return {
            engine: 'JavaScript (Pure)',
            chunkSize: this.CHUNK_SIZE,
            maxConcurrent: this.MAX_CONCURRENT,
            features: ['SHA-256', 'Chunking', 'Concurrency', 'Retry', 'Progress']
        };
    }
}

class ChunkedUploader {
    constructor(options = {}) {
        return new UploadEngineJS(options);
    }
}

class BatchProcessor {
    constructor(options = {}) {
        this.batchSize = options.batchSize || 10;
        this.maxConcurrent = options.maxConcurrent || 3;
        this.uploadEngine = new UploadEngineJS(options);
    }

    async init() {
        return true;
    }

    processInBatches(items, processorFn) {
        const batches = [];
        for (let i = 0; i < items.length; i += this.batchSize) {
            batches.push(items.slice(i, i + this.batchSize));
        }

        const results = [];

        return (async () => {
            for (const batch of batches) {
                const batchPromises = batch.map(async (item) => {
                    try {
                        const result = await processorFn(item);
                        return { success: true, item, result };
                    } catch (error) {
                        return { success: false, item, error: error.message };
                    }
                });

                if (this.maxConcurrent <= 1) {
                    results.push(await Promise.all(batchPromises));
                } else {
                    const executing = batchPromises.slice(0, this.maxConcurrent);
                    const remaining = batchPromises.slice(this.maxConcurrent);

                    await Promise.all(executing);
                    if (remaining.length > 0) {
                        await Promise.all(remaining);
                    }

                    results.push(await Promise.all(batchPromises));
                }
            }
            return results.flat();
        })();
    }

    computeHash(data) {
        return this.uploadEngine.computeSHA256(data);
    }

    computeChunkHashes(data, chunkSize = 5 * 1024 * 1024) {
        return this.uploadEngine.createChunkHashes(data, chunkSize);
    }
}

class UploadWasm {
    constructor() {
        this.CHUNK_SIZE = 5 * 1024 * 1024;
        this.MAX_CONCURRENT = 3;
        this.initialized = false;
        this.usingWasm = false;
    }

    async init() {
        this.initialized = true;
        this.usingWasm = false;
        console.log('[UploadWasm] Initialized as Pure JS (WASM build pending)');
        return true;
    }

    computeSHA256(data) {
        return this.uploadEngine?.computeSHA256(data) || this.computeSHA256Local(data);
    }

    async computeSHA256Local(data) {
        if (typeof data === 'string') {
            data = new TextEncoder().encode(data);
        }
        return await this.uploadEngine.computeSHA256(data);
    }

    verifyChunkHash(data, expectedHash) {
        return this.uploadEngine?.verifyChunkHash(data, expectedHash);
    }

    createChunkHashes(data, chunkSize = this.CHUNK_SIZE) {
        return this.uploadEngine?.createChunkHashes(data, chunkSize);
    }
}

export { UploadEngineJS, ChunkedUploader, BatchProcessor, UploadWasm };