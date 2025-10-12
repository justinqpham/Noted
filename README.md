# Noted - Web Annotation Tool

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-brightgreen)](https://github.com/justinqpham/Noted)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License](https://img.shields.io/badge/license-MIT-orange)](LICENSE)

**Noted** is a Chrome extension that lets you annotate any webpage with persistent text labels and freehand drawings. Perfect for research, design feedback, web development, or sharing insights with friends and colleagues.

![Noted Demo](assets/demo.gif)

---

## Features

### ✅ Completed (Phases 1-4)

#### 🏷️ Text Annotations
- **Quick placement** with `Ctrl+Shift+T`
- Click anywhere on a page to add a text label
- Drag to move, resize handles to adjust
- Delete on hover
- Persists across browser sessions

#### ✏️ Freehand Drawing
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

#### 💾 Smart Storage
- Annotations saved per URL
- Automatic cross-tab synchronization
- Local storage using Chrome Storage API
- No account required, no tracking

#### 🎨 Dashboard
- View all annotations for current page
- Quick delete with visual confirmation
- Clear all annotations with safety confirmation

---

### 🔄 In Progress (Phases 5-7)

#### Phase 5: Robust Anchoring System
- Multi-strategy DOM anchoring (5 strategies with fallback)
- Machine learning from user corrections
- Screenshot thumbnail fallback
- Warning system for page changes

#### Phase 6: SVG Export
- Export annotations as layered SVG
- Figma-compatible format
- Background screenshot + editable annotations

#### Phase 7: Basic Sharing
- Share annotations via extension-to-extension links
- Recipients must have extension installed
- 90-day expiration on shared links

---

### 📋 Planned (Phases 8-12)

**Future enhancements (optional based on user feedback):**
- Authentication & cloud sync
- Browser sidebar panel integration
- Context menu (right-click to annotate)
- Annotation templates (Bug Report, Design Feedback, Research)
- Layers system
- Monetization (optional Pro tier)
- Comprehensive testing & Chrome Web Store launch

See [project_spec_3_phases8-12.md](project_spec_3_phases8-12.md) for details (to be written after Phase 7).

---

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
*Coming soon after Phase 12!*

---

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

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+T` | Activate text annotation mode |
| `Ctrl+Shift+D` | Activate drawing mode |
| `Alt+Drag` | Move stroke during draw mode |
| `Ctrl+Z` | Undo last stroke (draw mode only) |
| `ESC` | Exit current mode |

---

## Project Structure

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
├── utils/
│   ├── hotkey-manager.js      # Keyboard shortcut handling
│   └── storage-helper.js      # Storage utilities
└── tests/
    ├── drawing-engine.test.html
    └── storage-helper.test.html
```

---

## Documentation Structure

### For Users
- **README.md** (this file) - Project overview and usage
- **HANDOFF.md** - Development progress and handoff notes

### For Developers/Agents
- **agent_instructions.md** - Rules and workflow for AI coding agents
- **project_spec_1_foundation.md** - Always load (architecture + completed features)
- **project_spec_2_phases5-7.md** - Load when working on Phases 5-7
- **project_spec_3_phases8-12.md** - Load when working on Phases 8-12 (to be written)

**Important:** Agents should load specifications based on which phase they're working on. See [agent_instructions.md](agent_instructions.md) for details.

---

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
```

---

## Current Status

**Phase 4 Complete** ✅
- Local annotation system fully functional
- Text and drawing modes working
- Basic dashboard implemented

**Phase 5 In Progress** 🔄
- Robust anchoring system (multi-strategy with ML learning)

See [HANDOFF.md](HANDOFF.md) for latest development status and handoff notes.

---

## Known Issues

No critical issues currently. Recent fixes include:
- ✅ Alt+drag ghost stroke bug resolved
- ✅ URL normalization for annotation persistence
- ✅ Window resize drift fixed
- ✅ Scroll ghosting eliminated

See [HANDOFF.md](HANDOFF.md) for detailed fix history.

---

## Roadmap

### Completed (Phases 1-4)
- [x] Text annotation system
- [x] Freehand drawing system
- [x] 12-color palette with 5 brush sizes
- [x] Draggable control panel
- [x] Eraser mode with undo support
- [x] Persistent local storage
- [x] Basic dashboard UI

### In Progress (Phases 5-7)
- [ ] Multi-strategy anchoring with ML learning
- [ ] SVG export (Figma-compatible)
- [ ] Basic sharing (extension-to-extension)

### Planned (Phases 8-12)
- [ ] Authentication & cloud sync (optional)
- [ ] Browser sidebar integration
- [ ] Context menu
- [ ] Annotation templates
- [ ] Layers system
- [ ] Testing & Chrome Web Store launch

See [project_spec_3_phases8-12.md](project_spec_3_phases8-12.md) for future roadmap details.

---

## Contributing

This is primarily a personal project, but feedback and suggestions are welcome!

If you'd like to contribute:
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Follow the coding standards in [agent_instructions.md](agent_instructions.md)
4. Test your changes thoroughly
5. Submit a Pull Request

**Coding Standards:**
- Vanilla JavaScript (no frameworks)
- Clean, commented code
- Descriptive variable names
- Console logging prefixed with "Noted:"

---

## Privacy

Noted stores all annotations **locally** on your device using Chrome's Storage API. 

**Current (Phases 1-7):**
- No data sent to external servers
- No tracking, no analytics
- No cloud storage
- No account required

**Future (Phases 8+, Optional):**
- Optional cloud sync with authentication (if implemented)
- Optional sharing features (if implemented)
- Users will have full control over data sharing

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

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Author

**Justin Pham**  
GitHub: [@justinqpham](https://github.com/justinqpham)

---

## Acknowledgments

- Catmull-Rom spline interpolation for smooth drawing
- Chrome Extensions documentation and community
- AI coding assistants (Claude Code, Cursor, GitHub Copilot) for development support
- All contributors and testers

---

**Made with ❤️ for better web annotation**

If you find Noted useful, please ⭐ star this repository!

---

## Multi-Agent Development

This project is developed using multiple AI coding agents across different platforms (Claude Code, Cursor, GitHub Copilot). For developers/agents:

**Important Notes:**
- Load specifications based on current phase
- Follow handoff protocol in [agent_instructions.md](agent_instructions.md)
- Check [HANDOFF.md](HANDOFF.md) for latest development status
- Document your work before session limits

See [agent_instructions.md](agent_instructions.md) for complete development workflow.