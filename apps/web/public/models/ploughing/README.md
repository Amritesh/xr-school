# Ploughing 3D model assets

## Cattle mesh

- File: `cow-pytorch3d.glb`
- Source: `https://github.com/facebookresearch/pytorch3d/blob/main/tests/data/cow.glb`
- Upstream project: PyTorch3D
- License: BSD 3-Clause; the verbatim upstream license is stored in `PYTORCH3D-LICENSE.txt`.
- Local modifications: none to the binary. The XR scene scales, rotates and clones the model at runtime, and adds its own yoke, harness, horns/fallback anatomy, plough and interaction target.

The model is stored locally so the school experience does not depend on a third-party network request.
