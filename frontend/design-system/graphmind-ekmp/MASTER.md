# Design System Master File — GraphMind EKMP

> **STATUS:** Verified & Active Source of Truth  
> **FRAMEWORK:** React 18 + Vite + Tailwind CSS + Vanilla CSS Tokens (UI/UX Pro Max)  
> **PROJECT:** GraphMind (EKAI) — GraphRAG Enterprise Knowledge Management Platform for SME Decision Support

---

## 1. Brand Direction & Personality

- **Product Category:** Enterprise Knowledge Intelligence & Executive Decision Support Platform
- **Visual Identity:** Modern, Authoritative, Calm, High-Precision, Trustworthy, Production-Grade Enterprise
- **Design Dials:**
  - **Variance:** 5/10 (Balanced / Modern Swiss Precision)
  - **Motion:** 4/10 (Standard 200–300ms transitions, WCAG `prefers-reduced-motion` compliance)
  - **Density:** 8/10 (Dense / Dashboard with 8dp spatial rhythm)
- **Anti-Patterns Strictly Prohibited:**
  - ❌ No AI purple/magenta glowing gradients or neon borders
  - ❌ No emoji icons in system navigation, tables, or buttons (SVG/Lucide only)
  - ❌ No blurry neumorphism or floating cards without borders
  - ❌ No low-contrast muted text (< 4.5:1 ratio)
  - ❌ No layout-shifting hover effects or instant jarring state jumps
  - ❌ No arbitrary one-off hex colors scattered in inline styles

---

## 2. Global Color System & Semantic Tokens

### Light Mode (Primary Default)
| Token Name | Hex Value | Semantic Usage |
|---|---|---|
| `--color-primary` | `#0F172A` | Core brand anchor, primary headers, active emphasis |
| `--color-primary-accent` | `#2563EB` | Interactive brand blue, primary actions, active tabs |
| `--color-primary-dim` | `#EFF6FF` | Soft blue tint for active backgrounds & badges |
| `--color-secondary` | `#0284C7` | Data intelligence, analytics accent, secondary focus |
| `--color-secondary-dim` | `#F0F9FF` | Soft sky background for insights |
| `--color-accent` | `#059669` | Trust green, verified knowledge, positive delta |
| `--color-accent-dim` | `#ECFDF5` | Soft emerald background for verified badges |
| `--color-background` | `#F8FAFC` | Main application canvas background |
| `--color-surface` | `#FFFFFF` | Cards, modals, sidebars, topbar surface |
| `--color-surface-subtle` | `#F1F5F9` | Table headers, secondary panels, card headers |
| `--color-surface-hover` | `#F8FAFC` | Hover state for table rows, menu items |
| `--color-border` | `#E2E8F0` | Structural borders, card outlines, table dividers |
| `--color-border-subtle` | `#EDF2F7` | Subtle divider lines |
| `--color-border-strong` | `#CBD5E1` | Input borders, elevated dividers, table borders |
| `--color-border-focus` | `#2563EB` | Accessible keyboard focus ring outline |
| `--color-text-primary` | `#0F172A` | Primary body text, headings (WCAG 14:1) |
| `--color-text-secondary` | `#334155` | Secondary body text, subtitles (WCAG 9:1) |
| `--color-text-muted` | `#64748B` | Labels, timestamps, hints (WCAG 4.8:1) |
| `--color-text-disabled` | `#94A3B8` | Disabled controls, inactive icons |
| `--color-success` | `#059669` | Positive metrics, verified state, low risk |
| `--color-success-dim` | `#ECFDF5` | Green badge background |
| `--color-warning` | `#D97706` | Cautionary alerts, pending reviews, medium risk |
| `--color-warning-dim` | `#FFFBEB` | Amber badge background |
| `--color-destructive` | `#DC2626` | High risk, critical alerts, delete actions |
| `--color-destructive-dim` | `#FEF2F2` | Red badge background |
| `--color-info` | `#0284C7` | Informational callouts, sync activity |
| `--color-info-dim` | `#F0F9FF` | Sky blue badge background |

### Dark Mode (Enterprise Night Theme)
| Token Name | Hex Value | Semantic Usage |
|---|---|---|
| `--color-background` | `#0B0F19` | Dark canvas base |
| `--color-surface` | `#111827` | Dark card surface |
| `--color-surface-subtle` | `#1F2937` | Dark card headers, table headers |
| `--color-surface-hover` | `#1A2234` | Dark item hover |
| `--color-border` | `#1F2937` | Dark structural borders |
| `--color-border-strong` | `#374151` | Dark input borders |
| `--color-text-primary` | `#F8FAFC` | Primary light text |
| `--color-text-secondary` | `#CBD5E1` | Secondary light text |
| `--color-text-muted` | `#94A3B8` | Muted light text |

---

## 3. Typography Scale

- **Display & Heading:** `'Plus Jakarta Sans', 'Lexend', system-ui, sans-serif`
- **Body & Controls:** `'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif`
- **Data & Monospace:** `'JetBrains Mono', 'Fira Code', monospace`

