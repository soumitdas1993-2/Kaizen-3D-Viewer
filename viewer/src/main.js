import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as WebIFC from "web-ifc";

const stage = document.getElementById("stage");
const fileInput = document.getElementById("fileInput");
const welcome = document.getElementById("welcome");
const busy = document.getElementById("busy");
const busyText = document.getElementById("busyText");
const fileNameLabel = document.getElementById("fileName");
const modelInfo = document.getElementById("modelInfo");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101820);
const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1e9);
camera.position.set(8, 6, 8);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x101820, 1);
stage.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.screenSpacePanning = true;
controls.target.set(0, 0, 0);

scene.add(new THREE.HemisphereLight(0xddeeff, 0x26313b, 2.0));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.3);
keyLight.position.set(8, 12, 10);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0x8bb8ff, 0.8);
fillLight.position.set(-8, 4, -8);
scene.add(fillLight);

const grid = new THREE.GridHelper(20, 40, 0x40515d, 0x263641);
grid.position.y = -0.002;
scene.add(grid);
const axes = new THREE.AxesHelper(1.5);
scene.add(axes);

let currentModel = null;
let wireframeOn = false;
let occtPromise = null;
let ifcApi = null;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let selectedMesh = null;
let selectedOriginalMaterial = null;
let ifcProperties = new Map();

const propertyPanel = document.getElementById("propertyPanel");
const propertyTitle = document.getElementById("propertyTitle");
const propertyId = document.getElementById("propertyId");
const propertyRows = document.getElementById("propertyRows");

function readableIfcValue(value, depth = 0) {
  if (value === null || value === undefined) return "—";
  if (depth > 2) return "[…]";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.slice(0, 12).map(item => readableIfcValue(item, depth + 1)).join(", ");
  if (typeof value === "object") {
    if (Object.prototype.hasOwnProperty.call(value, "value")) return readableIfcValue(value.value, depth + 1);
    const entries = Object.entries(value).slice(0, 8);
    return entries.map(([key, item]) => `${key}: ${readableIfcValue(item, depth + 1)}`).join("; ");
  }
  return String(value);
}

function showElementProperties(mesh) {
  const expressID = mesh.userData.ifcExpressID;
  const props = expressID !== undefined ? ifcProperties.get(expressID) : null;
  propertyTitle.textContent = props?.Name ? readableIfcValue(props.Name) : (mesh.name || "Selected element");
  propertyId.textContent = expressID !== undefined ? `IFC Express ID: ${expressID}` : "Geometry selection";
  propertyRows.replaceChildren();

  const entries = props ? Object.entries(props).filter(([key, value]) =>
    key !== "expressID" && value !== null && value !== undefined && typeof value !== "function"
  ).slice(0, 28) : [["Name", mesh.name || "Unnamed part"]];

  for (const [key, value] of entries) {
    const k = document.createElement("div");
    k.className = "property-key";
    k.textContent = key;
    const v = document.createElement("div");
    v.className = "property-value";
    v.textContent = readableIfcValue(value);
    propertyRows.append(k, v);
  }
  propertyPanel.hidden = false;
}

function clearSelection() {
  if (selectedMesh && selectedOriginalMaterial) selectedMesh.material = selectedOriginalMaterial;
  selectedMesh = null;
  selectedOriginalMaterial = null;
  propertyPanel.hidden = true;
}

function selectAtPointer(event) {
  if (!currentModel) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(currentModel, true).filter(hit => hit.object.isMesh);
  if (!hits.length) return;
  const mesh = hits[0].object;
  if (selectedMesh === mesh) return;
  clearSelection();
  selectedMesh = mesh;
  selectedOriginalMaterial = mesh.material;
  const highlight = Array.isArray(mesh.material)
    ? mesh.material.map(material => material.clone())
    : mesh.material.clone();
  const materials = Array.isArray(highlight) ? highlight : [highlight];
  materials.forEach(material => {
    material.emissive = new THREE.Color(0x1a8f78);
    material.emissiveIntensity = 0.8;
  });
  mesh.material = highlight;
  showElementProperties(mesh);
}

renderer.domElement.addEventListener("click", selectAtPointer);
document.getElementById("closeProperties").addEventListener("click", clearSelection);

function resize() {
  const width = Math.max(stage.clientWidth, 1);
  const height = Math.max(stage.clientHeight, 1);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}
