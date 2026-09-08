📐 Design System & AI Coding Guidelines: ITS NU Website
This document serves as a strict style guide for AI assistants and developers when creating new pages, components, or modifying the Engineering Technical Service (ITS) Nazarbayev University website.

## ⚠️ Two active themes — read this first

As of 2026-09-08, this repository has **two** concurrent visual systems:

1. **Dark theme (current, `MainPage/Main/index.html`)** — Tailwind CDN,
   Material Symbols Outlined icons, amber accent `#f59e0b` on dark surfaces
   (`#111827`/`#0b0f1a`). See "Dark Theme (Main Page)" section below.
2. **Legacy light/red Constructivist theme (`Instruktazh/**` instruction
   pages only)** — vanilla CSS custom properties, Font Awesome, white
   background, red accent `#b91c1c`. This is everything described in the
   rest of this document below the dark-theme section. It has **not** been
   migrated and remains the correct style to follow when editing any file
   under `Instruktazh/`.

When editing `MainPage/Main/index.html`, follow the Dark Theme section.
When editing anything under `Instruktazh/`, follow the legacy section as
before (it is unchanged).

## Dark Theme (Main Page)

Used exclusively by `MainPage/Main/index.html`, migrated from
`stich_template.html` (see `docs/superpowers/specs/2026-09-08-main-page-dark-redesign-design.md`
for the full rationale).

**Stack:** Tailwind CDN (`cdn.tailwindcss.com?plugins=forms,container-queries`)
with a custom `tailwind.config` (colors/spacing/typography), Google Fonts
Inter + Material Symbols Outlined. No Font Awesome, no AOS on this page —
scroll reveal is a hand-rolled `IntersectionObserver` (`.reveal`/`.reveal.active`).

**Colors:**
- Background: `#111827` (`bg-background`), Hero background `#0b0f1a`.
- Surfaces: `#1f2937` (`bg-surface-variant`), `#374151` (`surface-container-highest`, also used for `.grid-cell` borders).
- Accent (the ONLY accent): amber `#f59e0b` (`text-primary`/`bg-primary`). Used for CTAs, active nav state, hover-invert, numbers, icons.
- Text: `#f9fafb` (`text-on-surface`) primary, `#9ca3af` (`text-on-surface-variant`) secondary.
- Semantic: error/emergency `#ef4444` (`text-error`), success/status `#10b981` (`text-status-success`).

**Typography:** Inter throughout, via Tailwind's custom font-size tokens:
`headline-xl` (48px/900, hero titles), `headline-lg` (32px/800, section
titles), `headline-md` (24px/700, card/subsection titles), `body-lg`
(18px), `body-md` (16px), `label-bold` (14px/700 uppercase, used for
buttons/badges/labels), `label-sm` (12px).

**Shape:** `borderRadius` is `0px` for `DEFAULT`/`lg`/`xl` (rectangular
everywhere) except `full` (`9999px`, for dots/circular badges only) — same
zero-radius philosophy as the legacy theme, just carried into Tailwind's
config instead of a raw CSS rule.

**Icons:** Material Symbols Outlined exclusively
(`<span class="material-symbols-outlined">icon_name</span>`), never Font
Awesome, on this page.

**Grid/card pattern:** repeated card grids (Виды работ, Технические
подразделения) use the `.grid-cell` class (1px `#374151` border with
negative margins to collapse into a shared grid line) plus a `group`
hover that inverts the card to `bg-primary`/`text-on-primary`.

**Motion:** `.reveal` fades/slides sections in on scroll via a shared
`IntersectionObserver`; the Hero's WebGL grid-shader background and the
`.animate-pulse-gentle`/`.iot-glow-icon` CSS animations are all disabled
under `prefers-reduced-motion: reduce`.

---

1. Design Philosophy: Engineering Constructivism
The visual language of this website is inspired by Constructivism and industrial engineering blueprints.

