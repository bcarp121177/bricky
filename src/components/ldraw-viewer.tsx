"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { LDrawLoader } from "three/examples/jsm/loaders/LDrawLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const LDRAW_PARTS_CDN =
  "https://raw.githubusercontent.com/gkjohnson/ldraw-parts-library/master/complete/ldraw/";

export interface LDrawViewerProps {
  ldrawContent: string; // full LDraw .ldr file content as a string
  stepLabel?: string;   // e.g. "Step 2 of 4" — shown while loading
}

export default function LDrawViewer({ ldrawContent, stepLabel }: LDrawViewerProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Initialise the Three.js scene once on mount.
  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;

    // ── Renderer ─────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0xe8f4ff);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── Scene ─────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe8f4ff);
    sceneRef.current = scene;

    // ── Camera ────────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      10000
    );
    camera.position.set(0, 80, 150);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // ── Lighting ──────────────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(100, 200, 150);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xaaccff, 0.3);
    fillLight.position.set(-100, -80, -100);
    scene.add(fillLight);

    // ── OrbitControls ────────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.5;
    controlsRef.current = controls;

    // ── Animation loop ────────────────────────────────────────────────────────
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // ── Resize observer ───────────────────────────────────────────────────────
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
    };
  }, []); // run once

  // Load / reload the model whenever ldrawContent changes.
  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!scene || !camera || !controls) return;

    // Remove the previous model group if any.
    if (modelGroupRef.current) {
      scene.remove(modelGroupRef.current);
      modelGroupRef.current = null;
    }

    if (!ldrawContent || ldrawContent.trim() === "0 Bricky Build") {
      // Nothing to render — empty model
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    const loader = new LDrawLoader();
    loader.setPartsLibraryPath(LDRAW_PARTS_CDN);

    // Load from a Blob URL so the loader sees a proper URL string.
    const blob = new Blob([ldrawContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    loader.load(
      url,
      (group: THREE.Group) => {
        URL.revokeObjectURL(url);

        // Center and scale the model to fit the viewport.
        const box = new THREE.Box3().setFromObject(group);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = maxDim > 0 ? 120 / maxDim : 1;

        group.scale.setScalar(scale);
        group.position.sub(center.multiplyScalar(scale));

        scene.add(group);
        modelGroupRef.current = group;

        // Reset camera to a good framing angle.
        camera.position.set(0, 80, 150);
        camera.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);
        controls.update();

        setLoading(false);
      },
      undefined, // onProgress — not used
      (_err: unknown) => {
        URL.revokeObjectURL(url);
        setLoading(false);
        setError(true);
      }
    );
  }, [ldrawContent]);

  return (
    <div className="relative w-full" style={{ height: "260px" }}>
      {/* Three.js canvas mount point */}
      <div ref={canvasRef} className="w-full h-full" />

      {/* Loading overlay */}
      {loading && !error && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2"
          style={{ backgroundColor: "#E8F4FF" }}
        >
          <span className="text-4xl">🧱</span>
          <p className="text-yellow-400 font-semibold text-sm">
            {stepLabel ? `Building ${stepLabel}…` : "Building your model…"}
          </p>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2"
          style={{ backgroundColor: "#E8F4FF" }}
        >
          <span className="text-2xl">🔧</span>
          <p className="text-gray-500 font-medium text-sm">3D view unavailable</p>
        </div>
      )}
    </div>
  );
}