window.addEventListener("resize", resize);
resize();

function setBusy(show, message = "Preparing model…") {
  busy.hidden = !show;
  busyText.textContent = message;
}

function clearModel() {
  clearSelection();
  ifcProperties.clear();
  if (currentModel) {
    scene.remove(currentModel);
    currentModel.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.forEach((material) => material.dispose());
      }
    });
    currentModel = null;
  }
}

function fitModel(object) {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const radius = Math.max(sphere.radius, 0.01);
  controls.target.copy(sphere.center);
  const distance = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov * 0.5)) * 1.15;
  camera.position.set(
    sphere.center.x + distance * 0.8,
    sphere.center.y + distance * 0.65,
    sphere.center.z + distance * 0.8
  );
  camera.near = Math.max(radius / 10000, 0.001);
  camera.far = Math.max(radius * 100, 1000);
  camera.updateProjectionMatrix();
  controls.minDistance = radius * 0.01;
  controls.maxDistance = radius * 100;
  controls.update();
  grid.scale.setScalar(Math.max(radius / 10, 0.1));
  grid.position.y = box.min.y;
  axes.position.copy(box.min);
}

function addModel(object, name, kind, meshCount) {
  clearModel();
  currentModel = object;
  scene.add(currentModel);
  welcome.hidden = true;
  fileNameLabel.textContent = name;
  modelInfo.textContent = `${kind} · ${meshCount.toLocaleString()} meshes`;
  fitModel(currentModel);
}

async function getOcct() {
  if (!occtPromise) {
    if (typeof window.occtimportjs !== "function") {
      throw new Error("The STEP geometry engine did not load. Please reinstall the app or rebuild it.");
    }
    occtPromise = window.occtimportjs();
  }
  return occtPromise;
}

function makeStepGeometry(meshData) {
  const geometry = new THREE.BufferGeometry();
  const position = meshData.attributes?.position?.array;
  const normal = meshData.attributes?.normal?.array;
  const index = meshData.index?.array;
  if (!position || !index) return null;
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
  if (normal) geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normal, 3));
  else geometry.computeVertexNormals();
  geometry.setIndex(index);
  geometry.computeBoundingSphere();
  return geometry;
}

async function loadStep(file, bytes) {
  setBusy(true, "Reading STEP geometry…");
  const occt = await getOcct();
  const result = occt.ReadStepFile(new Uint8Array(bytes), {
    linearUnit: "millimeter",
    linearDeflectionType: "bounding_box_ratio",
    linearDeflection: 0.001,
    angularDeflection: 0.5
  });
  if (!result?.success || !Array.isArray(result.meshes) || result.meshes.length === 0) {
    throw new Error("No renderable geometry was found in this STEP file.");
  }
  const group = new THREE.Group();
  for (const meshData of result.meshes) {
    const geometry = makeStepGeometry(meshData);
    if (!geometry) continue;
    const rgb = meshData.color || [0.72, 0.76, 0.8];
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(rgb[0], rgb[1], rgb[2]),
      metalness: 0.12,
      roughness: 0.62,
      side: THREE.DoubleSide,
      wireframe: wireframeOn
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = meshData.name || "STEP part";
    group.add(mesh);
  }
  if (group.children.length === 0) throw new Error("The STEP file contained no usable triangle meshes.");
  addModel(group, file.name, "STEP", group.children.length);
}

function makeIfcMaterial(color) {
  const rgba = color || { x: 0.72, y: 0.76, z: 0.8, w: 1 };
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(rgba.x, rgba.y, rgba.z),
    opacity: rgba.w ?? 1,
    transparent: (rgba.w ?? 1) < 1,
    roughness: 0.72,
    metalness: 0.05,
    side: THREE.DoubleSide,
    wireframe: wireframeOn
  });
}

