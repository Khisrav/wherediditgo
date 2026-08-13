---
name: vue-mobile-ui-ux
# Keep this description specific: Cursor uses it to decide when the skill is relevant.
description: Design and build polished Vue 3 web/mobile interfaces with Material 3 Expressive principles, restrained Liquid Glass-inspired layering, responsive mobile-first UX, and Capacitor Android integration. Use when creating or redesigning UI, adding mobile screens, structuring a Vue/Capacitor app, implementing navigation, theming, motion, accessibility, native Android features, or reviewing frontend architecture.
---

# Vue Mobile UI/UX Skill

Build interfaces that feel intentional, modern, fast, accessible, and native-appropriate without turning the codebase into a pile of one-off visual hacks.

This skill applies primarily to Vue 3 + TypeScript applications that may run in the browser and inside Capacitor on Android. It can also guide responsive desktop UI.

## Core Rules

1. **Understand before changing.** Inspect the existing project structure, dependencies, design system, routing, state management, and build setup before introducing new architecture or replacing libraries.
2. **Prefer the existing stack.** Do not add a UI framework, state library, animation library, icon library, or native plugin unless there is a real gap that the current stack cannot solve cleanly.
3. **Design for mobile first, then expand.** A responsive desktop layout is not a substitute for a good touch-first mobile experience.
4. **Use design systems, not random CSS.** Reuse tokens, components, spacing rules, typography, radii, elevation, interaction states, and motion conventions.
5. **Expressiveness must support usability.** Visual personality is good; visual noise is not.
6. **Do not blindly imitate Apple or Google.** Material 3 Expressive and Liquid Glass are references and principles, not permission to copy proprietary UI wholesale.
7. **Accessibility is a requirement.** Keyboard navigation, focus, contrast, reduced motion, readable type, touch targets, semantic HTML, and screen-reader behavior must be considered while building, not after.
8. **Avoid unnecessary abstraction.** Create a reusable component when reuse or semantic consistency is likely. Do not create wrappers for one-off markup merely to make the tree look architectural.
9. **Never hide complexity behind giant files.** Split by feature and responsibility when a file becomes difficult to reason about.
10. **Preserve platform behavior.** Android back navigation, status/navigation bars, safe areas, keyboard behavior, deep links, permissions, and lifecycle events must feel intentional.

## When to Use This Skill

Use this skill when the task involves:

- New Vue screens or flows
- UI/UX redesigns
- Mobile-first responsive layouts
- Material 3-inspired component design
- Expressive color, typography, shape, and motion
- Glass/translucent/frosted UI treatment
- Capacitor integration
- Android-specific behavior
- Native plugins and bridge code
- App shell/navigation architecture
- Design-system creation or cleanup
- Accessibility and interaction-state review
- Frontend architecture review

Do not use it as the sole authority for backend architecture, database design, security policy, or domain logic unrelated to the UI/mobile client.

# Design Direction

## Material 3 Expressive

Use Material 3 Expressive as a design vocabulary rather than a strict visual template.

Important principles:

- Use **vibrant but controlled color** to communicate hierarchy, state, and brand personality.
- Use **flexible typography** to create clear hierarchy and personality without sacrificing readability.
- Use **contrasting shapes** deliberately. Shape can communicate hierarchy, grouping, importance, and brand character.
- Use **adaptive layouts** instead of scaling a desktop layout down onto a phone.
- Use **motion** to explain state changes, continuity, and relationships between elements.
- Prefer meaningful expressive components and patterns over decorative randomness.
- Keep important actions visually prominent; secondary actions should not compete with the primary task.
- Use consistent interaction states: enabled, disabled, hovered, focused, pressed, dragged, selected, loading, success, and error where applicable.

Material 3 Expressive currently emphasizes vibrant color, intuitive motion, adaptive components, flexible typography, contrasting shapes, and newer expressive components such as toolbars, split buttons, button groups, expressive progress indicators, and shape/motion systems.

Reference: https://m3.material.io/

### Expressive UI Checklist

Before shipping a screen, verify:

- There is one obvious primary action or focus.
- Typography communicates hierarchy before color does.
- Shape choices reinforce grouping and priority.
- Color has semantic purpose rather than being decoration.
- Motion explains a change instead of merely making an element move.
- The screen still works when animation is disabled.
- Empty, loading, error, and success states are designed.
- Touch targets are comfortably usable on a phone.

## Liquid Glass / Translucent Layering

