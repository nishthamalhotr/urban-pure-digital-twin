let scene, camera, renderer, controls, raycaster, mouse;
let modelGroup;
let compartmentWaterMeshes = [];
let boundsMin = 0, boundsMax = 0, axisLength = 1;

let tankLevels = [0, 0, 0, 0, 0, 0]; // 0% to 90%
let tankCurrentLiters = [0, 0, 0, 0, 0, 0]; // Live volume in liters

let pumpStates = STP_CONFIG.pumps.map(p => ({
  running: false,
  hp: p.defaultHP || 3.0,
  status: "IDLE",
  estTimeRemaining: 0 // in minutes
}));

function init() {
  const container = document.getElementById('canvas-container');

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f1117);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.001, 1000);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight1.position.set(200, 400, 200);
  scene.add(dirLight1);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  const loader = new THREE.GLTFLoader();
  loader.load('container_stp.glb', (gltf) => {
    modelGroup = new THREE.Group();
    const model = gltf.scene;
    model.rotation.x = Math.PI / 2;

    model.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.side = THREE.DoubleSide;
      }
    });

    modelGroup.add(model);
    scene.add(modelGroup);

    const box = new THREE.Box3().setFromObject(modelGroup);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    boundsMin = box.min.x;
    boundsMax = box.max.x;
    axisLength = size.x;

    camera.position.set(center.x + maxDim * 1.2, center.y + maxDim * 0.8, center.z + maxDim * 1.2);
    controls.target.copy(center);
    camera.lookAt(center);
    controls.update();

    createCompartmentWaterMeshes(box);
    renderNavigationTabs();
    renderPumpControlCards();
    document.getElementById('loading-screen').style.display = 'none';
  });

  window.addEventListener('resize', onWindowResize);
  window.addEventListener('click', onCanvasClick);

  setInterval(simulationTick, 200);
  animate();
}

