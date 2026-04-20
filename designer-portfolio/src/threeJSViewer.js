/**
 * ThreeJS 3D Viewer - High-performance 3D model viewer using Three.js
 * Built-in support for Three.js from https://threejs.org/
 */

class ThreeJSViewer {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.model = null;
        this.animationId = null;
        this.isInitialized = false;
        this.modelMetadata = null;
        this.LOADER_CACHE = new Map();
    }

    async init(options = {}) {
        if (this.isInitialized) return;

        const width = options.width || this.container.clientWidth || 800;
        const height = options.height || this.container.clientHeight || 600;
        const backgroundColor = options.backgroundColor || 0x1a1a2e;
        const enableGrid = options.enableGrid !== false;
        const enableLights = options.enableLights !== false;

        await this.loadThreeJS();

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(backgroundColor);

        const aspect = width / height;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        this.camera.position.set(5, 5, 5);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        this.container.appendChild(this.renderer.domElement);

        if (enableLights) {
            this.setupLights();
        }

        if (enableGrid) {
            this.setupGrid();
        }

        this.setupControls();
        this.setupResizeHandler();

        this.isInitialized = true;
        this.animate();

        return this;
    }

    async loadThreeJS() {
        if (window.THREE) return;

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

        const moduleScript = document.createElement('script');
        moduleScript.type = 'module';

        await new Promise((resolve, reject) => {
            const threeScript = document.createElement('script');
            threeScript.src = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
            threeScript.onload = resolve;
            threeScript.onerror = reject;
            document.head.appendChild(threeScript);

            const orbitScript = document.createElement('script');
            orbitScript.src = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/controls/OrbitControls.js';
            orbitScript.onload = resolve;
            orbitScript.onerror = reject;
            document.head.appendChild(orbitScript);

            const loaders = [
                'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/loaders/GLTFLoader.js',
                'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/loaders/FBXLoader.js',
                'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/loaders/OBJLoader.js',
                'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/loaders/STLLoader.js',
                'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/loaders/3DMLoader.js',
                'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/loaders/ColladaLoader.js',
                'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/loaders/PLYLoader.js'
            ];

            let loadedCount = 0;
            loaders.forEach(src => {
                const s = document.createElement('script');
                s.src = src;
                s.onload = () => {
                    loadedCount++;
                    if (loadedCount === loaders.length) resolve();
                };
                s.onerror = () => {
                    loadedCount++;
                    if (loadedCount === loaders.length) resolve();
                };
                document.head.appendChild(s);
            });
        });
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.bottom = -20;
        this.scene.add(directionalLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-10, 5, -10);
        this.scene.add(fillLight);

        const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
        this.scene.add(hemisphereLight);
    }

    setupGrid() {
        const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
        gridHelper.position.y = 0;
        this.scene.add(gridHelper);

        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);
    }

    setupControls() {
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.screenSpacePanning = true;
            this.controls.minDistance = 1;
            this.controls.maxDistance = 100;
            this.controls.maxPolarAngle = Math.PI / 2;
        }
    }

    setupResizeHandler() {
        window.addEventListener('resize', () => {
            if (!this.camera || !this.renderer) return;
            const width = this.container.clientWidth;
            const height = this.container.clientHeight;
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        });
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        if (this.controls) {
            this.controls.update();
        }
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    async loadModel(file, format, onProgress) {
        if (!this.isInitialized) {
            await this.init();
        }

        if (this.model) {
            this.scene.remove(this.model);
            this.model = null;
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    this.model = await this.parseModel(arrayBuffer, format, onProgress);
                    this.centerAndScaleModel();
                    this.scene.add(this.model);
                    resolve(this.model);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    async parseModel(arrayBuffer, format, onProgress) {
        switch (format.toLowerCase()) {
            case 'obj':
                return await this.loadOBJ(arrayBuffer, onProgress);
            case 'gltf':
            case 'glb':
                return await this.loadGLTF(arrayBuffer, format, onProgress);
            case 'fbx':
                return await this.loadFBX(arrayBuffer, onProgress);
            case 'stl':
            case 'stl-binary':
            case 'stl-ascii':
                return await this.loadSTL(arrayBuffer, onProgress);
            case '3ds':
                return await this.load3DS(arrayBuffer, onProgress);
            case 'dae':
                return await this.loadDAE(arrayBuffer, onProgress);
            case 'ply':
                return await this.loadPLY(arrayBuffer, onProgress);
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }

    loadOBJ(arrayBuffer, onProgress) {
        return new Promise((resolve, reject) => {
            if (typeof THREE.OBJLoader === 'undefined') {
                reject(new Error('OBJLoader not loaded'));
                return;
            }

            const loader = new THREE.OBJLoader();
            const text = new TextDecoder().decode(arrayBuffer);
            const object = loader.parse(text);

            object.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshStandardMaterial({
                        color: 0x888888,
                        metalness: 0.3,
                        roughness: 0.7
                    });
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            resolve(object);
        });
    }

    loadGLTF(arrayBuffer, format, onProgress) {
        return new Promise((resolve, reject) => {
            if (typeof THREE.GLTFLoader === 'undefined') {
                reject(new Error('GLTFLoader not loaded'));
                return;
            }

            const loader = new THREE.GLTFLoader();
            const isGLB = format.toLowerCase() === 'glb';

            if (isGLB) {
                loader.parse(arrayBuffer, '', (gltf) => {
                    this.processGLTF(gltf);
                    resolve(gltf.scene);
                }, reject);
            } else {
                const text = new TextDecoder().decode(arrayBuffer);
                loader.parse(text, '', (gltf) => {
                    this.processGLTF(gltf);
                    resolve(gltf.scene);
                }, reject);
            }
        });
    }

    processGLTF(gltf) {
        gltf.scene.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }

    loadFBX(arrayBuffer, onProgress) {
        return new Promise((resolve, reject) => {
            if (typeof THREE.FBXLoader === 'undefined') {
                reject(new Error('FBXLoader not loaded'));
                return;
            }

            const loader = new THREE.FBXLoader();
            const object = loader.parse(arrayBuffer);

            object.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            resolve(object);
        });
    }

    loadSTL(arrayBuffer, onProgress) {
        return new Promise((resolve, reject) => {
            if (typeof THREE.STLLoader === 'undefined') {
                reject(new Error('STLLoader not loaded'));
                return;
            }

            const loader = new THREE.STLLoader();
            const geometry = loader.parse(arrayBuffer);
            const material = new THREE.MeshStandardMaterial({
                color: 0x888888,
                metalness: 0.3,
                roughness: 0.7
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            resolve(mesh);
        });
    }

    load3DS(arrayBuffer, onProgress) {
        return new Promise((resolve, reject) => {
            if (typeof THREE.TDSLoader === 'undefined') {
                reject(new Error('3DSLoader not loaded'));
                return;
            }

            const loader = new THREE.TDSLoader();
            const object = loader.parse(arrayBuffer);

            object.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            resolve(object);
        });
    }

    loadDAE(arrayBuffer, onProgress) {
        return new Promise((resolve, reject) => {
            if (typeof THREE.ColladaLoader === 'undefined') {
                reject(new Error('ColladaLoader not loaded'));
                return;
            }

            const loader = new THREE.ColladaLoader();
            const text = new TextDecoder().decode(arrayBuffer);
            loader.parse(text, (collada) => {
                collada.scene.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                resolve(collada.scene);
            }, reject);
        });
    }

    loadPLY(arrayBuffer, onProgress) {
        return new Promise((resolve, reject) => {
            if (typeof THREE.PLYLoader === 'undefined') {
                reject(new Error('PLYLoader not loaded'));
                return;
            }

            const loader = new THREE.PLYLoader();
            const geometry = loader.parse(arrayBuffer);
            const material = new THREE.MeshStandardMaterial({
                color: 0x888888,
                metalness: 0.3,
                roughness: 0.7,
                flatShading: true
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            resolve(mesh);
        });
    }

    centerAndScaleModel() {
        if (!this.model) return;

        const box = new THREE.Box3().setFromObject(this.model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 5 / maxDim;

        this.model.position.sub(center);
        this.model.scale.multiplyScalar(scale);

        this.modelMetadata = {
            center: center,
            size: size,
            scale: scale
        };

        if (this.controls) {
            this.controls.target.copy(center);
        }
    }

    setBackgroundColor(color) {
        if (this.scene) {
            this.scene.background = new THREE.Color(color);
        }
    }

    setCameraPosition(x, y, z) {
        if (this.camera) {
            this.camera.position.set(x, y, z);
            if (this.controls) {
                this.controls.update();
            }
        }
    }

    enableRotation(enable = true) {
        if (this.controls) {
            this.controls.enableRotate = enable;
        }
    }

    enableZoom(enable = true) {
        if (this.controls) {
            this.controls.enableZoom = enable;
        }
    }

    enablePan(enable = true) {
        if (this.controls) {
            this.controls.enablePan = enable;
        }
    }

    resetCamera() {
        this.camera.position.set(5, 5, 5);
        if (this.controls) {
            this.controls.target.set(0, 0, 0);
            this.controls.update();
        }
    }

    takeScreenshot(format = 'png', quality = 0.9) {
        if (!this.renderer) return null;

        this.renderer.render(this.scene, this.camera);
        const dataUrl = this.renderer.domElement.toDataURL(`image/${format}`, quality);
        return dataUrl;
    }

    getModelInfo() {
        if (!this.model) return null;

        const box = new THREE.Box3().setFromObject(this.model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        let vertexCount = 0;
        let faceCount = 0;
        let meshCount = 0;

        this.model.traverse((child) => {
            if (child.isMesh) {
                meshCount++;
                if (child.geometry) {
                    const positions = child.geometry.attributes.position;
                    if (positions) vertexCount += positions.count;
                    const indices = child.geometry.index;
                    if (indices) faceCount += indices.count / 3;
                    else if (positions) faceCount += positions.count / 3;
                }
            }
        });

        return {
            vertexCount,
            faceCount,
            meshCount,
            boundingBox: {
                min: { x: box.min.x, y: box.min.y, z: box.min.z },
                max: { x: box.max.x, y: box.max.y, z: box.max.z },
                size: { x: size.x, y: size.y, z: size.z }
            },
            metadata: this.modelMetadata
        };
    }

    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        if (this.controls) {
            this.controls.dispose();
        }

        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }

        if (this.model) {
            this.model.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.model = null;
        this.isInitialized = false;
    }
}

class ModelViewerManager {
    constructor() {
        this.viewers = new Map();
        this.formatExtensions = {
            'obj': 'obj',
            'gltf': 'gltf',
            'glb': 'glb',
            'fbx': 'fbx',
            'stl': 'stl',
            '3ds': '3ds',
            'dae': 'dae',
            'ply': 'ply'
        };
    }

    createViewer(containerId, options = {}) {
        const container = typeof containerId === 'string'
            ? document.getElementById(containerId)
            : containerId;

        if (!container) {
            throw new Error(`Container not found: ${containerId}`);
        }

        const viewer = new ThreeJSViewer(container);
        this.viewers.set(containerId, viewer);

        return viewer;
    }

    getViewer(containerId) {
        return this.viewers.get(containerId);
    }

    removeViewer(containerId) {
        const viewer = this.viewers.get(containerId);
        if (viewer) {
            viewer.dispose();
            this.viewers.delete(containerId);
        }
    }

    async loadModel(containerId, file, format, onProgress) {
        const viewer = this.viewers.get(containerId);
        if (!viewer) {
            throw new Error(`Viewer not found: ${containerId}`);
        }

        return await viewer.loadModel(file, format, onProgress);
    }

    getSupportedFormats() {
        return Object.keys(this.formatExtensions);
    }

    isFormatSupported(format) {
        return format.toLowerCase() in this.formatExtensions;
    }
}

const modelViewerManager = new ModelViewerManager();

export { ThreeJSViewer, ModelViewerManager, modelViewerManager };