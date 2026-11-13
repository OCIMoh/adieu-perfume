---
name: scroll-world
description: >
  Plan and engineer an immersive scroll-scrubbed "fly through the world" camera journey
  for visual, architectural, physical, and craft-driven brands. Runs a streamlined 3-question
  intake, locks visual style with a decoupled [STYLE LOCK] block, selects one of 4 scrollytelling
  journeys, outputs a physics-grounded shot specification with Continuous Handoff as universal
  default (only Clip 01 gets a static still prompt; subsequent clips chain from extracted boundary frames),
  enforces seamless video handoffs, and scaffolds an Apple-grade HTML5 Canvas frame engine.
allowed-tools: Bash, Read, Write, Edit, AskUserQuestion, Skill
---

# scroll-world

Produces an interactive landing page where **scroll drives a camera**: it glides through a space, inspects a hero product, follows a craft process, or navigates a spatial system. Delivered as a sequence of AI-generated video clips scrubbed by scroll position and terminating in a goal-driven conversion space.

---

## The Primary Output Contract: The Shot Specification

The agent's primary deliverable is **a strict, physics-grounded Shot Specification**. Standard image-to-video diffusion models accept **one Start Frame** at a time and start from zero initial velocity. Therefore, every transition must have an explicit **`Seam Type`**:

1. **`Continuous Handoff` (UNIVERSAL DEFAULT)**: Clip $N$ begins on the exact extracted last frame of Clip $N-1$ (`assets/frames/clip_{N-1}_last.png`). Used for open terrain, straight corridors, unbroken tracking shots, and sequential craft/making.
   - **GOLDEN LAW — NO PHANTOM STILLS**: **Only Clip 01 gets a Start Image Prompt (`scene_01.png`)**. For Clips 02 through $N$, the starting image is **physically extracted** from `clip_{N-1}_last.png`. The agent **NEVER writes static image prompts for Clips 02+** in Continuous Handoff! It outputs ONLY the Grounded Video Motion Prompt. Generating static prompts for intermediate clips produces visual hallucination and destroys frame-to-frame continuity.
2. **`Threshold Cut`**: Clip $N-1$ ends approaching a dark doorway, gate, or portal; Clip $N$ begins inside the space. The dark interior masks the editorial cut. (Only here does Clip $N$ receive an interior still prompt `scene_N.png`).
3. **`Match Cut`**: Camera transitions between discrete physical stations or angles, joined by a shared visual anchor (focal point, geometry, or motion axis). Reserved ONLY for intentional jumps across discontinuous spaces or non-adjacent environments.

### Output Structure: Summary Table + Per-Clip Detail Blocks

#### 1. Summary Shot Table
| Clip # | Move Type | Seam Type | Visual Anchor | Duration |
|:---:|:---:|:---:|:---|:---:|
| **01** | Forward Dolly | Initial Start | Exterior facade approaching entrance portal | 5s |
| **02** | Forward Dolly | Continuous Handoff | Push through courtyard toward central rotunda | 5s |
| **03** | 60° Orbit Arc | Continuous Handoff | Hero centerpiece on display plinth | 4s |
| **04** | Forward Glide | Continuous Handoff | Push past plinth toward terminal destination | 5s |

#### 2. Per-Clip Specification Blocks

##### For Clip 01 (Initial Start):
```markdown
### Clip 01: [Shot Title]
- **Move Type**: [Forward Dolly / Orbit Arc / Rail Traverse]
- **Seam Type**: Initial Start
- **Start Image Prompt (`assets/stills/scene_01.png`)**:
  `[STYLE LOCK] [Detailed scene description with focal anchor, camera perspective, and negative space margin].`
- **Video Motion Prompt**:
  `Single continuous cinematic camera move, no cuts. Starting from the exact composition of the starting frame, camera executes a [move description]. In the final 1.5 seconds, settle into a slow, level, steady forward drift toward [exit anchor]. Smooth acceleration, zero backward movement, zero camera shake, no text.`
- **Duration**: [4s–6s]
- **Handoff Note**: Extract clip_01_last.png to anchor Clip 02.
```

