# HANDOFF DOCUMENTATION - Noted Chrome Extension

## Project Overview

**Noted** is a Chrome Extension (Manifest V3) that enables users to annotate any webpage with persistent text labels and freehand drawings. Annotations are stored locally using Chrome Storage API and synchronized across sessions.

**Repository**: https://github.com/justinqpham/Noted.git

## Current Status: Phase 3 - Drawing System (In Progress)

### Completed Features

#### Phase 1: Extension Structure ✅
- Chrome Extension Manifest V3 setup
- Service worker background script
- Content scripts injection system
- Chrome Storage API integration
- Hotkey manager for keyboard shortcuts

#### Phase 2: Text Annotation System ✅
- Text annotation creation with Ctrl+Shift+T
- Click-to-place text labels on any webpage
- Drag and resize functionality for text annotations
- Delete button with hover interaction
- Persistent storage per URL
- Cross-session annotation loading

#### Phase 3: Drawing System (95% Complete) ✅
- Drawing mode activation with Ctrl+Shift+D
- Canvas overlay for freehand drawing
- Catmull-Rom spline interpolation for smooth strokes
- Drawing history with undo (Ctrl+Z)
- Conversion from canvas drawings to SVG annotations
- Delete button positioning on strokes
- Alt+drag to move strokes during draw mode
- Global cursor changes (crosshair in draw mode, grab when Alt held)
- Clear All Annotations with double-click confirmation
- **NEW**: Combined color + brush size control panel
- **NEW**: 12-color palette in 6x2 grid layout
- **NEW**: 5 brush sizes (2px, 4px, 6px, 8px, 12px) displayed as solid black circles
- **NEW**: Draggable control panel with grab handle
- **NEW**: Visual selection feedback (blue borders/backgrounds)

#### Phase 4: Dashboard (Partial) ✅
- Popup dashboard UI
- Display all annotations for current page
- Clear All Annotations button with confirmation
- Basic annotation list view

---

## Current Technical Implementation

### File Structure

```
/Users/justinqpham/Projects/Noted/
├── manifest.json                    # Extension manifest (MV3)
├── background/
│   ├── service-worker.js            # Background service worker
│   └── sync-manager.js              # Storage sync coordination
├── content/
│   ├── content-script.js            # Main content script entry point
│   ├── annotation-manager.js        # Manages all annotation lifecycle
│   ├── text-engine.js               # Text annotation system
│   ├── drawing-engine.js            # Drawing annotation system
│   └── styles.css                   # Annotation UI styles
├── popup/
│   ├── dashboard.html               # Extension popup UI
│   ├── dashboard.js                 # Dashboard logic
│   └── dashboard.css                # Dashboard styles
├── utils/
│   ├── hotkey-manager.js            # Keyboard shortcut handling
│   └── storage-helper.js            # Storage utilities
└── tests/
    ├── drawing-engine.test.html     # Drawing system tests
    └── storage-helper.test.html     # Storage utility tests
```

### Key Architecture Decisions

1. **Dual Rendering System**: Drawing annotations exist in two representations:
   - **Canvas (raster)**: Used during active drawing for performance
   - **SVG (vector)**: Used for persistent storage and display
   - Both must stay synchronized during drag operations

2. **Storage Change Listeners**: Chrome storage onChanged listener reloads annotations synchronously, creating race conditions during drag operations

3. **Event Handling**:
   - Z-index stacking: Canvas at 2147483647, UI panels at 2147483649
   - Pointer-events management for drawing over existing strokes
   - Alt key modifier for drag operations during draw mode

4. **Coordinate System**:
   - Viewport-relative positioning
   - SVG viewBox for scalable annotations
   - Bounding box calculations for delete button positioning

---

## Known Issues & Bugs

### 🔴 CRITICAL: Canvas Copy Left Behind When Alt+Dragging

**Status**: UNRESOLVED
**Priority**: HIGH

**Description**:
When Alt+dragging a stroke during draw mode, the stroke appears to duplicate - leaving a "copy" behind at the original position. The "copy" is actually the canvas raster image, while the dragged element is the SVG annotation.

**What Happens**:
1. User draws a stroke in draw mode
2. User holds Alt and drags the stroke to new position
3. SVG annotation moves correctly
4. Canvas shows stroke at BOTH old and new positions
5. Pressing ESC clears the canvas and only shows SVG at new position

**Root Cause Analysis**:
The issue stems from a race condition between canvas history updates and storage reload:

1. When dragging ends (mouseup), code attempts to:
   - Update canvas history points with new delta
   - Redraw canvas from updated history
   - Call `saveAnnotation()` which triggers storage change event

2. The storage change listener (`handleStorageChange()`) calls `loadAnnotations()` synchronously
3. `loadAnnotations()` reloads ALL annotations from storage and re-renders them
4. This reload interrupts the canvas update flow, causing the canvas to show the old position