Liquid Glass is an Apple platform material, not a generic synonym for "blurred background".

When using it as a visual reference in a cross-platform web/Capacitor application:

- Treat translucent material as a **functional elevated layer**, not the default background for everything.
- Reserve strong glass treatment for important navigation, floating controls, toolbars, overlays, or transient controls.
- Keep primary content relatively clear and visually stable.
- Do not place every card, input, button, and container inside glass.
- Maintain strong text/icon contrast against changing backgrounds.
- Avoid glass over visually noisy content unless contrast is actively managed.
- Use regular/stronger blur where content underneath could hurt legibility.
- Use stronger translucency only when the underlying visual content is intentionally part of the experience.
- Respect reduced-transparency/high-contrast preferences where possible.
- Use a fallback solid or lightly translucent surface when backdrop-filter is unavailable or expensive.

Apple's current HIG explicitly recommends Liquid Glass mainly for functional layers such as navigation and controls, warns against using it throughout the content layer, and recommends applying it sparingly.

Reference: https://developer.apple.com/design/human-interface-guidelines/materials
Reference: https://developer.apple.com/documentation/technologyoverviews/liquid-glass

### Cross-Platform Rule

Do **not** claim that a CSS glass effect is literally Apple's Liquid Glass. In a Vue app, describe it as a "Liquid Glass-inspired" or "translucent material" treatment unless native Apple APIs are actually being used.

For Android/web:

- Prefer CSS `backdrop-filter` when appropriate.
- Always provide a fallback background.
- Avoid large areas of expensive blur on low-end devices.
- Never rely on transparency alone to establish hierarchy.

Example token direction:

```css
.surface-glass {
  background: color-mix(in srgb, var(--color-surface) 70%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-outline) 18%, transparent);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
}

@supports not (backdrop-filter: blur(1px)) {
  .surface-glass {
    background: var(--color-surface);
  }
}
```

Do not paste this blindly. Adapt it to the project's token system.

# Visual System

## Design Tokens

Create or reuse semantic tokens rather than hard-coding visual values throughout components.

At minimum define:

- Colors: background, surface, surface-container, primary, on-primary, secondary, tertiary, outline, error, success, warning, muted text
- Typography: display, headline, title, body, label
- Spacing: a small consistent scale
- Shape: small, medium, large, extra-large, full/pill
- Elevation/shadows
- Motion duration and easing
- Breakpoints / layout widths
- Touch-target sizes
- Safe-area spacing

Prefer semantic names such as `--color-surface-container` over component-specific names such as `--card-gray`.

## Color

- Start from semantic roles, not arbitrary hex values.
- Maintain accessible contrast.
- Use accent colors to indicate hierarchy and actions.
- Avoid using multiple saturated colors with equal visual weight.
- Support light and dark themes from the beginning when the product requires them.
- Never use color as the only indication of state.

## Typography

- Establish a small, intentional type scale.
- Prefer readable body text over oversized visual drama.
- Avoid more than necessary font weights.
- Use line-height appropriate to the text size.
- Do not make text small simply to fit more content.
- Allow text to wrap on narrow screens.
- Never use fixed heights for text containers unless clipping is intentionally designed.

## Shape

Use shape to communicate semantics:

- Small radii for compact controls.
- Larger radii for prominent surfaces and containers.
- Pill/full shapes for tags, chips, selected states, and clearly compact controls.
- Strongly expressive shapes only where hierarchy or brand personality benefits from them.

Do not make every element maximally rounded.

# Layout and Responsiveness

## Mobile First

Design the smallest important viewport first.

A good mobile screen should:

- Have a clear top-level purpose.
- Keep primary actions reachable.
- Avoid horizontal scrolling unless horizontal scrolling is the actual interaction.
- Account for the soft keyboard.
- Account for safe-area insets.
- Avoid content being hidden under bottom navigation or floating controls.
- Use comfortable touch targets.
- Keep frequent actions near the natural thumb area where practical.

Then expand the design for tablets and desktop.

## Adaptive Layout

Use layout changes, not just smaller dimensions:

- Phone: one-column / single-pane navigation.
- Larger screens: split panes, supporting panes, side navigation, wider content areas, or multi-column layouts where useful.
- Do not simply stretch mobile cards to enormous desktop widths.
- Constrain reading-heavy content to comfortable line lengths.

Material's canonical layout guidance favors adaptive patterns such as list-detail, supporting-pane, and layered layouts when screen size permits.

