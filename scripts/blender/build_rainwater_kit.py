"""Builds the Sundargram low-poly kit and exports raw GLBs.

Run headless:
  blender -b --python scripts/blender/build_rainwater_kit.py -- <output_dir>

Each model is one mesh with one material and vertex colours, so it costs one
draw call on Quest. Ambient occlusion is baked into the vertex colours.
Coordinates are metres, Blender Z up; the exporter converts to Y up, so the
house front (Blender -Y) faces +Z in Three.js.
"""
import math
import os
import random
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

OUT = sys.argv[sys.argv.index("--") + 1]
os.makedirs(OUT, exist_ok=True)
random.seed(7)
for leftover in list(bpy.data.objects):
    bpy.data.objects.remove(leftover)


def linear(hex_colour):
    def channel(value):
        value /= 255
        return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4

    return (
        channel((hex_colour >> 16) & 255),
        channel((hex_colour >> 8) & 255),
        channel(hex_colour & 255),
        1.0,
    )


PALETTE = {
    "lime": 0xf3e7c9,
    "turquoise": 0x5fb7ad,
    "ochre": 0xd9973f,
    "stone": 0x9c9486,
    "stone_dark": 0x7a7367,
    "tile": 0xb9573a,
    "tile_dark": 0x9a452e,
    "wood": 0x7a5233,
    "door": 0x2f6fb0,
    "shutter": 0x2f8f6b,
    "glass": 0x25424f,
    "metal": 0xa7bac6,
    "metal_dark": 0x6f8591,
    "earth": 0xa98660,
    "earth_dark": 0x9c7a56,
    "path": 0xb4a68e,
    "grass": 0x7c9f55,
    "grass_dark": 0x6c9150,
    "leaf": 0x4f8a4a,
    "leaf_light": 0x76a356,
    "bark": 0x6a4a31,
    "hill": 0x5f8f62,
    "hill_far": 0x7fa6a0,
    "clay": 0xb86a3f,
    "brick": 0xa8583c,
    "rangoli_a": 0xe4476b,
    "rangoli_b": 0xf2c230,
    "sand": 0xdcc18c,
    "droppy_blue": 0x3fb6e8,
    "charcoal": 0x2b2b2e,
    "charcoal_light": 0x45454a,
}


