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

**Base**:
The backing plate of a Keychain. Every Color Layer and the Attachment attach to it. Has its own thickness and color.
_Avoid_: Plate, backer, backing

**Color Layer**:
A region of the source image assigned to one Palette color and extruded from the Base to its own thickness. Up to five per Keychain.
_Avoid_: Block, level, stripe

**Palette**:
The set of up to five colors that quantizing the source image produces.
_Avoid_: Colors, scheme

**Quantization**:
Reducing the source PNG to the Palette by grouping pixels into the nearest Palette color.
_Avoid_: Posterize, vectorize, trace

**Attachment**:
An optional feature on a Keychain used to hang or carry it. Variants: Hook (raised loop joined to the Base), Hole (through-hole), Bookmark (through-hole at the tassel position).
_Avoid_: Loop, ring, tab, hanger

**Source image**:
The PNG a Tool consumes as its input.
_Avoid_: Upload, photo, artwork
