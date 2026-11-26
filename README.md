# Kaizen 3D Viewer

Android engineering-model viewer with an embedded Three.js viewport.

## Current viewer features

- Android file picker using the system document picker
- STEP / STP import through OpenCascade WebAssembly (OCCT)
- IFC import through web-ifc WebAssembly
- Interactive 3D orbit, zoom and pan controls
- Fit-to-model, camera reset and wireframe toggle
- Model processing runs locally on the device; selected model files are not uploaded

## Build

The GitHub Actions workflow installs the JavaScript viewer dependencies, copies the WebAssembly runtimes into the Android assets, and builds a debug APK.

After a successful workflow run, download the artifact named **kaizen-3d-viewer-debug-apk**.

## Supported formats in this build

- STEP: `.step`, `.stp`
- IFC: `.ifc`

IGES and BREP import engines are not yet connected to the viewer UI.

## Notes and limitations

This is the first geometry-rendering milestone. Large CAD/BIM files may exceed available Android memory or take a long time to tessellate. IFC models are streamed into Three.js meshes; this initial viewer does not yet include advanced BIM property panels, element selection, sectioning, measurement tools, saved camera views, or optimized fragment caching. Validate with representative project files before relying on it for production work.

The app uses WebView with locally packaged JavaScript and WebAssembly assets. JDK 17, Android SDK platform 35, Node.js 20 and Gradle 8.9 are used by CI.
