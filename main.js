// ============================================
// 3D Lotus Flower - Touch & Mobile Support
// Warm atmosphere with DOF effect
// ============================================

window.bloomProgress = 0;
window.targetBloom = 0;

let scene, camera, renderer, clock;
let flower;
let fallingPetals = [];
let clouds = [];
let raycaster, mouse;
let bgm; // Background music

// Wind effect parameters
const wind = {
    strength: 0,
    targetStrength: 0,
    direction: 0,
    gustTimer: 0,
    gustInterval: 3 + Math.random() * 4, // Random interval between gusts
    maxStrength: 0.15,
    minStrength: 0.02
};

const colors = {
    petalTip: 0xfff5f8,
    petalMid: 0xffcdd9,
    petalBase: 0xf8a5b8,
    petalInner: 0xe87a96,
    centerYellow: 0xffd700,
    centerOrange: 0xff8c00,
    stem: 0x4a6741
};

// Leaf configurations - adjust these values to customize each leaf
const leaf1Config = {
    length: 0.35, // Panjang daun
    width: 0.15, // Lebar daun
    stemPosition: 0.7, // Posisi pada tangkai (0-1, 0=bawah, 1=atas)
    offsetDistance: 0.03, // Jarak dari tangkai
    side: 1, // Sisi: 1 = kanan, -1 = kiri
    tiltAngle: 0.8, // Sudut kemiringan ke bawah
    twistAngle: 1.28, // Sudut putar/twist
    color: 0x4a6741 // Warna daun
};

const leaf2Config = {
    length: 0.28, // Panjang daun
    width: 0.12, // Lebar daun
    stemPosition: 0.6, // Posisi pada tangkai (0-1, 0=bawah, 1=atas)
    offsetDistance: 0.03, // Jarak dari tangkai
    side: -1, // Sisi: 1 = kanan, -1 = kiri
    tiltAngle: 1, // Sudut kemiringan ke bawah
    twistAngle: 0.6, // Sudut putar/twist
    color: 0x3d5c3d // Warna daun
};

function init() {
    scene = new THREE.Scene();

    // Warm sunset/golden hour background
    scene.background = new THREE.Color(0xffecd2);
    scene.fog = new THREE.FogExp2(0xffecd2, 0.15); // Stronger fog for DOF effect

    // Closer camera with narrower FOV for more intimate view
    camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.5, 200);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    document.getElementById("canvas-container").appendChild(renderer.domElement);

    clock = new THREE.Clock();
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    setupOrbitControls();
    setupLighting();
    createSkyGradient();
    createClouds();

    flower = createFlower();
    window.flower = flower;
    scene.add(flower);

    createGround();
    createFallingPetals();

    window.addEventListener("resize", onWindowResize);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("click", onMouseClick);

    // Touch support for tap to bloom
    window.addEventListener("touchend", onTouchEnd);

    // Add blur to canvas during loading
    document.getElementById("canvas-container").classList.add("blur");

    // Setup BGM
    bgm = new Audio("bgm.mp3");
    bgm.loop = true;
    bgm.volume = 0.5;
    window.bgm = bgm; // Make globally accessible for entrance screen

    // Make startLoading globally accessible
    window.startLoading = startLoading;

    animate();
}

// Loading bar animation - called when user clicks enter
function startLoading() {
    const loadingBarFill = document.getElementById("loading-bar-fill");
    const loadingDuration = 2000; // 2 seconds
    const startTime = Date.now();

    function updateLoadingBar() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / loadingDuration) * 100, 100);
        loadingBarFill.style.width = progress + "%";

        if (elapsed < loadingDuration) {
            requestAnimationFrame(updateLoadingBar);
        } else {
            // Hide loading after 2 seconds
            document.getElementById("loading").classList.add("hidden");
            document.getElementById("loading-overlay").classList.add("hidden");
            document.getElementById("canvas-container").classList.remove("blur");

            // Start BGM after loading (requires user interaction first)
            startBGM();
        }
    }
    updateLoadingBar();
}