class Kit:
    """Accumulates coloured geometry into one bmesh."""

    def __init__(self, name):
        self.name = name
        self.bm = bmesh.new()
        self.layer = self.bm.loops.layers.float_color.new("Col")
        self.empties = []

    def _paint(self, faces, colour, jitter=0.05):
        base = linear(PALETTE[colour])
        for face in faces:
            shade = 1 + random.uniform(-jitter, jitter)
            tinted = (base[0] * shade, base[1] * shade, base[2] * shade, 1.0)
            for loop in face.loops:
                loop[self.layer] = tinted

    def _finish(self, geom, colour, jitter):
        faces = [item for item in geom if isinstance(item, bmesh.types.BMFace)]
        self._paint(faces, colour, jitter)

    def box(self, centre, size, colour, rotate_x=0.0, cuts=0, jitter=0.05):
        before = set(self.bm.faces)
        matrix = (
            Matrix.Translation(centre)
            @ Matrix.Rotation(rotate_x, 4, "X")
            @ Matrix.Diagonal((size[0], size[1], size[2], 1))
        )
        made = bmesh.ops.create_cube(self.bm, size=1.0, matrix=matrix)
        if cuts:
            edges = list({edge for vert in made["verts"] for edge in vert.link_edges})
            bmesh.ops.subdivide_edges(self.bm, edges=edges, cuts=cuts, use_grid_fill=True)
        self._paint([face for face in self.bm.faces if face not in before], colour, jitter)

    def cylinder(self, start, end, radius, colour, segments=6, end_radius=None, jitter=0.05):
        before = set(self.bm.faces)
        axis = Vector(end) - Vector(start)
        rotation = axis.to_track_quat("Z", "Y").to_matrix().to_4x4()
        centre = (Vector(start) + Vector(end)) / 2
        bmesh.ops.create_cone(
            self.bm,
            cap_ends=True,
            segments=segments,
            radius1=radius,
            radius2=end_radius if end_radius is not None else radius,
            depth=axis.length,
            matrix=Matrix.Translation(centre) @ rotation,
        )
        self._paint([face for face in self.bm.faces if face not in before], colour, jitter)

    def blob(self, centre, radius, colour, squash=1.0, subdivisions=1, rough=0.12):
        before = set(self.bm.faces)
        made = bmesh.ops.create_icosphere(
            self.bm,
            subdivisions=subdivisions,
            radius=radius,
            matrix=Matrix.Translation(centre) @ Matrix.Diagonal((1, 1, squash, 1)),
        )
        for vert in made["verts"]:
            vert.co += vert.normal * random.uniform(-radius * rough, radius * rough)
        self._paint([face for face in self.bm.faces if face not in before], colour, 0.09 if rough else 0.0)

    def prism(self, points, width_x, colour, centre_x=0.0):
        """Extrudes a closed Y-Z profile along X."""
        before = set(self.bm.faces)
        half = width_x / 2
        left = [self.bm.verts.new((centre_x - half, y, z)) for y, z in points]
        right = [self.bm.verts.new((centre_x + half, y, z)) for y, z in points]
        self.bm.faces.new(left)
        self.bm.faces.new(list(reversed(right)))
        count = len(points)
        for index in range(count):
            following = (index + 1) % count
            self.bm.faces.new((left[following], left[index], right[index], right[following]))
        bmesh.ops.recalc_face_normals(self.bm, faces=[f for f in self.bm.faces if f not in before])
        self._paint([face for face in self.bm.faces if face not in before], colour)

    def socket(self, name, location):
        self.empties.append((name, location))

    def build(self, bake_ao=True):
        mesh = bpy.data.meshes.new(self.name)
        self.bm.normal_update()
        self.bm.to_mesh(mesh)
        self.bm.free()
        for polygon in mesh.polygons:
            polygon.use_smooth = False
        for attribute in list(mesh.color_attributes):
            if attribute.name != "Col":
                mesh.color_attributes.remove(attribute)
        mesh.color_attributes.active_color = mesh.color_attributes["Col"]
        mesh.color_attributes.render_color_index = mesh.color_attributes.find("Col")
        material = bpy.data.materials.new(f"{self.name}_mat")
        material.use_nodes = True
        material.use_backface_culling = True
        nodes = material.node_tree.nodes
        shader = nodes["Principled BSDF"]
        shader.inputs["Roughness"].default_value = 0.88
        attribute = nodes.new("ShaderNodeVertexColor")
        attribute.layer_name = "Col"
        material.node_tree.links.new(attribute.outputs["Color"], shader.inputs["Base Color"])
        mesh.materials.append(material)
        collection = bpy.data.collections.new(self.name)
        bpy.context.scene.collection.children.link(collection)
        obj = bpy.data.objects.new(self.name, mesh)
        collection.objects.link(obj)
        for name, location in self.empties:
            empty = bpy.data.objects.new(name, None)
            empty.location = location
            empty.parent = obj
            collection.objects.link(empty)
        if bake_ao:
            bake_ambient_occlusion(obj)
        export(collection, obj)
        bpy.context.scene.collection.children.unlink(collection)


def bake_ambient_occlusion(obj):
    """Multiplies a Cycles AO bake into the vertex colours."""
    mesh = obj.data
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 48
    scene.cycles.device = "CPU"
    ao = mesh.color_attributes.new("AO", "FLOAT_COLOR", "CORNER")
    mesh.color_attributes.active_color = ao
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    scene.render.bake.target = "VERTEX_COLORS"
    bpy.ops.object.bake(type="AO")
    obj.select_set(False)
    colours = mesh.color_attributes["Col"].data
    for index, item in enumerate(ao.data):
        strength = 0.35 + 0.65 * item.color[0]
        colour = colours[index].color
        colours[index].color = (
            colour[0] * strength,
            colour[1] * strength,
            colour[2] * strength,
            1.0,
        )
    mesh.color_attributes.remove(ao)
    mesh.color_attributes.active_color = mesh.color_attributes["Col"]
    mesh.color_attributes.render_color_index = mesh.color_attributes.find("Col")


def export(collection, obj):
    bpy.ops.object.select_all(action="DESELECT")
    for item in collection.objects:
        item.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUT, f"{obj.name}.glb"),
        use_selection=True,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_vertex_color="ACTIVE",
        export_all_vertex_colors=False,
        export_materials="EXPORT",
        export_extras=False,
        export_animations=False,
    )


