/**
 * Model3DProcessor - Unified 3D model processing engine
 * Combines WASM-based metadata extraction with Three.js rendering
 */

import { UploadEngineJS } from './uploadEnginePure.js';
import { ThreeJSViewer, modelViewerManager } from './threeJSViewer.js';

class Model3DProcessor {
    constructor(options = {}) {
        this.uploadEngine = new UploadEngineJS(options);
        this.viewer = null;
        this.currentFile = null;
        this.currentFormat = null;
        this.metadata = null;
        this.isProcessing = false;

        this.onMetadataExtracted = options.onMetadataExtracted || (() => {});
        this.onModelLoaded = options.onModelLoaded || (() => {});
        this.onProgress = options.onProgress || (() => {});
        this.onError = options.onError || (() => {});
    }

    getSupportedFormats() {
        return [
            { ext: 'obj', name: 'Wavefront OBJ', mime: 'model/obj' },
            { ext: 'gltf', name: 'GL Transmission Format', mime: 'model/gltf+json' },
            { ext: 'glb', name: 'GL Binary', mime: 'model/gltf-binary' },
            { ext: 'fbx', name: 'Filmbox FBX', mime: 'model/fbx' },
            { ext: 'stl', name: 'Stereolithography STL', mime: 'model/stl' },
            { ext: '3ds', name: '3D Studio MAX', mime: 'model/3ds' },
            { ext: 'dae', name: 'COLLADA', mime: 'model/vnd.collada+xml' },
            { ext: 'ply', name: 'Polygon PLY', mime: 'model/ply' }
        ];
    }

    is3DFormat(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const supported = this.getSupportedFormats();
        return supported.some(f => f.ext === ext);
    }

    getFormatFromFilename(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const formatMap = {
            'obj': 'obj',
            'gltf': 'gltf',
            'glb': 'glb',
            'fbx': 'fbx',
            'stl': 'stl',
            '3ds': '3ds',
            'dae': 'collada',
            'ply': 'ply'
        };
        return formatMap[ext] || ext;
    }

