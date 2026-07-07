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

/* Texture silhouette tête + épaules (dessinée à la volée) */
function makeCrowdTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 128, 128);
  g.fillStyle = '#08080a';
  // épaules
  g.beginPath();
  g.moveTo(6, 128);
  g.bezierCurveTo(10, 78, 40, 66, 64, 66);
  g.bezierCurveTo(88, 66, 118, 78, 122, 128);
  g.closePath();
  g.fill();
  // tête
  g.beginPath();
  g.ellipse(64, 42, 24, 27, 0, 0, Math.PI * 2);
  g.fill();
  // léger liseré de contre-jour sur le crâne
  g.strokeStyle = 'rgba(255,214,160,0.28)';
  g.lineWidth = 2.5;
  g.beginPath();
  g.ellipse(64, 42, 24, 27, 0, -Math.PI * 0.85, -Math.PI * 0.15);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 2;
  return t;
}

/* Texture bras + poing levé */
function makeFistTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 64, 128);
  g.fillStyle = '#08080a';
  // bras
  g.save();
  g.translate(32, 128);
  g.rotate(-0.06);
  g.fillRect(-7, -104, 14, 104);
  g.restore();
  // poing
  g.beginPath();
  g.ellipse(30, 22, 14, 16, -0.1, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(255,214,160,0.3)';
  g.lineWidth = 2;
  g.beginPath();
  g.ellipse(30, 22, 14, 16, -0.1, -Math.PI * 0.9, -Math.PI * 0.1);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  return t;
}

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
    const backGlowTex = keep(makeGlowTexture('rgba(96,64,34,0.85)', 'rgba(0,0,0,0)'));
    const backGlow = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(70, 30)),
      keep(new THREE.MeshBasicMaterial({
        map: backGlowTex, transparent: true, depthWrite: false,
        opacity: 0.5, fog: false,
      }))
    );
    backGlow.position.set(0, 6, -24);
    scene.add(backGlow);

    // lueur rouge diffuse côté bannières
    const redGlow = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(30, 20)),
      keep(new THREE.MeshBasicMaterial({
        map: keep(makeGlowTexture('rgba(110,16,18,0.5)', 'rgba(0,0,0,0)')),
        transparent: true, depthWrite: false, opacity: 0.55, fog: false,
        blending: THREE.AdditiveBlending,
      }))
    );
    redGlow.position.set(-9, 7, -22);
    scene.add(redGlow);

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

    /* ── La foule ──────────────────────────────────────── */
    const crowdTex = keep(makeCrowdTexture());
    const rows = 7;
    const perRow = mobile ? 26 : 42;
    const crowdCount = rows * perRow;
    const crowdGeo = keep(new THREE.PlaneGeometry(1, 1));
    const crowdMat = keep(new THREE.MeshBasicMaterial({
      map: crowdTex, transparent: true, alphaTest: 0.45,
      side: THREE.DoubleSide,
    }));
    const crowd = new THREE.InstancedMesh(crowdGeo, crowdMat, crowdCount);
    const crowdBase = [];
    const dummy = new THREE.Object3D();
    let ci = 0;
    for (let r = 0; r < rows; r++) {
      const z = -6.5 - r * 1.7;
      const y = 0.85 + r * 0.52;
      const spread = 9 + r * 1.1;
      for (let k = 0; k < perRow; k++) {
        const x = -spread + (k / (perRow - 1)) * spread * 2 + (Math.random() - 0.5) * 0.7;
        const s = 1.55 + Math.random() * 0.5 + r * 0.06;
        crowdBase.push({
          x, y: y + (Math.random() - 0.5) * 0.2, z: z + (Math.random() - 0.5) * 0.8,
          s, phase: Math.random() * Math.PI * 2, amp: 0.5 + Math.random(),
        });
        const b = crowdBase[ci];
        dummy.position.set(b.x, b.y, b.z);
        dummy.scale.set(b.s, b.s, 1);
        dummy.updateMatrix();
        crowd.setMatrixAt(ci, dummy.matrix);
        ci++;
      }
    }
    scene.add(crowd);

    /* ── Les poings levés ──────────────────────────────── */
    const fistTex = keep(makeFistTexture());
    const fistCount = mobile ? 44 : 80;
    const fistGeo = keep(new THREE.PlaneGeometry(0.5, 1));
    const fistMat = keep(new THREE.MeshBasicMaterial({
      map: fistTex, transparent: true, alphaTest: 0.45, side: THREE.DoubleSide,
    }));
    const fists = new THREE.InstancedMesh(fistGeo, fistMat, fistCount);
    const fistBase = [];
    for (let i = 0; i < fistCount; i++) {
      const host = crowdBase[Math.floor(Math.random() * crowdBase.length)];
      fistBase.push({
        x: host.x + (Math.random() - 0.5) * 0.3,
        y: host.y, z: host.z + 0.05,
        s: host.s, phase: Math.random() * Math.PI * 2,
        stagger: Math.random() * 0.5,
        zealous: Math.random() < 0.28, // certains gardent le poing levé quand la salle chauffe
      });
      dummy.position.set(0, -99, 0);
      dummy.scale.set(0.001, 0.001, 1);
      dummy.updateMatrix();
      fists.setMatrixAt(i, dummy.matrix);
    }
    scene.add(fists);

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

      // foule : houle permanente, plus nerveuse quand ça chauffe
      const bobSpeed = 1.1 + heat * 2.4;
      for (let i = 0; i < crowdCount; i++) {
        const b = crowdBase[i];
        const bob = Math.sin(t * bobSpeed * b.amp + b.phase) * (0.035 + heat * 0.09);
        const swayR = Math.sin(t * 0.7 * b.amp + b.phase * 2) * (0.01 + heat * 0.05);
        dummy.position.set(b.x, b.y + Math.max(0, bob), b.z);
        dummy.rotation.set(0, 0, swayR);
        dummy.scale.set(b.s, b.s, 1);
        dummy.updateMatrix();
        crowd.setMatrixAt(i, dummy.matrix);
      }
      crowd.instanceMatrix.needsUpdate = true;

      // poings : levés en masse à l'ovation, quelques-uns dressés selon la chaleur
      for (let i = 0; i < fistCount; i++) {
        const f = fistBase[i];
        let up = 0;
        if (ovActive) {
          const local = Math.min(1, Math.max(0, (sinceOvation - f.stagger) / 0.35));
          const fall = sinceOvation > 2.2 ? Math.max(0, 1 - (sinceOvation - 2.2) / 1) : 1;
          up = local * fall;
        } else if (f.zealous && heat > 0.55) {
          up = Math.min(1, (heat - 0.55) * 3);
        }
        if (up > 0.01) {
          const pump = Math.sin(t * 7 + f.phase) * 0.09 * up * (0.4 + heat);
          dummy.position.set(f.x, f.y + 0.55 * f.s * up + pump, f.z);
          dummy.scale.set(0.5 * f.s, f.s * up, 1);
          dummy.rotation.set(0, 0, Math.sin(f.phase) * 0.14);
        } else {
          dummy.position.set(0, -99, 0);
          dummy.scale.set(0.001, 0.001, 1);
          dummy.rotation.set(0, 0, 0);
        }
        dummy.updateMatrix();
        fists.setMatrixAt(i, dummy.matrix);
      }
      fists.instanceMatrix.needsUpdate = true;

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
      coneMat.opacity = 0.045 + heat * 0.03 + Math.sin(t * 9) * 0.004;

      // poussière qui retombe dans la lumière
      const dp = dustGeo.attributes.position.array;
      for (let i = 0; i < dustCount; i++) {
        dp[i * 3 + 1] -= dustSpeed[i] * 0.016 * (1 + heat);
        dp[i * 3] += Math.sin(t * 0.6 + i) * 0.0025;
        if (dp[i * 3 + 1] < 0) dp[i * 3 + 1] = 12;
      }
      dustGeo.attributes.position.needsUpdate = true;

      // caméra documentaire : dérive lente + secousse
      st.shake *= 0.93;
      const shk = st.shake;
      camera.position.x = camBase.x + Math.sin(t * 0.21) * 0.35 + (Math.random() - 0.5) * 0.06 * shk;
      camera.position.y = camBase.y + Math.sin(t * 0.34) * 0.14 + (Math.random() - 0.5) * 0.05 * shk;
      camera.position.z = camBase.z - ovK * 0.9;
      camera.fov = 55 - ovK * 3;
      camera.updateProjectionMatrix();
      camera.lookAt(0, 3 + Math.sin(t * 0.17) * 0.2, -11);

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
      crowd.dispose();
      fists.dispose();
      disposables.forEach(d => d.dispose && d.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="tr-hall" />;
});

export default SovietHall;