**Attempted Fixes**:
1. ✅ Moved history update code BEFORE saveAnnotation() call
2. ✅ Added `skipNextStorageReload` flag to prevent reload during drag
3. ❌ Still doesn't work - issue persists

**Code Locations**:
- [drawing-engine.js:230-270](content/drawing-engine.js) - Mouseup handler with history update
- [annotation-manager.js:306-316](content/annotation-manager.js) - Storage change handler with skip flag

**Next Steps to Try**:
1. Add console logging to verify the skip flag is being set and checked correctly
2. Consider using a debounce/throttle on storage reload
3. Investigate using requestAnimationFrame for canvas redraw timing
4. Consider separating canvas and SVG update flows entirely
5. Research localStorage for synchronous operations instead of chrome.storage

**Web Research Findings**:
- Chrome Storage API is not ACID-compliant and lacks transaction support
- Common pattern: Cache storage in memory, use onChanged for cross-tab sync only
- Canvas and SVG have fundamentally different update models (redraw vs DOM manipulation)
- Consider localStorage for synchronous operations that need immediate consistency

---

## Architecture Details

### Class Structure

#### AnnotationManager (`content/annotation-manager.js`)
**Purpose**: Central coordinator for all annotation lifecycle operations

**Key Properties**:
- `annotations` - Array of all annotation objects
- `containerElement` - Root DOM element for annotations
- `currentURL` - Current page URL for scoping
- `skipNextStorageReload` - Flag to prevent reload during drag operations

**Key Methods**:
- `loadAnnotations()` - Loads annotations from storage for current URL
- `saveAnnotations()` - Saves all annotations to storage
- `renderAllAnnotations()` - Renders all annotations to DOM
- `deleteAnnotation(id)` - Removes annotation by ID
- `handleStorageChange()` - Handles cross-tab sync events

#### DrawingEngine (`content/drawing-engine.js`)
**Purpose**: Manages canvas drawing, stroke recording, and history

**Key Properties**:
- `canvas` - HTML5 canvas element
- `ctx` - 2D rendering context
- `isDrawing` - Boolean flag for active drawing
- `currentStroke` - Array of points for stroke in progress
- `history` - Array of completed strokes with annotation IDs

**Key Methods**:
- `startDrawing(e)` - Begins stroke on mousedown
- `draw(e)` - Continues stroke on mousemove
- `endDrawing()` - Finalizes stroke, converts to SVG annotation
- `interpolatePoints(points)` - Catmull-Rom spline smoothing
- `redrawFromHistory()` - Redraws canvas from history array
- `undo()` - Removes last stroke (Ctrl+Z)

#### DrawingAnnotation (`content/drawing-engine.js`)
**Purpose**: Renders individual drawing annotation as SVG with interactions

**Key Features**:
- SVG path rendering with viewBox
- Drag-to-move functionality (normal mode)
- Alt+drag during draw mode
- Delete button positioned at stroke end point
- Hit area for interaction (invisible stroke overlay)

**Key Methods**:
- `render()` - Creates SVG DOM elements
- `saveAnnotation()` - Persists to storage via manager
- `updateCursor(e)` - Changes cursor based on Alt key state

#### DrawModeController (`content/drawing-engine.js`)
**Purpose**: Orchestrates drawing mode UI and interactions

**Key Features**:
- Instruction banner (top of viewport)
- Canvas overlay setup
- Keyboard event handlers (Alt, Ctrl+Z, ESC)
- Global cursor management
- Combined control panel (color + brush size)
- Draggable control panel with grab handle

---

## User Interactions & Hotkeys

### Text Annotation Mode
- **Ctrl+Shift+T** - Activate text mode
- **Click** - Place text annotation
- **Drag** - Move annotation
- **Resize handles** - Resize annotation
- **Hover + Delete button** - Remove annotation
- **ESC** - Exit text mode

### Drawing Mode
- **Ctrl+Shift+D** - Activate draw mode
- **Click + Drag** - Draw freehand stroke
- **Control Panel** - Select color (12 colors) and brush size (5 sizes)
- **Drag Panel** - Click and drag the "≡" handle to move control panel
- **Alt + Drag** - Move existing stroke (during draw mode)
- **Ctrl+Z** - Undo last stroke
- **Hover + Delete button** - Remove stroke (only when NOT in draw mode)
- **ESC** - Exit draw mode and finalize all strokes

### Dashboard
- **Click extension icon** - Open popup dashboard
- **Clear All Annotations** - Double-click to confirm and clear all

---

## Technical Challenges & Solutions

### Challenge 1: Drawing Over Existing Strokes
**Problem**: Mouse events on SVG hitArea elements captured events before canvas, preventing drawing over existing strokes.