    async extractMetadata(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const data = new Uint8Array(arrayBuffer);
            const format = this.getFormatFromFilename(file.name);

            const metadata = {
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                format: format,
                formatDisplayName: this.getFormatDisplayName(format),
                lastModified: file.lastModified,
                estimatedVertices: 0,
                estimatedFaces: 0,
                hasNormals: false,
                hasTextures: false,
                hasMaterials: false,
                boundingBox: null,
                processingTime: 0
            };

            const startTime = performance.now();

            if (typeof window !== 'undefined' && window.UploadWasm && window.UploadWasm.initialized) {
                try {
                    const wasmMetadata = window.UploadWasm.extract3DMetaData(file.name, data);
                    if (wasmMetadata) {
                        Object.assign(metadata, wasmMetadata);
                    }
                } catch (e) {
                    console.warn('WASM metadata extraction failed, using JS fallback:', e);
                }
            } else {
                const jsMetadata = await this.extractMetadataJS(file.name, data, format);
                Object.assign(metadata, jsMetadata);
            }

            metadata.processingTime = performance.now() - startTime;
            this.metadata = metadata;
            this.onMetadataExtracted(metadata);

            return metadata;
        } catch (error) {
            this.onError({ type: 'metadata', error: error.message });
            throw error;
        }
    }

    async extractMetadataJS(filename, data, format) {
        const metadata = {
            estimatedVertices: 0,
            estimatedFaces: 0,
            hasNormals: false,
            hasTextures: false,
            hasMaterials: false,
            boundingBox: null
        };

        switch (format) {
            case 'obj':
                return this.parseOBJMetadata(data);
            case 'glb':
                return this.parseGLBMetadata(data);
            case 'stl':
                return this.parseSTLMetadata(data);
            case 'gltf':
                return this.parseGLTFMetadata(data);
            case 'ply':
                return this.parsePLYMetadata(data);
            default:
                return metadata;
        }
    }

    parseOBJMetadata(data) {
        const text = new TextDecoder().decode(data);
        let vertices = 0;
        let normals = 0;
        let texcoords = 0;
        let faces = 0;
        let hasMaterials = false;
        let minX = Infinity;
        let minY = Infinity;
        let minZ = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        let maxZ = -Infinity;

        const lines = text.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('v ')) {
                vertices++;
                const parts = trimmed.split(/\s+/);
                if (parts.length >= 4) {
                    const x = parseFloat(parts[1]);
                    const y = parseFloat(parts[2]);
                    const z = parseFloat(parts[3]);
                    if (!isNaN(x)) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
                    if (!isNaN(y)) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
                    if (!isNaN(z)) { minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
                }
            } else if (trimmed.startsWith('vn ')) {
                normals++;
            } else if (trimmed.startsWith('vt ')) {
                texcoords++;
            } else if (trimmed.startsWith('f ')) {
                faces++;
            } else if (trimmed.startsWith('mtllib ')) {
                hasMaterials = true;
            }
        }

        return {
            estimatedVertices: vertices,
            estimatedFaces: faces,
            hasNormals: normals > 0,
            hasTextures: texcoords > 0,
            hasMaterials: hasMaterials,
            boundingBox: (minX !== Infinity) ? {
                min: { x: minX, y: minY, z: minZ },
                max: { x: maxX, y: maxY, z: maxZ }
            } : null
        };
    }

    parseGLBMetadata(data) {
        if (data.length < 12) return {};

        const view = new DataView(data.buffer);
        const magic = view.getUint32(0, true);
        if (magic !== 0x46546C67) return {};

        const chunkLength = view.getUint32(12, true);
        const chunkType = view.getUint32(16, true);

        if (chunkType !== 0x4E4F534A) return {};

        const jsonChunk = new Uint8Array(data.buffer, 20, chunkLength);
        const jsonText = new TextDecoder().decode(jsonChunk);

        return {
            hasNormals: jsonText.includes('"NORMAL"'),
            hasTextures: jsonText.includes('"TEXCOORD_0"'),
            hasMaterials: jsonText.includes('"materials"'),
            estimatedVertices: (jsonText.match(/"primitives"/g) || []).length * 1000,
            estimatedFaces: (jsonText.match(/"primitives"/g) || []).length * 500
        };
    }

    parseSTLMetadata(data) {
        if (data.length < 84) return {};

        const view = new DataView(data.buffer);
        const triangleCount = view.getUint32(80, true);

        return {
            estimatedVertices: triangleCount * 3,
            estimatedFaces: triangleCount,
            hasNormals: true,
            hasTextures: false,
            hasMaterials: false
        };
    }

    parseGLTFMetadata(data) {
        const text = new TextDecoder().decode(data);

        return {
            hasNormals: text.includes('"NORMAL"'),
            hasTextures: text.includes('"TEXCOORD_0"'),
            hasMaterials: text.includes('"materials"'),
            estimatedVertices: (text.match(/"mesh"/g) || []).length * 1000,
            estimatedFaces: (text.match(/"mesh"/g) || []).length * 500
        };
    }

    parsePLYMetadata(data) {
        const text = new TextDecoder().decode(data);
        let vertexCount = 0;
        let faceCount = 0;
        let hasNormals = false;
        let hasTextures = false;

        const lines = text.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('element vertex')) {
                vertexCount = parseInt(trimmed.split(/\s+/)[2], 10) || 0;
            } else if (trimmed.startsWith('element face')) {
                faceCount = parseInt(trimmed.split(/\s+/)[2], 10) || 0;
            } else if (trimmed.includes('nx') || trimmed.includes('ny')) {
                hasNormals = true;
            } else if (trimmed.includes('s ') || trimmed.includes('t ')) {
                hasTextures = true;
            }
        }

        return {
            estimatedVertices: vertexCount,
            estimatedFaces: faceCount,
            hasNormals: hasNormals,
            hasTextures: hasTextures
        };
    }

    getFormatDisplayName(format) {
        const names = {
            'obj': 'Wavefront OBJ',
            'gltf': 'GL Transmission Format',
            'glb': 'GL Binary',
            'fbx': 'Filmbox FBX',
            'stl': 'Stereolithography STL',
            '3ds': '3D Studio MAX',
            'collada': 'COLLADA',
            'ply': 'Polygon PLY'
        };
        return names[format] || format.toUpperCase();
    }

    async initViewer(container, options) {
        this.viewer = new ThreeJSViewer(container);
        await this.viewer.init(options);
        return this.viewer;
    }

    async loadModel(file, options) {
        if (!this.viewer) {
            throw new Error('Viewer not initialized. Call initViewer() first.');
        }

        this.isProcessing = true;
        this.currentFile = file;
        this.currentFormat = this.getFormatFromFilename(file.name);

        try {
            await this.extractMetadata(file);

            const model = await this.viewer.loadModel(
                file,
                this.currentFormat,
                (progress) => {
                    this.onProgress({
                        stage: 'loading',
                        progress: progress.loaded / progress.total * 100,
                        ...progress
                    });
                }
            );

            this.isProcessing = false;
            this.onModelLoaded({
                model,
                metadata: this.metadata,
                viewer: this.viewer
            });

            return { model, metadata: this.metadata, viewer: this.viewer };
        } catch (error) {
            this.isProcessing = false;
            this.onError({ type: 'loading', error: error.message });
            throw error;
        }
    }

    async uploadAndLoad(file, container, uploadOptions, viewerOptions) {
        await this.initViewer(container, viewerOptions);

        const uploadResult = await this.uploadEngine.uploadFile(file);

        await this.loadModel(file, viewerOptions);

        return {
            upload: uploadResult,
            model: this.viewer.model,
            metadata: this.metadata
        };
    }

    takeScreenshot(format) {
        if (!this.viewer) return null;
        return this.viewer.takeScreenshot(format);
    }

    getModelInfo() {
        if (!this.viewer) return null;
        return this.viewer.getModelInfo();
    }

    dispose() {
        if (this.viewer) {
            this.viewer.dispose();
            this.viewer = null;
        }
        this.currentFile = null;
        this.currentFormat = null;
        this.metadata = null;
        this.isProcessing = false;
    }
}

