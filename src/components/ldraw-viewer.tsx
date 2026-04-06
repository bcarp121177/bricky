"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const PARTS_LIBRARY =
  "https://raw.githubusercontent.com/gkjohnson/ldraw-parts-library/master/complete/ldraw/";

const COLORS_URL =
  "https://raw.githubusercontent.com/gkjohnson/ldraw-parts-library/master/colors/ldcfgalt.ldr";

interface Props {
  ldrawContent: string;
  currentStep: number;
}

// All mutable three.js handles in one object so cleanup is unambiguous.
interface SceneState {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  model: THREE.Group | null;
  render: () => void;
}

export default function LDrawViewer({ ldrawContent, currentStep }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<SceneState | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  // Build the three.js scene whenever ldrawContent changes.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setStatus("loading");

    const w = container.clientWidth || 400;
    const h = 300;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);

    const camera = new THREE.PerspectiveCamera(45, w / h, 1, 10000);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.0));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(200, -300, 300);
    scene.add(dirLight);

    // On-demand rendering: render only when the camera actually changes.
    // This eliminates the animation loop and all its cleanup timing issues.
    const render = () => renderer.render(scene, camera);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false; // damping requires a loop; skip it
    controls.addEventListener("change", render);

    const state: SceneState = { renderer, scene, camera, controls, model: null, render };
    stateRef.current = state;

    // Track whether this effect instance has been cleaned up.
    let active = true;

    const loader = new LDrawLoader();
    loader.setPartsLibraryPath(PARTS_LIBRARY);
    loader.setConditionalLineMaterial(LDrawConditionalLineMaterial);

    const blob = new Blob([ldrawContent], { type: "text/plain" });
    const blobUrl = URL.createObjectURL(blob);

    loader.preloadMaterials(COLORS_URL).then(() => {
      if (!active) { URL.revokeObjectURL(blobUrl); return; }
      loader.load(
      blobUrl,
      (group: THREE.Group) => {
        URL.revokeObjectURL(blobUrl);
        if (!active) return; // effect was cleaned up while parts were loading

        group.rotation.x = Math.PI; // LDraw is Y-down; flip for three.js

        const box = new THREE.Box3().setFromObject(group);
        const center = box.getCenter(new THREE.Vector3());
        group.position.sub(center);

        scene.add(group);
        state.model = group;

        const size = box.getSize(new THREE.Vector3()).length();
        camera.position.set(size * 0.8, size * 0.6, size * 1.2);
        camera.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);

        applyStep(group, currentStep);
        render();
        setStatus("ready");
      },
      undefined,
      () => {
        URL.revokeObjectURL(blobUrl);
        if (active) setStatus("error");
      }
    );
    }).catch(() => {
      URL.revokeObjectURL(blobUrl);
      if (active) setStatus("error");
    });

    function onResize() {
      const w = container!.clientWidth;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      render();
    }
    window.addEventListener("resize", onResize);

    return () => {
      active = false;
      stateRef.current = null;
      window.removeEventListener("resize", onResize);
      controls.removeEventListener("change", render);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [ldrawContent]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-render when the user navigates steps.
  useEffect(() => {
    const state = stateRef.current;
    if (!state?.model) return;
    applyStep(state.model, currentStep);
    state.render();
  }, [currentStep]);

  if (status === "error") {
    return (
      <div
        className="w-full rounded-xl bg-gray-50 border border-gray-200 flex flex-col items-center justify-center gap-2 text-sm text-gray-500"
        style={{ height: 300 }}
      >
        <span className="text-2xl">⚠️</span>
        <p>3D preview unavailable</p>
        <p className="text-xs text-gray-400">The AI generated an unrenderable model file</p>
      </div>
    );
  }

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden border border-gray-200"
      style={{ height: 300 }}
    >
      <div ref={containerRef} className="w-full h-full" />
      {status === "loading" && (
        <div className="absolute inset-0 bg-gray-50 flex flex-col items-center justify-center gap-2 text-sm text-gray-400">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-yellow-400 rounded-full animate-spin" />
          Loading 3D model…
        </div>
      )}
    </div>
  );
}

function applyStep(model: THREE.Group, step: number) {
  model.traverse((child) => {
    if ("buildingStep" in child.userData) {
      child.visible = child.userData.buildingStep <= step;
    }
  });
}