def build_house():
    kit = Kit("sundargram-house")
    kit.box((0, 0, 0.15), (5.2, 4.0, 0.3), "stone", cuts=5)
    kit.box((0, -2.15, 0.08), (1.5, 0.45, 0.16), "stone_dark", cuts=2)
    # Lime-washed walls with a painted lower band and a trim line.
    kit.box((0, 0, 0.6), (4.8, 3.6, 0.6), "turquoise", cuts=6, jitter=0.03)
    kit.box((0, 0, 1.68), (4.8, 3.6, 1.56), "lime", cuts=6, jitter=0.02)
    kit.box((0, 0, 0.93), (4.84, 3.64, 0.06), "ochre", jitter=0.02)
    kit.box((0, 0, 2.42), (4.84, 3.64, 0.06), "ochre", jitter=0.02)
    # Gable ends close the space under the roof.
    for x in (-2.4, 2.4):
        kit.prism([(-1.8, 2.45), (1.8, 2.45), (0, 3.55)], 0.04, "lime", centre_x=x)
    # Door, frame and threshold.
    kit.box((0, -1.82, 1.25), (1.1, 0.06, 2.0), "wood")
    kit.box((-0.22, -1.86, 1.2), (0.42, 0.04, 1.8), "door")
    kit.box((0.22, -1.86, 1.2), (0.42, 0.04, 1.8), "door")
    kit.box((0, -1.89, 1.3), (0.05, 0.03, 0.3), "ochre")
    # Windows with open shutters.
    for x in (-1.55, 1.55):
        kit.box((x, -1.82, 1.5), (0.9, 0.05, 0.9), "wood")
        kit.box((x, -1.85, 1.5), (0.7, 0.03, 0.7), "glass", jitter=0.0)
        kit.box((x - 0.56, -1.88, 1.5), (0.26, 0.04, 0.72), "shutter")
        kit.box((x + 0.56, -1.88, 1.5), (0.26, 0.04, 0.72), "shutter")
        for z in (1.28, 1.5, 1.72):
            kit.box((x, -1.87, z), (0.7, 0.02, 0.025), "metal_dark", jitter=0.0)
    # Veranda posts and beam under the front eave.
    for x in (-2.3, 0.85, -0.85, 2.3):
        kit.cylinder((x, -2.18, 0.3), (x, -2.18, 2.64), 0.07, "wood", segments=6)
    kit.box((0, -2.18, 2.62), (5.0, 0.12, 0.12), "wood")
    # Roof: a solid wedge under rows of overlapping clay tiles.
    ridge = 3.62
    eave = 2.66
    run = 2.38
    kit.prism(
        [(-run, eave - 0.1), (run, eave - 0.1), (run, eave), (0, ridge), (-run, eave)],
        5.5,
        "tile_dark",
    )
    angle = math.atan2(ridge - eave, run)
    rows = 9
    for side in (-1, 1):
        for row in range(rows):
            t = (row + 0.5) / rows
            y = side * run * (1 - t)
            z = eave + (ridge - eave) * t + 0.035
            colour = "tile" if row % 3 else "tile_dark"
            kit.box(
                (0, y, z),
                (5.56, run / rows / math.cos(angle) + 0.03, 0.06),
                colour,
                rotate_x=-side * angle,
                jitter=0.07,
            )
    kit.box((0, 0, ridge + 0.05), (5.6, 0.2, 0.1), "tile_dark")
    # Courtyard details: tulsi pot, water pots and a rangoli.
    kit.cylinder((1.75, -2.55, 0.0), (1.75, -2.55, 0.5), 0.22, "lime", segments=8)
    kit.blob((1.75, -2.55, 0.68), 0.2, "leaf_light")
    kit.cylinder((-2.05, -2.5, 0.0), (-2.05, -2.5, 0.28), 0.17, "clay", segments=8, end_radius=0.22)
    kit.cylinder((-2.05, -2.5, 0.28), (-2.05, -2.5, 0.42), 0.22, "clay", segments=8, end_radius=0.09)
    for layer, (radius, colour) in enumerate(((0.5, "rangoli_a"), (0.32, "rangoli_b"), (0.14, "rangoli_a"))):
        kit.cylinder((0, -3.05, 0.0), (0, -3.05, 0.012 + layer * 0.012), radius, colour, segments=12, jitter=0.0)
    # Where the four gutter pieces lock on.
    for index, x in enumerate((-1.65, -0.55, 0.55, 1.65), start=1):
        kit.socket(f"Socket_Gutter_{index}", (x, -2.46, eave - 0.06))
    kit.build()


def build_gutter():
    kit = Kit("gutter-piece")
    segments = 7
    radius = 0.075
    outer = []
    inner = []
    for index in range(segments + 1):
        angle = math.pi + math.pi * index / segments
        outer.append((math.cos(angle) * radius, math.sin(angle) * radius))
        inner.append((math.cos(angle) * radius * 0.8, math.sin(angle) * radius * 0.8))
    profile = outer + list(reversed(inner))
    kit.prism(profile, 1.08, "metal", centre_x=0.0)
    for x in (-0.48, 0.48):
        kit.box((x, 0, -0.01), (0.03, 0.17, 0.17), "metal_dark", jitter=0.0)
    kit.build(bake_ao=False)


