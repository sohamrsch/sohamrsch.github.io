// 3D Model Viewer for PLY files using Three.js

let viewerGT, viewerPred;
let sceneGT, scenePred;
let cameraGT, cameraPred;
let rendererGT, rendererPred;
let controlsGT, controlsPred;
let currentModelGT, currentModelPred;

// Base path to PLY models (relative to index.html)
const MODEL_BASE_PATH = 'assets/models/';

// Initialize viewers on page load
document.addEventListener('DOMContentLoaded', function() {
    initViewers();
    loadSelectedModel();
});

function initViewers() {
    // Initialize Ground Truth viewer
    const containerGT = document.getElementById('viewer-gt');
    if (containerGT) {
        const result = createViewer(containerGT);
        viewerGT = result.renderer;
        sceneGT = result.scene;
        cameraGT = result.camera;
        rendererGT = result.renderer;
        controlsGT = result.controls;
    }

    // Initialize Prediction viewer
    const containerPred = document.getElementById('viewer-pred');
    if (containerPred) {
        const result = createViewer(containerPred);
        viewerPred = result.renderer;
        scenePred = result.scene;
        cameraPred = result.camera;
        rendererPred = result.renderer;
        controlsPred = result.controls;
    }

    // Start animation loop
    animate();
}

function createViewer(container) {
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 3);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(1, 1, 1);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-1, -1, -1);
    scene.add(directionalLight2);

    // Add a subtle gradient background
    const gradientCanvas = document.createElement('canvas');
    gradientCanvas.width = 2;
    gradientCanvas.height = 512;
    const ctx = gradientCanvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(gradientCanvas);
    scene.background = texture;

    // Handle resize
    window.addEventListener('resize', function() {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
    });

    return { scene, camera, renderer, controls };
}

function loadSelectedModel() {
    const select = document.getElementById('model-select');
    if (!select) return;

    const modelName = select.value;

    // Load Ground Truth model
    loadPLYModel(
        MODEL_BASE_PATH + modelName + '_gt.ply',
        sceneGT,
        cameraGT,
        controlsGT,
        (mesh) => {
            if (currentModelGT) sceneGT.remove(currentModelGT);
            currentModelGT = mesh;
            sceneGT.add(mesh);
        }
    );

    // Load Prediction model
    loadPLYModel(
        MODEL_BASE_PATH + modelName + '_pred.ply',
        scenePred,
        cameraPred,
        controlsPred,
        (mesh) => {
            if (currentModelPred) scenePred.remove(currentModelPred);
            currentModelPred = mesh;
            scenePred.add(mesh);
        }
    );
}

function loadPLYModel(url, scene, camera, controls, callback) {
    const loader = new THREE.PLYLoader();

    // Show loading indicator
    console.log('Loading model:', url);

    loader.load(
        url,
        function(geometry) {
            // Compute normals if not present
            geometry.computeVertexNormals();

            // Center the geometry
            geometry.computeBoundingBox();
            const center = new THREE.Vector3();
            geometry.boundingBox.getCenter(center);
            geometry.translate(-center.x, -center.y, -center.z);

            // Scale to fit view
            const size = new THREE.Vector3();
            geometry.boundingBox.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2 / maxDim;
            geometry.scale(scale, scale, scale);

            // Create material - use vertex colors if available
            let material;
            if (geometry.hasAttribute('color')) {
                material = new THREE.MeshPhongMaterial({
                    vertexColors: true,
                    side: THREE.DoubleSide,
                    shininess: 30
                });
            } else {
                material = new THREE.MeshPhongMaterial({
                    color: 0x4196c8,
                    side: THREE.DoubleSide,
                    shininess: 30
                });
            }

            const mesh = new THREE.Mesh(geometry, material);

            // Reset camera position
            camera.position.set(0, 0, 3);
            controls.reset();

            callback(mesh);
        },
        function(xhr) {
            // Progress callback
            if (xhr.lengthComputable) {
                const percentComplete = xhr.loaded / xhr.total * 100;
                console.log(Math.round(percentComplete) + '% loaded');
            }
        },
        function(error) {
            console.error('Error loading PLY model:', error);
            // Create a placeholder sphere if loading fails
            const geometry = new THREE.SphereGeometry(0.5, 32, 32);
            const material = new THREE.MeshPhongMaterial({ color: 0xff6b6b });
            const mesh = new THREE.Mesh(geometry, material);
            callback(mesh);
        }
    );
}

function animate() {
    requestAnimationFrame(animate);

    // Update controls
    if (controlsGT) controlsGT.update();
    if (controlsPred) controlsPred.update();

    // Render scenes
    if (rendererGT && sceneGT && cameraGT) {
        rendererGT.render(sceneGT, cameraGT);
    }
    if (rendererPred && scenePred && cameraPred) {
        rendererPred.render(scenePred, cameraPred);
    }
}

// Sync camera movements between viewers (optional - can be enabled)
function syncCameras() {
    if (controlsGT && controlsPred) {
        controlsGT.addEventListener('change', function() {
            cameraPred.position.copy(cameraGT.position);
            cameraPred.rotation.copy(cameraGT.rotation);
        });

        controlsPred.addEventListener('change', function() {
            cameraGT.position.copy(cameraPred.position);
            cameraGT.rotation.copy(cameraPred.rotation);
        });
    }
}

// Expose function globally for the select element
window.loadSelectedModel = loadSelectedModel;
