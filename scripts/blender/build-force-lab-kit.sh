#!/bin/sh
# Rebuilds every Force and Motion lab model and its licence record.
# Usage: BLENDER=/path/to/blender sh scripts/blender/build-force-lab-kit.sh
set -e
RAW="tmp/force-lab-kit"
"${BLENDER:-blender}" -b --python scripts/blender/build_force_lab_kit.py -- "$RAW" > /dev/null
for name in store-room trolley wagon door playground football riya classroom toy-car stop-flag courtyard tennis-ball racket; do
  node scripts/optimize-model.mjs "$RAW/$name.glb" "$name" --group force-lab \
    --source "scripts/blender/build_force_lab_kit.py" --author "XR School project" \
    --license XR-School-original --modifications "Original procedural model; meshopt compression"
done