def build_downpipe():
    kit = Kit("downpipe")
    kit.cylinder((0, 0, 0.02), (0, 0, -0.14), 0.11, "metal_dark", segments=8, end_radius=0.05)
    kit.cylinder((0, 0, -0.14), (0, 0, -0.5), 0.05, "metal", segments=8)
    kit.cylinder((0, 0, -0.5), (0.8, 0, -0.5), 0.05, "metal", segments=8)
    kit.cylinder((0.8, 0, -0.5), (0.8, 0, -0.62), 0.05, "metal", segments=8)
    kit.box((0, 0.05, -0.3), (0.14, 0.08, 0.03), "metal_dark", jitter=0.0)
    # First-flush branch: a capped chamber that drains the first dirty water.
    kit.cylinder((0.17, 0, -0.5), (0.17, 0, -1.1), 0.05, "metal", segments=8)
    kit.cylinder((0.17, 0, -1.1), (0.17, 0, -1.5), 0.085, "metal_dark", segments=8)
    kit.cylinder((0.17, 0, -1.5), (0.17, -0.12, -1.58), 0.035, "metal", segments=6)
    # Brick stand under the tank (ground is 2.6 m below the gutter).
    for layer in range(3):
        kit.box((0.8, 0, -2.6 + 0.07 + layer * 0.135), (1.3, 1.3, 0.13), "brick", jitter=0.08)
    kit.build(bake_ao=False)


def build_filter_unit():
    """Open frame on the tank lid, so the child can see the layers inside."""
    kit = Kit("filter-unit")
    kit.cylinder((0, 0, 0), (0, 0, 0.035), 0.37, "metal_dark", segments=16, jitter=0.0)
    segments = 16
    for index in range(segments):
        a = index / segments * math.tau
        b = (index + 1) / segments * math.tau
        kit.cylinder(
            (math.cos(a) * 0.36, math.sin(a) * 0.36, 0.5),
            (math.cos(b) * 0.36, math.sin(b) * 0.36, 0.5),
            0.018,
            "metal",
            segments=5,
            jitter=0.0,
        )
    for index in range(4):
        a = (index + 0.5) / 4 * math.tau
        x, y = math.cos(a) * 0.36, math.sin(a) * 0.36
        kit.cylinder((x, y, 0), (x, y, 0.5), 0.02, "metal", segments=6, jitter=0.0)
    kit.build(bake_ao=False)


def build_flush_valve():
    """A bright hand wheel, centred, facing the child (+Z in Three.js)."""
    kit = Kit("flush-valve")
    kit.cylinder((0, 0.05, 0), (0, -0.03, 0), 0.04, "metal_dark", segments=8, jitter=0.0)
    segments = 14
    for index in range(segments):
        a = index / segments * math.tau
        b = (index + 1) / segments * math.tau
        kit.cylinder(
            (math.cos(a) * 0.13, -0.04, math.sin(a) * 0.13),
            (math.cos(b) * 0.13, -0.04, math.sin(b) * 0.13),
            0.024,
            "rangoli_a",
            segments=6,
            jitter=0.0,
        )
    for a in (0, math.pi / 2):
        kit.cylinder(
            (math.cos(a) * 0.13, -0.04, math.sin(a) * 0.13),
            (-math.cos(a) * 0.13, -0.04, -math.sin(a) * 0.13),
            0.016,
            "rangoli_a",
            segments=5,
            jitter=0.0,
        )
    kit.build(bake_ao=False)


def build_layer(name, base, lump, lumps, lump_size):
    """One filter layer: a disc with a lumpy top. Origin at its centre."""
    kit = Kit(name)
    kit.cylinder((0, 0, -0.06), (0, 0, 0.04), 0.31, base, segments=12)
    for _ in range(lumps):
        a = random.uniform(0, math.tau)
        r = 0.27 * math.sqrt(random.random())
        kit.blob(
            (math.cos(a) * r, math.sin(a) * r, 0.045),
            random.uniform(*lump_size),
            lump,
            0.7,
            1,
        )
    kit.build(bake_ao=False)


