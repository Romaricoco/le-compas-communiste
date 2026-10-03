import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

/* ══════════════════════════════════════════════════════════
   LA SALLE DU SOVIET — décor 3D temps réel
   Vraies lumières (SpotLight + Hemisphere) sur de la vraie
   géométrie éclairée (sol, mur, pupitre), avec un vrai bloom
   en post-traitement — plus des sprites plats en additive sur
   fond noir, qui lisaient comme un jeu des années 80.
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

/* Pupitre : profil trapézoïdal extrudé — absent du décor jusqu'ici */
function makePodium() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.95, 0);
  shape.lineTo(0.95, 0);
  shape.lineTo(0.68, 1.35);
  shape.lineTo(-0.68, 1.35);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.62, bevelEnabled: false });
  geo.center();
  return geo;
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
    scene.fog = new THREE.FogExp2(0x060403, 0.042);

    const camera = new THREE.PerspectiveCamera(
      55, mount.clientWidth / mount.clientHeight, 0.1, 80
    );
    const camBase = new THREE.Vector3(0, 2.3, 9);
    camera.position.copy(camBase);

    const disposables = [];
    const keep = o => { disposables.push(o); return o; };

    /* ── Éclairage réel : fini le plat, la scène a de vraies ombres
       et un vrai falloff de lumière sur la géométrie ─────────── */
    const hemi = new THREE.HemisphereLight(0x3a2e24, 0x0c0808, 0.55);
    scene.add(hemi);

    const spotLights = [];
    const spotIntensity = mobile ? 55 : 85;
    [-7, 0, 7].forEach((x, i) => {
      const light = new THREE.SpotLight(0xffd9a0, spotIntensity, 34, Math.PI / 7.2, 0.55, 1.5);
      light.position.set(x, 12.5, -7.5 - (i === 1 ? 1.2 : 0));
      // le projecteur central tient le pupitre, les deux latéraux
      // balaient les gradins pour que l'assemblée ne soit pas une
      // masse noire
      if (i === 1) light.target.position.set(0, 0.4, -6);
      else light.target.position.set(x * 0.7, 2.5, -12.5);
      scene.add(light, light.target);
      spotLights.push(light);
    });
    // lumière d'appoint chaude et froide pour que le pupitre ne soit
    // jamais plat ni purement éclairé d'une seule source
    const fillWarm = new THREE.PointLight(0xffb070, mobile ? 6 : 10, 14, 2);
    fillWarm.position.set(2.5, 2.2, -4);
    scene.add(fillWarm);
    const fillCool = new THREE.PointLight(0x5068a0, mobile ? 3 : 5, 16, 2);
    fillCool.position.set(-4, 3, -3);
    scene.add(fillCool);
    // contre-jour : lumière rasante venue du fond, qui dessine un liseré
    // chaud sur les têtes et les épaules de l'assemblée
    const rim = new THREE.DirectionalLight(0xffa060, 2.2);
    rim.position.set(0, 14, -32);
    rim.target.position.set(0, 0, -6);
    scene.add(rim, rim.target);

    /* ── Géométrie du décor, enfin réellement éclairée ─────────── */
    const floor = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(60, 40)),
      keep(new THREE.MeshStandardMaterial({ color: 0x120d0a, roughness: 0.95, metalness: 0 }))
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);

    const backWall = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(70, 30)),
      keep(new THREE.MeshStandardMaterial({ color: 0x1a110e, roughness: 0.92, metalness: 0 }))
    );
    backWall.position.set(0, 10, -25);
    scene.add(backWall);

    const podium = new THREE.Mesh(
      keep(makePodium()),
      keep(new THREE.MeshStandardMaterial({ color: 0x1c130f, roughness: 0.72, metalness: 0.12 }))
    );
    podium.position.set(0, 0.68, -6);
    scene.add(podium);
    // plaque rouge du pupitre, légèrement émissive — elle doit scintiller
    // sous le bloom, pas rester un aplat mort
    const plaque = new THREE.Mesh(
      keep(new THREE.BoxGeometry(0.72, 0.22, 0.04)),
      keep(new THREE.MeshStandardMaterial({
        color: 0x5c0d10, roughness: 0.4, metalness: 0.2,
        emissive: 0x7c1116, emissiveIntensity: 0.9,
      }))
    );
    plaque.position.set(0, 1.08, -5.68);
    scene.add(plaque);

    /* ── Fond enfumé (contre-jour) ─────────────────────── */
    // contre-jour chaud derrière les gradins : c'est lui qui découpe
    // les silhouettes de l'assemblée
    const backGlowTex = keep(makeGlowTexture('rgba(220,140,70,1)', 'rgba(0,0,0,0)'));
    const backGlow = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(60, 26)),
      keep(new THREE.MeshBasicMaterial({
        map: backGlowTex, transparent: true, depthWrite: false,
        opacity: 0.85, fog: false,
      }))
    );
    backGlow.position.set(0, 5, -23.8);
    scene.add(backGlow);

    // lueur rouge : présente des deux côtés, mais contenue — pas un
    // bain de rouge, juste la couleur du décor qui affleure.
    const redGlowTex = keep(makeGlowTexture('rgba(120,18,20,0.4)', 'rgba(0,0,0,0)'));
    const redGlowMat = keep(new THREE.MeshBasicMaterial({
      map: redGlowTex, transparent: true, depthWrite: false, opacity: 0.4, fog: false,
      blending: THREE.AdditiveBlending,
    }));
    const redGlowL = new THREE.Mesh(keep(new THREE.PlaneGeometry(26, 18)), redGlowMat);
    redGlowL.position.set(-9.5, 6.5, -20);
    scene.add(redGlowL);
    const redGlowR = new THREE.Mesh(keep(new THREE.PlaneGeometry(26, 18)), redGlowMat);
    redGlowR.position.set(9.5, 6.5, -20);
    scene.add(redGlowR);

    /* ── Faisceaux des projecteurs — effet de volume (poussière
       éclairée) superposé à la vraie lumière, pas un remplacement ── */
    const cones = [];
    // Faisceau à bords doux : l'opacité dépend de l'angle de vue
    // (centre du cône dense, bords qui s'évanouissent) et s'estompe
    // vers le bas — fini le trapèze à arêtes dures, signature des
    // jeux 80s.
    const coneMat = keep(new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(0xffdcaa) }, uOpacity: { value: 0.16 } },
      vertexShader: `
        varying vec3 vN; varying vec3 vV; varying float vH;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          vH = position.y;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 uColor; uniform float uOpacity;
        varying vec3 vN; varying vec3 vV; varying float vH;
        void main() {
          float facing = pow(abs(dot(vN, vV)), 2.2);
          float fade = smoothstep(-8.0, 6.0, vH);
          gl_FragColor = vec4(uColor, facing * fade * uOpacity);
        }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
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
        map: lampTex, transparent: true, opacity: 0.85,
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
        map: keep(makeGlowTexture('rgba(140,110,70,0.35)', 'rgba(0,0,0,0)')),
        transparent: true, depthWrite: false, opacity: 0.4,
        blending: THREE.AdditiveBlending,
      }))
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(0, 0.03, -5);
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

    /* ── L'assemblée : silhouettes en contre-jour sur gradins ──
       Pas de visages (ils faisaient peur) : des corps sombres découpés
       sur la lumière du fond, debout, bras levés, qui sautent. */
    const rows = 9;
    const perRow = mobile ? 20 : 34;
    const people = [];
    // blanc : la teinte réelle vient de la couleur par instance
    const crowdMat = keep(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }));
    const tierMat = keep(new THREE.MeshStandardMaterial({ color: 0x100b09, roughness: 0.95 }));
    for (let r = 0; r < rows; r++) {
      const z = -8.6 - r * 1.35;
      const base = r * 0.6;
      const spread = 6.8 + r * 1.0;
      if (base > 0) {
        const tier = new THREE.Mesh(keep(new THREE.BoxGeometry(spread * 2 + 2, base, 1.45)), tierMat);
        tier.position.set(0, base / 2, z);
        scene.add(tier);
      }
      for (let k = 0; k < perRow; k++) {
        people.push({
          x: -spread + (k / (perRow - 1)) * spread * 2 + (Math.random() - 0.5) * 0.5,
          z: z + (Math.random() - 0.5) * 0.4,
          base,
          s: 1.15 + Math.random() * 0.3,
          phase: Math.random() * Math.PI * 2,
          speed: 2 + Math.random() * 2.5,
          // seuil d'enthousiasme : certains lèvent le poing tout de suite
          eager: Math.random(),
          side: Math.random() < 0.5 ? -1 : 1,
          both: Math.random() < 0.3,
        });
      }
    }
    const nP = people.length;
    const bodies = new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.26, 0.6, 4, 8)), crowdMat, nP);
    const heads = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.17, 10, 8)), crowdMat, nP);
    const armsA = new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.065, 0.55, 3, 6)), crowdMat, nP);
    const armsB = new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.065, 0.55, 3, 6)), crowdMat, nP);
    [bodies, heads, armsA, armsB].forEach(m => { keep(m); scene.add(m); });
    // chacun sa veste : tons de laine, de toile, de cuir, et des
    // chemises rouges de militants ici et là
    const COATS = [0x2a201a, 0x241e1c, 0x302419, 0x1f2124, 0x2c2622, 0x3a2a1c];
    const SKINS = [0x5a4232, 0x3e2c22, 0x6a4c38, 0x2e2018, 0x4c3626];
    const col = new THREE.Color();
    for (let i = 0; i < nP; i++) {
      const coat = Math.random() < 0.12 ? 0x6e1014 : COATS[i % COATS.length];
      col.setHex(coat);
      bodies.setColorAt(i, col); armsA.setColorAt(i, col); armsB.setColorAt(i, col);
      heads.setColorAt(i, col.setHex(SKINS[(i * 7) % SKINS.length]));
    }
    [bodies, heads, armsA, armsB].forEach(m => { if (m.instanceColor) m.instanceColor.needsUpdate = true; });
    const dummy = new THREE.Object3D();
    const setArm = (mesh, i, sx, sy, z, angle, side, s) => {
      // angle 0 = bras tendu vers le haut, π = bras le long du corps
      const dx = Math.sin(angle) * side, dy = Math.cos(angle);
      dummy.position.set(sx + dx * 0.34 * s, sy + dy * 0.34 * s, z);
      dummy.rotation.set(0, 0, -angle * side);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    };

    // drapeaux brandis un peu partout dans les gradins
    const crowdFlags = [];
    for (let f = 0; f < (mobile ? 4 : 7); f++) {
      const p = people[Math.floor(Math.random() * nP)];
      crowdFlags.push({ p, h: 1.6 + Math.random() * 0.8 });
    }

    /* ── Bannières et drapeau ──────────────────────────── */
    const clothMeshes = [];
    function addCloth(w, h, segW, segH, color, x, y, z, pinnedTop, waveAmp) {
      const geo = keep(new THREE.PlaneGeometry(w, h, segW, segH));
      const mat = keep(new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.85 }));
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      scene.add(mesh);
      clothMeshes.push({ mesh, geo, base: geo.attributes.position.array.slice(), h, pinnedTop, waveAmp });
      return mesh;
    }
    // deux bannières verticales sombres
    addCloth(2.6, 6.5, 10, 22, 0x8a1418, -8.2, 6.8, -14, true, 0.16);
    addCloth(2.6, 6.5, 10, 22, 0x7e1216, 8.6, 6.6, -14.5, true, 0.14);
    // un drapeau brandi dans la foule
    const flag = addCloth(2.3, 1.5, 16, 8, 0x8c1216, 3.4, 4.4, -9.5, false, 0.3);
    flag.rotation.z = 0.08;
    // hampe du drapeau
    const pole = new THREE.Mesh(
      keep(new THREE.CylinderGeometry(0.03, 0.03, 3.4)),
      keep(new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.6 }))
    );
    pole.position.set(2.25, 3.1, -9.5);
    scene.add(pole);

    const poleGeo = keep(new THREE.CylinderGeometry(0.025, 0.025, 1));
    const poleMat = keep(new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.6 }));
    crowdFlags.forEach(({ p, h }) => {
      const top = p.base + 1.2 * p.s + h;
      const fp = new THREE.Mesh(poleGeo, poleMat);
      fp.scale.y = h + 0.6;
      fp.position.set(p.x + 0.3, p.base + 1.2 * p.s + (h - 0.6) / 2, p.z);
      scene.add(fp);
      addCloth(1.1, 0.7, 10, 5, Math.random() < 0.8 ? 0x8c1216 : 0x6a0e12,
        p.x + 0.3 + 0.55, top - 0.35, p.z, false, 0.26);
    });

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

    /* ── Post-traitement : vrai bloom, pas des sprites additive
       qui simulaient grossièrement la lumière qui déborde ───── */
    // sur mobile on s'en passe : le bloom coûte trop cher en calcul et
    // ferait ramer toute la page (texte, animations des délégués)
    let composer = null, bloomPass = null;
    if (!mobile) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      bloomPass = new UnrealBloomPass(new THREE.Vector2(mount.clientWidth, mount.clientHeight), 0.85, 0.46, 0.78);
      composer.addPass(bloomPass);
    }

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

      // les projecteurs réagissent à la chaleur de la salle — plus
      // vifs, et un vacillement réaliste de théâtre
      spotLights.forEach((light, i) => {
        light.intensity = spotIntensity * (0.72 + heat * 0.4) + Math.sin(t * 9 + i * 2) * 1.2;
      });

      // l'assemblée ne tient pas en place : ça trépigne en permanence,
      // les poings se lèvent à mesure que la salle chauffe, et tout le
      // monde saute bras en l'air à l'ovation
      const sinceMurmur = now - st.murmurT;
      const murK = sinceMurmur < 1.6 ? 1 - sinceMurmur / 1.6 : 0;
      for (let i = 0; i < nP; i++) {
        const p = people[i];
        const fervor = Math.min(1, 0.3 + heat * 0.75 + ovK);
        const bounce = Math.abs(Math.sin(t * p.speed * (0.6 + fervor) + p.phase));
        const lift = bounce * (0.03 + fervor * 0.1) + ovK * bounce * 0.35;
        const y = p.base + lift;
        const s = p.s;
        const sway = Math.sin(t * 1.3 + p.phase) * 0.06 * (0.5 + fervor) + murK * Math.sin(t * 7 + p.phase) * 0.05;

        dummy.position.set(p.x, y + 0.56 * s, p.z);
        dummy.rotation.set(0, 0, sway);
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        bodies.setMatrixAt(i, dummy.matrix);

        dummy.position.set(p.x + sway * 0.5, y + 1.25 * s, p.z);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        heads.setMatrixAt(i, dummy.matrix);

        // poing levé si l'enthousiasme dépasse son seuil personnel
        const up = ovK > 0.05 || p.eager < 0.22 + heat * 0.7;
        const pump = Math.sin(t * p.speed * 2 + p.phase) * 0.35;
        const armUp = up ? 0.15 + pump * 0.4 : Math.PI - 0.25;
        const armDown = Math.PI - 0.25 + Math.sin(t + p.phase) * 0.1;
        const sy = y + 0.95 * s;
        setArm(armsA, i, p.x + 0.27 * s * p.side, sy, p.z, armUp, p.side, s);
        setArm(armsB, i, p.x - 0.27 * s * p.side, sy, p.z,
          (up && (p.both || ovK > 0.05)) ? 0.25 - pump * 0.4 : armDown, -p.side, s);
      }
      bodies.instanceMatrix.needsUpdate = true;
      heads.instanceMatrix.needsUpdate = true;
      armsA.instanceMatrix.needsUpdate = true;
      armsB.instanceMatrix.needsUpdate = true;

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
      coneMat.uniforms.uOpacity.value = 0.13 + heat * 0.09 + Math.sin(t * 9) * 0.008;
      bulbMat.opacity = 0.75 + Math.sin(t * 13.7) * 0.05 + Math.sin(t * 3.1) * 0.04;

      // poussière qui retombe dans la lumière
      const dp = dustGeo.attributes.position.array;
      for (let i = 0; i < dustCount; i++) {
        dp[i * 3 + 1] -= dustSpeed[i] * 0.016 * (1 + heat);
        dp[i * 3] += Math.sin(t * 0.6 + i) * 0.0025;
        if (dp[i * 3 + 1] < 0) dp[i * 3 + 1] = 12;
      }
      dustGeo.attributes.position.needsUpdate = true;

      if (composer) composer.render(); else renderer.render(scene, camera);
    }
    animate();

    const onResize = () => {
      if (!mount.clientWidth) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      composer?.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      disposables.forEach(d => d.dispose && d.dispose());
      bloomPass?.dispose?.();
      composer?.dispose?.();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="tr-hall" />;
});

export default SovietHall;
