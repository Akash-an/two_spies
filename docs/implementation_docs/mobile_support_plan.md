# Mobile Support Implementation Plan

This document outlines the strategy for making the Two Spies web application fully functional and optimized for mobile browsers (iOS and Android).

## 1. Core Objectives
- **Responsive Layout:** Transition from a desktop-first design to a fluid, device-agnostic layout.
- **Touch Optimization:** Ensure all interactive elements (cities, buttons, inputs) are easily usable with touch gestures.
- **Orientation Awareness:** Support both portrait and landscape modes. **Portrait** is the primary mobile target for one-handed play, using a vertical "Tactical Stack". **Landscape** will offer a scaled version of the desktop HUD.
- **Full-Screen Experience:** Implement the `Fullscreen API` and PWA manifests to allow a "standalone" app experience, hiding browser chrome and address bars.
- **Single Codebase Strategy:** Use a single responsive UI (React + Tailwind) rather than a separate mobile site. This ensures feature parity and simplifies maintenance.

---

## 2. Layout & UI Adaptations

### 2.1 Surveillance Command Center (Gameplay)
The main tactical display requires the most significant changes for mobile portrait mode.

- **Current State:** Side panel is on the right, map in the center/left, action bar at the bottom.
- **Mobile Portrait Proposed Layout:**
  - **Top Header:** Minimized height, keeping only essential stats (Intel, Timer, Turn status).
  - **Main Map:** Centered in the top 50-60% of the screen.
  - **Tactical Drawer/Panel:** Moves from the right to the bottom-center (above the action bar). It should be collapsible or scrollable to reveal the Intel Log and secondary stats.
  - **Action Bar:** Persistent at the bottom, using larger icons and potentially a "swipeable" or "paged" layout if buttons exceed screen width.

### 2.2 Mission Deployment Hub (Lobby)
- **Sidebar:** On screens < 768px, the sidebar will be hidden by default and accessible via a "hamburger" menu in the header.
- **Hero Modules:** Maintain the vertical stack for "Initiate Operation" and "Link to Network" buttons.
- **Contextual Feed:** Move "Active Intel", "Threat Level", and "Environment" to a scrollable horizontal carousel or a single vertical list.

### 2.3 Codename Authorization (Login)
- **Centering:** Ensure the terminal form is vertically centered and remains visible when the virtual keyboard is active.
- **Typography:** Scale down the large "CODENAME AUTHORIZATION TERMINAL" header for small viewports.

---

## 3. Interaction & Input

### 3.1 Map Navigation (Phaser/SVG)
- **Tap Targets:** Increase the "hit area" of cities in the SVG. Currently, they are circles; we can add an invisible larger circle around them to catch nearby taps.
- **Zoom/Pan:** On mobile, users expect to pinch-to-zoom or drag-to-pan. We should implement a basic pan/zoom behavior for the map SVG to allow closer inspection of clusters.

### 3.2 Action Confirmation
- **Touch feedback:** Add active states and subtle haptic-style animations (CSS transforms) for all buttons to confirm interaction.
- **Tooltips:** Desktop tooltips (on hover) don't work on mobile. We need to implement a "long-press for info" or a dedicated "Info Mode" toggle to see action descriptions.

---

## 4. Technical Implementation

### 4.1 Dynamic Viewport Units
Mobile browsers' address bars frequently change the `100vh` value.
- **Fix:** Use `dvh` (Dynamic Viewport Height) or `svh` (Short Viewport Height) in CSS for the `.game-container` to prevent the bottom UI from being cut off.

### 4.2 Safe Area Insets
Ensure the UI respects the "notch" and "home indicator" on modern iPhones.
- **Fix:** Use `env(safe-area-inset-*)` in padding for headers and the action bar.

### 4.3 Viewport Meta Tag & PWA
Ensure the viewport is locked and the app is "mobile-web-app-capable".
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

### 4.4 Fullscreen API
Add a "Go Fullscreen" utility in the header to trigger the browser's native fullscreen mode, providing an immersive experience on Android and desktop.

---

## 5. Proposed Tasks

- [ ] **Infrastructure:** Update `index.html` with correct viewport meta tags.
- [ ] **Global CSS:** Define mobile-specific CSS variables for header/footer heights.
- [ ] **PhaserGame Component:**
  - Refactor layout to use `flex-direction: column` in portrait.
  - Implement a collapsible "Tactical Panel" for mobile.
  - Increase city tap targets in the SVG.
- [ ] **MissionDeploymentHub Component:**
  - Implement mobile drawer for the sidebar.
  - Adjust grid layout for action modules.
- [ ] **CodenameAuthorization Component:**
  - Fix keyboard-overlap issues with centering.
- [ ] **Testing:** Verify on iOS Safari, Android Chrome, and various screen ratios.

## 6. Success Criteria
- The game is fully playable on a standard smartphone in portrait orientation.
- No UI elements overlap or are hidden by browser chrome.
- All game actions (Move, Strike, Abilities) can be triggered with one hand.
