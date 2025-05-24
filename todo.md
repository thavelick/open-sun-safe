# TODO: Web Components Refactor

## 1. Project Setup
- [x] Create a `public_html/js/components/` (or similar) directory
- [ ] Change `<script src="js/main.js">` in `index.html` to `<script type="module" src="js/main.js">`

## 2. Root Application Shell
- [ ] Create `<sun-safe-app>`
  - Manage global state (settings, UV cache, selected segment)
  - Handle routing/tabs and orchestrate child components
  - Persist to `localStorage` and kick off data fetch

## 3. Navigation Components
- [ ] `<tab-navigation>`
  - Renders two `<tab-button>`s (“Home” / “Settings”)
  - Dispatches a `tab-change` event
- [ ] `<tab-button>`
  - Accepts attributes like `label`, `selected`

## 4. View Containers
- [ ] `<home-view>`
  - Contains `<loading-indicator>`, `<message-box>`, `<uv-circle-widget>`, `<safe-time-card>`, `<location-panel>`
  - Listens for data/state events to re-render
- [ ] `<settings-view>`
  - Contains `<settings-form>` and `<about-section>`

## 5. Feedback & Placeholders
- [ ] `<loading-indicator>`
- [ ] `<message-box>`

## 6. Cards & Panels
- [ ] `<app-card>`
  - Generic header + content wrapper
- [ ] `<safe-time-card>` (extends or uses `<app-card>`)
- [ ] `<location-panel>`
- [ ] `<about-section>`

## 7. UV Visualization
- [ ] `<uv-circle-widget>`
  - Outer wrapper, renders overall SVG canvas
  - Coordinates clicks and selection state
- [ ] `<uv-circle-segment>`
  - Renders one 30° arc, takes `startAngle`, `endAngle`, `color`, `selected` props
- [ ] `<uv-circle-center>`
  - Inner overlay showing time, UVI, risk label, burn-time

## 8. Settings Form & Controls
- [ ] `<settings-form>`
  - Latitude, Longitude, Skin Type fields + Save button
  - Dispatches `settings-saved` with payload
- [ ] `<form-group>`
  - Label + control wrapper
- [ ] (Optional) `<app-input>`, `<app-select>`, `<app-button>` for shared styling

## 9. Styling & Themes
- [ ] Move CSS variables and reset into a shared `<style>` module or inject into each component’s shadow DOM
- [ ] Ensure global theme (colors, radii, transitions) is applied consistently

## 10. Integration & Cleanup
- [ ] Update `index.html` to use the new custom elements
- [ ] Refactor `js/main.js` to import and bootstrap `<sun-safe-app>`
- [ ] Migrate logic from `main.js` into component lifecycle methods / event handlers
- [ ] Remove old DOM-manipulation code once its functionality is fully covered

## 11. Testing & Documentation
- [ ] Manually verify each component in isolation (e.g. Storybook or simple HTML pages)
- [ ] Update `README.md` with usage examples for new components
- [ ] Add any unit/integration tests if desired

---
End of TODO
