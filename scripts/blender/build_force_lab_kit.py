"""Builds the Force and Motion lab kit and exports raw GLBs.

Run headless:
  blender -b --python scripts/blender/build_force_lab_kit.py -- <output_dir> [model ...]

Same pipeline as the rainwater kit: one vertex-coloured mesh per part, baked
ambient occlusion on rooms, exported Y up. Blender front (-Y) faces the child
(+Z in Three.js). Each scene is built around the origin; the child stands at
about Three.js z = +2.2.
"""
import math
import os
import random
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

ARGS = sys.argv[sys.argv.index("--") + 1:]
OUT = ARGS[0]
ONLY = set(ARGS[1:])
os.makedirs(OUT, exist_ok=True)
random.seed(11)
for leftover in list(bpy.data.objects):
    bpy.data.objects.remove(leftover)


def linear(hex_colour):
    def channel(value):
        value /= 255
        return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4

    return (channel((hex_colour >> 16) & 255), channel((hex_colour >> 8) & 255), channel(hex_colour & 255), 1.0)


PALETTE = {
    "tile_a": 0xe9e2d4, "tile_b": 0xd9d1c1, "wall": 0xf4e3c3, "wall_side": 0xe8d7b6,
    "wood": 0xb98a57, "wood_dark": 0x8a6239, "bread": 0xc78a3b, "bread_dark": 0xa86a2c,
    "counter": 0x5aa7a0, "counter_top": 0xf2efe6, "poster": 0xfafafa, "poster_fruit": 0x8e3d7a,
    "trolley": 0x2f6fd0, "trolley_wire": 0x9db6d8, "handle_red": 0xe24b3b, "metal": 0x8a9bb0,
    "rubber": 0x2b2b2b, "wagon": 0xd93a2f, "wagon_rim": 0xb22a22, "door": 0xc89a63, "brass": 0xd9b44a,
    "grass": 0x93be5a, "grass_dark": 0x7ea94b, "chalk": 0xfafafa, "wall_play": 0xe9c98f, "wall_cap": 0xd77e4a,
    "bark": 0x6a4a31, "leaf": 0x5e9b4c, "leaf_light": 0x76b05a, "net": 0xeeeeee,
    "ball_white": 0xf6f3ee, "ball_orange": 0xd2692e,
    "skin": 0xc98b62, "hair": 0x2b1d16, "shirt": 0xfafafa, "skirt": 0x2a4f8f, "sock": 0xf2f2f2,
    "shoe": 0x222222, "eye": 0x1b1b1b, "mouth": 0x9c3b3b, "ribbon": 0xe24b6a,
    "class_floor": 0xd8c9ae, "class_wall": 0xf1e6cf, "board": 0x2f5d4a, "window": 0xbfe2f2,
    "ramp": 0xd9a86c, "tile_blue": 0x86c7ee, "tile_blue_b": 0x6fb8e6, "carpet": 0xd8bf8f,
    "carpet_dark": 0xc4a877, "mark": 0x333333, "sign": 0xdff6f0, "sign_text": 0x16365c, "start_line": 0xffffff,
    "car": 0xd93a2f, "glass": 0x9fd3f2, "light": 0xfff3b0, "flag_blue": 0x2f6fd0, "flag_orange": 0xd99a1c,
    "court_floor": 0xd6cdbd, "court_wall": 0xf2c8a0, "court_band": 0xd27a54, "target": 0x2f6fd0,
    "target_dot": 0xe24b3b, "feeder": 0x4a9a7a, "feeder_dark": 0x2c5f4b, "tennis": 0xd7e64a,
    "racket_frame": 0x2e7dd1, "racket_grip": 0x2a2a2a, "strings": 0xf5f5f5,
}