##### For Clips 02 to N (Continuous Handoff — Universal Default):
```markdown
### Clip [N]: [Shot Title]
- **Move Type**: [Forward Dolly / Orbit Arc / Rail Traverse]
- **Seam Type**: Continuous Handoff
- **Start Image**: `assets/frames/clip_{N-1}_last.png` (extracted directly from Clip {N-1} final frame; NO static prompt)
- **Video Motion Prompt**:
  `Single continuous cinematic camera move, no cuts. Starting from the exact composition of the starting frame, camera executes a [move description]. In the final 1.5 seconds, settle into a slow, level, steady forward drift toward [exit anchor]. Smooth acceleration, zero camera shake, no text.`
- **Duration**: [4s–6s]
- **Handoff Note**: Extract clip_[N]_last.png to anchor Clip [N+1].
```

---

## Step 0 — Bootstrap (Silent Verification)

Verify tools and folders silently. **Do NOT print tool version dumps, PATH verifications, or directory listings to the user.** If `ffmpeg` or `node` is missing from `$PATH`, state the missing tool in one brief line. Otherwise, proceed immediately to Step 1 without technical preamble.

Scaffolding directories ensured silently:
```bash
mkdir -p assets/stills assets/raw assets/frames assets/vid assets/ref
```

---

## Step 1 — The Simple Intake (Ask & Pick)

Keep the opening simple, direct, and human. **Never interrogate the user with technical jargon (no questions about model backends, I2V start-frame APIs, ComfyUI, or texture boiling).**

Ask only these 3 simple things:

1. **The Subject:**
   *"What is this world about? Tell me about the product, brand, or space (and let me know if you have any existing photos/CAD or if we are creating it from scratch)."*
2. **The Palette & Materials:**
   *"Provide your brand colors and materials (or say 'choose for me' and one will be given)."*
3. **The Journey (Present options for user to pick):**
   - **1. Walkthrough:** Fly through a physical space, building, or landscape from outside to inside.
   - **2. Hero Orbit:** Sweep around a single finished product to inspect its details, craft, and angles.
   - **3. Process / Origin:** Follow the creation story stage-by-stage (from raw materials to finished product).
   - **4. Spatial Flow:** Glide across an abstract concept, digital network, or conceptual system.

---

## Step 2 — Formulate the STYLE LOCK Block

Style is decoupled from the journey. Formulate the `[STYLE LOCK]` block once. Paste it **verbatim** into every prompt to lock lighting, palette, and texture continuity:

```text
[STYLE LOCK: [LENS / OPTICAL MEDIUM], [LIGHTING ENGINE & ATMOSPHERE], Palette: [HEX_1, HEX_2, HEX_3], Materials: [MATERIAL_1, MATERIAL_2], subtle film grain, pristine textures, zero text, zero logos]
```

### Reference Examples:
- **Craft / Industrial (Photoreal):**
  `[STYLE LOCK: 35mm macro anamorphic lens, dark studio chiaroscuro with warm brass rim-light, Palette: #111111 obsidian, #D4AF37 brass, #E5E7EB titanium, subtle atmospheric haze, pristine physical textures, zero text, zero logos]`
- **DTC Specialty Goods (Photoreal):**
  `[STYLE LOCK: 50mm portrait prime lens, natural morning overcast daylight, Palette: #2C1810 espresso, #F5EDE0 cream, #B87333 copper, tactile organic textures, shallow depth of field, zero text, zero logos]`
- **Software / Platform (Diorama Safety Fallback):**
  `[STYLE LOCK: Isometric 45-degree angle, tilt-shift miniature lens with soft depth of field, crafted from smooth matte clay and frosted acrylic, warm studio softbox lighting, clean solid #F8FAFC background with soft contact shadow, zero text, zero logos]`

---

## Step 3 — Global Shot Rules (The 8 Laws)

1. **Clip Budget & Runway:** Total sequence consists of 4 to 8 clips, 4 to 6 seconds each (**total scroll runway: 16 to 48 seconds**).
2. **Canonical Naming:** Standardize on 1-based, zero-padded indexing: `clip_01`, `clip_02`, `clip_03`.
3. **Single Start-Frame Conditioning:** Every video prompt assumes a single Start Frame input.
4. **One Camera Move Per Clip:** Never combine dolly + orbit + zoom in a single generation. One vector per clip.
5. **Explicit Seam Types (Continuous Default):** Continuous Handoff is the universal default for all adjacent camera moves and sequential making. Threshold Cut is used for dark doorways; Match Cut is reserved strictly for discontinuous jumps.
6. **Threshold Cut Execution:** Never attempt to fly through a solid door in one clip. Clip $N-1$ ends approaching the dark opening; Clip $N$ begins inside.
7. **Orbit Grounding & 60° Limit:** Cap orbits at a 60° sweep of the visible face unless using real client multi-angle reference photos.
8. **No Single-Clip Morphing:** In Process/Origin journeys, never animate full material transformations in one clip. Stages chain sequentially via Continuous Handoff.