**Attempts**:
- Set `pointer-events: none` on containers
- Increased canvas z-index
- Disabled pointer-events on individual elements

**Issue**: Inline styles (`pointer-events: stroke`) on SVG elements override container settings.

**Solution**: Changed approach to Alt+drag modifier. Only allow dragging when Alt key is pressed, otherwise events pass through to canvas.

### Challenge 2: Delete Button Positioning
**Problem**: Delete button positioned far from stroke, especially on diagonal strokes.

**Attempts**:
- Position at center-top of stroke
- Position at absolute last point coordinates

**Issue**: Button position drifted when dragging annotation because coordinates were absolute.

**Solution**: Calculate button position relative to bounding box (minX, minY) instead of absolute coordinates. Button stays consistent during drag operations.

**Code**: [drawing-engine.js:63-78](content/drawing-engine.js)

### Challenge 3: Clear All Annotations
**Problem**: `confirm()` dialog doesn't work in Chrome extension popups (returns false immediately).

**Solution**: Implemented double-click confirmation pattern with visual feedback (button turns red, text changes to "Click again to confirm", auto-reset after 3 seconds).

**Code**: [popup/dashboard.js:117-140](popup/dashboard.js)

### Challenge 4: Global Cursor Changes
**Problem**: Cursor only changed to grab when hovering over stroke with Alt held.

**Solution**: Added keydown/keyup listeners on document to change canvas cursor globally when Alt is pressed/released.

**Code**: [drawing-engine.js:713-758](content/drawing-engine.js)

### Challenge 5: Combined Control Panel UI
**Problem**: Need color picker and brush size selector in a single, moveable panel.

**Requirements**:
- Remove Shift-to-show palette behavior from original spec
- Combine color and brush size into one panel
- Make panel draggable by top handle
- Display brush sizes as solid black circles (not numbers)

**Solution**: Created unified control panel with draggable handle.

**Implementation Details**:
- **Panel Structure**: Drag handle (≡) at top, color section, divider, brush size section
- **Colors**: 12 colors in 6x2 grid (Red, Yellow, Orange, Pink, Green, Blue, Purple, Gray, Black, Brown, Turquoise, White)
- **Brush Sizes**: 5 sizes (2px, 4px, 6px, 8px, 12px) displayed as solid black circles (6px, 10px, 14px, 18px, 24px visual size)
- **Selection Feedback**: Colors show blue border + ring, brush sizes show blue background with white circle
- **Drag Functionality**: Grab/grabbing cursor, smooth drag with mousedown/mousemove/mouseup
- **Styling**: Apple-style design with backdrop blur, subtle shadows, smooth animations

**Code**:
- Panel creation: [drawing-engine.js:817-944](content/drawing-engine.js)
- Drag functionality: [drawing-engine.js:949-987](content/drawing-engine.js)
- CSS styling: [styles.css:265-398](content/styles.css)

---

## Data Structures

### Annotation Object (Text)
```javascript
{
  id: "uuid-v4-string",
  type: "text",
  position: { x: number, y: number },  // Viewport coordinates
  size: { width: number, height: number },
  content: {
    text: "annotation text"
  },
  url: "https://example.com",
  timestamp: 1234567890
}
```

### Annotation Object (Drawing)
```javascript
{
  id: "uuid-v4-string",
  type: "drawing",
  position: { x: number, y: number },  // Top-left of bounding box
  size: { width: number, height: number },  // Bounding box dimensions
  content: {
    points: [
      { x: number, y: number, timestamp: number },
      // ... more points
    ],
    color: "#FF0000",
    strokeWidth: 3
  },
  url: "https://example.com",
  timestamp: 1234567890
}
```

### Drawing History Entry
```javascript
{
  annotationId: "uuid-v4-string",
  points: [
    { x: number, y: number, timestamp: number },
    // ... more points
  ]
}
```

---

## Storage Architecture

### Chrome Storage Structure
```javascript
{
  "annotations": {
    "https://example.com": [
      { /* annotation object */ },
      { /* annotation object */ }
    ],
    "https://another-site.com": [
      { /* annotation object */ }
    ]
  }
}
```

### Storage Events Flow
1. User modifies annotation (drag, delete, create)
2. Code calls `saveAnnotations()` in AnnotationManager
3. Chrome Storage API `set()` is called
4. Storage change event fires via `chrome.storage.onChanged` listener
5. `handleStorageChange()` is called
6. Annotations are reloaded and re-rendered (unless `skipNextStorageReload` is true)

---

## Testing

### Manual Testing Checklist

**Text Annotations**:
- [ ] Create text annotation with Ctrl+Shift+T
- [ ] Drag to move
- [ ] Resize using corner/edge handles
- [ ] Delete using hover button
- [ ] Persist across page refresh
- [ ] Escape exits mode without saving

