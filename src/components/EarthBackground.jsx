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

    // — Lénine en apesanteur —
    const lenineTex = loader.load('/lenine.jpg')
    const lenine = new THREE.Mesh(
      new THREE.PlaneGeometry(0.38, 0.48),
      new THREE.MeshBasicMaterial({ map: lenineTex, transparent: true, depthWrite: false })
    )
    lenine.position.set(-1.4, 0.6, 0.5)
    scene.add(lenine)
    let lenineT = 0
    let isDragging = false
    let prevX = 0, prevY = 0
    let velX = 0, velY = 0

    const INTERACTIVE = ['INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'A']

    const onMouseDown = e => {
      if (INTERACTIVE.includes(e.target.tagName)) return
      e.preventDefault()
      isDragging = true; prevX = e.clientX; prevY = e.clientY; velX = 0; velY = 0
      document.body.style.cursor = 'grabbing'
      document.body.style.userSelect = 'none'
    }
    const onMouseMove = e => {
      if (!isDragging) return
      velX = (e.clientX - prevX) * 0.005
      velY = (e.clientY - prevY) * 0.005
      earth.rotation.y += velX
      earth.rotation.x += velY
      prevX = e.clientX; prevY = e.clientY
    }
    const onMouseUp = () => {
      isDragging = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    const onTouchStart = e => {
      if (INTERACTIVE.includes(e.target.tagName)) return
      isDragging = true; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY
    }
    const onTouchMove = e => {
      if (!isDragging) return
      velX = (e.touches[0].clientX - prevX) * 0.005
      velY = (e.touches[0].clientY - prevY) * 0.005
      earth.rotation.y += velX
      earth.rotation.x += velY
      prevX = e.touches[0].clientX; prevY = e.touches[0].clientY
    }

    // Zoom with wheel
    const onWheel = e => {
      if (INTERACTIVE.includes(e.target.tagName)) return
      camera.position.z = Math.min(6, Math.max(1.2, camera.position.z + e.deltaY * 0.003))
    }

    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onMouseUp)

    // — Sputnik —
    const sputnikGroup = new THREE.Group()
    scene.add(sputnikGroup)

    // Corps métallique
    const sputnikMat = new THREE.MeshPhongMaterial({ color: 0xcccccc, specular: 0xffffff, shininess: 120 })
    const sputnikBody = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), sputnikMat)
    sputnikGroup.add(sputnikBody)

    // 4 antennes
    const antennaMat = new THREE.MeshPhongMaterial({ color: 0xaaaaaa, shininess: 60 })
    const antennaAngles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5]
    antennaAngles.forEach(angle => {
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.002, 0.18, 6), antennaMat)
      ant.position.set(Math.cos(angle) * 0.04, -0.07, Math.sin(angle) * 0.04)
      ant.rotation.z = (Math.cos(angle) * 0.5)
      ant.rotation.x = (Math.sin(angle) * 0.5)
      sputnikGroup.add(ant)
    })

    // Drapeau rouge (mât + tissu)
    const poleMat = new THREE.MeshPhongMaterial({ color: 0xaaaaaa })
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.14, 6), poleMat)
    pole.position.set(0, 0.12, 0)
    sputnikGroup.add(pole)

    const flagMat = new THREE.MeshBasicMaterial({ color: 0xcc0000, side: THREE.DoubleSide })
    const flagGeo = new THREE.PlaneGeometry(0.1, 0.065, 12, 6)
    const flagOrigZ = new Float32Array(flagGeo.attributes.position.count)
    for (let i = 0; i < flagOrigZ.length; i++) flagOrigZ[i] = flagGeo.attributes.position.getZ(i)
    const flag = new THREE.Mesh(flagGeo, flagMat)
    flag.position.set(0.05, 0.165, 0)
    sputnikGroup.add(flag)

    // Orbite inclinée autour de la Terre
    const ORBIT_RADIUS = 1.55
    const ORBIT_TILT = Math.PI / 5
    let orbitAngle = 0

    let raf
    const animate = () => {
      raf = requestAnimationFrame(animate)
      if (!isDragging) {
        velX *= 0.95
        velY *= 0.95
        earth.rotation.y += 0.0008 + velX
        earth.rotation.x += velY
      }
      clouds.rotation.y += 0.0003

      // Sputnik orbit
      orbitAngle += 0.004
      const ox = Math.cos(orbitAngle) * ORBIT_RADIUS
      const oy = Math.sin(orbitAngle) * Math.sin(ORBIT_TILT) * ORBIT_RADIUS
      const oz = Math.sin(orbitAngle) * Math.cos(ORBIT_TILT) * ORBIT_RADIUS
      sputnikGroup.position.set(earth.position.x + ox, earth.position.y + oy, earth.position.z + oz)
      sputnikGroup.rotation.y += 0.02

      // Lénine dérive lentement en apesanteur
      lenineT += 0.004
      lenine.position.y = 0.6 + Math.sin(lenineT * 0.7) * 0.12
      lenine.position.x = -1.4 + Math.sin(lenineT * 0.4) * 0.08
      lenine.rotation.z = Math.sin(lenineT * 0.5) * 0.08
      lenine.lookAt(camera.position)

      // Ondulation du drapeau
      const pos2 = flagGeo.attributes.position
      const t2 = performance.now() * 0.003
      for (let i = 0; i < pos2.count; i++) {
        const x = pos2.getX(i)
        const wave = Math.sin(x * 30 + t2) * 0.012 * ((x + 0.05) / 0.1)
        pos2.setZ(i, flagOrigZ[i] + wave)
      }
      pos2.needsUpdate = true

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
      window.removeEventListener('wheel', onWheel)
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