class Kit:
    """Accumulates coloured geometry into one bmesh, around an optional pivot."""

    def __init__(self, name, pivot=(0, 0, 0)):
        self.name = name
        self.pivot = Vector(pivot)
        self.bm = bmesh.new()
        self.layer = self.bm.loops.layers.float_color.new("Col")

    def _paint(self, faces, colour, jitter=0.04):
        base = linear(PALETTE[colour])
        for face in faces:
            shade = 1 + random.uniform(-jitter, jitter)
            tinted = (base[0] * shade, base[1] * shade, base[2] * shade, 1.0)
            for loop in face.loops:
                loop[self.layer] = tinted

    def _new_faces(self, before):
        return [face for face in self.bm.faces if face not in before]

    def box(self, centre, size, colour, rot=(0, 0, 0), cuts=0, jitter=0.04, bevel=0.0):
        before = set(self.bm.faces)
        matrix = (
            Matrix.Translation(centre)
            @ Matrix.Rotation(rot[2], 4, "Z") @ Matrix.Rotation(rot[1], 4, "Y") @ Matrix.Rotation(rot[0], 4, "X")
            @ Matrix.Diagonal((size[0], size[1], size[2], 1))
        )
        made = bmesh.ops.create_cube(self.bm, size=1.0, matrix=matrix)
        if bevel:
            bmesh.ops.bevel(self.bm, geom=list({e for v in made["verts"] for e in v.link_edges}),
                            offset=bevel, segments=2, affect="EDGES")
        if cuts:
            edges = list({e for v in made["verts"] if v.is_valid for e in v.link_edges})
            bmesh.ops.subdivide_edges(self.bm, edges=edges, cuts=cuts, use_grid_fill=True)
        self._paint(self._new_faces(before), colour, jitter)

    def cylinder(self, start, end, radius, colour, segments=8, end_radius=None, jitter=0.03):
        before = set(self.bm.faces)
        axis = Vector(end) - Vector(start)
        rotation = axis.to_track_quat("Z", "Y").to_matrix().to_4x4()
        bmesh.ops.create_cone(
            self.bm, cap_ends=True, segments=segments, radius1=radius,
            radius2=end_radius if end_radius is not None else radius, depth=axis.length,
            matrix=Matrix.Translation((Vector(start) + Vector(end)) / 2) @ rotation,
        )
        self._paint(self._new_faces(before), colour, jitter)

    def blob(self, centre, radius, colour, scale=(1, 1, 1), subdivisions=2, rough=0.0, jitter=0.03):
        before = set(self.bm.faces)
        made = bmesh.ops.create_icosphere(
            self.bm, subdivisions=subdivisions, radius=radius,
            matrix=Matrix.Translation(centre) @ Matrix.Diagonal((scale[0], scale[1], scale[2], 1)),
        )
        if rough:
            for vert in made["verts"]:
                vert.co += vert.normal * random.uniform(-radius * rough, radius * rough)
        self._paint(self._new_faces(before), colour, jitter)

    def torus(self, centre, major, minor, colour, axis="Y", segments=24, ring=8):
        """A ring lying in the plane perpendicular to axis."""
        for index in range(segments):
            a = index / segments * math.tau
            b = (index + 1) / segments * math.tau

            def point(angle):
                if axis == "Y":
                    return (centre[0] + math.cos(angle) * major, centre[1], centre[2] + math.sin(angle) * major)
                return (centre[0] + math.cos(angle) * major, centre[1] + math.sin(angle) * major, centre[2])

            self.cylinder(point(a), point(b), minor, colour, segments=ring, jitter=0.0)

    def text(self, body, centre, size, colour, rot=(math.radians(90), 0, 0)):
        bpy.ops.object.text_add(location=centre, rotation=rot)
        obj = bpy.context.object
        obj.data.body = body
        obj.data.size = size
        obj.data.align_x = "CENTER"
        obj.data.extrude = 0.008
        obj.data.resolution_u = 3
        bpy.ops.object.convert(target="MESH")
        mesh_obj = bpy.context.object
        temp = bmesh.new()
        temp.from_mesh(mesh_obj.data)
        matrix = mesh_obj.matrix_world
        before = set(self.bm.faces)
        verts = [self.bm.verts.new(matrix @ v.co) for v in temp.verts]
        temp.verts.ensure_lookup_table()
        for face in temp.faces:
            try:
                self.bm.faces.new([verts[v.index] for v in face.verts])
            except ValueError:
                pass
        temp.free()
        bpy.data.objects.remove(mesh_obj)
        self._paint(self._new_faces(before), colour, 0.0)

    def make(self, collection, bake_ao=False):
        bmesh.ops.translate(self.bm, verts=self.bm.verts, vec=-self.pivot)
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
        nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.85
        attribute = nodes.new("ShaderNodeVertexColor")
        attribute.layer_name = "Col"
        material.node_tree.links.new(attribute.outputs["Color"], nodes["Principled BSDF"].inputs["Base Color"])
        mesh.materials.append(material)
        obj = bpy.data.objects.new(self.name, mesh)
        obj.location = self.pivot
        collection.objects.link(obj)
        if bake_ao:
            bake_ambient_occlusion(obj)
        return obj