Form follows function: No decorative elements. Every line, color, and shape must serve a purpose.
Brutal Typography: Headings are massive, heavy, and often act as architectural elements on the page.
Grid & Borders: The layout relies on strict grids separated by thick black borders, resembling factory blueprints or spreadsheet tables. Gaps between elements are typically 0, replaced by solid 1px or 2px borders.
Zero Radius: border-radius: 0 globally. There are no rounded corners, pills, or soft shapes. Everything is strictly rectangular.
2. Global CSS Variables
You MUST use these CSS variables for colors. Do not introduce new hex codes unless absolutely necessary for micro-shades.

:root {    --bg-main: #ffffff;          /* Main background */    --text-primary: #111827;     /* Graphite black for main text */    --text-secondary: #6b7280;   /* Gray for descriptive text */    --border-color: #e5e7eb;     /* Light gray for subtle separators */    --construct-red: #b91c1c;    /* The ONLY accent color. Used for danger, alerts, primary actions, and hover states. */    --construct-black: #000000;  /* Used for thick borders, heavy emphasis, and dark theme blocks */}
3. Typography
Font Family: 'Inter', sans-serif (Always include via Google Fonts).
Headings (h1, h2, h3, h4):
MUST be text-transform: uppercase.
MUST have letter-spacing: 0.02em (or up to 0.1em for small labels).
Weights: Strictly 700, 800, 900. No light or medium headings.
h2 specific rule: Must have a thick left border: border-left: 5px solid var(--construct-black); padding-left: 20px;.
Body Text: Weight 400 or 500. Color var(--text-secondary).
Labels/Badges: Uppercase, heavy weight (700-800), tight letter-spacing.
4. Layout & Grid System
Container: Max-width 1200px, centered. Padding: 80px 40px.
Constructivist Grids:
When creating lists of cards or items (services, team, stats), use CSS Grid with gap: 0.
Items MUST be separated by borders: border-right: 1px solid var(--construct-black); border-bottom: 1px solid var(--construct-black);.
Use :nth-child selectors to remove the right border from the last column and the bottom border from the last row.
Asymmetry: Hero sections or intro blocks should use asymmetric grids (e.g., 1.5fr 1fr) rather than perfect halves.
5. Component Library
Buttons
Global: text-transform: uppercase; font-weight: 800; font-size: 0.9rem; border: 2px solid; padding: 16px 32px; border-radius: 0!;
Primary (Action): Background var(--construct-red), text #fff, border var(--construct-red). Hover: Inverts to bg #fff, text var(--construct-red).
Outline (Secondary): Background transparent, text/black border var(--construct-black). Hover: Inverts to bg var(--construct-black), text #fff.
Disabled: Background/border var(--border-color), text var(--text-secondary), cursor: not-allowed.
Cards (Work, Service, Premises)
Structure: Padding 25-30px. Strict borders. No shadows (box-shadow: none).
Hover Effects:
For text-heavy cards: Slight background change (#f9fafb).
For interactive cards (like services): Invert colors completely on hover (bg var(--construct-black), text #fff). Accent elements (arrows, numbers) turn var(--construct-red).
Forms & Inputs
Labels: Uppercase, font-weight: 700, letter-spacing: 0.1em.
Inputs: border: 1px solid var(--construct-black); border-radius: 0; background: #fff; padding: 14px;. On focus: border-width: 3px; outline: none.
Status Badges
Must have a solid border and colored text. E.g., border: 1px solid #166534; color: #166534; background: #f0fdf4;.
If indicating "live" or "active", include a pulsing CSS dot (@keyframes pulse).
6. Strict Prohibitions (DO NOT)
❌ NO border-radius. Never use rounded corners on buttons, cards, inputs, or images.
❌ NO pastel colors or gradients (except subtle background grid lines or watermark typography).
❌ NO drop shadows (box-shadow) unless extremely subtle for modals.
❌ NO playful or bouncy animations. Animations must be strictly functional (e.g., fade-up, fade-right with AOS library).
❌ NO generic corporate blue. The only accent is var(--construct-red).
❌ NO float layouts. Use Flexbox or CSS Grid exclusively.
7. Tech Stack Requirements
Icons: Font Awesome 6 (Solid style preferred).
Animations: AOS (Animate On Scroll) library. Use data-aos="fade-up" or fade-right".
Images: Use grayscale filters or low opacity if used as backgrounds to maintain the monochrome industrial feel.
