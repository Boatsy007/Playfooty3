# ECC Frontend Patterns

Source: https://github.com/affaan-m/ecc (skills/frontend-patterns)

## Activate when
Building or modifying React components, hooks, forms, performance, or accessibility.

## Component Patterns

### Composition over inheritance
Build with `children` props and small focused components. No class inheritance chains.

### React.memo for pure components
Wrap components that receive stable props and re-render unnecessarily:
```tsx
export const Ticker = React.memo(function Ticker() { ... })
export const Footer = React.memo(function Footer() { ... })
```

### useCallback for scroll/event handlers passed to children
```tsx
const go = useCallback((id: string) => {
  document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })
}, [])
```

## Performance

### Lazy load below-fold sections
```tsx
const Experience = lazy(() => import('./sections/Experience'))
const HowItWorks = lazy(() => import('./sections/HowItWorks'))
const Prize = lazy(() => import('./sections/Prize'))
const Invitation = lazy(() => import('./sections/Invitation'))
```

### Suspense fallback
```tsx
<Suspense fallback={<div style={{ minHeight: '400px' }} />}>
  <Experience />
</Suspense>
```

## Error Boundary
Wrap the entire app to prevent white-screen crashes:
```tsx
export class ErrorBoundary extends React.Component<...> {
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  render() {
    if (this.state.hasError) return <ErrorFallback error={this.state.error} />
    return this.props.children
  }
}
```

## Form Handling
- Use `react-hook-form` (already installed) for all forms
- Validate at submission, not on every keystroke for simple forms
- Show errors inline below the field, not in a toast

## Accessibility
- Every interactive element needs keyboard support
- Modal/drawer: trap focus, restore on close, Escape key closes
- Form inputs: label always present (even if visually hidden)
- Buttons: never icon-only without aria-label

## Animation (with Framer Motion)
- `useReducedMotion()` required when animating more than 3 elements
- `exit` prop on AnimatePresence children for unmount animations
- Stagger delays: max 0.08s per item, max 0.5s total stagger

## Anti-patterns
- No `window.addEventListener` for scroll — use Framer Motion `useScroll()`
- No inline `style={{ animation: ... }}` — use Framer Motion or CSS classes
- No array index as React key when list can reorder
- No uncontrolled inputs in forms
