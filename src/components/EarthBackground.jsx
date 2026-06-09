import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function EarthBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    el.appendChild(renderer.domElement);

    // Scene + Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.z = 2.8;

    // Lights
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.4);
    sunLight.position.set(-2, 1.5, 2);
    scene.add(sunLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.08));

    // Stars
    const starPositions = new Float32Array(3000 * 3);
    for (let i = 0; i < 3000; i++) {
      const r = 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, sizeAttenuation: true })));

    // Earth
    const loader = new THREE.TextureLoader();
    const fallback = new THREE.Color(0x1a4a8a);

    const earthMat = new THREE.MeshPhongMaterial({
      color: fallback,
      specular: new THREE.Color(0x4488ff),
      shininess: 18,
    });
    loader.load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
      tex => { earthMat.map = tex; earthMat.needsUpdate = true; });
    loader.load('https://unpkg.com/three-globe/example/img/earth-water.png',
      tex => { earthMat.specularMap = tex; earthMat.needsUpdate = true; });

    const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), earthMat);
    earth.position.set(0.35, 0.05, 0);
    scene.add(earth);

    // Clouds
    const cloudMat = new THREE.MeshPhongMaterial({ transparent: true, opacity: 0.35, depthWrite: false });
    loader.load('https://unpkg.com/three-globe/example/img/earth-clouds.png',
      tex => { cloudMat.map = tex; cloudMat.needsUpdate = true; });
    const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.008, 64, 64), cloudMat);
    clouds.position.copy(earth.position);
    scene.add(clouds);

    // Atmosphere halo
    const atmos = new THREE.Mesh(
      new THREE.SphereGeometry(1.06, 32, 32),
      new THREE.MeshLambertMaterial({ color: 0x4488ff, transparent: true, opacity: 0.18, side: THREE.BackSide })
    );
    atmos.position.copy(earth.position);
    scene.add(atmos);

    // Resize
    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onResize);

    // Animate
    let raf;
    function animate() {
      raf = requestAnimationFrame(animate);
      earth.rotation.y  += 0.0008;
      clouds.rotation.y += 0.0005;
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <>
      <div ref={mountRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.0) 35%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.88) 100%)'
      }} />
    </>
  );
}