| Scale Level | Font Size | Line Height | Weight | Usage |
|---|---|---|---|---|
| `Display` | `28px (1.75rem)` | `1.2` | `700` | Landing heroes, executive briefing headlines |
| `H1 / Page Title` | `22px (1.375rem)` | `1.25` | `700` | Topbar view titles, major section titles |
| `H2 / Section Title` | `18px (1.125rem)` | `1.3` | `600` | Card headers, table section titles |
| `H3 / Card Title` | `15px (0.9375rem)` | `1.4` | `600` | Widget titles, modal headings |
| `Body Large` | `15px (0.9375rem)` | `1.5` | `400 / 500`| Executive summary paragraphs |
| `Body Base` | `13.5px (0.844rem)`| `1.5` | `400 / 500`| Standard text, table rows, descriptions |
| `Body Small` | `12px (0.75rem)` | `1.4` | `400 / 500`| Helper text, metadata, table captions |
| `Caption / Monospace`| `11px (0.688rem)`| `1.3` | `600` | Node IDs, timestamps, status badges, hashes |

---

## 4. Spacing Scale (8dp Spatial Rhythm)

| Token | Pixels | Rem | Typical Usage |
|---|---|---|---|
| `--space-2xs` | `2px` | `0.125rem` | Fine border offsets, badge padding |
| `--space-xs` | `4px` | `0.25rem` | Icon gaps, tight inline elements |
| `--space-sm` | `8px` | `0.5rem` | Input internal padding (vertical), gap between chips |
| `--space-md` | `12px` | `0.75rem` | Button padding, card internal gutter |
| `--space-lg` | `16px` | `1rem` | Standard container padding, form field spacing |
| `--space-xl` | `20px` | `1.25rem` | Card padding, widget gaps |
| `--space-2xl` | `24px` | `1.5rem` | Section margins, page padding |
| `--space-3xl` | `32px` | `2rem` | Major dashboard grid gaps |

---

## 5. Radius System

| Token | Value | Typical Usage |
|---|---|---|
| `--r-xs` | `4px` | Small tags, code chips, table inner cells |
| `--r-sm` | `6px` | Form inputs, select dropdowns, compact buttons |
| `--r-md` | `8px` | Standard buttons, badges, popover dropdowns |
| `--r-lg` | `12px` | Main cards, dashboard widgets, table wrappers |
| `--r-xl` | `16px` | Modals, drawers, hero banners |
| `--r-full` | `9999px` | Avatars, status indicator dots, round pill badges |

---

## 6. Elevation & Shadows

- `--shadow-xs`: `0 1px 2px rgba(15, 23, 42, 0.04)`
- `--shadow-sm`: `0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)`
- `--shadow-md`: `0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`
- `--shadow-lg`: `0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)`
- `--shadow-xl`: `0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.04)`
- `--shadow-focus`: `0 0 0 3px rgba(37, 99, 235, 0.22)`
- `--shadow-focus-danger`: `0 0 0 3px rgba(220, 38, 38, 0.22)`

---

## 7. Component Specifications

### 7.1 Buttons
- **Primary:** Solid `#2563EB`, text `#FFFFFF`, font-weight 600, height 36px (compact) or 40px (default), radius 8px, hover opacity 0.92, active translateY(1px).
- **Secondary:** Surface `#FFFFFF`, border `1px solid var(--color-border-strong)`, text `var(--color-text-primary)`, hover background `var(--color-surface-hover)`.
- **Ghost:** Background transparent, text `var(--color-text-secondary)`, hover background `var(--color-surface-subtle)`.
- **Danger:** Solid `#DC2626` or soft `#FEF2F2` with text `#DC2626` and border `#FECACA`.
- **Icon-Only:** Square (32px or 36px), center aligned, accessible `aria-label` required.

### 7.2 Tables
- **Header:** Background `var(--color-surface-subtle)`, uppercase tracking-wide 11px font, weight 600, color `var(--color-text-muted)`, border-bottom `1px solid var(--color-border)`.
- **Row:** Height 48px–54px, border-bottom `1px solid var(--color-border)`, hover background `var(--color-surface-hover)`, smooth transition 150ms.
- **Cells:** Vertical align middle, text 13px, primary column bold/semibold, status columns using standard `Badge`.
- **Empty & Loading States:** Built into table container with no layout shifts.

### 7.3 Cards & Widgets
- Surface `#FFFFFF`, border `1px solid var(--color-border)`, radius `12px`, padding `16px–20px`, box-shadow `var(--shadow-sm)`.
- Clear header with icon badge, title, subtitle, and optional top-right action button.

### 7.4 Form Inputs
- Height 38px, padding `0 12px`, border `1px solid var(--color-border-strong)`, radius `8px`, background `var(--color-surface)`.
- Focus state: border `var(--color-primary-accent)`, box-shadow `var(--shadow-focus)`.
- Always accompanied by persistent `<label>` (never placeholder alone) and inline error messages with `aria-describedby`.

### 7.5 Status Badges & Pills
- Contrast ratio >= 4.5:1.
- Success: Background `#ECFDF5`, text `#065F46`, border `#A7F3D0`.
- Warning: Background `#FFFBEB`, text `#92400E`, border `#FDE68A`.
- Danger / Critical: Background `#FEF2F2`, text `#991B1B`, border `#FECACA`.
- Info / Blue: Background `#EFF6FF`, text `#1E40AF`, border `#BFDBFE`.
- Neutral: Background `#F1F5F9`, text `#334155`, border `#CBD5E1`.

---

## 8. Accessibility & Responsiveness Requirements

- [x] All icon buttons have an explicit `aria-label` or visible title.
- [x] Color is never the sole communicator of state (always combined with text and/or SVG icons).
- [x] Keyboard focus visible across all interactive components with `--shadow-focus`.
- [x] Minimum touch targets: >= 36px on desktop dense mode, >= 44px on touch viewports.
- [x] Breakpoints: Mobile (375px–640px), Tablet (641px–1024px), Desktop (1025px–1440px), Ultrawide (1441px+).
