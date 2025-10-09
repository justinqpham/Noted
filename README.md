# Noted - Web Annotation Tool

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-brightgreen)](https://github.com/justinqpham/Noted)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License](https://img.shields.io/badge/license-MIT-orange)](LICENSE)

**Noted** is a Chrome extension that lets you annotate any webpage with persistent text labels and freehand drawings. Perfect for research, design feedback, web development, or just remembering important details on your favorite sites.

![Noted Demo](assets/demo.gif)

## Features

### 🏷️ Text Annotations
- **Quick placement** with `Ctrl+Shift+T`
- Click anywhere on a page to add a text label
- Drag to move, resize handles to adjust
- Delete on hover
- Persists across browser sessions

### ✏️ Freehand Drawing
- **Drawing mode** with `Ctrl+Shift+D`
- **12-color palette** with easy selection
- **5 brush sizes** (2px to 12px) displayed as visual circles
- **Draggable control panel** - move it anywhere on the page
- Smooth, natural brush strokes using Catmull-Rom interpolation
- **Alt+drag** to reposition strokes while drawing
- **Ctrl+Z** to undo mistakes
- **Eraser mode** to remove individual strokes (with undo support)
- Delete individual strokes
- All drawings saved as crisp SVG vectors

### 💾 Smart Storage
- Annotations saved per URL
- Automatic cross-tab synchronization
- Local storage using Chrome Storage API
- No account required, no tracking

### 🎨 Dashboard
- View all annotations for current page
- Quick delete with visual confirmation
- Clear all annotations with safety confirmation

## Installation

### From Source (Developer Mode)

1. **Clone this repository**:
   ```bash
   git clone https://github.com/justinqpham/Noted.git
   cd Noted
   ```

2. **Load in Chrome**:
   - Open Chrome and navigate to `chrome://extensions`
   - Enable **Developer mode** (toggle in top-right corner)
   - Click **Load unpacked**
   - Select the `Noted` directory

3. **Start annotating**!
   - Click the Noted icon in your toolbar
   - Or use keyboard shortcuts: `Ctrl+Shift+T` (text) or `Ctrl+Shift+D` (draw)

### From Chrome Web Store
*Coming soon!*

## Usage

### Text Annotations

1. Press `Ctrl+Shift+T` to activate text mode
2. Click anywhere on the page to place a text box
3. Type your annotation
4. Drag to move, use handles to resize
5. Hover to see delete button
6. Press `ESC` to exit text mode

### Drawing Annotations

1. Press `Ctrl+Shift+D` to activate drawing mode
2. A control panel appears with:
   - **Colors**: 12 colors in a grid - click to select
   - **Brush Sizes**: 5 sizes shown as black circles - click to select
3. Click and drag anywhere on the panel's handle (≡) to move it
4. Click and drag to draw freehand strokes with selected color/size
5. Hold `Alt` while dragging to move existing strokes
6. Press `Ctrl+Z` to undo the last stroke
7. Switch to **Eraser** in the panel to remove individual strokes (undo supported)
8. Hover over strokes (outside draw mode) to delete
9. Press `ESC` to finalize and exit drawing mode

### Managing Annotations

- **View all annotations**: Click the Noted extension icon
- **Clear all**: Click "Clear All Annotations" in popup (requires double-click confirmation)
- **Delete individual**: Hover over annotation and click delete button

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+T` | Activate text annotation mode |
| `Ctrl+Shift+D` | Activate drawing mode |
| `Alt+Drag` | Move stroke during draw mode |
| `Ctrl+Z` | Undo last stroke (draw mode only) |
| `ESC` | Exit current mode |

## Architecture

Noted is built with vanilla JavaScript and uses Chrome Extension Manifest V3.

### Project Structure

```
Noted/
├── manifest.json              # Extension configuration
├── background/
│   ├── service-worker.js      # Background service worker
│   └── sync-manager.js        # Storage synchronization
├── content/
│   ├── content-script.js      # Main content script
│   ├── annotation-manager.js  # Annotation lifecycle management
│   ├── text-engine.js         # Text annotation system
│   ├── drawing-engine.js      # Drawing & canvas system
│   └── styles.css             # Annotation UI styles
├── popup/
│   ├── dashboard.html         # Extension popup interface
│   ├── dashboard.js           # Dashboard logic
│   └── dashboard.css          # Dashboard styles
└── utils/
    ├── hotkey-manager.js      # Keyboard shortcut handling
    └── storage-helper.js      # Storage utilities
```

### Key Technologies

- **Chrome Extensions API** (Manifest V3)
- **Chrome Storage API** for persistence
- **HTML5 Canvas** for drawing
- **SVG** for vector annotation storage
- **Vanilla JavaScript** (no frameworks)

## Development

### Prerequisites

- Chrome browser (version 88+)
- Basic understanding of Chrome Extensions

### Local Development

1. Clone and load the extension (see Installation)

2. Make your changes to the source files

3. Reload the extension:
   - Go to `chrome://extensions`
   - Click the reload icon on the Noted card
   - Refresh any pages with active annotations

### Debugging

**Content Scripts**:
```
Right-click page → Inspect → Console
Filter by "Noted" to see extension logs
```

**Service Worker**:
```
chrome://extensions → Noted → Click "service worker" link
```

**Popup**:
```
Right-click extension icon → Inspect popup
```

### Running Tests

Open test files in Chrome:
```bash
# Drawing engine tests
open tests/drawing-engine.test.html

# Storage helper tests
open tests/storage-helper.test.html

# Phase 3 control panel manual test
open tests/phase3-manual-test.html
```

## Known Issues

- _None currently tracked._ Recent fixes include the Alt+drag ghost stroke bug and URL normalization to keep annotations after refresh. See [HANDOFF.md](HANDOFF.md) for history and details.

## Roadmap

- [x] Text annotation system
- [x] Freehand drawing system
- [x] **Stroke color picker (12 colors)**
- [x] **Stroke width controls (5 sizes)**
- [x] **Draggable control panel**
- [x] **Eraser mode with undo support**
- [x] Persistent storage
- [x] Dashboard UI
- [x] Fix Alt+drag canvas copy bug
- [ ] Eraser tool
- [ ] Export/import annotations
- [ ] Cloud sync
- [ ] Collaborative annotations
- [ ] Mobile support

See [HANDOFF.md](HANDOFF.md) for detailed roadmap and development notes.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Guidelines

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please ensure your code:
- Follows existing code style
- Includes comments for complex logic
- Doesn't break existing functionality
- Includes console logging prefixed with "Noted:"

## Privacy

Noted stores all annotations **locally** on your device using Chrome's Storage API. No data is sent to external servers. No tracking, no analytics, no cloud storage (unless you explicitly enable sync in future versions).

## Browser Compatibility

**Fully Supported**:
- Chrome 88+
- Microsoft Edge (Chromium-based)
- Brave Browser
- Opera
- Other Chromium-based browsers

**Not Supported**:
- Firefox (different extension API)
- Safari (different extension API)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Justin Pham**
GitHub: [@justinqpham](https://github.com/justinqpham)

## Acknowledgments

- Catmull-Rom spline interpolation for smooth drawing
- Chrome Extensions documentation and community
- All contributors and testers

---

**Made with ❤️ for better web annotation**

If you find Noted useful, please ⭐ star this repository!
