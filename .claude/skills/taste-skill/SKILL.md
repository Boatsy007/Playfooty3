# Taste Skill — Anti-Slop Frontend Design

Source: https://github.com/leonxlnx/taste-skill

## Activate when
Any task changes how a feature looks, feels, moves, or is interacted with.

## Design Read (CNCA)
National sports festival for country netball. Audience: passionate regional clubs, families, supporters. Vibe signals: championship prestige + end-of-season celebration + Gold Coast destination. References: Australian Open, State of Origin broadcast design.

## Dials (set for this project)
- DESIGN_VARIANCE = 7 — bold, unexpected layouts; not a template
- MOTION_INTENSITY = 4 — alive but not cinematic; `useReducedMotion()` REQUIRED
- VISUAL_DENSITY = 3 — generous breathing room; festival poster spacing

## Hard Rules (non-negotiable)

### The Em-Dash Ban
Zero em-dashes (—) anywhere. Headlines, body, form options, alt text, comments — all banned. Most-recurring AI design tell.

### Eyebrow Restraint
Max ONE eyebrow label per THREE sections. They lose all meaning when every section has one.

### Hero
- Content fits viewport without scroll
- Headline ≤ 2–3 stacked words (stacked display type is fine; paragraph headlines are not)
- Subtext ≤ 20 words

### Motion
- Every animation must answer "what does this communicate?" — hierarchy, storytelling, feedback, or state
- `useReducedMotion()` required when MOTION_INTENSITY > 3
- No raw `window.addEventListener('scroll')` — use Framer Motion `useScroll()`

### Layout
- One page theme — dark global theme locked (not flipping mid-scroll between full dark/full light)
- No three-equal-feature-card grid
- No empty bento cells
- No decorative div-based fake screenshots

## Production Tells to Actively Avoid
- Generic three-equal cards
- Serif font defaults (Fraunces, Instrument Serif)
- AI Purple gradients
- Warm beige + brass + oxblood palette
- Section numbers, scroll cues, photo captions as decoration
- Fake-precise specs without source data
- Eyebrow on every single section

## Pre-Flight Checklist (run before shipping)
- [ ] Zero em-dashes verified across all rendered text
- [ ] One page theme, no mid-scroll mode flips
- [ ] Button text not wrapping at desktop
- [ ] Hero headline fits viewport
- [ ] WCAG AA contrast on all text (4.5:1 min)
- [ ] Form labels + inputs pass contrast
- [ ] All animations are motivated
- [ ] `useReducedMotion()` wired for animated components
- [ ] No three-equal-card section

## Redesign order (if modernising)
typography → spacing → color → motion → full block replacement
