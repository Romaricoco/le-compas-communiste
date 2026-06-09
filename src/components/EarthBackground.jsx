import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function EarthBackground() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = 2.8

    const sun = new THREE.DirectionalLight(0xffffff, 1.4)
    sun.position.set(-2, 1.5, 2)
    scene.add(sun)
    scene.add(new THREE.AmbientLight(0xffffff, 0.08))

    const loader = new THREE.TextureLoader()

    function loadTex(local, cdn, onLoad) {
      loader.load(local, onLoad, undefined, () => loader.load(cdn, onLoad))
    }

    const earthMat = new THREE.MeshPhongMaterial({
      color: new THREE.Color(0x1a4a8a),
      specular: new THREE.Color(0x4488ff),
      shininess: 18,
    })

    loadTex(
      '/textures/earth-blue-marble.jpg',
      'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
      tex => { earthMat.map = tex; earthMat.color.set(0xffffff); earthMat.needsUpdate = true }
    )
    loadTex(
      '/textures/earth-water.png',
      'https://unpkg.com/three-globe/example/img/earth-water.png',
      tex => { earthMat.specularMap = tex; earthMat.needsUpdate = true }
    )

    const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), earthMat)
    earth.position.set(0.8, 0.05, 0)
    scene.add(earth)

    const cloudMat = new THREE.MeshPhongMaterial({ transparent: true, opacity: 0, depthWrite: false })
    loadTex(
      '/textures/earth-clouds.png',
      'https://unpkg.com/three-globe/example/img/earth-clouds.png',
      tex => { cloudMat.map = tex; cloudMat.opacity = 0.35; cloudMat.needsUpdate = true }
    )
    const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.008, 64, 64), cloudMat)
    earth.add(clouds)

    earth.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.06, 32, 32),
      new THREE.MeshLambertMaterial({ color: 0x4488ff, transparent: true, opacity: 0.18, side: THREE.BackSide })
    ))

    const pos = new Float32Array(3000 * 3)
    for (let i = 0; i < pos.length; i++) pos[i] = (Math.random() - 0.5) * 160
    const starsGeo = new THREE.BufferGeometry()
    starsGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    scene.add(new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12 })))

    // Mouse drag state
    let isDragging = false
    let prevX = 0, prevY = 0
    let velX = 0, velY = 0

    const onMouseDown = e => { isDragging = true; prevX = e.clientX; prevY = e.clientY; velX = 0; velY = 0 }
    const onMouseMove = e => {
      if (!isDragging) return
      velX = (e.clientX - prevX) * 0.005
      velY = (e.clientY - prevY) * 0.005
      earth.rotation.y += velX
      earth.rotation.x += velY
      prevX = e.clientX; prevY = e.clientY
    }
    const onMouseUp = () => { isDragging = false }

    const onTouchStart = e => { isDragging = true; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY }
    const onTouchMove = e => {
      if (!isDragging) return
      velX = (e.touches[0].clientX - prevX) * 0.005
      velY = (e.touches[0].clientY - prevY) * 0.005
      earth.rotation.y += velX
      earth.rotation.x += velY
      prevX = e.touches[0].clientX; prevY = e.touches[0].clientY
    }

    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('touchstart', onTouchStart)
    window.addEventListener('touchmove', onTouchMove)
    window.addEventListener('touchend', onMouseUp)

    let raf
    const animate = () => {
      raf = requestAnimationFrame(animate)
      if (!isDragging) {
        // auto-rotate + inertia
        velX *= 0.95
        velY *= 0.95
        earth.rotation.y += 0.0008 + velX
        earth.rotation.x += velY
      }
      clouds.rotation.y += 0.0003
      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onMouseUp)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <>
      <div ref={mountRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'auto', background: '#000' }} />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.88) 100%)',
      }} />
    </>
  )
}