def bake_ambient_occlusion(obj):
    mesh = obj.data
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 48
    scene.cycles.device = "CPU"
    ao = mesh.color_attributes.new("AO", "FLOAT_COLOR", "CORNER")
    mesh.color_attributes.active_color = ao
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    scene.render.bake.target = "VERTEX_COLORS"
    bpy.ops.object.bake(type="AO")
    obj.select_set(False)
    colours = mesh.color_attributes["Col"].data
    for index, item in enumerate(ao.data):
        strength = 0.4 + 0.6 * item.color[0]
        c = colours[index].color
        colours[index].color = (c[0] * strength, c[1] * strength, c[2] * strength, 1.0)
    mesh.color_attributes.remove(ao)
    mesh.color_attributes.active_color = mesh.color_attributes["Col"]
    mesh.color_attributes.render_color_index = mesh.color_attributes.find("Col")


def model(name, parts, bake_ao=False):
    """parts: list of (Kit, parent_index or None). Exports one GLB named name."""
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    objects = []
    for kit, parent in parts:
        obj = kit.make(collection, bake_ao=bake_ao)
        if parent is not None:
            parent_obj = objects[parent]
            obj.parent = parent_obj
            obj.location = obj.location - parent_obj.location
        objects.append(obj)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in collection.objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUT, f"{name}.glb"), use_selection=True, export_format="GLB",
        export_yup=True, export_apply=True, export_vertex_color="ACTIVE", export_all_vertex_colors=False,
        export_materials="EXPORT", export_extras=False, export_animations=False,
    )
    bpy.context.scene.collection.children.unlink(collection)
    print("BUILT", name)


def tree(kit, x, y, scale=1.0):
    kit.cylinder((x, y, 0), (x, y, 2.0 * scale), 0.13 * scale, "bark", segments=7, end_radius=0.09 * scale)
    for dx, dy, dz, r in ((0, 0, 2.3, 0.9), (0.6, 0.2, 2.0, 0.6), (-0.6, -0.1, 2.1, 0.7), (0.1, 0.4, 2.8, 0.6)):
        kit.blob((x + dx * scale, y + dy * scale, dz * scale), r * scale, random.choice(("leaf", "leaf_light")),
                 subdivisions=2, rough=0.08)


# ------------------------------------------------------------- scene 1

