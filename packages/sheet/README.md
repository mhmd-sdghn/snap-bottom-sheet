# Snap Bottom Sheet 🎯

A lightweight, flexible, and highly customizable bottom sheet component for React with dynamic height support, scroll management, and SSR compatibility. Built with TypeScript and supports CommonJS/ESM modules.

![Demo](https://via.placeholder.com/600x400?text=Bottom+Sheet+Demo) _[Placeholder for demo GIF]_

## Features ✨

- 📱 Compound component pattern for ultimate flexibility
- 🔄 Dynamic height support with `Sheet.DynamicHeight`
- 📜 Scroll management for content
- 🎯 Snap points in pixels, percentages, or dynamic values
- 🖱️ Drag behavior customization (lock directions)
- 🌍 SSR compatible
- � TypeScript-first with full TS support
- 🎨 Customizable positioning (portal or custom wrapper)

## Installation 📦

```bash
npm install snap-bottom-sheet
# or
yarn add snap-bottom-sheet
```

## Core Components 🧩

### 1. `<Sheet>` (Root Component)

Manages sheet state and snap behavior.

**Props:**

### Sheet Component Props

| Prop Name              | Required | Type                                | Default Value |
| ---------------------- | -------- | ----------------------------------- | ------------- |
| `isOpen`               | Yes      | `boolean`                           |               |
| `snapPoints`           | No       | `(number or SnapPointDynamicValue)` | -             |
| `activeSnapPointIndex` | No       | -                                   |               |
| `onClose`              | Yes      | -                                   |               |
| `onSnap`               | Yes      | -                                   |               |
| `noInitialAnimation`   | No       | -                                   |               |

---

### 2. `<Sheet.Container>`

Wrapper for your sheet content.

### Sheet.Container Props

| Prop Name   | Required | Default Value |
| ----------- | -------- | ------------- |
| `style`     | No       | -             |
| `className` | No       | -             |
| `wrapper`   | No       | -             |

---

### 3. `<Sheet.DynamicHeight>\*\*

Special container for content with changing heights.

## Snap Points Explained 🔢

Define your snap points as:

- **Pixel value**: `200` (200px from bottom)
- **Percentage**: `0.5` (50% of viewport height)
- **Dynamic**: `SnapPointDynamicValue` (Use with `Sheet.DynamicHeight`)

**Advanced configuration:**

```tsx
const snapPoints = [
  SnapPointDynamicValue, // Required first when using DynamicHeight
  {
    value: 0.4, // 40% height
    scroll: true, // Enable content scrolling
    drag: { up: false }, // Disable dragging up
  },
  200, // Fixed 200px height
];
```

## Basic Usage 🚀

```tsx
import { Sheet, SnapPointDynamicValue } from "snap-bottom-sheet";

function App() {
  const [isOpen, setIsOpen] = useState(true);
  const [activeSnap, setActiveSnap] = useState(0);

  const snapPoints = [
    SnapPointDynamicValue,
    0.5, // 50% height
    600, // 600px height
  ];

  return (
    <Sheet
      isOpen={isOpen}
      snapPoints={snapPoints}
      activeSnapPointIndex={activeSnap}
      onClose={() => setIsOpen(false)}
      onSnap={(index) => setActiveSnap(index)}
    >
      <Sheet.Container>
        <Sheet.DynamicHeight>
          <div
            style={{
              height: activeSnap === 0 ? 100 : 300,
              transition: "height 0.3s",
            }}
          >
            Resizable Content
          </div>
        </Sheet.DynamicHeight>

        <div className="content">
          <h2>My Bottom Sheet</h2>
          <p>Scrollable content here...</p>
        </div>
      </Sheet.Container>
    </Sheet>
  );
}
```

## Key Features Deep Dive 🔍

### 1. Dynamic Height Handling

Wrap content with changing heights in `Sheet.DynamicHeight`:

```tsx
<Sheet.DynamicHeight>
  <CollapsibleSection /> {/* Height changes internally */}
</Sheet.DynamicHeight>
```

### 2. Scroll Management

Enable content scrolling per snap point:

```tsx
const snapPoints = [
  SnapPointDynamicValue,
  { value: 400, scroll: true }, // Enable scroll at 400px
];
```

### 3. Drag Behavior Control

Restrict drag directions:

```tsx
const restrictedSnap = {
  value: 0.5,
  drag: { up: false }, // Only allow dragging down
};
```

### 4. Custom Positioning

Render in custom container instead of portal:

```tsx
const wrapperRef = useRef<HTMLDivElement>(null);

// In parent component:
<div ref={wrapperRef} className="custom-wrapper" />

// In Sheet:
<Sheet.Container wrapper={wrapperRef}>
  {/* Content */}
</Sheet.Container>
```

## SSR Considerations ⚛️

The sheet works seamlessly with Server-Side Rendering:

- Automatic portal handling
- No hydration mismatches
- Graceful fallbacks

## Styling Tips 🎨

1. Override default styles:

```css
.snap-bottom-sheet-container {
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
  border-radius: 16px 16px 0 0;
}
```

2. Add custom transitions:

```css
.snap-bottom-sheet-content {
  transition: transform 0.3s cubic-bezier(0.33, 0.84, 0.24, 1);
}
```

## Best Practices ✅

- Always include `SnapPointDynamicValue` as first snap point when using dynamic content
- Use percentage values for responsive layouts
- Wrap height-changing content in `Sheet.DynamicHeight`
- Use `noInitialAnimation` for modals triggered by instant actions
- Combine pixel and percentage snap points for hybrid layouts

## TypeScript Support 💻

Full type definitions included - no need for separate `@types` package!

```ts
import type {
  SnapPoint,
  SnapPointConfigObj,
  SheetCallbacks,
} from "snap-bottom-sheet";
```

---

**Enjoy building smooth, interactive bottom sheets!** 🚀  
_Found an issue? Please [report it on GitHub](https://github.com/your-repo-url)._
