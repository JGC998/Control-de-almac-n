"use client";
import { useEffect, useRef } from 'react';

const SCRIPT_THREE = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const SCRIPT_ORBIT = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';

const COLOR_MAP = {
  NEGRO:  { hex: 0x0e1014, str: '#0e1014' },
  BLANCO: { hex: 0xdde0d8, str: '#dde0d8' },
  VERDE:  { hex: 0x2a5c25, str: '#2a5c25' },
  AZUL:   { hex: 0x1a6bab, str: '#1a6bab' },
  ROJO:   { hex: 0x8a1c1c, str: '#8a1c1c' },
};

function resolveColor(color) {
  if (!color || color === '__std') return COLOR_MAP.BLANCO;
  return COLOR_MAP[color.toUpperCase()] ?? COLOR_MAP.BLANCO;
}

function resolveConf(tipoConfeccion, tipoGrapa) {
  if (tipoConfeccion === 'GRAPA') return tipoGrapa === 'UNA' ? 'GRAPA_UNA' : 'GRAPA_NORMAL';
  if (tipoConfeccion === 'ABIERTA') return 'ABIERTA';
  return 'VULCANIZADA';
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Script load failed: ' + src));
    document.head.appendChild(s);
  });
}

export default function Visor3DBandaPVC({
  ancho = 400,
  largo = 1400,
  espesor = 3,
  color = '',
  tipoConfeccion = 'VULCANIZADA',
  tipoGrapa = 'NORMAL',
  configuracionTacos = null,
  height = 280,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const buildRef = useRef(null);
  const rendererRef = useRef(null);
  const viewRef = useRef(null);     // { camera, controls }
  const dimsRef = useRef({ W: 40, L: 140, diag: 145 });
  const cameraInitRef = useRef(false);

  const propsRef = useRef({ ancho, largo, espesor, color, tipoConfeccion, tipoGrapa, configuracionTacos });
  propsRef.current = { ancho, largo, espesor, color, tipoConfeccion, tipoGrapa, configuracionTacos };

  useEffect(() => {
    let mounted = true;
    let animId;
    let ro;

    async function init() {
      try {
        await loadScript(SCRIPT_THREE);
        await loadScript(SCRIPT_ORBIT);
      } catch { return; }
      if (!mounted || !canvasRef.current || !containerRef.current) return;

      const THREE = window.THREE;
      const canvas = canvasRef.current;
      const container = containerRef.current;

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      rendererRef.current = renderer;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1c2335);

      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2000);
      camera.position.set(60, 55, 120);

      const controls = new THREE.OrbitControls(camera, canvas);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.autoRotate = false;
      controls.minDistance = 10;
      controls.maxDistance = 600;

      viewRef.current = { camera, controls };

      // Lighting
      scene.add(new THREE.AmbientLight(0xaabbcc, 0.9));
      const sun = new THREE.DirectionalLight(0xffffff, 1.0);
      sun.position.set(60, 100, 80);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.near = 1;
      sun.shadow.camera.far = 500;
      sun.shadow.camera.left = sun.shadow.camera.bottom = -150;
      sun.shadow.camera.right = sun.shadow.camera.top = 150;
      scene.add(sun);
      const fillLight = new THREE.DirectionalLight(0x6688cc, 0.6);
      fillLight.position.set(-80, 40, -60);
      scene.add(fillLight);
      const underLight = new THREE.DirectionalLight(0x557799, 0.4);
      underLight.position.set(0, -80, 0);
      scene.add(underLight);

      const grid = new THREE.GridHelper(500, 50, 0x2a3a5a, 0x222d47);
      grid.position.y = -20;
      scene.add(grid);

      const bandGroup = new THREE.Group();
      scene.add(bandGroup);

      function resize() {
        const w = container.clientWidth || 300;
        const h = container.clientHeight || 280;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      ro = new ResizeObserver(resize);
      ro.observe(container);
      resize();

      function animate() {
        animId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      }
      animate();

      function clearGroup(g) {
        while (g.children.length) {
          const child = g.children[0];
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            (Array.isArray(child.material) ? child.material : [child.material]).forEach(m => m.dispose());
          }
          g.remove(child);
        }
      }

      function makeTexture(colorStr, isDark) {
        const sz = 256;
        const c = document.createElement('canvas');
        c.width = c.height = sz;
        const ctx = c.getContext('2d');
        ctx.fillStyle = colorStr;
        ctx.fillRect(0, 0, sz, sz);
        const gs = 7;
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.09)';
        ctx.lineWidth = 0.7;
        for (let x = 0; x < sz; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, sz); ctx.stroke(); }
        for (let y = 0; y < sz; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(sz, y); ctx.stroke(); }
        const grad = ctx.createLinearGradient(0, 0, sz * 0.6, sz * 0.4);
        grad.addColorStop(0,   isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.18)');
        grad.addColorStop(0.4, 'rgba(0,0,0,0)');
        grad.addColorStop(1,   isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.06)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, sz, sz);
        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        return tex;
      }

      function buildGrapas(W, T, L, tipo) {
        const g = new THREE.Group();
        const clipW = 2.6, plateT = 0.28, topD = 1.3;
        const botD = tipo === 'GRAPA_UNA' ? topD * 0.55 : topD;
        const grMat = new THREE.MeshStandardMaterial({ color: 0xa8bcc8, metalness: 0.90, roughness: 0.16 });
        const dkMat = new THREE.MeshStandardMaterial({ color: 0x7a90a0, metalness: 0.85, roughness: 0.22 });
        const count = Math.floor(W / clipW);
        const startX = -(count * clipW) / 2 + clipW / 2;
        for (const zSign of [-1, 1]) {
          const zEdge = zSign * L / 2, zOut = zSign;
          const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, W, 8), grMat);
          wire.rotation.z = Math.PI / 2;
          wire.position.set(0, 0, zEdge + zOut * 0.4);
          g.add(wire);
          for (let i = 0; i < count; i++) {
            const x = startX + i * clipW;
            const top = new THREE.Mesh(new THREE.BoxGeometry(clipW * 0.87, plateT, topD), grMat);
            top.position.set(x, T / 2 + plateT / 2, zEdge + zOut * topD / 2);
            top.castShadow = true;
            g.add(top);
            const bot = new THREE.Mesh(new THREE.BoxGeometry(clipW * 0.87, plateT, botD), i % 2 === 0 ? grMat : dkMat);
            bot.position.set(x, -T / 2 - plateT / 2, zEdge + zOut * botD / 2);
            bot.castShadow = true;
            g.add(bot);
            const prong = new THREE.Mesh(new THREE.BoxGeometry(clipW * 0.28, T + plateT * 2, 0.22), dkMat);
            prong.position.set(x + (i % 2 === 0 ? clipW * 0.2 : -clipW * 0.2), 0, zEdge + zOut * 0.15);
            g.add(prong);
          }
        }
        return g;
      }

      function buildScene() {
        clearGroup(bandGroup);
        const p = propsRef.current;
        const SC = 0.1;
        const anchoMm = parseFloat(p.ancho) || 400;
        const largoMm = parseFloat(p.largo) || 1400;
        const espesorMm = parseFloat(p.espesor) || 3;
        const conf = resolveConf(p.tipoConfeccion, p.tipoGrapa);

        const W = anchoMm * SC;
        const L = largoMm * SC;
        const T = Math.max(espesorMm * SC * 2.5, 1.8);

        const col = resolveColor(p.color);
        const isDark = ['NEGRO', 'VERDE', 'AZUL', 'ROJO'].includes((p.color || '').toUpperCase());
        const tex = makeTexture(col.str, isDark);
        tex.repeat.set(W / 6, L / 6);

        const bandGeo = new THREE.BoxGeometry(W, T, L, 1, 1, 1);
        const band = new THREE.Mesh(
          bandGeo,
          new THREE.MeshStandardMaterial({ color: col.hex, roughness: 0.62, metalness: 0.0, map: tex })
        );
        band.castShadow = true;
        band.receiveShadow = true;
        bandGroup.add(band);

        bandGroup.add(new THREE.LineSegments(
          new THREE.EdgesGeometry(bandGeo),
          new THREE.LineBasicMaterial({ color: 0x3b6fd4, transparent: true, opacity: 0.5 })
        ));

        if (conf === 'GRAPA_NORMAL' || conf === 'GRAPA_UNA') {
          bandGroup.add(buildGrapas(W, T, L, conf));
        }

        if (conf === 'VULCANIZADA') {
          [-L / 2, L / 2].forEach(z => {
            const m = new THREE.Mesh(
              new THREE.PlaneGeometry(W, T * 0.15),
              new THREE.MeshStandardMaterial({ color: 0x222244, roughness: 0.9 })
            );
            m.rotation.y = Math.PI / 2;
            m.position.set(0, 0, z);
            bandGroup.add(m);
          });
        }

        if (p.configuracionTacos && p.configuracionTacos.paso) {
          const tc = p.configuracionTacos;
          const cantidadTacos = Math.floor(largoMm / tc.paso);
          if (cantidadTacos > 0) {
            const finH = Math.max(tc.altura * SC, 0.8);
            const finD = Math.max(tc.altura * SC * 0.35, 0.5);
            const finL = (tc.longitudTaco ?? (anchoMm - 10)) * SC;
            const finMat = new THREE.MeshStandardMaterial({ color: col.hex, roughness: 0.70, metalness: 0.0 });
            const pitch = tc.paso * SC;
            const startZ = -((cantidadTacos - 1) * pitch) / 2;
            for (let r = 0; r < cantidadTacos; r++) {
              const fin = new THREE.Mesh(new THREE.BoxGeometry(finL, finH, finD), finMat);
              fin.position.set(0, T / 2 + finH / 2, startZ + r * pitch);
              if (tc.tipo === 'INCLINADO') fin.rotation.x = -0.22;
              fin.castShadow = true;
              bandGroup.add(fin);
            }
          }
        }

        const diag = Math.sqrt(W * W + L * L);
        dimsRef.current = { W, L, diag };
        controls.minDistance = diag * 0.12;
        controls.maxDistance = diag * 4;
        if (!cameraInitRef.current) {
          camera.position.set(0, diag * 0.78 + 10, L * 0.17);
          controls.target.set(0, 0, 0);
          cameraInitRef.current = true;
        }
        controls.update();
      }

      buildRef.current = buildScene;
      buildScene();
    }

    init();

    return () => {
      mounted = false;
      cancelAnimationFrame(animId);
      if (ro) ro.disconnect();
      buildRef.current = null;
      cameraInitRef.current = false;
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (buildRef.current) buildRef.current();
  }, [ancho, largo, espesor, color, tipoConfeccion, tipoGrapa, configuracionTacos]);

  function doView(positionFn) {
    if (!viewRef.current) return;
    const { camera, controls } = viewRef.current;
    const { W, L, diag } = dimsRef.current;
    positionFn(camera, W, L, diag);
    controls.target.set(0, 0, 0);
    controls.update();
  }

  const BTN = "text-[0.65rem] px-2 py-0.5 rounded bg-black/60 border border-blue-400/30 text-slate-400 hover:bg-blue-500/25 hover:text-white transition-colors whitespace-nowrap";

  return (
    <div
      ref={containerRef}
      className="relative rounded-lg overflow-hidden bg-[#1c2335]"
      style={{ height }}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
      <div className="absolute top-2 left-2 flex gap-1">
        <button className={BTN} onClick={() => doView((c, W, L, d) => c.position.set(0, d * 0.78 + 10, L * 0.17))}>Top</button>
        <button className={BTN} onClick={() => doView((c, W, L, d) => c.position.set(W * 1.3, d * 0.38 + 15, L * 0.65))}>3/4</button>
        <button className={BTN} onClick={() => doView((c, W, L, d) => c.position.set(0, 8, L * 0.75))}>Frontal</button>
        <button className={BTN} onClick={() => { cameraInitRef.current = false; if (buildRef.current) buildRef.current(); }}>↺</button>
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[0.6rem] text-slate-600 pointer-events-none whitespace-nowrap">
        Arrastra · Zoom · Clic derecho desplazar
      </div>
    </div>
  );
}