def build_store_room():
    kit = Kit("store-room")
    for i in range(-4, 4):
        for j in range(-5, 5):
            kit.box((i * 0.62 + 0.31, j * 0.62 + 0.31, -0.01), (0.61, 0.61, 0.02), "tile_a" if (i + j) % 2 else "tile_b", jitter=0.01)
    kit.box((0, 3.05, 1.5), (5.2, 0.1, 3.0), "wall", cuts=4, jitter=0.01)
    kit.box((-2.55, 0, 1.5), (0.1, 6.2, 3.0), "wall_side", cuts=4, jitter=0.01)
    kit.box((2.55, 0, 1.5), (0.1, 6.2, 3.0), "wall_side", cuts=4, jitter=0.01)
    kit.box((0, 0, 3.0), (5.2, 6.2, 0.06), "tile_b", jitter=0.0)
    # Bread shelves on the right wall.
    for k, z in enumerate((0.45, 0.9, 1.35)):
        kit.box((1.95, 1.1, z), (0.7, 2.8, 0.05), "wood")
        for n in range(6):
            kit.blob((1.95, -0.1 + n * 0.46, z + 0.09), 0.1, "bread" if (n + k) % 2 else "bread_dark", scale=(1.25, 1.9, 0.75), subdivisions=2)
    for y in (-0.3, 2.5):
        kit.box((1.95, y, 0.8), (0.7, 0.05, 1.6), "wood_dark")
    # Counter and poster at the far end.
    kit.box((-0.3, 2.45, 0.5), (2.2, 0.7, 1.0), "counter", cuts=2)
    kit.box((-0.3, 2.45, 1.02), (2.3, 0.8, 0.05), "counter_top")
    kit.box((-1.3, 2.99, 1.9), (0.8, 0.02, 0.6), "poster", jitter=0.0)
    kit.blob((-1.3, 2.97, 1.9), 0.14, "poster_fruit", scale=(1, 0.2, 1.2))
    # Door frame on the left wall (the door itself is a separate model).
    kit.box((-2.49, -0.4, 2.15), (0.06, 1.14, 0.1), "wood_dark")
    for y in (-0.95, 0.15):
        kit.box((-2.49, y, 1.05), (0.06, 0.06, 2.2), "wood_dark")
    model("store-room", [(kit, None)], bake_ao=True)


def build_trolley():
    """Origin at the floor under the trolley centre; handle towards the child (-Y)."""
    kit = Kit("trolley")
    w, d, h0, h1 = 0.56, 0.66, 0.52, 0.93
    for x in (-w / 2, w / 2):
        for y in (-d / 2, d / 2):
            kit.cylinder((x, y, h0), (x, y, h1), 0.012, "trolley", segments=6)
    for z in (h0, h1):
        for (a, b) in (((-w / 2, -d / 2), (w / 2, -d / 2)), ((-w / 2, d / 2), (w / 2, d / 2)),
                       ((-w / 2, -d / 2), (-w / 2, d / 2)), ((w / 2, -d / 2), (w / 2, d / 2))):
            kit.cylinder((a[0], a[1], z), (b[0], b[1], z), 0.014, "trolley", segments=6)
    for i in range(1, 8):
        x = -w / 2 + i * w / 8
        for y in (-d / 2, d / 2):
            kit.cylinder((x, y, h0), (x, y, h1), 0.006, "trolley_wire", segments=4, jitter=0.0)
    for i in range(1, 9):
        y = -d / 2 + i * d / 9
        for x in (-w / 2, w / 2):
            kit.cylinder((x, y, h0), (x, y, h1), 0.006, "trolley_wire", segments=4, jitter=0.0)
    kit.box((0, 0, h0), (w, d, 0.012), "trolley_wire", jitter=0.0)
    for x in (-w / 2, w / 2):
        kit.cylinder((x, -d / 2, h1), (x, -d / 2 - 0.12, 1.0), 0.014, "trolley", segments=6)
        kit.cylinder((x, -d / 2 + 0.05, h0), (x, -0.25, 0.09), 0.014, "metal", segments=6)
        kit.cylinder((x, d / 2 - 0.05, h0), (x, 0.25, 0.09), 0.014, "metal", segments=6)
    kit.cylinder((-w / 2 - 0.02, -d / 2 - 0.12, 1.0), (w / 2 + 0.02, -d / 2 - 0.12, 1.0), 0.026, "handle_red", segments=10)
    for x in (-w / 2, w / 2):
        for y in (-0.25, 0.25):
            kit.cylinder((x - 0.02, y, 0.05), (x + 0.02, y, 0.05), 0.05, "rubber", segments=12)
    model("trolley", [(kit, None)])


