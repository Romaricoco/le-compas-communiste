import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';

/* ══════════════════════════════════════════════════════════
   LA SALLE DU SOVIET — décor 3D temps réel
   Foule en contre-jour, faisceaux volumétriques, poussière,
   bannières rouges, caméra documentaire.
   La salle s'échauffe avec l'intensité du débat :
   ref.setIntensity(0..1) · ref.ovation() · ref.murmur()
   ══════════════════════════════════════════════════════════ */

const isMobile = () => window.innerWidth < 720;

/* Halo radial (fond enfumé, lampes, flaque de lumière) */
function makeGlowTexture(inner, outer) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

const SovietHall = forwardRef(function SovietHall(_props, ref) {
  const mountRef = useRef(null);
  const stateRef = useRef({ intensity: 0.25, ovationT: -99, murmurT: -99, shake: 0 });

  useImperativeHandle(ref, () => ({
    setIntensity(v) {
      stateRef.current.intensity = Math.max(0, Math.min(1, v));
    },
    ovation() {
      stateRef.current.ovationT = performance.now() / 1000;
      stateRef.current.shake = 1;
    },
    murmur() {
      stateRef.current.murmurT = performance.now() / 1000;
      stateRef.current.shake = Math.max(stateRef.current.shake, 0.35);
    },
  }), []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
    } catch {
      return; // pas de WebGL : le fond reste noir, le jeu fonctionne
    }
    const mobile = isMobile();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.4 : 1.75));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x000000, 1);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.045);

    const camera = new THREE.PerspectiveCamera(
      55, mount.clientWidth / mount.clientHeight, 0.1, 80
    );
    const camBase = new THREE.Vector3(0, 2.3, 9);
    camera.position.copy(camBase);

    const disposables = [];
    const keep = o => { disposables.push(o); return o; };

    /* ── Fond enfumé (contre-jour) ─────────────────────── */
    const backGlowTex = keep(makeGlowTexture('rgba(154,100,50,0.92)', 'rgba(0,0,0,0)'));
    const backGlow = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(70, 30)),
      keep(new THREE.MeshBasicMaterial({
        map: backGlowTex, transparent: true, depthWrite: false,
        opacity: 0.62, fog: false,
      }))
    );
    backGlow.position.set(0, 6, -24);
    scene.add(backGlow);

    // lueur rouge : présente des deux côtés, mais contenue — pas un
    // bain de rouge, juste la couleur du décor qui affleure.
    const redGlowTex = keep(makeGlowTexture('rgba(120,18,20,0.55)', 'rgba(0,0,0,0)'));
    const redGlowMat = keep(new THREE.MeshBasicMaterial({
      map: redGlowTex, transparent: true, depthWrite: false, opacity: 0.5, fog: false,
      blending: THREE.AdditiveBlending,
    }));
    const redGlowL = new THREE.Mesh(keep(new THREE.PlaneGeometry(26, 18)), redGlowMat);
    redGlowL.position.set(-9.5, 6.5, -20);
    scene.add(redGlowL);
    const redGlowR = new THREE.Mesh(keep(new THREE.PlaneGeometry(26, 18)), redGlowMat);
    redGlowR.position.set(9.5, 6.5, -20);
    scene.add(redGlowR);

    /* ── Faisceaux des projecteurs ─────────────────────── */
    const cones = [];
    const coneMat = keep(new THREE.MeshBasicMaterial({
      color: 0xffe2b0, transparent: true, opacity: 0.05,
      side: THREE.DoubleSide, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: false,
    }));
    const coneGeo = keep(new THREE.ConeGeometry(4.2, 16, 28, 1, true));
    const lampTex = keep(makeGlowTexture('rgba(255,236,200,1)', 'rgba(255,220,160,0)'));
    [-7, 0, 7].forEach((x, i) => {
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.set(x, 11, -10.5 - (i === 1 ? 1.2 : 0));
      cone.rotation.z = (i - 1) * 0.1;
      scene.add(cone);
      cones.push(cone);
      const lamp = new THREE.Sprite(keep(new THREE.SpriteMaterial({
        map: lampTex, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, fog: false,
      })));
      lamp.scale.setScalar(2.4);
      lamp.position.set(x, 18.6, cone.position.z);
      scene.add(lamp);
    });

    // flaque de lumière au sol devant la tribune
    const pool = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(20, 12)),
      keep(new THREE.MeshBasicMaterial({
        map: keep(makeGlowTexture('rgba(140,110,70,0.5)', 'rgba(0,0,0,0)')),
        transparent: true, depthWrite: false, opacity: 0.5,
        blending: THREE.AdditiveBlending,
      }))
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(0, 0.02, -5);
    scene.add(pool);

    /* ── Poussière dans les faisceaux ──────────────────── */
    const dustCount = mobile ? 220 : 480;
    const dustGeo = keep(new THREE.BufferGeometry());
    const dustPos = new Float32Array(dustCount * 3);
    const dustSpeed = new Float32Array(dustCount);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 24;
      dustPos[i * 3 + 1] = Math.random() * 12;
      dustPos[i * 3 + 2] = -4 - Math.random() * 12;
      dustSpeed[i] = 0.1 + Math.random() * 0.25;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dust = new THREE.Points(dustGeo, keep(new THREE.PointsMaterial({
      color: 0xffe0b0, size: 0.05, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    })));
    scene.add(dust);

    /* ── Bannières et drapeau ──────────────────────────── */
    const clothMeshes = [];
    function addCloth(w, h, segW, segH, color, x, y, z, pinnedTop, waveAmp) {
      const geo = keep(new THREE.PlaneGeometry(w, h, segW, segH));
      const mat = keep(new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      scene.add(mesh);
      clothMeshes.push({ mesh, geo, base: geo.attributes.position.array.slice(), h, pinnedTop, waveAmp });
      return mesh;
    }
    // deux bannières verticales sombres
    addCloth(2.6, 6.5, 10, 22, 0x4a0d10, -8.2, 6.8, -14, true, 0.16);
    addCloth(2.6, 6.5, 10, 22, 0x400b0e, 8.6, 6.6, -14.5, true, 0.14);
    // un drapeau brandi dans la foule
    const flag = addCloth(2.3, 1.5, 16, 8, 0x8c1216, 3.4, 4.4, -9.5, false, 0.3);
    flag.rotation.z = 0.08;
    // hampe du drapeau
    const pole = new THREE.Mesh(
      keep(new THREE.CylinderGeometry(0.03, 0.03, 3.4)),
      keep(new THREE.MeshBasicMaterial({ color: 0x1a1210 }))
    );
    pole.position.set(2.25, 3.1, -9.5);
    scene.add(pole);

    // grande banderole-slogan au fond de la salle
    const sloganCanvas = document.createElement('canvas');
    sloganCanvas.width = 1024; sloganCanvas.height = 96;
    {
      const sg = sloganCanvas.getContext('2d');
      sg.fillStyle = '#7c1116';
      sg.fillRect(0, 0, 1024, 96);
      sg.strokeStyle = 'rgba(244,226,188,0.5)';
      sg.lineWidth = 3;
      sg.strokeRect(10, 10, 1004, 76);
      sg.fillStyle = '#f4e2bc';
      sg.font = '700 54px Oswald, Impact, sans-serif';
      sg.textAlign = 'center'; sg.textBaseline = 'middle';
      sg.fillText('★  TOUT LE POUVOIR À L’ASSEMBLÉE  ★', 512, 52);
    }
    const sloganTex = keep(new THREE.CanvasTexture(sloganCanvas));
    const sloganGeo = keep(new THREE.PlaneGeometry(16, 1.7, 40, 4));
    const sloganMat = keep(new THREE.MeshBasicMaterial({ map: sloganTex, side: THREE.DoubleSide }));
    const slogan = new THREE.Mesh(sloganGeo, sloganMat);
    slogan.position.set(0, 8.5, -16.5);
    scene.add(slogan);
    clothMeshes.push({ mesh: slogan, geo: sloganGeo, base: sloganGeo.attributes.position.array.slice(), h: 1.7, pinnedTop: true, waveAmp: 0.09 });

    // guirlandes d'ampoules chaudes au-dessus de la salle
    const bulbMat = keep(new THREE.SpriteMaterial({
      map: lampTex, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, fog: false,
    }));
    [[-10, 6.6, -8.5, 0.9], [-10, 7.4, -12.5, 1.1]].forEach(([x0, y0, z, sag]) => {
      for (let i = 0; i <= 8; i++) {
        const k = i / 8;
        const bulb = new THREE.Sprite(bulbMat);
        bulb.position.set(x0 + k * 20, y0 - Math.sin(Math.PI * k) * sag, z);
        bulb.scale.setScalar(0.5);
        scene.add(bulb);
      }
    });

    /* ── Boucle ────────────────────────────────────────── */
    let raf = 0;
    let disposed = false;
    const clock = new THREE.Clock();

    function animate() {
      if (disposed) return;
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const now = performance.now() / 1000;
      const st = stateRef.current;

      const sinceOvation = now - st.ovationT;
      const ovActive = sinceOvation < 3.2;
      const ovK = ovActive ? Math.max(0, 1 - sinceOvation / 3.2) : 0;
      const heat = Math.min(1, st.intensity + ovK * 0.8);

      // caméra documentaire : dérive lente + secousse
      st.shake *= 0.93;
      const shk = st.shake;
      camera.position.x = camBase.x + Math.sin(t * 0.21) * 0.35 + (Math.random() - 0.5) * 0.06 * shk;
      camera.position.y = camBase.y + Math.sin(t * 0.34) * 0.14 + (Math.random() - 0.5) * 0.05 * shk;
      camera.position.z = camBase.z - ovK * 0.9;
      camera.fov = 55 - ovK * 3;
      camera.updateProjectionMatrix();
      camera.lookAt(0, 3 + Math.sin(t * 0.17) * 0.2, -11);

      // tissus : ondulation, plus violente à l'ovation
      for (const c of clothMeshes) {
        const pos = c.geo.attributes.position;
        const arr = pos.array;
        const amp = c.waveAmp * (0.6 + heat * 1.4);
        for (let v = 0; v < arr.length; v += 3) {
          const bx = c.base[v], by = c.base[v + 1];
          // le bord accroché ne bouge pas
          const anchor = c.pinnedTop
            ? Math.min(1, (c.h / 2 - by) / c.h * 1.6)
            : Math.min(1, (bx + 1.15) / 2.3);
          const w = Math.sin(bx * 2.1 + by * 1.4 + t * (1.6 + heat * 2.2)) * amp * anchor;
          arr[v + 2] = w;
          arr[v + 1] = by + Math.sin(bx * 3 + t * 2) * amp * 0.25 * anchor;
        }
        pos.needsUpdate = true;
      }

      // faisceaux qui balaient lentement
      cones.forEach((cone, i) => {
        cone.rotation.z = (i - 1) * 0.1 + Math.sin(t * 0.24 + i * 2.1) * 0.06;
      });
      coneMat.opacity = 0.06 + heat * 0.035 + Math.sin(t * 9) * 0.004;
      bulbMat.opacity = 0.75 + Math.sin(t * 13.7) * 0.05 + Math.sin(t * 3.1) * 0.04;

      // poussière qui retombe dans la lumière
      const dp = dustGeo.attributes.position.array;
      for (let i = 0; i < dustCount; i++) {
        dp[i * 3 + 1] -= dustSpeed[i] * 0.016 * (1 + heat);
        dp[i * 3] += Math.sin(t * 0.6 + i) * 0.0025;
        if (dp[i * 3 + 1] < 0) dp[i * 3 + 1] = 12;
      }
      dustGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    }
    animate();

    const onResize = () => {
      if (!mount.clientWidth) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      disposables.forEach(d => d.dispose && d.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="tr-hall" />;
});

export default SovietHall;