def build_school():
    """Wide school with a big roof. Origin at floor centre; front faces +Z in Three.js."""
    kit = Kit("school")
    kit.box((0, 0, 0.12), (8.6, 4.4, 0.24), "stone", cuts=6)
    kit.box((0, 0, 0.55), (8.2, 4.0, 0.62), "ochre", cuts=6, jitter=0.03)
    kit.box((0, 0, 1.96), (8.2, 4.0, 2.2), "lime", cuts=6, jitter=0.02)
    kit.box((0, 0, 0.88), (8.24, 4.04, 0.05), "door", jitter=0.0)
    for x in (-4.1, 4.1):
        kit.prism([(-2.0, 3.06), (2.0, 3.06), (0, 4.3)], 0.04, "lime", centre_x=x)
    kit.box((0, -2.02, 1.25), (1.5, 0.05, 2.0), "wood")
    kit.box((-0.36, -2.06, 1.2), (0.66, 0.04, 1.8), "door")
    kit.box((0.36, -2.06, 1.2), (0.66, 0.04, 1.8), "door")
    for x in (-3.0, -1.7, 1.7, 3.0):
        kit.box((x, -2.02, 1.75), (0.95, 0.05, 1.05), "wood")
        kit.box((x, -2.05, 1.75), (0.75, 0.03, 0.85), "glass", jitter=0.0)
    kit.box((0, -2.04, 2.82), (2.4, 0.04, 0.3), "door", jitter=0.0)
    ridge, eave, run = 4.36, 3.32, 2.55
    kit.prism(
        [(-run, eave - 0.1), (run, eave - 0.1), (run, eave), (0, ridge), (-run, eave)],
        8.9,
        "tile_dark",
    )
    angle = math.atan2(ridge - eave, run)
    rows = 9
    for side in (-1, 1):
        for row in range(rows):
            t = (row + 0.5) / rows
            kit.box(
                (0, side * run * (1 - t), eave + (ridge - eave) * t + 0.035),
                (8.96, run / rows / math.cos(angle) + 0.03, 0.06),
                "tile" if row % 3 else "tile_dark",
                rotate_x=-side * angle,
                jitter=0.07,
            )
    kit.box((0, 0, ridge + 0.05), (9.0, 0.2, 0.1), "tile_dark")
    kit.cylinder((-4.9, -3.4, 0), (-4.9, -3.4, 5.2), 0.04, "metal", segments=6, jitter=0.0)
    kit.box((-4.55, -3.4, 5.0), (0.62, 0.015, 0.14), "ochre", jitter=0.0)
    kit.box((-4.55, -3.4, 4.86), (0.62, 0.015, 0.14), "lime", jitter=0.0)
    kit.box((-4.55, -3.4, 4.72), (0.62, 0.015, 0.14), "grass", jitter=0.0)
    kit.build()


def build_long_gutter():
    kit = Kit("school-gutter")
    segments = 7
    radius = 0.09
    outer = []
    inner = []
    for index in range(segments + 1):
        angle = math.pi + math.pi * index / segments
        outer.append((math.cos(angle) * radius, math.sin(angle) * radius))
        inner.append((math.cos(angle) * radius * 0.8, math.sin(angle) * radius * 0.8))
    kit.prism(outer + list(reversed(inner)), 8.0, "metal")
    for x in (-3.6, -1.8, 0, 1.8, 3.6):
        kit.box((x, 0, -0.01), (0.04, 0.2, 0.2), "metal_dark", jitter=0.0)
    kit.build(bake_ao=False)


def build_school_pipe():
    kit = Kit("school-pipe")
    kit.cylinder((0, 0, 1.1), (0, 0, -1.0), 0.07, "metal", segments=8)
    kit.cylinder((0, 0, -1.0), (0.85, 0, -1.0), 0.07, "metal", segments=8)
    kit.cylinder((0, 0, 1.25), (0, 0, 1.1), 0.13, "metal_dark", segments=8, end_radius=0.07)
    kit.build(bake_ao=False)


def build_school_cover():
    kit = Kit("school-tank-cover")
    kit.cylinder((0, 0, 0), (0, 0, 0.08), 1.0, "stone_dark", segments=16)
    kit.cylinder((0, 0, 0.08), (0, 0, 0.16), 0.3, "metal_dark", segments=8, jitter=0.0)
    kit.build(bake_ao=False)


