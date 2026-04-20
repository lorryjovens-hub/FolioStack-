/**
 * UploadJS - JavaScript fallback for file upload engine
 * This is used when WebAssembly is not available or fails to load
 */

class UploadJS {
    constructor() {
        this.CHUNK_SIZE = 5 * 1024 * 1024;
    }

    init() {
        console.log('[UploadJS] Initialized (JavaScript fallback)');
        return Promise.resolve(true);
    }

    computeSHA256(data) {
        if (typeof data === 'string') {
            data = new TextEncoder().encode(data);
        }
        return this._sha256(data);
    }

    _sha256(buffer) {
        async function digestMessage(message) {
            const msgBuffer = message instanceof ArrayBuffer ? message : message;
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }
        return digestMessage(buffer);
    }

    async computeSHA256Async(data) {
        return await this.computeSHA256(data);
    }

    verifyChunkHash(data, expectedHash) {
        const hash = this.computeSHA256(data);
        if (hash instanceof Promise) {
            return hash.then(h => h === expectedHash);
        }
        return hash === expectedHash;
    }

    createChunkHashes(data, chunkSize = this.CHUNK_SIZE) {
        if (typeof data === 'string') {
            data = new TextEncoder().encode(data);
        }

        const hashes = [];
        let index = 0;

        for (let i = 0; i < data.length; i += chunkSize) {
            const chunk = data.slice(i, i + chunkSize);
            const hash = this._sha256(chunk);
            hashes.push({
                index,
                size: chunk.length,
                hash: hash
            });
            index++;
        }

        return hashes;
    }

    computeFileHashFromChunks(hashes) {
        const combined = hashes.join('');
        const encoder = new TextEncoder();
        return this._sha256(encoder.encode(combined));
    }
}

class ChunkedUploaderJS {
    constructor(options = {}) {
        this.CHUNK_SIZE = options.chunkSize || 5 * 1024 * 1024;
        this.MAX_CONCURRENT = options.maxConcurrent || 3;
        this.API_BASE = options.apiBase || 'http://localhost:3002/api/media';
        this.uploadJS = new UploadJS();

        this.onProgress = options.onProgress || (() => {});
        this.onComplete = options.onComplete || (() => {});
        this.onError = options.onError || (() => {});
    }

    async init() {
        await this.uploadJS.init();
        return true;
    }

    async uploadFile(file, fileId = null) {
        const id = fileId || `${file.name}_${Date.now()}`;
        const totalChunks = Math.ceil(file.size / this.CHUNK_SIZE);
        const results = [];

        let bytesUploaded = 0;
        const startTime = Date.now();

        const uploadChunk = async (chunkIndex) => {
            const start = chunkIndex * this.CHUNK_SIZE;
            const end = Math.min(start + this.CHUNK_SIZE, file.size);
            const chunk = file.slice(start, end);

            const formData = new FormData();
            formData.append('chunk', chunk);
            formData.append('filename', file.name);
            formData.append('chunkIndex', chunkIndex.toString());
            formData.append('totalChunks', totalChunks.toString());
            formData.append('fileId', id);

            let retries = 3;
            while (retries > 0) {
                try {
                    const response = await fetch(`${this.API_BASE}/upload-chunk`, {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) throw new Error(`Chunk ${chunkIndex} upload failed`);

                    const result = await response.json();
                    bytesUploaded += chunk.size;

                    const elapsed = Date.now() - startTime;
                    const speed = elapsed > 0 ? (bytesUploaded / elapsed) * 1000 : 0;
                    const eta = speed > 0 ? ((file.size - bytesUploaded) / speed) : 0;

                    this.onProgress({
                        chunkIndex,
                        totalChunks,
                        bytesUploaded,
                        totalBytes: file.size,
                        percentage: (bytesUploaded / file.size) * 100,
                        speed,
                        eta
                    });

                    return result;
                } catch (error) {
                    retries--;
                    if (retries === 0) throw error;
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
        };

        const executing = [];
        const allPromises = [];

        for (let i = 0; i < totalChunks; i++) {
            const promise = uploadChunk(i)
                .then(result => ({ index: i, success: true, result }))
                .catch(error => ({ index: i, success: false, error: error.message }));

            allPromises.push(promise);

            if (this.MAX_CONCURRENT <= 1) {
                results.push(await promise);
            } else {
                results.push(promise);
                executing.push(promise);

                if (executing.length >= this.MAX_CONCURRENT) {
                    await Promise.race(executing);
                    const completedIdx = executing.findIndex(p => {
                        return p.then ? false : true;
                    });
                    if (completedIdx !== -1) {
                        executing.splice(completedIdx, 1);
                    }
                }
            }
        }

        if (this.MAX_CONCURRENT > 1) {
            await Promise.all(allPromises);
            results.forEach((p, i) => {
                if (p.then) {
                    results[i] = results[i].then ? null : p;
                }
            });
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
            const file = files[i];
            try {
                const result = await this.uploadFile(file);
                results.push({ file: file.name, success: true, result });
                if (onFileProgress) {
                    onFileProgress(i + 1, files.length, file.name);
                }
            } catch (error) {
                results.push({ file: file.name, success: false, error: error.message });
            }
        }

        return results;
    }
}

export { UploadJS, ChunkedUploaderJS };