Reference: https://m3.material.io/foundations/layout/canonical-examples/overview

# Vue Architecture

Use Vue 3 with Composition API and TypeScript unless the existing project deliberately uses another pattern.

Prefer feature-oriented organization.

Recommended baseline:

```text
src/
├── app/
│   ├── router/
│   ├── providers/
│   ├── layouts/
│   └── bootstrap/
├── features/
│   ├── feature-a/
│   │   ├── components/
│   │   ├── composables/
│   │   ├── services/
│   │   ├── stores/
│   │   ├── types.ts
│   │   └── views/
│   └── feature-b/
├── components/
│   ├── ui/
│   └── shared/
├── composables/
├── services/
├── stores/
├── lib/
├── styles/
│   ├── tokens.css
│   ├── theme.css
│   └── globals.css
├── assets/
└── types/
```

Adjust this structure to the actual project's size. Small applications should not be forced into dozens of directories.

## Component Boundaries

A component should usually have one clear responsibility.

Prefer:

- `AppShell.vue`
- `MobileBottomNav.vue`
- `TransactionList.vue`
- `TransactionRow.vue`
- `AmountField.vue`
- `GlassToolbar.vue`

over a 1,500-line page component containing every detail.

But do not split every `<div>` into a component.

## Composables

Use composables for reusable behavior, not just to move code out of a component.

Good examples:

```text
useTheme()
useNetworkStatus()
useKeyboard()
useSafeArea()
useBackButton()
useHaptics()
useTransactions()
```

A composable should expose a focused API and keep native/platform details out of presentational components.

# State Management

Choose the smallest state solution that fits the application.

Use:

- Local component state for local UI state.
- Composables for reusable behavior.
- A store such as Pinia for shared application state.
- Server-state/query caching for remote data when the project uses such a library.
- Persistent storage only for data that actually needs persistence.

Avoid:

- One giant global store.
- Duplicating the same server data in several stores.
- Passing the same state through many component levels when a composable/store is cleaner.
- Putting transient modal state into global persistence.

# Routing and Navigation

Use the project's router consistently.

For mobile:

- Make top-level destinations easy to reach.
- Keep navigation predictable.
- Avoid deeply nested modal-over-modal flows.
- Preserve navigation state when appropriate.
- Support deep links when the feature needs them.
- Design explicit loading and error states for route-level data.

For Capacitor Android, back-button behavior must be explicitly considered. Do not let the Android system back button randomly exit the app when there is an obvious in-app navigation state that should be popped first.

# Capacitor Architecture

Capacitor is a native runtime for web applications. A Vue app can remain mostly web code while accessing native Android/iOS APIs through Capacitor plugins.

Reference: https://capacitorjs.com/docs

## Installation Pattern

Use the official Capacitor packages and the project's current version.

Typical setup:

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npm install @capacitor/android
npx cap add android
```

Do not assume these commands or package versions are identical for every project. Read the existing `package.json`, Capacitor config, and official docs before changing versions.

## Capacitor Rule: Web First, Native Where Needed

Keep business logic and most UI platform-neutral.

Use native APIs for capabilities that genuinely benefit from native access, such as:

- Filesystem
- Notifications
- Camera
- Geolocation
- Haptics
- Network status
- App lifecycle
- Keyboard behavior
- Deep links
- Secure/native storage where appropriate

Do not create a native plugin when a standard web API is sufficient and reliable for the project's target platforms.

## Native Adapter Pattern

Do not scatter Capacitor calls across dozens of Vue components.

Prefer:

```text
src/services/native/
├── app.ts
├── haptics.ts
├── notifications.ts
├── storage.ts
├── keyboard.ts
└── network.ts
```

Example:

```ts
// src/services/native/haptics.ts
import { Haptics, ImpactStyle } from '@capacitor/haptics'