def build_recharge_cutaway():
    """A mound cut open at the front so the child can see inside the ground."""
    kit = Kit("recharge-cutaway")
    kit.box((-1.15, 0, 0.9), (0.9, 1.8, 1.8), "earth", cuts=3)
    kit.box((1.15, 0, 0.9), (0.9, 1.8, 1.8), "earth", cuts=3)
    kit.box((0, 0.65, 1.05), (1.4, 0.5, 1.5), "earth_dark", cuts=3)
    kit.box((0, 0, 0.22), (1.4, 1.8, 0.44), "earth_dark", cuts=2)
    for x in (-1.15, 1.15):
        kit.box((x, 0, 1.81), (0.94, 1.84, 0.05), "grass", jitter=0.03)
    kit.box((0, 0.65, 1.81), (1.4, 0.5, 0.05), "grass", jitter=0.03)
    for _ in range(14):
        side = random.choice((-1, 1))
        x, y = side * random.uniform(0.8, 1.5), random.uniform(-0.8, 0.8)
        kit.cylinder((x, y, 1.82), (x, y, 2.05), 0.06, "leaf_light", segments=4, end_radius=0.0)
    kit.build()


def build_pit_layer(name, base, lump, lumps, size):
    kit = Kit(name)
    kit.box((0, 0, -0.02), (1.32, 1.1, 0.32), base, jitter=0.06)
    for _ in range(lumps):
        x, y = random.uniform(-0.6, 0.6), random.uniform(-0.5, 0.5)
        kit.blob((x, y, 0.13), random.uniform(*size), lump, 0.75, 1)
    # Lumps on the front so the layer reads in the cutaway.
    for _ in range(lumps // 2):
        x, z = random.uniform(-0.6, 0.6), random.uniform(-0.14, 0.1)
        kit.blob((x, -0.55, z), random.uniform(*size), lump, 0.8, 1)
    kit.build(bake_ao=False)


def build_pond():
    kit = Kit("pond")
    kit.cylinder((0, 0, 0), (0, 0, 0.02), 1.65, "earth_dark", segments=20, jitter=0.0)
    for index in range(22):
        a = index / 22 * math.tau
        kit.blob((math.cos(a) * 1.72, math.sin(a) * 1.72, 0.1), random.uniform(0.14, 0.24), "stone", 0.8, 1)
    for _ in range(6):
        a = random.uniform(0, math.tau)
        kit.cylinder(
            (math.cos(a) * 2.0, math.sin(a) * 2.0, 0),
            (math.cos(a) * 2.0, math.sin(a) * 2.0, random.uniform(0.5, 0.9)),
            0.05,
            "grass_dark",
            segments=4,
            end_radius=0.0,
        )
    kit.build(bake_ao=False)


def build_crops():
    """Field beds with rows of plants. Origin at the field centre."""
    kit = Kit("crops")
    for row in range(5):
        y = -1.6 + row * 0.8
        kit.box((0, y, 0.07), (2.4, 0.55, 0.14), "earth_dark", jitter=0.03)
        for column in range(7):
            x = -1.05 + column * 0.35
            for leaf in range(3):
                a = leaf / 3 * math.tau + random.uniform(0, 1)
                kit.cylinder(
                    (x, y, 0.14),
                    (x + math.cos(a) * 0.13, y + math.sin(a) * 0.13, random.uniform(0.5, 0.75)),
                    0.05,
                    random.choice(("leaf", "leaf_light")),
                    segments=3,
                    end_radius=0.0,
                )
    kit.build(bake_ao=False)


def build_station():
    """Control post for the storm: valves mount on the front beam."""
    kit = Kit("control-station")
    kit.box((0, 0, 0.1), (3.2, 0.9, 0.2), "stone_dark", cuts=2)
    for x in (-1.45, 1.45):
        kit.cylinder((x, 0, 0.2), (x, 0, 1.4), 0.08, "wood", segments=6)
    kit.box((0, 0, 1.15), (3.3, 0.14, 0.34), "wood")
    kit.box((0, 0, 1.45), (3.3, 0.6, 0.06), "tile", jitter=0.08)
    kit.build(bake_ao=False)


def build_leaf_pile():
    kit = Kit("leaf-pile")
    for _ in range(14):
        kit.blob(
            (random.uniform(-0.3, 0.3), random.uniform(-0.3, 0.3), random.uniform(0.03, 0.2)),
            random.uniform(0.07, 0.13),
            random.choice(("leaf", "leaf_light", "ochre", "clay")),
            0.5,
            1,
        )
    kit.build(bake_ao=False)


def build_droppy():
    """Droppy the guide. Origin at the base; face looks towards +Z in Three.js."""
    kit = Kit("droppy")
    kit.blob((0, 0, 0.3), 0.3, "droppy_blue", 0.95, 3, 0.0)
    kit.cylinder((0, 0, 0.42), (0, 0, 0.82), 0.25, "droppy_blue", segments=16, end_radius=0.0, jitter=0.0)
    for x in (-0.1, 0.1):
        kit.blob((x, -0.255, 0.36), 0.062, "lime", 1.0, 2, 0.0)
        kit.blob((x, -0.305, 0.36), 0.032, "glass", 1.0, 2, 0.0)
    for index in range(7):
        a = math.pi + (index + 1) / 8 * math.pi
        kit.blob((math.cos(a) * 0.1, -0.292, 0.24 + math.sin(a) * 0.05), 0.014, "glass", 1.0, 1, 0.0)
    kit.build(bake_ao=False)


def build_badge():
    kit = Kit("guardian-badge")
    kit.cylinder((0, 0.02, 0), (0, -0.02, 0), 0.26, "rangoli_b", segments=20, jitter=0.0)
    kit.cylinder((0, -0.02, 0), (0, -0.05, 0), 0.19, "droppy_blue", segments=20, jitter=0.0)
    kit.blob((0, -0.08, -0.03), 0.075, "lime", 1.0, 2, 0.0)
    kit.cylinder((0, 0.02, 0), (0, 0.05, 0), 0.19, "droppy_blue", segments=20, jitter=0.0)
    kit.cylinder((0, -0.08, 0.02), (0, -0.08, 0.13), 0.065, "lime", segments=10, end_radius=0.0, jitter=0.0)
    kit.build(bake_ao=False)


def build_summer_props():
    """Trough and wash bucket, shared by the summer stage."""
    kit = Kit("summer-props")
    kit.box((-3.3, -4.2, 0.2), (1.5, 0.08, 0.4), "wood")
    kit.box((-3.3, -3.6, 0.2), (1.5, 0.08, 0.4), "wood")
    kit.box((-4.02, -3.9, 0.2), (0.08, 0.6, 0.4), "wood")
    kit.box((-2.58, -3.9, 0.2), (0.08, 0.6, 0.4), "wood")
    kit.box((-3.3, -3.9, 0.03), (1.5, 0.6, 0.06), "wood")
    kit.build(bake_ao=False)


def build_goat():
    """A small goat. Origin at its feet; faces +X."""
    kit = Kit("goat")
    kit.box((0, 0, 0.42), (0.62, 0.26, 0.28), "lime", jitter=0.03)
    kit.box((0.36, 0, 0.62), (0.2, 0.17, 0.2), "lime", jitter=0.03)
    kit.box((0.46, 0, 0.58), (0.12, 0.11, 0.1), "stone", jitter=0.0)
    for x in (-0.24, 0.22):
        for y in (-0.09, 0.09):
            kit.cylinder((x, y, 0), (x, y, 0.32), 0.035, "wood", segments=5, jitter=0.0)
    for y in (-0.05, 0.05):
        kit.cylinder((0.33, y, 0.71), (0.27, y, 0.85), 0.018, "stone_dark", segments=4, end_radius=0.0, jitter=0.0)
    kit.box((-0.33, 0, 0.5), (0.1, 0.05, 0.16), "lime", jitter=0.0)
    kit.build(bake_ao=False)


def build_ground():
    kit = Kit("courtyard-ground")
    bm = kit.bm
    made = bmesh.ops.create_grid(bm, x_segments=80, y_segments=80, size=26.0)
    for vert in made["verts"]:
        x, y = vert.co.x, vert.co.y
        distance = math.hypot(x, y)
        if distance > 7:
            lift = min(1.0, (distance - 7) / 14)
            vert.co.z = lift * lift * (1.1 + math.sin(x * 0.6) * 0.5 + math.cos(y * 0.47) * 0.5)
        else:
            vert.co.z = 0
    for face in bm.faces:
        centre = face.calc_center_median()
        x, y = centre.x, centre.y
        distance = math.hypot(x, y)
        patch = math.sin(x * 0.55 + y * 0.2) + math.sin(y * 0.7 - x * 0.31)
        if abs(x) < 1.3 and y < -2:
            colour = "path"
        elif -5.2 < y < -4.4 and abs(x) < 14:
            colour = "path"
        elif distance < 8:
            colour = "earth" if patch > 0 else "earth_dark"
        else:
            colour = "grass" if patch > 0 else "grass_dark"
        kit._paint([face], colour, 0.015)
    # A drain along the road edge: where lost water goes.
    kit.box((0, -5.45, 0.012), (28, 0.3, 0.024), "stone_dark", jitter=0.03)
    for _ in range(70):
        angle = random.uniform(0, math.tau)
        distance = random.uniform(4.5, 13)
        x, y = math.cos(angle) * distance, math.sin(angle) * distance
        if -6 < y < -3 and abs(x) < 4:
            continue
        kit.cylinder((x, y, 0), (x, y, random.uniform(0.15, 0.32)), 0.09, "grass_dark", segments=4, end_radius=0.0)
    for _ in range(14):
        angle = random.uniform(0, math.tau)
        distance = random.uniform(4.2, 11)
        kit.blob((math.cos(angle) * distance, math.sin(angle) * distance, 0.08), random.uniform(0.12, 0.28), "stone", 0.6)
    kit.build()


def mango_tree(kit, x, y, scale):
    kit.cylinder((x, y, 0), (x, y, 2.0 * scale), 0.2 * scale, "bark", segments=6, end_radius=0.12 * scale)
    for _ in range(9):
        kit.blob(
            (
                x + random.uniform(-1.3, 1.3) * scale,
                y + random.uniform(-1.3, 1.3) * scale,
                (2.5 + random.uniform(0, 1.5)) * scale,
            ),
            random.uniform(0.7, 1.1) * scale,
            random.choice(("leaf", "leaf_light")),
            0.82,
            2,
        )


def palm_tree(kit, x, y, scale):
    height = 4.6 * scale
    tilt = random.uniform(-0.4, 0.4)
    top = (x + tilt, y + tilt * 0.5, height)
    kit.cylinder((x, y, 0), top, 0.14 * scale, "bark", segments=6, end_radius=0.08 * scale)
    for index in range(7):
        angle = index / 7 * math.tau
        reach = 1.5 * scale
        kit.cylinder(
            top,
            (top[0] + math.cos(angle) * reach, top[1] + math.sin(angle) * reach, height - 0.55 * scale),
            0.2 * scale,
            "leaf_light",
            segments=3,
            end_radius=0.0,
        )


def neighbour_house(kit, x, y, wall, roof_colour):
    kit.box((x, y, 1.1), (3.6, 3.0, 2.2), wall, cuts=2, jitter=0.03)
    half = 1.75
    kit.prism([(y - half, 2.2), (y + half, 2.2), (y, 3.1)], 4.2, roof_colour, centre_x=x)


def build_backdrop():
    kit = Kit("village-backdrop")
    for index in range(26):
        angle = index / 26 * math.tau
        distance = random.uniform(44, 58)
        radius = random.uniform(14, 24)
        kit.cylinder(
            (math.cos(angle) * distance, math.sin(angle) * distance, -1),
            (math.cos(angle) * distance, math.sin(angle) * distance, random.uniform(8, 17)),
            radius,
            "hill_far" if distance > 50 else "hill",
            segments=7,
            end_radius=radius * 0.12,
            jitter=0.06,
        )
    neighbour_house(kit, -11, 7, "lime", "tile")
    neighbour_house(kit, 11, 8, "turquoise", "tile_dark")
    neighbour_house(kit, -15, -8, "ochre", "tile")
    neighbour_house(kit, 15, -9, "lime", "tile_dark")
    for x, y, scale in (
        (-6, 5, 1.1),
        (5, 5, 1.25),
        (-17, -10, 1.0),
        (15, -10, 1.15),
        (-4, 8, 1.3),
        (5, 9, 1.2),
        (-17, 2, 1.4),
        (18, 3, 1.3),
        (-3, 15, 1.5),
        (10, 15, 1.4),
    ):
        mango_tree(kit, x, y, scale)
    for x, y, scale in (
        (-20, -11, 1.0),
        (5.8, 5.5, 1.1),
        (-19, -3, 1.2),
        (14, -2, 1.15),
        (-8, 12, 1.25),
        (2, 13, 1.1),
        (19, 10, 1.3),
        (-20, 9, 1.3),
    ):
        palm_tree(kit, x, y, scale)
    kit.build(bake_ao=False)


build_house()
build_gutter()
build_downpipe()
build_filter_unit()
build_flush_valve()
build_layer("filter-stones", "stone_dark", "stone", 22, (0.05, 0.08))
build_layer("filter-sand", "sand", "sand", 12, (0.04, 0.07))
build_layer("filter-charcoal", "charcoal", "charcoal_light", 22, (0.04, 0.07))
build_school()
build_long_gutter()
build_school_pipe()
build_school_cover()
build_recharge_cutaway()
build_pit_layer("pit-large-stones", "stone_dark", "stone", 12, (0.09, 0.14))
build_pit_layer("pit-small-stones", "stone_dark", "stone_dark", 22, (0.05, 0.08))
build_pit_layer("pit-sand", "sand", "sand", 14, (0.04, 0.07))
build_pond()
build_crops()
build_station()
build_leaf_pile()
build_droppy()
build_badge()
build_summer_props()
build_goat()
build_ground()
build_backdrop()
print("KIT_DONE")