// ============================================
// ORBIT CONTROLS WITH TOUCH SUPPORT
// ============================================
function setupOrbitControls() {
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let spherical = { theta: 0, phi: Math.PI / 2.8, radius: 2.8 }; // Closer to flower
    const target = new THREE.Vector3(0, 2.0, 0);

    // For pinch zoom
    let initialPinchDistance = 0;

    function updateCamera() {
        camera.position.x =
            target.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
        camera.position.y = target.y + spherical.radius * Math.cos(spherical.phi);
        camera.position.z =
            target.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
        camera.lookAt(target);
    }
    updateCamera();

    // Mouse events
    renderer.domElement.addEventListener("mousedown", (e) => {
        if (e.button === 0) {
            isDragging = true;
            prevMouse = { x: e.clientX, y: e.clientY };
        }
    });
    renderer.domElement.addEventListener("mouseup", () => (isDragging = false));
    renderer.domElement.addEventListener("mouseleave", () => (isDragging = false));
    renderer.domElement.addEventListener("mousemove", (e) => {
        if (isDragging) {
            spherical.theta -= (e.clientX - prevMouse.x) * 0.01;
            spherical.phi = Math.max(
                0.3,
                Math.min(Math.PI - 0.3, spherical.phi + (e.clientY - prevMouse.y) * 0.01)
            );
            updateCamera();
            prevMouse = { x: e.clientX, y: e.clientY };
        }
    });
    renderer.domElement.addEventListener(
        "wheel",
        (e) => {
            spherical.radius = Math.max(1.5, Math.min(8, spherical.radius + e.deltaY * 0.003));
            updateCamera();
            e.preventDefault();
        },
        { passive: false }
    );

    // Touch events for mobile
    renderer.domElement.addEventListener(
        "touchstart",
        (e) => {
            if (e.touches.length === 1) {
                isDragging = true;
                prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2) {
                // Pinch start
                isDragging = false;
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
            }
        },
        { passive: true }
    );

    renderer.domElement.addEventListener(
        "touchmove",
        (e) => {
            if (e.touches.length === 1 && isDragging) {
                // Single touch - rotate
                const touch = e.touches[0];
                spherical.theta -= (touch.clientX - prevMouse.x) * 0.008;
                spherical.phi = Math.max(
                    0.3,
                    Math.min(Math.PI - 0.3, spherical.phi + (touch.clientY - prevMouse.y) * 0.008)
                );
                updateCamera();
                prevMouse = { x: touch.clientX, y: touch.clientY };
            } else if (e.touches.length === 2) {
                // Pinch zoom
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const currentDistance = Math.sqrt(dx * dx + dy * dy);
                const delta = initialPinchDistance - currentDistance;
                spherical.radius = Math.max(1.5, Math.min(8, spherical.radius + delta * 0.01));
                initialPinchDistance = currentDistance;
                updateCamera();
            }
            e.preventDefault();
        },
        { passive: false }
    );

    renderer.domElement.addEventListener("touchend", () => {
        isDragging = false;
    });
}