def build_wagon():
    """Body with wheels; the pull handle is a child node pivoting at its hinge."""
    body = Kit("wagon")
    body.box((0, 0, 0.26), (0.5, 0.75, 0.2), "wagon", bevel=0.015)
    body.box((0, 0, 0.37), (0.54, 0.79, 0.03), "wagon_rim")
    for x in (-0.27, 0.27):
        for y in (-0.26, 0.26):
            body.cylinder((x - 0.025, y, 0.1), (x + 0.025, y, 0.1), 0.09, "rubber", segments=14)
            body.cylinder((x - 0.03, y, 0.1), (x + 0.03, y, 0.1), 0.03, "metal", segments=8)
    handle = Kit("wagon-handle", pivot=(0, -0.38, 0.2))
    handle.cylinder((0, -0.38, 0.2), (0, -0.95, 0.62), 0.016, "rubber", segments=8)
    handle.cylinder((-0.09, -0.95, 0.62), (0.09, -0.95, 0.62), 0.028, "rubber", segments=10)
    model("wagon", [(body, None), (handle, 0)])


def build_door():
    """Door leaf. Origin at the hinge (bottom of the hinge edge)."""
    kit = Kit("door", pivot=(0, 0, 0))
    kit.box((0, 0.5, 1.0), (0.05, 1.0, 2.0), "door", bevel=0.01, cuts=1)
    kit.box((0, 0.5, 1.45), (0.06, 0.7, 0.6), "wood", jitter=0.02)
    kit.box((0, 0.5, 0.55), (0.06, 0.7, 0.6), "wood", jitter=0.02)
    for side in (-1, 1):
        kit.cylinder((side * 0.03, 0.88, 1.0), (side * 0.09, 0.88, 1.0), 0.015, "brass", segments=8)
        kit.cylinder((side * 0.09, 0.88, 0.92), (side * 0.09, 0.88, 1.08), 0.02, "brass", segments=8)
    model("door", [(kit, None)])


# ------------------------------------------------------------- scene 2

def build_playground():
    kit = Kit("playground")
    made = bmesh.ops.create_grid(kit.bm, x_segments=40, y_segments=40, size=14)
    for face in kit.bm.faces:
        c = face.calc_center_median()
        kit._paint([face], "grass" if (math.sin(c.x * 0.7) + math.cos(c.y * 0.55)) > -0.3 else "grass_dark", 0.02)
    kit.box((0, 0.9, 0.003), (2.4, 0.05, 0.006), "chalk", jitter=0.0)
    kit.box((0, 6.0, 0.45), (14, 0.25, 0.9), "wall_play", cuts=3, jitter=0.02)
    kit.box((0, 6.0, 0.92), (14, 0.32, 0.06), "wall_cap")
    tree(kit, -4.5, 4.6, 1.2)
    tree(kit, 5.0, 5.2, 1.0)
    # Goal frame (the net is added below as thin cords).
    gx, gy = 0.0, 3.2
    for x in (-1.0, 1.0):
        kit.cylinder((gx + x, gy, 0), (gx + x, gy, 1.0), 0.04, "chalk", segments=10)
        kit.cylinder((gx + x, gy, 1.0), (gx + x, gy + 0.7, 0.0), 0.02, "chalk", segments=8)
        kit.cylinder((gx + x, gy + 0.7, 0.0), (gx + x, gy, 0.0), 0.02, "chalk", segments=8)
    kit.cylinder((gx - 1.0, gy, 1.0), (gx + 1.0, gy, 1.0), 0.04, "chalk", segments=10)
    for i in range(11):
        x = gx - 1.0 + i * 0.2
        kit.cylinder((x, gy + 0.02, 1.0), (x, gy + 0.7, 0.0), 0.005, "net", segments=3, jitter=0.0)
    for j in range(1, 7):
        t = j / 7
        kit.cylinder((gx - 1.0, gy + 0.7 * t, 1.0 - t), (gx + 1.0, gy + 0.7 * t, 1.0 - t), 0.005, "net", segments=3, jitter=0.0)
    model("playground", [(kit, None)], bake_ao=False)


