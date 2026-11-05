#!/bin/sh
# Rebuilds every rainwater model and its licence record.
# Usage: BLENDER=/path/to/blender sh scripts/blender/build-rainwater-kit.sh
set -e
RAW="tmp/rainwater-kit"
"${BLENDER:-blender}" -b --python scripts/blender/build_rainwater_kit.py -- "$RAW" > /dev/null
for name in sundargram-house gutter-piece downpipe filter-unit flush-valve filter-stones filter-sand filter-charcoal school school-gutter school-pipe school-tank-cover recharge-cutaway pit-large-stones pit-small-stones pit-sand pond crops control-station leaf-pile droppy guardian-badge summer-props goat courtyard-ground village-backdrop; do
  node scripts/optimize-model.mjs "$RAW/$name.glb" "$name" --group rainwater \
    --source "scripts/blender/build_rainwater_kit.py" --author "XR School project" \
    --license XR-School-original --modifications "Original procedural model; meshopt compression"
done
