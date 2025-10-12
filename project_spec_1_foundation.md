# Noted - Foundation Specification

**Always load this file - Contains architecture and completed implementation details**

---

## Executive Summary

**Noted** is a Chrome extension (Manifest V3) that enables users to annotate any webpage with persistent text labels and freehand drawings. This is a personal tool designed for research, design feedback, web development, and sharing with friends and colleagues.

**Current Status:** Phases 1-4 complete (local annotation system functional)  
**Repository:** https://github.com/justinqpham/Noted.git

---

## Completed Implementation (Phases 1-4)

### Phase 1: Extension Structure ✅

**Completed Features:**
- Chrome Extension Manifest V3 setup
- Service worker background script (`background/service-worker.js`)
- Content script injection system (`content/content-script.js`)
- Chrome Storage API integration for local persistence
- Hotkey manager for keyboard shortcuts
  - `Ctrl+Shift+T` - Text annotation mode
  - `Ctrl+Shift+D` - Drawing mode

---

### Phase 2: Text Annotation System ✅

**Features:**
- Text annotation creation with `Ctrl+Shift+T`
- Click-to-place text labels anywhere on webpage
- Drag annotations to reposition
- Resize handles (corner/edge dragging)
- Delete button on hover
- Persistent storage per URL using Chrome Storage API
- Automatic loading on page load
- Cross-session persistence

**Current Anchoring:** Page-relative coordinates (viewport + scroll offsets)

**Known Limitation:** Text annotations use simple position storage without robust anchoring strategies (will be addressed in Phase 5)

---

### Phase 3: Drawing System ✅

**Features:**
- Drawing mode activation with `Ctrl+Shift+D`
- Canvas overlay for freehand drawing
- **Catmull-Rom spline interpolation** for smooth 60fps strokes
- 12-color palette in 6x2 grid layout:
  - Red, Yellow, Orange, Pink, Green, Blue, Purple, Gray, Black, Brown, Turquoise, White
- 5 brush sizes (2px, 4px, 6px, 8px, 12px) displayed as solid black circles
- Draggable control panel with grab handle (≡)
- Visual selection feedback (blue borders for colors, blue backgrounds for brush sizes)
- Canvas-to-SVG conversion for storage
- Drawing history with undo (Ctrl+Z)
- Alt+drag to move strokes during draw mode
- Global cursor changes (crosshair in draw mode, grab when Alt held)
- Delete button positioning on strokes (relative to bounding box)
- Eraser tool with undo support
- ESC to exit mode and finalize drawings

**Technical Implementation:**
- Dual rendering system: Canvas (raster) for active drawing, SVG (vector) for storage
- Page-space coordinate system (viewport + scroll) for persistence
- Off-screen canvas caching for performance
- Stroke samples stored with scroll offsets to prevent ghosting
- Drawing history maintains full undo/redo stack

**Resolved Issues:**
- ✅ Canvas ghosting on Alt+drag (fixed with synchronization pipeline)
- ✅ Scroll ghosting (fixed with page-space point storage)
- ✅ Window resize drift (fixed with debounced anchor recomputation)
- ✅ Annotation position jumping after refresh (fixed with page-relative anchoring)

---

### Phase 4: Dashboard (Partial) ✅

**Features:**
- Popup dashboard UI (400px × 600px)
- Display all annotations for current page
- Clear All Annotations button with double-click confirmation
- Basic annotation list view with icons (🏷️ for text, ✏️ for drawing)
- Visual feedback for actions

**Current Limitations:**
- No search/filter functionality
- No cross-page annotation viewing
- No collections or organization
- No export features
- Single tab view only

---

## Current Limitations & Technical Debt

### Critical Issues to Address in Upcoming Phases

**1. Anchoring System (Phase 5)**
- **Current:** Page-relative coordinates (viewport + scroll)
- **Problem:** Breaks on dynamic pages, SPAs, content changes
- **Solution:** Multi-strategy anchoring with ML learning

**2. Export (Phase 6)**
- **Current:** Not implemented
- **Problem:** Cannot use annotations in other tools (Figma, presentations)
- **Solution:** SVG export with layered structure

**3. Sharing (Phase 7)**
- **Current:** Not implemented
- **Problem:** Cannot collaborate or send annotations to others
- **Solution:** Share link generation (local-first approach)

**4. UI Enhancements (Future)**
- Browser sidebar panel for persistent view
- Context menu integration
- Annotation search across pages
- Templates and layers

---

## Architecture Overview

### Technology Stack

**Frontend:**
- Chrome Extension (Manifest V3)
- Vanilla JavaScript (no frameworks)
- HTML5 Canvas API
- SVG for vector storage
- Chrome Storage API (local annotations)

