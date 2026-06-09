import { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function EarthGlobe({ title, setTitle, onAnalyze, loading, view, setView, installPrompt, onInstall, installed, showIosBanner, onDismissIos }) {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;
    const W = el.offsetWidth;
    const H = 640;

    // Scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 0, 2.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Stars
    const starGeo = new THREE.BufferGeometry();
    const starCount = 6000;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
      starPositions[i] = (Math.random() - 0.5) * 200;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, sizeAttenuation: true, transparent: true, opacity: 0.85 });
    scene.add(new THREE.Points(starGeo, starMat));

    // Lighting
    const sun = new THREE.DirectionalLight(0xfff5e8, 2.2);
    sun.position.set(-5, 3, 5);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0x111133, 0.4));

    // Earth sphere
    const earthGeo = new THREE.SphereGeometry(1, 64, 64);
    const loader = new THREE.TextureLoader();

    // Use high-res NASA Blue Marble texture
    const earthTex = loader.load(
      'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
      () => renderer.render(scene, camera)
    );
    const normalTex = loader.load(
      'https://unpkg.com/three-globe/example/img/earth-topology.png'
    );
    const specularTex = loader.load(
      'https://unpkg.com/three-globe/example/img/earth-water.png'
    );

    const earthMat = new THREE.MeshPhongMaterial({
      map: earthTex,
      normalMap: normalTex,
      normalScale: new THREE.Vector2(6, 6),
      specularMap: specularTex,
      specular: new THREE.Color(0x4488ff),
      shininess: 18,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    // Tilt Earth 23.5°
    earthMesh.rotation.z = THREE.MathUtils.degToRad(23.5);
    scene.add(earthMesh);

    // Cloud layer
    const cloudGeo = new THREE.SphereGeometry(1.008, 64, 64);
    const cloudTex = loader.load('https://unpkg.com/three-globe/example/img/earth-clouds.png');
    const cloudMat = new THREE.MeshPhongMaterial({
      map: cloudTex,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    cloudMesh.rotation.z = THREE.MathUtils.degToRad(23.5);
    scene.add(cloudMesh);

    // Atmosphere glow
    const atmosGeo = new THREE.SphereGeometry(1.06, 64, 64);
    const atmosMat = new THREE.MeshPhongMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.08,
      side: THREE.FrontSide,
    });
    scene.add(new THREE.Mesh(atmosGeo, atmosMat));

    // Atmosphere rim (fresnel-like via backside)
    const rimGeo = new THREE.SphereGeometry(1.12, 64, 64);
    const rimMat = new THREE.MeshPhongMaterial({
      color: 0x2266cc,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(rimGeo, rimMat));

    // Resize handler
    function onResize() {
      const W2 = el.offsetWidth;
      camera.aspect = W2 / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W2, H);
    }
    window.addEventListener('resize', onResize);

    // Animate
    function animate() {
      rafRef.current = requestAnimationFrame(animate);
      earthMesh.rotation.y += 0.0008;
      cloudMesh.rotation.y += 0.0010;
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafRef.current);
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="hero-scene" style={{ position: 'relative', background: '#000008' }}>
      <div ref={mountRef} className="earth-mount" />
      <div className="hero-overlay" />

      <nav className="hero-nav">
        <div className="hero-brand">
          <div className="hero-mark">★</div>
          <div>
            <span className="hero-brand-name">Le Compas Communiste</span>
            <span className="hero-brand-sub">Distinguer pour agir</span>
          </div>
        </div>
        <div className="hero-nav-links">
          <a href="#" className={view === 'compas' ? 'active' : ''} onClick={e => { e.preventDefault(); setView('compas'); }}>Le Compas</a>
          <a href="#" className={view === 'jeu'    ? 'active' : ''} onClick={e => { e.preventDefault(); setView('jeu'); }}>★ Le Jeu</a>
        </div>
        {installPrompt && !installed && (
          <button className="hero-install-btn" onClick={onInstall}>⬇ Installer l'app</button>
        )}
        <div className="hero-status">
          <span className="hero-dot" />
          {installed ? 'App installée ✓' : 'Prototype v2.0 · IA active'}
        </div>
      </nav>

      {showIosBanner && (
        <div className="ios-banner">
          <span>Pour installer l'app : appuie sur <b>⎋ Partager</b> puis <b>« Sur l'écran d'accueil »</b></span>
          <button onClick={onDismissIos}>✕</button>
        </div>
      )}

      <div className="hero-ticker">
        <span>«&thinsp;Le capitalisme porte en lui la guerre comme la nuée porte <strong>l'orage</strong>&thinsp;» — Jean Jaurès &nbsp;⬥&nbsp; Outil d'analyse marxiste libre &nbsp;⬥&nbsp; Distinguer pour agir</span>
      </div>

      {view === 'compas' && (
        <div className="hero-content">
          <div className="hero-eyebrow">·· Boussole N° 01 ·· Scan ··</div>
          <h1 className="hero-title">
            <span className="ht-white">Qu'est-ce que tu passes au</span>
            <span className="ht-red">Compas</span>
            <span className="ht-white">aujourd'hui ?</span>
          </h1>
          <p className="hero-sub">
            Une idée, un événement, une réforme. Le compas teste si elle penche vers le <span className="com-em">commun</span> ou vers le <span className="cap-em">capital</span>, axiome par axiome.
          </p>
          <form className="hero-form" onSubmit={onAnalyze} autoComplete="off">
            <input
              className="hero-input"
              type="text"
              required
              maxLength={200}
              placeholder="Ex : Nationalisation d'EDF · Pass rail · Ubérisation…"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            <button className="hero-btn" type="submit" disabled={loading}>
              {loading ? '⟳ Analyse…' : '▶ Analyser'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
