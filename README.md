# Kaizen 3D Viewer

Android starter project for a mobile engineering-model viewer.

## Current starter features
- Native Android application shell
- File picker to select a model/document from device storage
- GitHub Actions workflow to build and upload a debug APK

## Important: model rendering is not implemented yet
This starter currently selects a file; it does **not** parse or display STEP, IFC, or other 3D geometry.

The next development phase is to integrate suitable geometry engines and a 3D rendering layer:
- STEP: Open CASCADE Technology (OCCT), typically through native Android/NDK integration.
- IFC: IfcOpenShell or web-ifc, subject to Android compatibility and packaging.
- 3D display: an Android-compatible OpenGL ES or Vulkan renderer.

The exact implementation should be chosen after confirming target file types, model sizes, and Android device requirements.

## Build
The GitHub Actions workflow builds a debug APK on pushes to main and on manual runs.
After a successful run, download the artifact named **kaizen-3d-viewer-debug-apk** from the workflow run's Artifacts section.

Local build requirements: JDK 17, Android SDK platform 35, Gradle 8.9.
