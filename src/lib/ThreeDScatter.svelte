<script lang="ts">
    import type { TSong } from "../types";
    import * as THREE from "three";
    import { OrbitControls } from "three/addons/controls/OrbitControls.js";
    import { onMount, onDestroy } from "svelte";

    type Props = {
        songs: TSong[];
    };

    let { songs }: Props = $props();

    let container: HTMLDivElement;
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let controls: OrbitControls;
    let animationId: number;

    const GENRE_COLORS: Record<string, number> = {
        rap: 0xb084ff,
        pop: 0x69e36b,
        rock: 0xffeb3b,
        rb: 0xff8a3d,
        country: 0xff5e5e,
        misc: 0x5eb3ff,
    };

    function getGenre(s: TSong): string {
        return Array.isArray(s.tag) ? s.tag[0] : s.tag ?? "misc";
    }

    function stratifiedSample(allSongs: TSong[], perGenre = 25): TSong[] {
        const byGenre: Record<string, TSong[]> = {};
        for (const s of allSongs) {
            const g = getGenre(s).toLowerCase();
            if (!byGenre[g]) byGenre[g] = [];
            byGenre[g].push(s);
        }
        const result: TSong[] = [];
        for (const g of Object.keys(byGenre)) {
            const sorted = byGenre[g].sort((a, b) => b.view_count - a.view_count);
            result.push(...sorted.slice(0, perGenre));
        }
        return result;
    }

    function init() {
        const width = container.clientWidth;
        const height = container.clientHeight;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);

        camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        camera.position.set(80, 60, 100);
        camera.lookAt(0, 0, 0);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(width, height);
        container.appendChild(renderer.domElement);

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.target.set(0, 30, 0);

        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambient);
        const dir = new THREE.DirectionalLight(0xffffff, 0.8);
        dir.position.set(50, 100, 50);
        scene.add(dir);

        addAxes();
        addPoints();
        animate();
    }

    function addAxes() {
        const axisLen = 100;
        const axisMat = new THREE.LineBasicMaterial({ color: 0x666666 });

        const xGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(axisLen, 0, 0),
        ]);
        scene.add(new THREE.Line(xGeo, axisMat));

        const yGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, axisLen, 0),
        ]);
        scene.add(new THREE.Line(yGeo, axisMat));

        const zGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, axisLen),
        ]);
        scene.add(new THREE.Line(zGeo, axisMat));
    }

    function addPoints() {
        const sample = stratifiedSample(songs, 25);

        const yearMin = 1965, yearMax = 2020;
        const viewMax = Math.max(...sample.map((s) => Math.log10(s.view_count + 1)));
        const viewMin = Math.min(...sample.map((s) => Math.log10(s.view_count + 1)));

        const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

        for (const s of sample) {
            const yr = s.year instanceof Date ? s.year.getFullYear() : (s.year as any);
            if (yr < yearMin || yr > yearMax) continue;
            const x = clamp(((yr - yearMin) / (yearMax - yearMin)) * 100, 0, 100);
            const y = clamp(((Math.log10(s.view_count + 1) - viewMin) / (viewMax - viewMin)) * 100, 0, 100);
            const z = clamp(s.repetition_score * 100, 0, 100);

            const genre = getGenre(s).toLowerCase();
            const color = GENRE_COLORS[genre] ?? 0xffffff;

            const geo = new THREE.SphereGeometry(1.5, 16, 16);
            const mat = new THREE.MeshStandardMaterial({
                color,
                emissive: color,
                emissiveIntensity: 0.3,
                roughness: 0.4,
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(x, y, z);
            scene.add(mesh);
        }
    }

    function animate() {
        animationId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }

    function handleResize() {
        if (!container || !renderer || !camera) return;
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }

    onMount(() => {
        if (songs.length > 0) {
            init();
            window.addEventListener("resize", handleResize);
        }
    });

    onDestroy(() => {
        if (animationId) cancelAnimationFrame(animationId);
        window.removeEventListener("resize", handleResize);
        if (renderer) renderer.dispose();
    });

    $effect(() => {
        if (songs.length > 0 && container && !scene) {
            init();
        }
    });
</script>

<section class="three-d-section">
    <div class="header">
        <h2>Songs in 3D Space</h2>
        <p class="subtitle">
            Year × Views × Repetition. Drag to rotate. Scroll to zoom.
        </p>
        <div class="legend">
            <span class="dot" style="background:#b084ff"></span> rap
            <span class="dot" style="background:#69e36b"></span> pop
            <span class="dot" style="background:#ffeb3b"></span> rock
            <span class="dot" style="background:#ff8a3d"></span> rb
            <span class="dot" style="background:#ff5e5e"></span> country
            <span class="dot" style="background:#5eb3ff"></span> misc
        </div>
    </div>

    <div class="canvas-wrapper" bind:this={container}></div>

    <div class="axis-labels">
        <span>X = Year (1965 → 2020)</span>
        <span>Y = Views (log scale)</span>
        <span>Z = Repetition (0 → 1)</span>
    </div>
</section>

<style>
    .three-d-section {
        background: #000;
        padding: 4rem 2rem 6rem 2rem;
        min-height: 100vh;
        box-sizing: border-box;
    }
    .header {
        text-align: center;
        color: white;
        margin-bottom: 2rem;
    }
    h2 {
        font-family: "Playfair Display", serif;
        font-weight: 800;
        font-size: clamp(2rem, 4vw, 3rem);
        margin: 0 0 0.5rem 0;
    }
    .subtitle {
        font-family: "Playfair Display", serif;
        font-style: italic;
        color: #aaa;
        margin: 0 0 1.5rem 0;
    }
    .legend {
        display: flex;
        gap: 1.5rem;
        justify-content: center;
        flex-wrap: wrap;
        font-size: 0.95rem;
        color: #ccc;
    }
    .dot {
        display: inline-block;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        margin-right: 0.4rem;
        vertical-align: middle;
    }
    .canvas-wrapper {
        width: 100%;
        max-width: 1200px;
        height: 600px;
        margin: 0 auto;
        border: 1px solid #222;
        border-radius: 4px;
    }
    .axis-labels {
        display: flex;
        gap: 2.5rem;
        justify-content: center;
        margin-top: 1.5rem;
        font-family: "Playfair Display", serif;
        font-style: italic;
        color: #888;
        font-size: 0.95rem;
        flex-wrap: wrap;
    }
</style>