---

## Step 4 — Motion Prompt Templates

Ground all video prompts in the approved still (for Clip 01) or the extracted last frame `assets/frames/clip_{N-1}_last.png` (for Clips 02+):

### 1. Forward Dolly / Pass-Through (Walkthrough & Process)
```text
Single continuous cinematic camera move, no cuts. Starting from the exact composition of the starting frame, camera executes a slow, perfectly steady forward dolly push toward [VISIBLE ANCHOR / THRESHOLD]. In the final 1.5 seconds, the camera settles into a slow, level, steady forward drift toward [OPENING]. Smooth acceleration, zero backward movement, zero camera shake, no text.
```

### 2. Orbital Arc (Hero Orbit)
```text
Single continuous cinematic camera move, no cuts. Starting from the exact angle of the starting frame, camera executes a slow, buttery smooth 60-degree orbital arc around [HERO OBJECT], keeping [CORE FEATURE] locked in center focus. In the final 1.5 seconds, velocity dampens to a calm, steady tangential glide. No reverse motion, identical lighting, no text.
```

### 3. Lateral Rail Traverse (Process Stations & Flow)
```text
Single continuous cinematic camera move, no cuts. Starting from the composition in the starting frame, camera initiates a smooth lateral tracking glide along [WORKBENCH / TERRAIN] from [STATION A] toward [STATION B]. In the final 1.5 seconds, camera slows to a calm, level linear drift. Constant speed, identical lighting, no text.
```

---

## Step 5 — Seam Verification & FFmpeg Pipeline

### 1. Boundary Frame Extraction (Run after each clip renders)
```bash
# Extract first and last frames
ffmpeg -v error -y -ss 0 -i assets/raw/clip_N.mp4 -frames:v 1 assets/frames/clip_N_first.png
ffmpeg -v error -y -sseof -0.1 -i assets/raw/clip_N.mp4 -update 1 -frames:v 1 assets/frames/clip_N_last.png
```
Inspect `assets/frames/clip_N_last.png`. Use this exact image as the Start Image conditioning for Clip $N+1$.

### 2. Sequential WebP Frame Extraction (For Tier 1 Canvas Engine)
Once all clips in `assets/raw/` are approved, extract continuous 24fps WebP frames:
```bash
mkdir -p public/assets/sequence
ffmpeg -v error -y -i assets/raw/clip_01.mp4 -vf "fps=24" -q:v 80 public/assets/sequence/frame_%04d.webp
```

### 3. Low-GOP Video Encoding (Optional Fallback)
```bash
ffmpeg -v error -y -i assets/raw/clip_N.mp4 -an -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -g 8 -keyint_min 8 -bf 0 -movflags +faststart assets/vid/clip_N.mp4
```

---

## Step 5b — Worked Example: Complete Shot Specification

**Brand:** *AERO-CHRONO* (High-precision aerospace horology) | **Journey:** Process / Origin  
**Style Lock Block:**  
`[STYLE LOCK: 35mm macro anamorphic lens, dark studio chiaroscuro with warm brass rim-light, Palette: #111111 obsidian, #D4AF37 brass, #E5E7EB titanium, subtle atmospheric haze, pristine physical textures, zero text, zero logos]`

### 1. Summary Shot Table
| Clip # | Move Type | Seam Type | Visual Anchor | Duration |
|:---:|:---:|:---:|:---|:---:|
| **01** | Forward Dolly | Initial Start | Glowing titanium billet on crucible anvil | 4s |
| **02** | Forward Dolly | Continuous Handoff | Precision 5-axis CNC mill cutting bezel | 5s |
| **03** | 60° Orbit Arc | Continuous Handoff | Watchmaker's assembly ring with escapement | 5s |
| **04** | Forward Glide | Continuous Handoff | Completed timepiece on charred oak display tray | 5s |

### 2. Detailed Clip Blocks