function createCompartmentWaterMeshes(box) {
  const sizeX = box.max.x - box.min.x;
  const sizeY = box.max.y - box.min.y;
  const sizeZ = box.max.z - box.min.z;
  const center = box.getCenter(new THREE.Vector3());

  const compartmentXOffsets = [-0.43, -0.29, -0.14, 0.08, 0.30, 0.45];
  const compartmentWidths = [0.09, 0.13, 0.09, 0.23, 0.17, 0.10];

  compartmentXOffsets.forEach((offsetX, i) => {
    const w = sizeX * compartmentWidths[i];
    const waterGeo = new THREE.BoxGeometry(w, 1.0, sizeZ * 0.82);
    waterGeo.translate(0, 0.5, 0);

    // HIGH-VISIBILITY NEON GREEN DEBUG MATERIAL
    const waterMat = new THREE.MeshBasicMaterial({
      color: 0x00ff00, 
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(waterGeo, waterMat);
    const posX = center.x + (offsetX * sizeX);
    
    mesh.position.set(posX, box.min.y + 0.1, center.z);
    mesh.scale.set(1, 0.001, 1);
    scene.add(mesh);

    compartmentWaterMeshes.push({ mesh: mesh, maxHeight: sizeY * 0.65 });
  });
}

function renderNavigationTabs() {
  const navContainer = document.getElementById('nav-bar');
  if (!navContainer) return;
  navContainer.innerHTML = STP_CONFIG.sections.map((sec, idx) => `
    <button class="nav-tab" onclick="selectSectionByIndex(${idx})">${sec.title.split('.')[1] || sec.title}</button>
  `).join('');
}

function renderPumpControlCards() {
  const container = document.getElementById('pump-cards-container');
  if (!container) return;

  container.innerHTML = STP_CONFIG.pumps.map((p, idx) => `
    <div class="pump-card" style="background:#161a24; border:1px solid #252a38; padding:10px; border-radius:6px; margin-bottom:8px;">
      <div style="font-size:12px; font-weight:600; color:#00d2ff; margin-bottom:4px;">${p.name}</div>
      
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        ${p.type !== 'gravity' && p.type !== 'blower' ? `
          <select id="hp-select-${idx}" onchange="updatePumpHP(${idx})" style="width:40%; background:#181c28; color:#fff; border:1px solid #2a2d3d; padding:3px; font-size:11px; border-radius:4px;">
            <option value="0.5" ${pumpStates[idx].hp==0.5?'selected':''}>0.5 HP</option>
            <option value="3.0" ${pumpStates[idx].hp==3.0?'selected':''}>3.0 HP</option>
            <option value="5.0" ${pumpStates[idx].hp==5.0?'selected':''}>5.0 HP</option>
            <option value="5.5" ${pumpStates[idx].hp==5.5?'selected':''}>5.5 HP</option>
            <option value="7.5" ${pumpStates[idx].hp==7.5?'selected':''}>7.5 HP</option>
            <option value="10.0" ${pumpStates[idx].hp==10.0?'selected':''}>10.0 HP</option>
          </select>
        ` : `<span style="font-size:10px; color:#ffaa00;">${p.type === 'gravity' ? 'Natural Flow' : 'Pneumatic Air'}</span>`}
        
        <button class="pump-btn" id="btn-pump-${idx}" onclick="togglePump(${idx})" style="background:${p.type==='gravity'?'#1e2433':'#00d2ff'}; color:${p.type==='gravity'?'#00ff88':'#0f1117'}; border:none; font-weight:700; padding:5px 12px; border-radius:4px; cursor:pointer; font-size:11px;">
          ${p.type==='gravity' ? 'GRAVITY ACTIVE' : (p.type==='blower' ? 'TOGGLE BLOWER' : 'START')}
        </button>
      </div>

      <div style="font-size:11px; color:#a0a5b5; display:flex; justify-content:space-between; margin-top:4px;">
        <span>Status: <strong id="status-pump-${idx}" style="color:#00ff88;">${pumpStates[idx].status}</strong></span>
        <span>ETA: <strong id="eta-pump-${idx}" style="color:#00d2ff;">0.0 mins</strong></span>
      </div>
      <div style="font-size:11px; color:#a0a5b5; display:flex; justify-content:space-between; margin-top:2px;">
        <span>Volume: <strong id="vol-pump-${idx}" style="color:#fff;">0 L</strong></span>
        <span>Level: <strong id="lvl-pump-${idx}" style="color:#00ff88;">0.0%</strong></span>
      </div>
    </div>
  `).join('');
}

function updatePumpHP(idx) {
  const sel = document.getElementById(`hp-select-${idx}`);
  if (sel) pumpStates[idx].hp = parseFloat(sel.value);
}

function togglePump(idx) {
  let p = STP_CONFIG.pumps[idx];
  if (p.type === 'gravity') return;

  let state = pumpStates[idx];
  state.running = !state.running;
  state.status = state.running ? "RUNNING" : "PAUSED";
  
  let btn = document.getElementById(`btn-pump-${idx}`);
  btn.innerText = state.running ? "STOP" : "START";
  btn.style.background = state.running ? "#ff4757" : "#00d2ff";
  btn.style.color = state.running ? "#fff" : "#0f1117";
}

function resetAllTanks() {
  tankLevels = [0, 0, 0, 0, 0, 0];
  tankCurrentLiters = [0, 0, 0, 0, 0, 0];
  pumpStates.forEach((s, idx) => {
    s.running = false;
    s.status = "IDLE";
    s.estTimeRemaining = 0;
    let btn = document.getElementById(`btn-pump-${idx}`);
    if (btn && STP_CONFIG.pumps[idx].type !== 'gravity') {
      btn.innerText = "START";
      btn.style.background = "#00d2ff";
      btn.style.color = "#0f1117";
    }
  });
  compartmentWaterMeshes.forEach(item => {
    item.mesh.scale.y = 0.001;
  });
}

// Mathematical Mass-Balance & Real-Time Flow Simulation Tick
function simulationTick() {
  let flowLPM = parseFloat(document.getElementById('sim-flow-slider').value) || 173;

  STP_CONFIG.pumps.forEach((p, idx) => {
    let state = pumpStates[idx];

    if (p.type === 'gravity') {
      // Natural gravity transfer from Tank 1 (Tube Settler) to Tank 2 (Anoxic)
      if (tankLevels[1] > 1.0 && tankLevels[2] < 90.0) {
        let transferVolLiters = flowLPM * (0.2 / 60); // Liters transferred in 200ms tick
        let maxAvailable = tankCurrentLiters[1];
        let actualTransfer = Math.min(transferVolLiters, maxAvailable);

        tankCurrentLiters[1] -= actualTransfer;
        tankCurrentLiters[2] += actualTransfer;

        tankLevels[1] = (tankCurrentLiters[1] / p.capacityLiters) * 100;
        tankLevels[2] = (tankCurrentLiters[2] / STP_CONFIG.pumps.find(x => x.targetTank === 2).capacityLiters) * 100;
      }
    } 
    else if (state.running && p.sourceTank !== undefined && p.targetTank !== undefined) {
      let targetCapLiters = p.capacityLiters;
      let targetMaxLiters = targetCapLiters * 0.90; // 90% operating limit
      let currentVol = tankCurrentLiters[p.targetTank];
      let remainingLitersNeeded = Math.max(0, targetMaxLiters - currentVol);

      // Mathematical ETA calculation: Time = Volume Remaining / Flow Rate (LPM)
      if (flowLPM > 0) {
        state.estTimeRemaining = remainingLitersNeeded / flowLPM; // in minutes
      } else {
        state.estTimeRemaining = 999;
      }

      if (p.sourceTank === -1) {
        // Inlet pump fills target tank from external source
        if (currentVol < targetMaxLiters) {
          let addedLiters = flowLPM * (0.2 / 60); // Liters per tick
          tankCurrentLiters[p.targetTank] = Math.min(targetMaxLiters, currentVol + addedLiters);
          tankLevels[p.targetTank] = (tankCurrentLiters[p.targetTank] / targetCapLiters) * 100;
        } else {
          state.running = false;
          state.status = "TANK FULL (90%)";
          state.estTimeRemaining = 0;
          document.getElementById(`btn-pump-${idx}`).innerText = "START";
          document.getElementById(`btn-pump-${idx}`).style.background = "#00d2ff";
        }
      } else {
        // Interconnected Pump Transfer
        let sourceVol = tankCurrentLiters[p.sourceTank];
        if (sourceVol > 10 && currentVol < targetMaxLiters) {
          let transferLiters = flowLPM * (0.2 / 60);
          let actualMove = Math.min(transferLiters, sourceVol, targetMaxLiters - currentVol);

          tankCurrentLiters[p.sourceTank] -= actualMove;
          tankCurrentLiters[p.targetTank] += actualMove;

          let sourceCap = STP_CONFIG.pumps.find(x => x.targetTank === p.sourceTank)?.capacityLiters || targetCapLiters;
          tankLevels[p.sourceTank] = (tankCurrentLiters[p.sourceTank] / sourceCap) * 100;
          tankLevels[p.targetTank] = (tankCurrentLiters[p.targetTank] / targetCapLiters) * 100;
        } else if (sourceVol <= 10) {
          state.status = "SOURCE EMPTY";
        } else if (currentVol >= targetMaxLiters) {
          state.status = "TARGET FULL (90%)";
          state.running = false;
          document.getElementById(`btn-pump-${idx}`).innerText = "START";
          document.getElementById(`btn-pump-${idx}`).style.background = "#00d2ff";
        }
      }
    }
  });

  // Update UI Monitor Labels and 3D Water Scale Heights
  STP_CONFIG.pumps.forEach((p, idx) => {
    let state = pumpStates[idx];
    let targetTankIdx = p.targetTank;
    if (targetTankIdx !== undefined) {
      let lvlElem = document.getElementById(`lvl-pump-${idx}`);
      let volElem = document.getElementById(`vol-pump-${idx}`);
      let etaElem = document.getElementById(`eta-pump-${idx}`);
      let statusElem = document.getElementById(`status-pump-${idx}`);

      if (lvlElem) lvlElem.innerText = tankLevels[targetTankIdx].toFixed(1) + "%";
      if (volElem) volElem.innerText = tankCurrentLiters[targetTankIdx].toFixed(0) + " L";
      if (etaElem) etaElem.innerText = state.estTimeRemaining.toFixed(1) + " mins";
      if (statusElem) statusElem.innerText = state.status;
    }
  });

  compartmentWaterMeshes.forEach((item, i) => {
    let pct = tankLevels[i] / 100;
    item.mesh.scale.y = Math.max(0.001, pct * item.maxHeight);
  });

  updateTelemetry();
}

function updateTelemetry() {
  let activeCount = pumpStates.filter(s => s.running).length;
  let totalKW = pumpStates.reduce((sum, s, i) => sum + (s.running ? s.hp * 0.746 : 0), 0);

  document.getElementById('calc-power').innerText = totalKW.toFixed(2) + " kW";
  document.getElementById('active-pumps-count').innerText = activeCount + " Active";
}

function selectSectionByIndex(idx) {
  showSectionDetails(STP_CONFIG.sections[idx]);
}

function onCanvasClick(event) {
  if (event.target.tagName !== 'CANVAS') return;
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  if (!modelGroup) return;

  const intersects = raycaster.intersectObjects(modelGroup.children, true);
  if (intersects.length > 0) {
    mapHitToSection(intersects[0].point);
  }
}

function mapHitToSection(hitPoint) {
  let t = (hitPoint.x - boundsMin) / axisLength;
  t = Math.max(0, Math.min(1, t));
  let normalizedPos = 1 - t;

  let selectedIndex = 0;
  if (normalizedPos < 0.10) selectedIndex = 0;
  else if (normalizedPos < 0.23) selectedIndex = 1;
  else if (normalizedPos < 0.32) selectedIndex = 2;
  else if (normalizedPos < 0.62) selectedIndex = 3;
  else if (normalizedPos < 0.72) selectedIndex = 4;
  else selectedIndex = 5;

  showSectionDetails(STP_CONFIG.sections[selectedIndex]);
}

function toggleMode() {
  const simControls = document.getElementById('sim-controls');
  simControls.style.display = simControls.style.display === 'block' ? 'none' : 'block';
}

function showSectionDetails(section) {
  const panel = document.getElementById('inspector-panel');
  const content = document.getElementById('inspector-content');

  let equipmentHTML = section.equipment.map(e => `
    <div class="equip-card">
      <div class="equip-title">${e.name}</div>
      <div class="equip-spec">${e.spec}</div>
    </div>
  `).join('');

  let metricsHTML = Object.entries(section.metrics).map(([key, val] ) => `
    <div class="metric-row">
      <span>${key}</span>
      <span class="metric-val">${val}</span>
    </div>
  `).join('');

  content.innerHTML = `
    <h2>${section.title}</h2>
    <div class="badge">Dimensions: ${section.dims}</div>
    <div class="badge">Geometric Volume: ${section.geometricVol}</div>
    <div class="badge" style="background:#143024; color:#00ff88;">Max Operating (90%): ${section.maxOperatingVol}</div>
    <p class="desc">${section.description}</p>
    <h3>Equipment Specs</h3>
    ${equipmentHTML}
    <h3>Sensor & Telemetry Readings</h3>
    <div class="metrics-container">${metricsHTML}</div>
  `;

  panel.style.transform = 'translateX(0)';
}

function closeInspector() {
  document.getElementById('inspector-panel').style.transform = 'translateX(100%)';
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

window.onload = init;