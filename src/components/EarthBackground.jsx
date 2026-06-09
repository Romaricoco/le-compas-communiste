import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const BASE = '/textures/'

export default function EarthBackground() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    const W = window.innerWidth
    const H = window.innerHeight

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(window.devicePixelRatio)
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000)
    camera.position.z = 2.8

    const sun = new THREE.DirectionalLight(0xffffff, 1.4)
    sun.position.set(-2, 1.5, 2)
    scene.add(sun)
    scene.add(new THREE.AmbientLight(0xffffff, 0.08))

    const loader = new THREE.TextureLoader()

    const earthMat = new THREE.MeshPhongMaterial({
      map: loader.load(BASE + 'earth-blue-marble.jpg'),
      specularMap: loader.load(BASE + 'earth-water.png'),
      specular: new THREE.Color(0x4488ff),
      shininess: 18,
    })
    const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), earthMat)
    earth.position.set(0.3, 0.05, 0)
    scene.add(earth)

    const atmMat = new THREE.MeshLambertMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide,
    })
    earth.add(new THREE.Mesh(new THREE.SphereGeometry(1.06, 32, 32), atmMat))

    const positions = new Float32Array(3000 * 3)
    for (let i = 0; i < positions.length; i++) {
      positions[i] = (Math.random() - 0.5) * 160
    }
    const starsGeo = new THREE.BufferGeometry()
    starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    scene.add(new THREE.Points(
      starsGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.12 })
    ))

    let raf
    const animate = () => {
      raf = requestAnimationFrame(animate)
      earth.rotation.y += 0.0008
      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      const W = window.innerWidth
      const H = window.innerHeight
      camera.aspect = W / H
      camera.updateProjectionMatrix()
      renderer.setSize(W, H)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <>
      <div ref={mountRef} style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        background: '#000',
      }} />
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.88) 100%)',
      }} />
    </>
  )
}