#### Clip 01: The Crucible
- **Move Type**: Forward Dolly | **Seam Type**: Initial Start | **Duration**: 4s
- **Start Image Prompt (`assets/stills/scene_01.png`)**:
  `[STYLE LOCK] Raw sintered titanium ingot glowing soft orange inside a dark vacuum induction furnace chamber, centered framing with 20% negative space around chamber walls.`
- **Video Motion Prompt**:
  `Single continuous cinematic camera move, no cuts. Starting from the exact composition of the starting frame, camera executes a slow, deliberate forward dolly push toward the glowing titanium ingot. In the final 1.5 seconds, settle into a slow, level, steady forward drift. Smooth acceleration, zero camera shake, no text.`
- **Handoff Note**: Extract clip_01_last.png to anchor Clip 02.

#### Clip 02: CNC Precision Milling
- **Move Type**: Forward Dolly | **Seam Type**: Continuous Handoff | **Duration**: 5s
- **Start Image**: `assets/frames/clip_01_last.png` (extracted from Clip 01; NO static prompt)
- **Video Motion Prompt**:
  `Single continuous cinematic camera move, no cuts. Starting from the exact composition of the starting frame, camera dollies forward smoothly along the spindle axis, tracking down toward the center arbor as the titanium bezel contour is precision machined. In the final 1.5 seconds, slow to a calm, steady forward drift. Smooth acceleration, zero reverse motion, zero text.`
- **Handoff Note**: Extract clip_02_last.png to anchor Clip 03.

#### Clip 03: Escapement Assembly
- **Move Type**: 60° Orbit Arc | **Seam Type**: Continuous Handoff | **Duration**: 5s
- **Start Image**: `assets/frames/clip_02_last.png` (extracted from Clip 02; NO static prompt)
- **Video Motion Prompt**:
  `Single continuous cinematic camera move, no cuts. Starting from the exact angle of the starting frame, camera executes a buttery smooth 60-degree orbital arc around the assembly ring, keeping the escapement assembly and balance wheel in sharp focus. In the final 1.5 seconds, velocity dampens to a calm tangential glide. Zero reverse motion, zero text.`
- **Handoff Note**: Extract clip_03_last.png to anchor Clip 04.

#### Clip 04: The Completed Chronograph
- **Move Type**: Forward Glide | **Seam Type**: Continuous Handoff | **Duration**: 5s
- **Start Image**: `assets/frames/clip_03_last.png` (extracted from Clip 03; NO static prompt)
- **Video Motion Prompt**:
  `Single continuous cinematic camera move, no cuts. Starting from the exact composition of the starting frame, camera glides forward in a majestic, slow push over the finished timepiece, settling on the crown and dial texture. In the final 1.5 seconds, camera gently coasts to a complete, stable stop. Zero text.`
- **Handoff Note**: Final frame hands off directly to the terminal destination conversion stage.

---

## Step 6 — Web Playback & Scaffolding (Canvas Frame Engine)

Scaffold websites directly from the flat starter in `canvas-starter/`:

1. **Install Dependencies:**
   ```bash
   npm install @studio-freight/lenis gsap
   npm install -D vite typescript
   ```
2. **Copy Starter Files from `canvas-starter/`:**
   - `index.html` (Minimal header, pinned stage `#scrollStage`, narrative cards, destination section).
   - `engine.ts` (Canvas 2D renderer with `watermarkCropFactor: 1.06`, two-tier preloader, and Lenis + ScrollTrigger).
   - `style.css` (Editorial typography, responsive card overlays).
3. **Run Dev Server:**
   ```bash
   npm run dev
   ```

---

## Gotchas & Hard-Won Rules

- **The Seam Truth:** Diffusion models start at zero velocity at frame 0. Never claim cuts are "velocity-continuous". Steer smooth acceleration in prompt wording.
- **Watermark Concealment (Veo / AI Generators):** AI generators place watermarks in the bottom corner. The canvas engine applies `watermarkCropFactor: 1.06` to seamlessly crop out the watermark during drawing.
- **Hero Clutter Anti-Pattern:** Never dump feature matrices, specs, or paragraphs on the opening hero screen. Let the visual world breathe.
- **Seek Stutter on Fast Scroll:** Caused by `<video>` seek latency. In production, always use sequential 24fps WebP frames drawn to `<canvas>`.