export async function tapFeedback() {
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    // Web/PWA fallback: intentionally no-op.
  }
}
```

UI components should call `tapFeedback()` rather than knowing which Capacitor plugin is used.

This gives the app a clean separation between:

```text
Vue component -> app service -> Capacitor plugin -> Android/iOS
```

## Platform Detection

When behavior genuinely differs by platform, isolate it.

Do not spread checks such as `Capacitor.getPlatform()` throughout the UI.

Prefer a small platform abstraction:

```text
src/lib/platform.ts
src/services/native/*
```

Then the rest of the application consumes a stable interface.

# Android UX Requirements

A Capacitor Android app is still a real Android application. Design for Android behavior rather than simply wrapping a website.

Consider:

- Android system back gesture/button
- Status bar appearance
- Navigation bar appearance
- Edge-to-edge layout
- Safe areas/insets
- Soft keyboard resize/overlay behavior
- Android permission flows
- Splash screen behavior
- App lifecycle/backgrounding
- Deep links/app links
- Push/local notifications
- External intents where needed
- Offline/reconnect behavior
- Screen rotation and configuration changes where relevant

Do not hard-code pixel offsets for status/navigation bars. Prefer platform-aware inset handling.

# Safe Areas and Mobile Chrome

For important fixed UI such as bottom navigation or floating controls, account for safe-area insets.

Typical CSS pattern:

```css
padding-bottom: calc(16px + env(safe-area-inset-bottom));
```

Do not blindly add safe-area padding to every element. Apply it to components that can actually overlap system UI.

# Offline-First Behavior

Mobile networks are unreliable. The app should degrade gracefully.

At minimum:

- Detect connection changes where the feature depends on connectivity.
- Provide meaningful loading states.
- Avoid blank screens during reconnects.
- Preserve unsent user input when safe.
- Make failed actions recoverable.
- Clearly indicate stale/offline data when relevant.
- Never assume a request will finish quickly.

For data-heavy apps, consider a repository/data-access layer so the UI is not tied directly to HTTP calls.

# Motion

Motion should communicate:

- What changed?
- Where did it come from?
- Where did it go?
- What is now available?
- Is the action complete?

Prefer short, purposeful transitions over constant animation.

Good uses:

- Navigation transitions
- Expand/collapse
- Selection changes
- Contextual controls appearing/disappearing
- Press feedback
- Reordering
- Progress changes

Avoid:

- Infinite decorative animations
- Large parallax effects everywhere
- Animating layout properties when a transform/opacity transition can work
- Motion that delays routine actions

Respect `prefers-reduced-motion`.

Material 3 Expressive includes motion physics and shape/motion concepts; use those ideas where appropriate, but adapt them to the capabilities of the web runtime.

# Accessibility

Every interactive element must have:

- A clear accessible name.
- Visible focus behavior.
- An appropriate semantic element.
- A usable touch target.
- A disabled/loading/error state when applicable.

Prefer semantic HTML:

- `<button>` for actions
- `<a>` for navigation
- `<label>` for form fields
- `<input>`/`<select>`/`<textarea>` for native form controls where appropriate

Do not use `<div @click>` as a fake button.

Ensure:

- Keyboard navigation works on web.
- Focus is not trapped accidentally.
- Modal dialogs manage focus correctly.
- Color is not the only state signal.
- Text remains readable at increased browser font size.
- Motion can be reduced.

# Performance

Optimize for actual user-perceived performance.

Prefer:

- Lazy-loaded routes.
- Lazy-loaded heavy components.
- Small images with appropriate dimensions.
- CSS transforms/opacity for animations.
- Debounced expensive search/filter actions.
- Virtualized lists for truly large datasets.
- Avoiding unnecessary reactive dependencies.
- Avoiding giant component trees when a simpler structure works.

Be especially careful with:

- `backdrop-filter` on large regions.
- Large shadows and filters.
- Excessive blur layers.
- Huge lists rendered at once.
- Watchers that trigger expensive operations repeatedly.
- Unoptimized media.

Do not optimize blindly. Measure or identify a credible bottleneck first.

# Forms and Data Entry

For forms:

- Keep labels visible.
- Use appropriate input types.
- Provide inline validation that explains how to fix the problem.
- Preserve user input after recoverable failures.
- Avoid resetting an entire form because one request failed.
- Use the correct keyboard/input mode on mobile.
- Make the primary submit action obvious.
- Disable only the controls that truly cannot be used during submission.

# Loading, Empty, Error, and Success States

Every important async screen should intentionally handle:

1. Initial loading
2. Loaded state
3. Empty state
4. Partial/slow state where relevant
5. Error state
6. Retry/recovery
7. Success/confirmation after mutations
8. Offline state where relevant

Do not use a spinner as the universal answer.

# UI Review Process

When asked to build or redesign a screen, follow this sequence:

## 1. Inspect

Read:

- `package.json`
- router setup
- entry points
- global CSS/theme files
- component folders
- existing design tokens
- state management
- Capacitor configuration
- native service abstractions

Identify existing conventions before creating new ones.

## 2. Define the User Goal

Write a one-sentence statement internally such as:

> "The user needs to see their current balance and quickly record a transaction."

Everything on the screen should support that goal.

## 3. Establish Hierarchy

Decide:

- Primary content
- Primary action
- Secondary actions
- Navigation
- Supporting information
- Optional information

## 4. Build the Semantic Structure

Create the simplest meaningful component hierarchy before polishing visuals.

## 5. Apply Tokens

Use the project's colors, typography, shapes, spacing, and motion tokens.

## 6. Add Expressiveness

Add expressive shape/color/motion only after hierarchy and usability are correct.

## 7. Add Translucency Carefully

Use glass-inspired treatment only where it improves layering and hierarchy.

## 8. Implement Responsive Behavior

Test narrow phone, larger phone, tablet, and desktop layouts as applicable.

## 9. Add Platform Behavior

Handle safe areas, keyboard, back navigation, and native APIs when relevant.

## 10. Review States and Accessibility

Test focus, disabled, loading, empty, error, reduced motion, and no-backdrop-filter cases.

## 11. Verify

Run the project's lint/typecheck/test/build commands and fix regressions before declaring the work complete.

# File/Code Conventions

Prefer:

- TypeScript strictness already established by the project.
- `<script setup lang="ts">` for Vue SFCs unless existing conventions differ.
- Named exports for utility/service functions where useful.
- Small focused composables.
- Explicit interfaces/types for shared data contracts.
- Centralized API/data-access code.
- Semantic CSS class names or token-driven utility classes.
- Co-location of feature-specific code.

Avoid:

- `any` unless unavoidable and documented.
- Huge inline style objects that duplicate the design system.
- Magic numbers scattered across files.
- Deep chains of prop drilling when state/composables are more appropriate.
- Direct network requests inside presentational components.
- Direct Capacitor plugin calls inside reusable visual components.
- Copy-pasted variants of nearly identical components.
- Replacing a working architecture just because a different pattern is fashionable.

# When Generating New Components

Before generating a component, decide whether it is:

1. A universal UI primitive
2. A shared app component
3. A feature-specific component
4. A page/view
5. A behavior/composable rather than a component

Place it accordingly.

A component belongs under `components/ui` only if it is genuinely reusable across unrelated features.

# When Refactoring

Do not perform broad refactors while solving a small UI task unless the existing structure blocks the requested change.

Prefer incremental cleanup:

```text
existing implementation
        ↓
extract repeated behavior
        ↓
introduce semantic tokens
        ↓
extract focused component
        ↓
replace call sites
        ↓
remove dead code
```

Keep the diff easy to review.

# AI Implementation Behavior

When acting as a coding agent:

- First inspect relevant files.
- State assumptions in the plan when they matter.
- Reuse existing components and tokens before inventing alternatives.
- Do not silently install dependencies.
- Do not silently change framework/library versions.
- Do not rewrite unrelated code.
- Prefer the smallest coherent implementation.
- When multiple design options are valid, choose one and implement it consistently rather than mixing styles.
- Avoid placeholder UI in production code unless explicitly requested.
- Do not leave TODO comments for work that the task expects you to complete.
- Verify imports and types after structural changes.
- Run relevant validation commands after implementation.

# Definition of Done

A UI/mobile feature is not complete until:

- The user flow is clear.
- The UI matches the project's design language.
- Responsive behavior is intentional.
- Interactive states exist.
- Loading/empty/error/success states are handled where relevant.
- Accessibility basics are satisfied.
- Mobile safe areas and keyboard behavior are considered.
- Android back behavior is correct where applicable.
- Native code is isolated behind a service/adapter boundary.
- No unnecessary dependencies were added.
- No obvious performance traps were introduced.
- Type checking/lint/tests/build pass according to the project's existing scripts.

# Reference Documentation

Use current official documentation when behavior may have changed:

- Material 3: https://m3.material.io/
- Material 3 canonical layouts: https://m3.material.io/foundations/layout/canonical-examples/overview
- Material interaction states: https://m3.material.io/foundations/interaction/states/overview
- Apple HIG Materials / Liquid Glass: https://developer.apple.com/design/human-interface-guidelines/materials
- Apple Liquid Glass overview: https://developer.apple.com/documentation/technologyoverviews/liquid-glass
- Capacitor: https://capacitorjs.com/docs

Do not rely on memory for rapidly changing package versions or APIs. Check the official documentation and the installed project's versions first.
