/**
 * 3D MOBA Canyon Map with Lanes, River, Bushes, and Obstacles
 */
class MobaMap {
  constructor(scene) {
    this.scene = scene;
    this.bushes = [];
    this.obstacles = [];
    this.waypoints = {
      blueMid: [
        new THREE.Vector3(-45, 0, 45),
        new THREE.Vector3(-20, 0, 20),
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(20, 0, -20),
        new THREE.Vector3(45, 0, -45)
      ],
      redMid: [
        new THREE.Vector3(45, 0, -45),
        new THREE.Vector3(20, 0, -20),
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(-20, 0, 20),
        new THREE.Vector3(-45, 0, 45)
      ]
    };

    this.createTerrain();
    this.createBushes();
    this.createBaseFountains();
    this.createJungleCampDecorations();
  }

  createTerrain() {
    // 1. Base Ground (160x160)
    const groundGeo = new THREE.PlaneGeometry(160, 160, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a2e22, // Rich dark forest green
      roughness: 0.85,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 2. Stone Lane paths
    const laneGeo = new THREE.PlaneGeometry(14, 150);
    const laneMat = new THREE.MeshStandardMaterial({
      color: 0x3d4349, // Slate stone
      roughness: 0.9,
      metalness: 0.05
    });

    // Diagonal Mid Lane
    const midLane = new THREE.Mesh(laneGeo, laneMat);
    midLane.rotation.x = -Math.PI / 2;
    midLane.rotation.z = Math.PI / 4;
    midLane.position.y = 0.02;
    midLane.receiveShadow = true;
    this.scene.add(midLane);

    // 3. River (Traversing perpendicular to Mid Lane)
    const riverGeo = new THREE.PlaneGeometry(18, 150);
    const riverMat = new THREE.MeshStandardMaterial({
      color: 0x0f4c81,
      roughness: 0.2,
      metalness: 0.6,
      transparent: true,
      opacity: 0.85
    });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.rotation.x = -Math.PI / 2;
    river.rotation.z = -Math.PI / 4;
    river.position.y = 0.01;
    river.receiveShadow = true;
    this.scene.add(river);

    // 4. Boundary Cliff Walls
    this.createCliffWalls();
  }

  createCliffWalls() {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x222a35,
      roughness: 0.9
    });

    // Outer boundary walls
    const wallConfigs = [
      { w: 160, h: 8, d: 4, x: 0, y: 4, z: -80 },
      { w: 160, h: 8, d: 4, x: 0, y: 4, z: 80 },
      { w: 4, h: 8, d: 160, x: -80, y: 4, z: 0 },
      { w: 4, h: 8, d: 160, x: 80, y: 4, z: 0 },
      // Mid lane rock obstacles
      { w: 10, h: 5, d: 6, x: -14, y: 2.5, z: 2 },
      { w: 10, h: 5, d: 6, x: 14, y: 2.5, z: -2 },
      // Jungle camp rock backings
      { w: 14, h: 6, d: 4, x: -30, y: 3, z: 0 },
      { w: 14, h: 6, d: 4, x: 30, y: 3, z: 0 },
      { w: 4, h: 6, d: 14, x: 0, y: 3, z: -30 },
      { w: 4, h: 6, d: 14, x: 0, y: 3, z: 30 }
    ];

    wallConfigs.forEach(c => {
      const geo = new THREE.BoxGeometry(c.w, c.h, c.d);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set(c.x, c.y, c.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.obstacles.push({
        minX: c.x - c.w / 2 - 1.0,
        maxX: c.x + c.w / 2 + 1.0,
        minZ: c.z - c.d / 2 - 1.0,
        maxZ: c.z + c.d / 2 + 1.0
      });
    });
  }

  createBushes() {
    // 6 strategic bushes: River bushes, jungle bushes, lane entrance bushes
    const bushPositions = [
      { x: -8, z: 12, radius: 4.2 },   // River Blue-side
      { x: 8, z: -12, radius: 4.2 },   // River Red-side
      { x: -22, z: 6, radius: 4.0 },   // Blue Blue-buff bush
      { x: 22, z: -6, radius: 4.0 },   // Red Red-buff bush
      { x: 6, z: 22, radius: 4.0 },    // Blue Red-buff bush
      { x: -6, z: -22, radius: 4.0 }   // Red Blue-buff bush
    ];

    bushPositions.forEach((b, idx) => {
      const bushGroup = new THREE.Group();
      const grassCount = 45;

      const grassMat = new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        roughness: 0.6,
        metalness: 0.1,
        side: THREE.DoubleSide
      });

      for (let i = 0; i < grassCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * (b.radius - 0.5);
        const gx = Math.cos(angle) * dist;
        const gz = Math.sin(angle) * dist;

        const bladeGeo = new THREE.ConeGeometry(0.25, 1.8 + Math.random() * 0.6, 4);
        const blade = new THREE.Mesh(bladeGeo, grassMat);
        blade.position.set(gx, 0.9, gz);
        blade.rotation.y = Math.random() * Math.PI;
        blade.rotation.z = (Math.random() - 0.5) * 0.3;
        blade.castShadow = true;
        bushGroup.add(blade);
      }

      bushGroup.position.set(b.x, 0, b.z);
      this.scene.add(bushGroup);

      this.bushes.push({
        id: `bush_${idx}`,
        center: new THREE.Vector2(b.x, b.z),
        radius: b.radius,
        group: bushGroup
      });
    });
  }

  createBaseFountains() {
    // Blue Base Fountain ([-52, 0, 52])
    const fountainMatBlue = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.5,
      roughness: 0.3
    });
    const blueGeo = new THREE.CylinderGeometry(8, 9, 0.4, 32);
    const blueFountain = new THREE.Mesh(blueGeo, fountainMatBlue);
    blueFountain.position.set(-52, 0.2, 52);
    this.scene.add(blueFountain);

    // Red Base Fountain ([52, 0, -52])
    const fountainMatRed = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xb91c1c,
      emissiveIntensity: 0.5,
      roughness: 0.3
    });
    const redGeo = new THREE.CylinderGeometry(8, 9, 0.4, 32);
    const redFountain = new THREE.Mesh(redGeo, fountainMatRed);
    redFountain.position.set(52, 0.2, -52);
    this.scene.add(redFountain);
  }

  createJungleCampDecorations() {
    // Altar rings for Red & Blue buff
    const camps = [
      { x: -28, z: 10, color: 0x3b82f6 }, // Blue Buff
      { x: 10, z: 28, color: 0xef4444 },  // Red Buff
      { x: -10, z: -28, color: 0x3b82f6 },// Enemy Blue Buff
      { x: 28, z: -10, color: 0xef4444 }  // Enemy Red Buff
    ];

    camps.forEach(c => {
      const ringGeo = new THREE.RingGeometry(2.2, 2.6, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: c.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(c.x, 0.04, c.z);
      this.scene.add(ring);
    });
  }

  // Check if a 3D position is inside any bush
  getBushAt(pos) {
    const p2d = new THREE.Vector2(pos.x, pos.z);
    for (const b of this.bushes) {
      if (p2d.distanceTo(b.center) <= b.radius) {
        return b;
      }
    }
    return null;
  }

  // Check wall obstacle collision
  checkCollision(pos, radius = 0.8) {
    for (const obs of this.obstacles) {
      if (
        pos.x + radius > obs.minX &&
        pos.x - radius < obs.maxX &&
        pos.z + radius > obs.minZ &&
        pos.z - radius < obs.maxZ
      ) {
        return true;
      }
    }
    return false;
  }
}
