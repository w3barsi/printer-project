# 3D Tools

Design tools inside the employee system app that turn 2D inputs into 3D-printable models. Each Tool exists to produce one Product, and nothing beyond that.

## Language

**3D**:
The system app section that hosts tools for designing 3D-printable products.
_Avoid_: MakerLab, 3D Studio, CAD

**Tool**:
A single-purpose interface in 3D that produces one Product and only the features that Product needs.
_Avoid_: App, editor, generator

**Product**:
The physical artifact a Tool produces. A scoping boundary, not a commerce entity; one Tool maps to exactly one Product.
_Avoid_: Item, SKU, output

**Keychain**:
The Product of the Keychain Maker: a printable Base carrying color relief and one Attachment.
_Avoid_: Tag, charm, fob

**Medal**:
The Product of the Medal Maker: a printable Base with Offsets beside it. Starts from a DXF Profile.
_Avoid_: Badge, coin, plaque

**Base**:
The backing plate of a Keychain or Medal. Every Color Layer, Offset, and Attachment attaches to it. Has its own thickness and color.
_Avoid_: Plate, backer, backing

**Color Layer**:
A region of the source image assigned to one Palette color and extruded from the Base to its own thickness. Up to five per Keychain.
_Avoid_: Block, level, stripe

**Palette**:
The set of up to five colors that quantizing the source image produces.
_Avoid_: Colors, scheme

**Quantization**:
Reducing the source image to the Palette by grouping pixels into the nearest Palette color.
_Avoid_: Posterize, vectorize, trace

**Rasterize**:
Rendering an SVG to pixels before Quantization. One of the SVG reading modes.
_Avoid_: Flatten, bake

**Exact fills**:
The SVG reading mode that builds the Palette from the file's declared fill and stroke colors, skipping Quantization.
_Avoid_: Vectorize, direct colors

**Profile**:
The closed outlines a DXF contributes to a Medal, in millimetres. The Medal's footprint; every Offset is measured from it.
_Avoid_: Shape, contour, path, silhouette

**Offset**:
A band beside a Medal, in the same plane, like a stroke: its width grows the object outward. Bands stack outward in list order; each has its own thickness and color.
_Avoid_: Ring, border, outline, bevel

**Lanyard**:
The section on a Medal that carries the ribbon: a filleted tab with an elongated hole. Its bottom edge spans two contact points on the object outline, which set its position, width, and orientation; the width can be locked, and the tab bridges the gap it spans into the object.
_Avoid_: Hook, loop, eyelet, bail

**Attachment**:
An optional feature on a Keychain used to hang or carry it. Variants: Hook (raised loop joined to the Base), Hole (through-hole), Bookmark (through-hole at the tassel position).
_Avoid_: Loop, ring, tab, hanger

**Source**:
The file a Tool consumes as its input. A PNG or SVG for the Keychain Maker; a DXF for the Medal Maker.
_Avoid_: Source image, upload, photo, artwork