def build_football():
    kit = Kit("football")
    made = bmesh.ops.create_icosphere(kit.bm, subdivisions=2, radius=0.11)
    for index, face in enumerate(kit.bm.faces):
        kit._paint([face], "ball_orange" if index % 7 == 0 else "ball_white", 0.0)
    model("football", [(kit, None)])


def build_riya():
    """Riya, origin at her feet, facing the child (-Y). Right leg and right arm pivot for animation."""
    body = Kit("riya")
    for x in (-0.07,):
        body.cylinder((x, 0, 0.6), (x, 0, 0.16), 0.05, "skin", segments=10)
        body.cylinder((x, 0, 0.17), (x, 0, 0.05), 0.052, "sock", segments=10)
        body.blob((x, -0.03, 0.04), 0.06, "shoe", scale=(1, 1.5, 0.75))
    body.cylinder((0, 0, 0.58), (0, 0, 0.85), 0.2, "skirt", segments=16, end_radius=0.15)
    body.cylinder((0, 0, 0.84), (0, 0, 1.17), 0.15, "shirt", segments=16, end_radius=0.14)
    body.blob((0, 0, 1.14), 0.17, "shirt", scale=(1, 0.75, 0.45))
    body.cylinder((-0.17, 0, 1.13), (-0.25, -0.02, 0.98), 0.055, "shirt", segments=10)
    body.cylinder((-0.25, -0.02, 0.98), (-0.3, -0.05, 0.78), 0.042, "skin", segments=10)
    body.blob((-0.31, -0.06, 0.74), 0.045, "skin")
    body.cylinder((0, 0, 1.17), (0, 0, 1.26), 0.05, "skin", segments=10)
    body.blob((0, 0, 1.42), 0.17, "skin", scale=(1, 0.95, 1.05), subdivisions=3)
    body.blob((0, 0.03, 1.48), 0.18, "hair", scale=(1.04, 0.95, 0.9), subdivisions=3)
    body.blob((0, 0.1, 1.6), 0.08, "hair")
    body.blob((0.06, 0.12, 1.66), 0.035, "ribbon")
    for x in (-0.06, 0.06):
        body.blob((x, -0.155, 1.44), 0.022, "eye", subdivisions=2)
    body.box((0, -0.16, 1.36), (0.06, 0.01, 0.012), "mouth", jitter=0.0)
    leg = Kit("riya-leg", pivot=(0.07, 0, 0.6))
    leg.cylinder((0.07, 0, 0.6), (0.07, 0, 0.16), 0.05, "skin", segments=10)
    leg.cylinder((0.07, 0, 0.17), (0.07, 0, 0.05), 0.052, "sock", segments=10)
    leg.blob((0.07, -0.03, 0.04), 0.06, "shoe", scale=(1, 1.5, 0.75))
    arm = Kit("riya-arm", pivot=(0.17, 0, 1.13))
    arm.cylinder((0.17, 0, 1.13), (0.25, -0.02, 0.98), 0.055, "shirt", segments=10)
    arm.cylinder((0.25, -0.02, 0.98), (0.3, -0.05, 0.78), 0.042, "skin", segments=10)
    arm.blob((0.31, -0.06, 0.74), 0.045, "skin")
    model("riya", [(body, None), (leg, 0), (arm, 0)])


# ------------------------------------------------------------- scene 3

TABLE_TOP = 0.7