**Future Backend (Optional - Phases 8+):**
- Supabase (PostgreSQL database) - if cloud sync needed
- Supabase Auth (Google/Apple OAuth) - if authentication needed
- Stripe (subscription management) - if monetization needed

**Hosting:**
- Extension: Chrome Web Store
- Backend: Supabase cloud (future)

---

### Current File Structure

```
Noted/
├── manifest.json
├── background/
│   ├── service-worker.js
│   └── sync-manager.js
├── content/
│   ├── content-script.js
│   ├── annotation-manager.js
│   ├── text-engine.js
│   ├── drawing-engine.js
│   └── styles.css
├── popup/
│   ├── dashboard.html
│   ├── dashboard.js
│   └── dashboard.css
├── utils/
│   ├── hotkey-manager.js
│   └── storage-helper.js
└── tests/
    ├── drawing-engine.test.html
    └── storage-helper.test.html
```

---

## Data Models

### Current Annotation Object (Phases 1-4)

```javascript
{
  // Core fields
  id: "uuid-v4",
  type: "text" | "drawing",
  url: "https://example.com/page",
  
  // Position (page-relative)
  position: {
    x: 500,  // pixels from left edge of page
    y: 300,  // pixels from top edge of page
    width: 250,  // text only
    height: 150  // text only
  },
  
  // Content
  content: {
    // Text annotations
    text: "Annotation text...",
    backgroundColor: "#FFEB3B",
    
    // Drawing annotations
    svgPath: "M 100 100 C 120 80...",
    strokeColor: "#FF0000",
    strokeWidth: 4,
    points: [
      { x: 100, y: 100, scrollX: 0, scrollY: 1200, timestamp: 1696704000000 }
    ]  // Full point history with scroll offsets
  },
  
  // Metadata
  tags: [],
  createdAt: 1696704000000,
  updatedAt: 1696704000000
}
```

### Storage Structure

```javascript
// Chrome Storage Local
{
  "annotations": {
    "https://example.com/page": [
      { /* annotation 1 */ },
      { /* annotation 2 */ }
    ],
    "https://another-site.com": [
      { /* annotation 1 */ }
    ]
  }
}
```

---

## Phase Roadmap Overview

### ✅ Completed (Phases 1-4)
- Phase 1: Extension Structure
- Phase 2: Text Annotation System
- Phase 3: Drawing System
- Phase 4: Dashboard (Basic)

### 🔄 In Progress / Upcoming (Phases 5-7)
- **Phase 5:** Robust Anchoring System
- **Phase 6:** SVG Export
- **Phase 7:** Basic Sharing (Extension-to-Extension)

### 📋 Future (Phases 8-12)
- Phase 8: Authentication & Cloud Sync (Optional)
- Phase 9: Browser Integration (Sidebar + Context Menu)
- Phase 10: Templates + Layers
- Phase 11: Monetization (Optional)
- Phase 12: Testing & Launch Prep

### 🔮 Future Enhancements
- Figma Plugin
- AI-powered features
- Mobile support
- Team features

---

## Key Design Principles

1. **Local-First:** Annotations work without internet, stored locally
2. **Privacy-Focused:** No tracking, no analytics by default
3. **Performance:** 60fps drawing, instant loading
4. **Simplicity:** Vanilla JS, no framework overhead
5. **Extensibility:** Easy to add new features incrementally

---

## Browser Compatibility

**Fully Supported:**
- Chrome 88+
- Microsoft Edge (Chromium-based)
- Brave Browser
- Opera
- Other Chromium-based browsers

**Not Supported:**
- Firefox (different extension API)
- Safari (different extension API)

---

## Development Workflow

### Loading the Extension
1. Open Chrome → `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select project directory

### Making Changes
1. Edit files
2. Go to `chrome://extensions`
3. Click reload icon on Noted extension
4. Refresh any pages with annotations

### Debugging
- **Content Scripts:** Right-click page → Inspect → Console
- **Service Worker:** chrome://extensions → Noted → "service worker" link
- **Popup:** Right-click extension icon → Inspect popup

---

## Success Metrics

- ✅ Annotations persist correctly 99%+ of the time (local storage)
- ✅ No noticeable lag when drawing (60fps achieved)
- ✅ Works on Wikipedia, Reddit, Gmail, Twitter (tested)
- ⏳ Robust anchoring on dynamic pages (Phase 5 goal)
- ⏳ Export to Figma workflow (Phase 6 goal)

---

## Notes for Agents

**This file contains:**
- What has been built (reference this to understand existing code)
- Current architecture (reference this when adding new features)
- Data models (reference this when modifying storage)

**For current phase instructions:**
- Load `project_spec_2_phases5-7.md` when working on Phases 5-7
- Load `project_spec_3_phases8-12.md` when working on Phases 8-12

**After completing a phase:**
- Update this file to add high-level summary of what was built
- Keep implementation details in code, not in this spec