async function loadIfc(file, bytes) {
  setBusy(true, "Initializing IFC engine…");
  if (!ifcApi) {
    const IfcAPI = WebIFC.IfcAPI;
    if (typeof IfcAPI !== "function") {
      throw new Error("The IFC engine API could not be loaded. The Web-IFC module entry point is incorrect.");
    }
    ifcApi = new IfcAPI();
    const wasmPath = new URL("./wasm/", window.location.href).href;
    ifcApi.SetWasmPath(wasmPath, true);
    await ifcApi.Init(undefined, true);
    if (typeof ifcApi.OpenModel !== "function") {
      throw new Error("The IFC engine initialized without its model-loading API.");
    }
  }
  setBusy(true, "Parsing IFC model…");
  const modelID = ifcApi.OpenModel(new Uint8Array(bytes));
  if (modelID === undefined || modelID < 0) {
    throw new Error("Web-IFC could not parse this file. It may be damaged or use an unsupported IFC schema.");
  }
  const group = new THREE.Group();
  let meshCount = 0;
  let geometryCount = 0;
  try {
    ifcApi.StreamAllMeshes(modelID, (flatMesh) => {
      const placed = flatMesh.geometries;
      let elementProps = {};
      try {
        const line = ifcApi.GetLine(modelID, flatMesh.expressID);
        if (line && typeof line === "object") elementProps = { ...line };
      } catch (error) {
        console.warn("Could not read IFC properties for element", flatMesh.expressID, error);
      }
      ifcProperties.set(flatMesh.expressID, elementProps);
      for (let i = 0; i < placed.size(); i++) {
        const placedGeometry = placed.get(i);
        const source = ifcApi.GetGeometry(modelID, placedGeometry.geometryExpressID);
        const vertices = ifcApi.GetVertexArray(source.GetVertexData(), source.GetVertexDataSize());
        const indices = ifcApi.GetIndexArray(source.GetIndexData(), source.GetIndexDataSize());
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(vertices.length / 2);
        const normals = new Float32Array(vertices.length / 2);
        for (let v = 0; v < vertices.length; v += 6) {
          const target = (v / 6) * 3;
          positions[target] = vertices[v];
          positions[target + 1] = vertices[v + 1];
          positions[target + 2] = vertices[v + 2];
          normals[target] = vertices[v + 3];
          normals[target + 1] = vertices[v + 4];
          normals[target + 2] = vertices[v + 5];
        }
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
        geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
        const mesh = new THREE.Mesh(geometry, makeIfcMaterial(placedGeometry.color));
        mesh.name = elementProps.Name
          ? readableIfcValue(elementProps.Name)
          : (elementProps.LongName ? readableIfcValue(elementProps.LongName) : `IFC element ${flatMesh.expressID}`);
        mesh.userData.ifcExpressID = flatMesh.expressID;
        mesh.matrix.fromArray(placedGeometry.flatTransformation);
        mesh.matrixAutoUpdate = false;
        group.add(mesh);
        geometryCount++;
        if (source.delete) source.delete();
      }
      meshCount++;
      if (meshCount % 250 === 0) {
        busyText.textContent = `Building IFC model… ${meshCount.toLocaleString()} elements`;
      }
    });
  } finally {
    ifcApi.CloseModel(modelID);
  }
  if (group.children.length === 0) throw new Error("No renderable IFC geometry was found in this model.");
  addModel(group, file.name, "IFC", geometryCount);
}

async function openModel(file) {
  if (!file) return;
  const extension = file.name.split(".").pop().toLowerCase();
  const format = extension === "stp" || extension === "step" ? "STEP"
    : extension === "ifc" ? "IFC"
    : extension === "igs" || extension === "iges" ? "IGES" : null;
  if (!format) {
    alert("Supported formats in this build: STEP (.step, .stp) and IFC (.ifc).");
    return;
  }
  try {
    setBusy(true, "Reading file…");
    const bytes = await file.arrayBuffer();
    if (format === "STEP") await loadStep(file, bytes);
    else if (format === "IFC") await loadIfc(file, bytes);
    setBusy(false);
  } catch (error) {
    console.error(error);
    setBusy(false);
    alert(`Could not open ${file.name}: ${error?.message || error}`);
  }
}

document.getElementById("openFile").addEventListener("click", () => fileInput.click());
document.getElementById("welcomeOpen").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) openModel(file);
  fileInput.value = "";
});

document.getElementById("fitView").addEventListener("click", () => {
  if (currentModel) fitModel(currentModel);
});
document.getElementById("resetView").addEventListener("click", () => {
  if (currentModel) fitModel(currentModel);
  else {
    camera.position.set(8, 6, 8);
    controls.target.set(0, 0, 0);
    controls.update();
  }
});
document.getElementById("wireframe").addEventListener("click", () => {
  wireframeOn = !wireframeOn;
  if (currentModel) currentModel.traverse((object) => {
    if (object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => { material.wireframe = wireframeOn; });
    }
  });
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