class ModelGallery {
    constructor(container, options) {
        this.container = typeof container === 'string'
            ? document.getElementById(container)
            : container;
        this.options = options || {};
        this.models = [];
        this.processor = new Model3DProcessor(options);
        this.currentIndex = -1;
    }

    async addModel(file, metadata) {
        const modelData = {
            file: file,
            name: file.name,
            format: this.processor.getFormatFromFilename(file.name),
            size: file.size,
            thumbnail: null,
            metadata: metadata || {},
            viewer: null
        };

        this.models.push(modelData);
        return this.renderItem(this.models.length - 1);
    }

    renderItem(index) {
        const model = this.models[index];
        const item = document.createElement('div');
        item.className = 'model-gallery-item';
        item.dataset.index = index;

        const preview = document.createElement('div');
        preview.className = 'model-preview';
        preview.innerHTML = '<span class="format-badge">' + model.format.toUpperCase() + '</span>';

        const info = document.createElement('div');
        info.className = 'model-info';
        info.innerHTML = '<div class="model-name">' + model.name + '</div><div class="model-size">' + this.formatSize(model.size) + '</div>';

        item.appendChild(preview);
        item.appendChild(info);

        item.addEventListener('click', () => this.selectModel(index));

        if (this.container) {
            this.container.appendChild(item);
        }

        return item;
    }

    async selectModel(index) {
        if (index < 0 || index >= this.models.length) return;

        this.currentIndex = index;
        const model = this.models[index];

        if (!model.viewer && this.options.viewerContainer) {
            model.viewer = new ThreeJSViewer(this.options.viewerContainer);
            await model.viewer.init();
            await model.viewer.loadModel(model.file, model.format);
        }

        document.querySelectorAll('.model-gallery-item').forEach((el, i) => {
            el.classList.toggle('active', i === index);
        });

        return model;
    }

    formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    removeModel(index) {
        if (index < 0 || index >= this.models.length) return;
        this.models.splice(index, 1);
        if (this.currentIndex >= index) {
            this.currentIndex = Math.max(0, this.currentIndex - 1);
        }
    }

    dispose() {
        this.models.forEach(m => {
            if (m.viewer) m.viewer.dispose();
        });
        this.models = [];
        this.processor.dispose();
    }
}

export { Model3DProcessor, ModelGallery, modelViewerManager };