def build_classroom():
    """Room, long table, ramp and two lanes. Lanes run from the ramp away from the child."""
    kit = Kit("classroom")
    kit.box((0, 1.0, -0.02), (7, 9, 0.04), "class_floor", cuts=3, jitter=0.01)
    kit.box((0, 4.0, 1.5), (7, 0.1, 3.0), "class_wall", cuts=4, jitter=0.01)
    kit.box((-3.5, 1.0, 1.5), (0.1, 9, 3.0), "class_wall", cuts=4, jitter=0.01)
    kit.box((-1.2, 3.93, 1.6), (2.4, 0.04, 1.1), "board", jitter=0.01)
    kit.box((1.8, 3.93, 1.8), (1.2, 0.04, 1.0), "window", jitter=0.0)
    # Long table: the lanes sit on top so children don't bend to the floor.
    kit.box((0, 0.5, TABLE_TOP - 0.03), (1.3, 3.6, 0.06), "wood")
    for x in (-0.6, 0.6):
        for y in (-1.2, 0.5, 2.2):
            kit.box((x, y, (TABLE_TOP - 0.06) / 2), (0.06, 0.06, TABLE_TOP - 0.06), "wood_dark")
    # Ramp from y = -1.05 (top, height 0.15) down to y = -0.55.
    ramp_top = TABLE_TOP + 0.15
    kit.box((0, -0.8, (TABLE_TOP + ramp_top) / 2), (0.8, 0.52, 0.03), "ramp", rot=(math.atan2(0.15, 0.5), 0, 0))
    kit.box((0, -1.05, (TABLE_TOP + ramp_top) / 2), (0.8, 0.04, 0.15), "ramp")
    kit.box((0, -1.02, ramp_top + 0.004), (0.8, 0.02, 0.003), "start_line", jitter=0.0)
    # Lanes from y = -0.55 for 2.6 m.
    y0, length = -0.55, 2.6
    for i in range(10):
        kit.box((-0.2, y0 + i * 0.26 + 0.13, TABLE_TOP + 0.004), (0.34, 0.25, 0.008), "tile_blue_b" if i % 2 else "tile_blue", jitter=0.0)
    for i in range(52):
        for j in range(7):
            x = 0.06 + j * 0.047
            y = y0 + i * 0.05 + 0.025
            kit.box((x, y, TABLE_TOP + 0.012 + random.uniform(-0.003, 0.004)), (0.04, 0.045, 0.024),
                    random.choice(("carpet", "carpet", "carpet_dark")), rot=(0, 0, random.uniform(-0.3, 0.3)), jitter=0.03)
    for i in range(1, 11):
        kit.box((-0.42, y0 + i * 0.25, TABLE_TOP + 0.003), (0.06, 0.012, 0.004), "mark", jitter=0.0)
        kit.box((0.42, y0 + i * 0.25, TABLE_TOP + 0.003), (0.06, 0.012, 0.004), "mark", jitter=0.0)
    # Lane names painted flat on the table, so nothing blocks the view down the lanes.
    for label, x in (("Smooth", -0.2), ("Rough", 0.2)):
        kit.box((x, -0.47, TABLE_TOP + 0.003), (0.34, 0.12, 0.004), "sign", jitter=0.0)
        kit.text(label, (x, -0.49, TABLE_TOP + 0.006), 0.07, "sign_text", rot=(0, 0, 0))
    model("classroom", [(kit, None)], bake_ao=True)


def build_toy_car():
    """Origin under the car centre; front towards +Y (away from the child)."""
    kit = Kit("toy-car")
    kit.box((0, 0, 0.05), (0.09, 0.18, 0.05), "car", bevel=0.012)
    kit.box((0, -0.01, 0.095), (0.075, 0.09, 0.045), "car", bevel=0.012)
    kit.box((0, 0.035, 0.098), (0.07, 0.004, 0.034), "glass", jitter=0.0)
    for sx in (-0.047, 0.047):
        for sy in (-0.06, 0.06):
            kit.cylinder((sx - 0.008, sy, 0.025), (sx + 0.008, sy, 0.025), 0.025, "rubber", segments=12)
    for sx in (-0.03, 0.03):
        kit.blob((sx, 0.091, 0.06), 0.008, "light", subdivisions=1)
    model("toy-car", [(kit, None)])


