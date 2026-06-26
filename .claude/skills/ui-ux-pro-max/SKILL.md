# UI/UX Pro Max — Design Intelligence

Source: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill

## When to activate
Any task that changes how a feature looks, feels, moves, or is interacted with.

## Design decisions for this project (CNCA)

### Typography
- **Headlines**: Bebas Neue (`.font-display`) — bold, impactful, championship
- **Sub-headings / labels / categories**: Barlow Condensed (`.font-condensed`) — athletic, condensed, energetic
- **Body**: Barlow — readable, sporty, modern pairing with Barlow Condensed
- Source: UI/UX Pro Max — Row 7 (Bebas Neue/Source Sans 3 for sports) + Row 49 (Barlow Condensed/Barlow for athletic brands)

### Color Palette
- Primary: `#ff2c91` (hot pink) — bold, energetic, festival
- Gold: `#f4c14d` — championship, prestige, awards
- Cyan: `#4dd9f4` — energy, variety
- Dark: `#111111` / `#0d0d0d` — premium contrast
- Light: `#f5f4f0` — warm off-white, breathing room
- Source: UI/UX Pro Max — Sports Team/Club palette adapted to brand

### UI Style
- **Vibrant & Block-based**: Bold color blocks, geometric layout, high contrast — font-size 32px+, gap 48px+
- **Motion-Driven**: Scroll animations via Framer Motion whileInView, 300-500ms timing, stagger on lists
- Source: UI/UX Pro Max — styles.csv rows for sports/festival/entertainment

### Section layout rhythm
Hero (dark photo) → Stats (bold color blocks) → Experience (full pink) → HowItWorks (warm light) → Prize (dark cinematic) → Invitation (dark form)

## Priority Framework (from skill)
1. **CRITICAL**: Contrast ratios ≥4.5:1, touch targets ≥44×44px
2. **HIGH**: Mobile-first layout, no horizontal scroll, consistent style
3. **MEDIUM**: Typography scale, animation timing 150-300ms
4. **LOW**: Chart types, data visualisation

## Anti-patterns (do NOT do)
- Emoji icons in UI
- Icon-only buttons without labels
- Mixing flat + skeuomorphic styles
- scale(0) in animations (min 0.95)
- Animation >400ms for UI interactions