// ============================================
// WARM LIGHTING
// ============================================
function setupLighting() {
    // Warm ambient
    scene.add(new THREE.AmbientLight(0xfff8e7, 0.6));

    // Golden sun light
    const sun = new THREE.DirectionalLight(0xffd89b, 1.2);
    sun.position.set(3, 8, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    scene.add(sun);

    // Warm fill light
    const fill = new THREE.DirectionalLight(0xffb347, 0.4);
    fill.position.set(-5, 3, -3);
    scene.add(fill);

    // Subtle rim light
    const rim = new THREE.DirectionalLight(0xffecd2, 0.3);
    rim.position.set(0, 5, -5);
    scene.add(rim);
}

// ============================================
// SKY GRADIENT (Simple dome)
// ============================================
function createSkyGradient() {
    const skyGeo = new THREE.SphereGeometry(50, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
        uniforms: {
            topColor: { value: new THREE.Color(0x87ceeb) }, // Light blue
            bottomColor: { value: new THREE.Color(0xffecd2) }, // Warm cream
            offset: { value: 10 },
            exponent: { value: 0.6 }
        },
        vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            uniform float offset;
            uniform float exponent;
            varying vec3 vWorldPosition;
            void main() {
                float h = normalize(vWorldPosition + offset).y;
                gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
            }
        `,
        side: THREE.BackSide
    });
    scene.add(new THREE.Mesh(skyGeo, skyMat));

    // Add mountains
    createMountains();
}

// ============================================
// MOUNTAINS - Background mountains
// ============================================
function createMountains() {
    const mountainGroup = new THREE.Group();

    // Mountain configurations - position, scale, color
    const mountainConfigs = [
        // Back mountains (far, larger, lighter/misty)
        { x: 0, z: -45, scaleX: 18, scaleY: 12, scaleZ: 8, color: 0x7a9bb5, opacity: 0.7 },
        { x: -25, z: -42, scaleX: 15, scaleY: 10, scaleZ: 7, color: 0x8aabbb, opacity: 0.65 },
        { x: 25, z: -40, scaleX: 14, scaleY: 9, scaleZ: 6, color: 0x8aa5b8, opacity: 0.7 },
        { x: -40, z: -38, scaleX: 12, scaleY: 8, scaleZ: 6, color: 0x9ab5c5, opacity: 0.6 },
        { x: 40, z: -35, scaleX: 13, scaleY: 7, scaleZ: 5, color: 0x95b0c0, opacity: 0.65 },

        // Mid mountains (medium distance, darker)
        { x: -15, z: -32, scaleX: 10, scaleY: 7, scaleZ: 5, color: 0x6a8a7a, opacity: 0.8 },
        { x: 18, z: -30, scaleX: 9, scaleY: 6, scaleZ: 4, color: 0x5a7a6a, opacity: 0.85 },
        { x: -35, z: -28, scaleX: 8, scaleY: 5, scaleZ: 4, color: 0x5a8070, opacity: 0.8 },
        { x: 35, z: -26, scaleX: 7, scaleY: 5, scaleZ: 4, color: 0x608575, opacity: 0.85 },

        // Side mountains (left and right)
        { x: -45, z: -15, scaleX: 10, scaleY: 8, scaleZ: 8, color: 0x6a8a7a, opacity: 0.75 },
        { x: 45, z: -10, scaleX: 9, scaleY: 7, scaleZ: 7, color: 0x5a7a6a, opacity: 0.8 },
        { x: -48, z: 5, scaleX: 8, scaleY: 6, scaleZ: 6, color: 0x5a8070, opacity: 0.7 },
        { x: 48, z: 10, scaleX: 7, scaleY: 5, scaleZ: 5, color: 0x608575, opacity: 0.75 }
    ];

    mountainConfigs.forEach((config) => {
        const mountain = createMountain(config);
        mountainGroup.add(mountain);
    });

    scene.add(mountainGroup);
}

function createMountain(config) {
    // Create mountain using cone geometry with some randomness
    const geometry = new THREE.ConeGeometry(1, 1, 6, 4);

    // Distort vertices for natural look
    const pos = geometry.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);

        // Add noise to make it look natural
        if (y > -0.4) {
            // Don't distort the base too much
            pos.setX(i, x + (Math.random() - 0.5) * 0.15);
            pos.setZ(i, z + (Math.random() - 0.5) * 0.15);
        }
        // Add some variation to height
        if (y > 0.3) {
            pos.setY(i, y + (Math.random() - 0.5) * 0.1);
        }
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
        color: config.color,
        roughness: 0.9,
        metalness: 0.0,
        transparent: true,
        opacity: config.opacity,
        flatShading: true
    });

    const mountain = new THREE.Mesh(geometry, material);
    mountain.position.set(config.x, config.scaleY / 2 - 0.5, config.z);
    mountain.scale.set(config.scaleX, config.scaleY, config.scaleZ);
    mountain.rotation.y = Math.random() * Math.PI * 2;

    return mountain;
}

// ============================================
// CLOUDS
// ============================================
function createClouds() {
    const cloudCount = 15;

    for (let i = 0; i < cloudCount; i++) {
        const cloud = createCloud();

        // Position clouds in a dome pattern
        const angle = Math.random() * Math.PI * 2;
        const radius = 15 + Math.random() * 25;
        const height = 8 + Math.random() * 15;

        cloud.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);

        cloud.rotation.y = Math.random() * Math.PI * 2;

        const scale = 1.5 + Math.random() * 2;
        cloud.scale.set(scale, scale * 0.6, scale);

        cloud.userData = {
            speed: 0.005 + Math.random() * 0.01,
            angle: angle,
            radius: radius,
            baseY: height
        };

        clouds.push(cloud);
        scene.add(cloud);
    }
}

function createCloud() {
    const cloud = new THREE.Group();

    const cloudMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.85,
        roughness: 1,
        flatShading: true
    });

    // Create puffy cloud from multiple spheres
    const puffCount = 5 + Math.floor(Math.random() * 4);

    for (let i = 0; i < puffCount; i++) {
        const size = 0.8 + Math.random() * 1.2;
        const puff = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 6), cloudMaterial);

        puff.position.set(
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 0.8,
            (Math.random() - 0.5) * 2
        );

        puff.scale.y = 0.6 + Math.random() * 0.3;

        cloud.add(puff);
    }

    return cloud;
}

// ============================================
// GROUND - Grass Terrain
// ============================================
function createGrassTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    // Base grass color
    ctx.fillStyle = "#4a7c3f";
    ctx.fillRect(0, 0, 256, 256);

    // Add grass variation
    for (let i = 0; i < 5000; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const length = Math.random() * 8 + 3;
        const brightness = Math.random();

        if (brightness > 0.6) {
            ctx.strokeStyle = `rgba(90, 150, 70, ${Math.random() * 0.7})`;
        } else if (brightness > 0.3) {
            ctx.strokeStyle = `rgba(60, 110, 50, ${Math.random() * 0.6})`;
        } else {
            ctx.strokeStyle = `rgba(80, 130, 60, ${Math.random() * 0.5})`;
        }

        ctx.lineWidth = Math.random() * 2 + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (Math.random() - 0.5) * 3, y - length);
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(20, 20);

    return texture;
}

function createGround() {
    // Create grass texture
    const grassTexture = createGrassTexture();

    // Main grass terrain
    const grassGround = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        new THREE.MeshStandardMaterial({
            map: grassTexture,
            color: 0x5a8f4a,
            roughness: 0.9
        })
    );
    grassGround.rotation.x = -Math.PI / 2;
    grassGround.position.y = -0.02;
    grassGround.receiveShadow = true;
    scene.add(grassGround);

    // Add soil/dirt mound at the base of the flower
    createSoil();
}

// ============================================
// SOIL - Tanah di bawah bunga
// ============================================
function createSoilTexture() {
    // Create procedural soil texture using canvas
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    // Base soil color
    ctx.fillStyle = "#5c4033";
    ctx.fillRect(0, 0, 512, 512);

    // Add noise/grain for soil texture
    for (let i = 0; i < 8000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const size = Math.random() * 10 + 1;
        const brightness = Math.random();

        if (brightness > 0.7) {
            ctx.fillStyle = `rgba(90, 70, 50, ${Math.random() * 0.5})`; // Light brown spots
        } else if (brightness > 0.4) {
            ctx.fillStyle = `rgba(60, 40, 25, ${Math.random() * 0.6})`; // Dark spots
        } else {
            ctx.fillStyle = `rgba(80, 60, 40, ${Math.random() * 0.4})`; // Medium spots
        }

        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    // Add some darker patches
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const radius = Math.random() * 15 + 5;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, "rgba(40, 25, 15, 0.3)");
        gradient.addColorStop(1, "rgba(40, 25, 15, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);

    return texture;
}

function createSoilBumpMap() {
    // Create bump map for soil
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    // Base gray
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, 256, 256);

    // Add bumps
    for (let i = 0; i < 3000; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const size = Math.random() * 4 + 1;
        const brightness = Math.floor(Math.random() * 100 + 100);
        ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    // Add darker crevices
    for (let i = 0; i < 1000; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const size = Math.random() * 2 + 0.5;
        const brightness = Math.floor(Math.random() * 60 + 40);
        ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);

    return texture;
}

function createSoil() {
    const soilGroup = new THREE.Group();

    // Create soil textures
    const soilTexture = createSoilTexture();
    const soilBumpMap = createSoilBumpMap();

    // Main soil mound - bentuk gundukan tanah with texture
    const soilMaterial = new THREE.MeshStandardMaterial({
        map: soilTexture,
        bumpMap: soilBumpMap,
        bumpScale: 0.02,
        color: 0x6b4423, // Brown tint
        roughness: 0.95,
        metalness: 0.0
    });

    // Create main mound using sphere geometry flattened
    const mainMound = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2),
        soilMaterial
    );
    mainMound.scale.set(3.2, 2.6, 3.2);
    mainMound.position.y = -0.05;
    mainMound.receiveShadow = true;
    mainMound.castShadow = true;
    soilGroup.add(mainMound);

    // Add smaller dirt clumps around the base for natural look
    const clumpMaterial = new THREE.MeshStandardMaterial({
        map: soilTexture,
        bumpMap: soilBumpMap,
        bumpScale: 0.015,
        color: 0x5a4030, // Slightly darker brown
        roughness: 1,
        metalness: 0.0
    });

    for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2 + Math.random() * 0.3;
        const radius = 0.5 + Math.random() * 0.25;
        const clump = new THREE.Mesh(
            new THREE.SphereGeometry(0.12 + Math.random() * 0.1, 8, 6),
            clumpMaterial
        );
        // Position clumps to merge with main mound - lower Y position
        const yPos = -0.02 + Math.random() * 0.04;
        clump.position.set(Math.cos(angle) * radius, yPos, Math.sin(angle) * radius);
        clump.scale.set(1, 0.3 + Math.random() * 0.2, 1); // Flatten to merge with surface
        clump.receiveShadow = true;
        clump.castShadow = true;
        soilGroup.add(clump);
    }

    // Add a few tiny pebbles/stones
    const stoneMaterial = new THREE.MeshStandardMaterial({
        color: 0x707070,
        roughness: 0.7,
        metalness: 0.1
    });

    for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.25 + Math.random() * 0.45;
        const stone = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.015 + Math.random() * 0.02, 0),
            stoneMaterial
        );
        stone.position.set(
            Math.cos(angle) * radius,
            0.02 + Math.random() * 0.03,
            Math.sin(angle) * radius
        );
        stone.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        stone.castShadow = true;
        soilGroup.add(stone);
    }

    soilGroup.position.y = 0;
    scene.add(soilGroup);
}

// ============================================
// STEM
// ============================================
function createStem(height = 2.2) {
    const points = [];
    for (let i = 0; i <= 25; i++) {
        const t = i / 25;
        points.push(
            new THREE.Vector3(
                Math.sin(t * Math.PI * 0.3) * 0.15 * (1 - t * 0.5),
                t * height,
                Math.cos(t * Math.PI * 0.15) * 0.06 * (1 - t)
            )
        );
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const stem = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 25, 0.025, 8, false),
        new THREE.MeshStandardMaterial({ color: colors.stem, roughness: 0.6 })
    );
    stem.castShadow = true;
    stem.name = "stem";
    return { mesh: stem, curve };
}

// ============================================
// LEAF
// ============================================
function createLeafGeometry(length, width) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    // Left side of leaf
    shape.quadraticCurveTo(-width * 0.8, length * 0.3, -width * 0.5, length * 0.6);
    shape.quadraticCurveTo(-width * 0.2, length * 0.85, 0, length);
    // Right side of leaf
    shape.quadraticCurveTo(width * 0.2, length * 0.85, width * 0.5, length * 0.6);
    shape.quadraticCurveTo(width * 0.8, length * 0.3, 0, 0);

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 0.003,
        bevelEnabled: true,
        bevelThickness: 0.001,
        bevelSize: 0.002,
        bevelSegments: 1
    });

    // Add natural curve to leaf
    const pos = geometry.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const x = pos.getX(i);
        const t = Math.max(0, y / length);
        // Curve the leaf downward and add slight wave
        pos.setZ(i, pos.getZ(i) - t * t * 0.08 - Math.abs(x) * 0.1);
    }
    geometry.computeVertexNormals();
    return geometry;
}

function createLeaf(config, stemCurve) {
    const leafGroup = new THREE.Group();

    const leafGeometry = createLeafGeometry(config.length, config.width);
    const leafMaterial = new THREE.MeshStandardMaterial({
        color: config.color,
        roughness: 0.6,
        side: THREE.DoubleSide
    });

    const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
    leaf.castShadow = true;
    leaf.name = "leaf";

    // Position on stem curve
    const point = stemCurve.getPoint(config.stemPosition);

    // Offset position to left (-1) or right (1) of stem
    leafGroup.position.set(point.x + config.side * config.offsetDistance, point.y, point.z);

    // Rotate leaf to point outward from stem
    leafGroup.rotation.y = config.side > 0 ? -Math.PI / 2 : Math.PI / 2;
    leafGroup.rotation.x = config.tiltAngle;
    leafGroup.rotation.z = config.side * config.twistAngle;

    leafGroup.add(leaf);
    return leafGroup;
}

// ============================================
// PETAL GEOMETRY
// ============================================
function createPetalGeometry(length, width) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(width * 0.9, length * 0.25, width * 0.6, length * 0.7);
    shape.quadraticCurveTo(width * 0.25, length * 0.95, 0, length);
    shape.quadraticCurveTo(-width * 0.25, length * 0.95, -width * 0.6, length * 0.7);
    shape.quadraticCurveTo(-width * 0.9, length * 0.25, 0, 0);

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 0.005,
        bevelEnabled: true,
        bevelThickness: 0.002,
        bevelSize: 0.005,
        bevelSegments: 2
    });

    const pos = geometry.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const t = Math.max(0, y / length);
        pos.setZ(i, pos.getZ(i) - t * t * 0.04);
    }
    geometry.computeVertexNormals();
    return geometry;
}

// ============================================
// FLOWER HEAD
// ============================================
function createFlowerHead() {
    const head = new THREE.Group();
    head.name = "flowerHead";

    const layers = [
        { count: 5, len: 0.28, wid: 0.1, color: colors.petalInner },
        { count: 8, len: 0.36, wid: 0.12, color: colors.petalBase },
        { count: 10, len: 0.44, wid: 0.15, color: colors.petalMid },
        { count: 12, len: 0.52, wid: 0.17, color: colors.petalMid },
        { count: 14, len: 0.6, wid: 0.19, color: colors.petalTip }
    ];

    layers.forEach((cfg, layerIdx) => {
        const offset = (layerIdx * Math.PI) / cfg.count;
        const geometry = createPetalGeometry(cfg.len, cfg.wid);
        const material = new THREE.MeshStandardMaterial({
            color: cfg.color,
            roughness: 0.4,
            side: THREE.DoubleSide
        });

        for (let i = 0; i < cfg.count; i++) {
            const angle = (i / cfg.count) * Math.PI * 2 + offset;

            const petal = new THREE.Mesh(geometry, material);
            petal.name = "petal";
            petal.castShadow = true;

            petal.userData = {
                layer: layerIdx,
                angle: angle,
                length: cfg.len,

                // Bloom parameters
                closedTilt: 0.5 + layerIdx * -0.15, // Nearly closed
                openTilt: -0.5 + layerIdx * -0.22, // Open wide

                closedRadius: 0.07 + layerIdx * -0.017, // close radius
                openRadius: 0.0015 + layerIdx * -0.005, // wide radius

                phase: i * 0.1,
                speed: 0.08
            };

            head.add(petal);
        }
    });

    createCenter(head);
    return head;
}

// ============================================
// CENTER
// ============================================
function createCenter(head) {
    const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 16, 16),
        new THREE.MeshStandardMaterial({
            color: colors.centerOrange,
            emissive: colors.centerOrange,
            emissiveIntensity: 0.3
        })
    );
    dome.position.y = 0.02;
    dome.scale.y = 0.5;
    dome.name = "center";
    head.add(dome);

    [10, 16].forEach((count, ring) => {
        const radius = 0.03 + ring * 0.028;
        for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2;
            const stamen = new THREE.Mesh(
                new THREE.CylinderGeometry(0.003, 0.006, 0.08 + ring * 0.03, 6),
                new THREE.MeshStandardMaterial({
                    color: colors.centerYellow,
                    emissive: colors.centerYellow,
                    emissiveIntensity: 0.4
                })
            );

            stamen.position.set(Math.cos(a) * radius, 0.04, Math.sin(a) * radius);
            const outward = new THREE.Vector3(Math.cos(a), 0.5, Math.sin(a));
            outward.add(stamen.position);
            stamen.lookAt(outward);
            stamen.rotateX(Math.PI / 2);

            stamen.name = "stamen";
            stamen.scale.setScalar(0);
            head.add(stamen);
        }
    });
}

// ============================================
// FLOWER
// ============================================
function createFlower() {
    const group = new THREE.Group();
    group.name = "flower";

    const stemData = createStem(2.2);
    group.add(stemData.mesh);

    // Add 2 leaves on the stem using config objects
    const leaf1 = createLeaf(leaf1Config, stemData.curve);
    group.add(leaf1);

    const leaf2 = createLeaf(leaf2Config, stemData.curve);
    group.add(leaf2);

    const top = stemData.curve.getPoint(1);
    const flowerHead = createFlowerHead();
    flowerHead.position.copy(top);
    group.add(flowerHead);

    return group;
}

// ============================================
// BLOOM UPDATE
// ============================================
function updateBloom(progress) {
    const head = flower.getObjectByName("flowerHead");
    if (!head) return;

    const time = clock.getElapsedTime();
    const t = smoothstep(progress);

    head.children.forEach((child) => {
        if (child.name === "petal") {
            const d = child.userData;
            const tilt = lerp(d.closedTilt, d.openTilt, t);
            const radius = lerp(d.closedRadius, d.openRadius, t);
            const breathe = Math.sin(time * d.speed + d.phase) * 0.002 * t;

            child.position.x = Math.cos(d.angle) * radius;
            child.position.z = Math.sin(d.angle) * radius;
            child.position.y = 0;

            child.quaternion.identity();
            child.rotateY(d.angle);
            child.rotateX(-tilt - breathe);
        }

        if (child.name === "stamen") {
            const s = Math.max(0, (t - 0.4) * 1.67);
            child.scale.setScalar(s);
        }

        if (child.name === "center") {
            child.scale.setScalar(0.5 + t * 0.5);
        }
    });
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}
function smoothstep(x) {
    return x * x * (3 - 2 * x);
}

// ============================================
// FALLING PETALS
// ============================================
function createFallingPetals() {
    const geometry = createPetalGeometry(0.08, 0.03);
    const material = new THREE.MeshStandardMaterial({
        color: colors.petalTip,
        roughness: 0.4,
        side: THREE.DoubleSide
    });

    for (let i = 0; i < 6; i++) {
        const petal = new THREE.Mesh(geometry, material);
        petal.scale.setScalar(0.4); // Bigger size (was 0.25)
        petal.position.set(
            (Math.random() - 0.5) * 6,
            3 + Math.random() * 3,
            (Math.random() - 0.5) * 5
        );
        petal.userData = {
            vel: new THREE.Vector3(
                (Math.random() - 0.5) * 0.001, // Slower horizontal (was 0.002)
                -0.0015 - Math.random() * 0.001, // Slower fall (was -0.003 - 0.002)
                (Math.random() - 0.5) * 0.001 // Slower horizontal (was 0.002)
            ),
            rot: new THREE.Vector3(
                (Math.random() - 0.5) * 0.003, // Slower rotation (was 0.006)
                (Math.random() - 0.5) * 0.003, // Slower rotation (was 0.006)
                (Math.random() - 0.5) * 0.003 // Slower rotation (was 0.006)
            ),
            phase: Math.random() * Math.PI * 2
        };
        fallingPetals.push(petal);
        scene.add(petal);
    }
}

// ============================================
// ANIMATION
// ============================================
function animate() {
    requestAnimationFrame(animate);

    const time = clock.getElapsedTime();
    const deltaTime = clock.getDelta();

    raycaster.setFromCamera(mouse, camera);
    const head = flower.getObjectByName("flowerHead");
    if (head) {
        const hits = raycaster.intersectObjects(head.children, true);
        if (hits.length > 0) {
            document.body.style.cursor = "pointer";
        } else {
            document.body.style.cursor = "grab";
        }
    }

    window.bloomProgress += (window.targetBloom - window.bloomProgress) * 0.035;
    updateBloom(window.bloomProgress);

    // Update wind effect
    updateWind(deltaTime || 0.016);

    // Apply wind to flower (replaces old flower rotation)
    applyWindToFlower(time);

    // Apply wind to falling petals (replaces old petal animation)
    applyWindToPetals(time);

    // Apply wind to clouds (replaces old cloud animation)
    applyWindToClouds(time);

    renderer.render(scene, camera);
}

// ============================================
// EVENTS
// ============================================
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
}

function onMouseClick() {
    raycaster.setFromCamera(mouse, camera);
    const head = flower.getObjectByName("flowerHead");
    if (head) {
        const hits = raycaster.intersectObjects(head.children, true);
        if (hits.length > 0) {
            window.targetBloom = window.targetBloom > 0.5 ? 0 : 1;
        }
    }
}

// Touch support for bloom toggle
function onTouchEnd(e) {
    if (e.changedTouches.length === 1) {
        const touch = e.changedTouches[0];
        mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const head = flower.getObjectByName("flowerHead");
        if (head) {
            const hits = raycaster.intersectObjects(head.children, true);
            if (hits.length > 0) {
                window.targetBloom = window.targetBloom > 0.5 ? 0 : 1;
            }
        }
    }
}

// ============================================
// BACKGROUND MUSIC
// ============================================
function startBGM() {
    // Make bgm globally accessible for entrance screen\n    window.bgm = bgm;
    // Try to play (will work after user clicks entrance screen)
    bgm.play().catch(() => {});
}

// Setup immediate BGM play on any user interaction
function setupImmediateBGM() {
    const tryPlay = () => {
        if (bgm && bgm.paused) {
            bgm.play().catch(() => {});
        }
    };

    // Listen for any interaction to start music
    ["click", "touchstart", "keydown", "mousemove", "scroll"].forEach((event) => {
        document.addEventListener(event, tryPlay, { once: true });
    });

    // Also try on visibility change
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden && bgm && bgm.paused) {
            bgm.play().catch(() => {});
        }
    });
}

// Initialize BGM listeners immediately
document.addEventListener("DOMContentLoaded", setupImmediateBGM);

// ============================================
// WIND EFFECT
// ============================================
function updateWind(deltaTime) {
    // Update gust timer
    wind.gustTimer += deltaTime;

    // Trigger random wind gusts
    if (wind.gustTimer >= wind.gustInterval) {
        wind.gustTimer = 0;
        wind.gustInterval = 3 + Math.random() * 5; // 3-8 seconds between gusts
        wind.targetStrength =
            wind.minStrength + Math.random() * (wind.maxStrength - wind.minStrength);
        wind.direction = Math.random() * Math.PI * 2; // Random direction
    }

    // Smoothly interpolate wind strength
    wind.strength += (wind.targetStrength - wind.strength) * 0.02;

    // Gradually reduce wind
    wind.targetStrength *= 0.995;
    if (wind.targetStrength < wind.minStrength) {
        wind.targetStrength = wind.minStrength * 0.5;
    }
}

function applyWindToFlower(time) {
    if (!flower) return;

    const windX = Math.cos(wind.direction) * wind.strength;
    const windZ = Math.sin(wind.direction) * wind.strength;

    // Apply wind sway to main flower
    flower.rotation.x = Math.sin(time * 0.15) * 0.004 + windX * 0.5;
    flower.rotation.z = Math.cos(time * 0.12) * 0.003 + windZ * 0.5;

    // Add subtle secondary motion
    const gustEffect = Math.sin(time * 2) * wind.strength * 0.3;
    flower.rotation.x += gustEffect;
}

function applyWindToPetals(time) {
    fallingPetals.forEach((p) => {
        // Base velocity
        p.position.add(p.userData.vel);

        // Wind effect on falling petals - stronger influence
        const windInfluence = wind.strength * 2;
        p.position.x += Math.cos(wind.direction) * windInfluence * 0.02;
        p.position.z += Math.sin(wind.direction) * windInfluence * 0.02;

        // Original swaying motion + enhanced wind turbulence
        const turbulence = wind.strength * 3;
        p.position.x += Math.sin(time + p.userData.phase) * 0.0005 * (1 + turbulence);
        p.position.x += Math.sin(time * 2 + p.userData.phase * 1.5) * 0.0003 * turbulence;
        p.position.z += Math.cos(time * 1.5 + p.userData.phase) * 0.0003 * turbulence;

        // Wind affects rotation more dramatically
        p.rotation.x += p.userData.rot.x * (1 + wind.strength * 5);
        p.rotation.y += p.userData.rot.y * (1 + wind.strength * 3);
        p.rotation.z += Math.sin(time + p.userData.phase) * wind.strength * 0.05;

        // Reset when fallen
        if (p.position.y < -0.1) {
            p.position.y = 5;
            p.position.x = (Math.random() - 0.5) * 6;
            p.position.z = (Math.random() - 0.5) * 5;
        }
    });
}

function applyWindToClouds(time) {
    clouds.forEach((cloud) => {
        // Original movement + wind influence
        cloud.userData.angle += cloud.userData.speed * 0.01 + wind.strength * 0.005;
        cloud.position.x = Math.cos(cloud.userData.angle) * cloud.userData.radius;
        cloud.position.z = Math.sin(cloud.userData.angle) * cloud.userData.radius;
        // Gentle vertical bob + wind lift
        cloud.position.y =
            cloud.userData.baseY +
            Math.sin(time * 0.1 + cloud.userData.angle) * 0.5 +
            wind.strength * 0.5;
    });
}

window.addEventListener("load", init);