def build_flag():
    kit = Kit("stop-flag")
    kit.cylinder((0, 0, 0), (0, 0, 0.3), 0.006, "mark", segments=6)
    kit.box((0.06, 0, 0.26), (0.12, 0.006, 0.08), "flag_orange", jitter=0.0)
    model("stop-flag", [(kit, None)])


# ------------------------------------------------------------- scene 4

def build_courtyard():
    kit = Kit("courtyard")
    kit.box((0, 1.0, -0.03), (12, 12, 0.06), "court_floor", cuts=4, jitter=0.01)
    kit.box((0, 2.65, 1.5), (6, 0.3, 3.0), "court_wall", cuts=4, jitter=0.01)
    kit.box((0, 2.49, 0.15), (6, 0.02, 0.3), "court_band", jitter=0.0)
    kit.torus((0.4, 2.48, 1.3), 0.45, 0.03, "target", axis="Y")
    kit.cylinder((0.4, 2.475, 1.3), (0.4, 2.485, 1.3), 0.08, "target_dot", segments=16)
    kit.box((1.9, 1.0, 0.35), (0.6, 0.6, 0.7), "feeder", bevel=0.02)
    kit.box((1.59, 1.0, 0.18), (0.04, 0.24, 0.2), "feeder_dark", jitter=0.0)
    tree(kit, -4.2, 4.0, 1.0)
    tree(kit, 4.6, 3.6, 0.9)
    model("courtyard", [(kit, None)], bake_ao=True)


def build_tennis_ball():
    kit = Kit("tennis-ball")
    kit.blob((0, 0, 0), 0.034, "tennis", subdivisions=2)
    kit.torus((0, 0, 0), 0.034, 0.003, "chalk", axis="Z", segments=16, ring=4)
    model("tennis-ball", [(kit, None)])


def build_racket():
    """Origin at the grip; the head points along +Z (up) when held upright."""
    kit = Kit("racket")
    kit.cylinder((0, 0, 0), (0, 0, 0.26), 0.016, "racket_grip", segments=8)
    kit.cylinder((0, 0, 0.26), (0, 0, 0.36), 0.012, "racket_frame", segments=8)
    centre = (0, 0, 0.5)
    for index in range(28):
        a = index / 28 * math.tau
        b = (index + 1) / 28 * math.tau
        kit.cylinder((math.cos(a) * 0.12, 0, 0.5 + math.sin(a) * 0.15),
                     (math.cos(b) * 0.12, 0, 0.5 + math.sin(b) * 0.15), 0.013, "racket_frame", segments=6, jitter=0.0)
    for i in range(-4, 5):
        x = i * 0.025
        h = 0.15 * math.sqrt(max(0, 1 - (x / 0.12) ** 2))
        kit.cylinder((x, 0, 0.5 - h), (x, 0, 0.5 + h), 0.002, "strings", segments=3, jitter=0.0)
    for i in range(-5, 6):
        z = 0.5 + i * 0.026
        w = 0.12 * math.sqrt(max(0, 1 - ((z - 0.5) / 0.15) ** 2))
        kit.cylinder((-w, 0, z), (w, 0, z), 0.002, "strings", segments=3, jitter=0.0)
    model("racket", [(kit, None)])


BUILDERS = {
    "store-room": build_store_room, "trolley": build_trolley, "wagon": build_wagon, "door": build_door,
    "playground": build_playground, "football": build_football, "riya": build_riya,
    "classroom": build_classroom, "toy-car": build_toy_car, "stop-flag": build_flag,
    "courtyard": build_courtyard, "tennis-ball": build_tennis_ball, "racket": build_racket,
}
for name, builder in BUILDERS.items():
    if not ONLY or name in ONLY:
        builder()
print("KIT_DONE")