**Drawing Annotations**:
- [x] Create drawing with Ctrl+Shift+D
- [x] Smooth stroke rendering
- [x] Control panel appears with colors and brush sizes
- [x] 12 colors displayed in 6x2 grid
- [x] 5 brush sizes displayed as solid black circles
- [x] Click to select color (blue border feedback)
- [x] Click to select brush size (blue background feedback)
- [x] Panel drag handle shows grab cursor on hover
- [x] Drag panel by handle to new position
- [x] Panel stays at new position during drawing
- [x] Draw with selected color and brush size
- [x] Undo last stroke with Ctrl+Z
- [x] Delete button appears on hover (when NOT in draw mode)
- [x] Delete button removes stroke
- [ ] ❌ Alt+drag moves stroke without leaving copy (BROKEN - known issue)
- [x] Cursor changes to crosshair in draw mode
- [x] Cursor changes to grab when Alt is held
- [x] Escape exits mode and finalizes strokes
- [x] Persist across page refresh

**Dashboard**:
- [ ] Click extension icon opens popup
- [ ] Shows all annotations for current page
- [ ] Clear All requires double-click confirmation
- [ ] Clear All removes all annotations

**Cross-Tab Sync**:
- [ ] Annotations created in one tab appear in another tab (same URL)
- [ ] Annotations deleted in one tab disappear in another tab

---

## Development Workflow

### Loading the Extension
1. Open Chrome
2. Navigate to `chrome://extensions`
3. Enable "Developer mode" (top-right toggle)
4. Click "Load unpacked"
5. Select `/Users/justinqpham/Projects/Noted` directory
6. Extension loads with icon in toolbar

### Making Changes
1. Edit files in `/Users/justinqpham/Projects/Noted`
2. Go to `chrome://extensions`
3. Click reload icon on Noted extension card
4. Refresh any pages with annotations

### Debugging
1. **Content Scripts**: Right-click page → Inspect → Console tab (filter by "Noted")
2. **Service Worker**: chrome://extensions → Noted → "service worker" link → Console
3. **Popup**: Right-click extension icon → Inspect popup → Console

---

## Next Steps & Roadmap

### Immediate Priority (Fix Critical Bug)
1. **Resolve Alt+Drag Canvas Copy Issue**
   - Add detailed console logging to trace execution flow
   - Verify `skipNextStorageReload` flag is working correctly
   - Consider refactoring storage reload to use debouncing
   - Investigate requestAnimationFrame for canvas updates
   - Research using localStorage instead of chrome.storage for drawing history

### Phase 3 Completion
- [ ] Fix canvas copy bug
- [ ] Implement stroke color picker
- [ ] Implement stroke width controls
- [ ] Add eraser tool
- [ ] Improve stroke rendering performance

### Phase 4: Enhanced Dashboard
- [ ] Group annotations by page URL
- [ ] Search/filter annotations
- [ ] Export annotations (JSON, CSV)
- [ ] Import annotations
- [ ] Annotation preview thumbnails

### Phase 5: Collaboration (Future)
- [ ] Cloud sync via Firebase/Supabase
- [ ] Share annotations via link
- [ ] Collaborative annotation (multi-user)
- [ ] Comment threads on annotations

### Phase 6: Advanced Features (Future)
- [ ] Highlight text annotations (like Medium)
- [ ] Screenshot annotations
- [ ] Arrow/shape tools
- [ ] PDF annotation support
- [ ] Mobile browser extension (Firefox for Android)

---

## Dependencies

**Core**:
- Chrome Extensions API (Manifest V3)
- Chrome Storage API
- HTML5 Canvas API
- SVG

**No external libraries** - Vanilla JavaScript implementation

---

## Performance Considerations

### Current Optimizations
- Content scripts load at `document_idle` to avoid blocking page load
- Canvas rendering uses double buffering via history
- SVG viewBox for scalable annotations
- Event delegation where possible

### Known Performance Issues
- Large number of annotations may slow page load
- Complex drawings with many points can cause lag
- No pagination in dashboard (loads all annotations)

### Future Optimizations
- Implement virtual scrolling for dashboard
- Lazy-load annotations outside viewport
- Use Web Workers for heavy computations
- Consider IndexedDB for large datasets
- Implement annotation compression

---

## Browser Compatibility

**Tested**:
- Chrome 120+ ✅

**Should Work**:
- Microsoft Edge (Chromium-based)
- Brave Browser
- Opera
- Any Chromium-based browser with Manifest V3 support

**Not Compatible**:
- Firefox (uses different extension API)
- Safari (uses different extension API)

---

## License & Attribution

**Author**: Justin Pham ([@justinqpham](https://github.com/justinqpham))
**Repository**: https://github.com/justinqpham/Noted

---

## Contact & Support

For issues, questions, or contributions, please open an issue on the GitHub repository.

**GitHub**: https://github.com/justinqpham/Noted
