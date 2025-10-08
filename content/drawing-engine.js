// Drawing Engine - Handles freehand drawing annotations
// Manages canvas drawing, smoothing, SVG conversion, and interaction

class DrawingAnnotation {
  constructor(annotation, manager) {
    this.annotation = annotation;
    this.manager = manager;
    this.element = null;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
  }

  /**
   * Render the drawing annotation
   * @returns {HTMLElement} The SVG element
   */
  render() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'noted-drawing-annotation');
    svg.dataset.annotationId = this.annotation.id;

    // Calculate bounding box from points
    const bbox = this.calculateBoundingBox(this.annotation.content.points);

    console.log('Noted: Rendering drawing annotation', {
      id: this.annotation.id,
      position: this.annotation.position,
      bbox,
      pathLength: this.annotation.content.svgPath.length
    });

    // Set SVG dimensions and viewBox
    svg.style.pointerEvents = 'none';  // Only the stroke itself should be grabbable
    svg.setAttribute('width', bbox.width);
    svg.setAttribute('height', bbox.height);
    svg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);

    // Create invisible hit area (thicker for easier grabbing)
    const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitArea.setAttribute('d', this.annotation.content.svgPath);
    hitArea.setAttribute('stroke', 'transparent');
    hitArea.setAttribute('stroke-width', Math.max(this.annotation.content.strokeWidth + 8, 12));
    hitArea.setAttribute('fill', 'none');
    hitArea.setAttribute('stroke-linecap', 'round');
    hitArea.setAttribute('stroke-linejoin', 'round');
    hitArea.style.pointerEvents = 'stroke';
    hitArea.style.cursor = 'grab';

    // Create visible path
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', this.annotation.content.svgPath);
    path.setAttribute('stroke', this.annotation.content.strokeColor);
    path.setAttribute('stroke-width', this.annotation.content.strokeWidth);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.style.pointerEvents = 'none';  // Hit area handles pointer events

    svg.appendChild(hitArea);
    svg.appendChild(path);

    // Delete button - position it EXACTLY at the END of the stroke (last point)
    const points = this.annotation.content.points;
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const lastPoint = points[points.length - 1];

    // Calculate button position relative to the stroke's bounding box, not absolute position
    // This way it stays consistent even when the annotation is dragged
    const relativeLastX = lastPoint.x - minX;
    const relativeLastY = lastPoint.y - minY;

    // Button positioned at the relative last point position
    const btnLeft = relativeLastX - 12;  // Center 24px button
    const btnTop = relativeLastY - 12;   // Center 24px button

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'noted-drawing-delete-btn';
    deleteBtn.innerHTML = '✕';
    deleteBtn.title = 'Delete drawing';
    deleteBtn.style.cssText = `
      position: absolute;
      left: ${btnLeft}px;
      top: ${btnTop}px;
      width: 24px;
      height: 24px;
      border: none;
      background: rgba(255, 59, 48, 0.9);
      color: white;
      border-radius: 50%;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      display: none;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      pointer-events: auto;
      z-index: 10;
    `;

    // Container for SVG + delete button
    const container = document.createElement('div');
    container.className = 'noted-drawing-container';
    container.dataset.annotationId = this.annotation.id;  // For deletion
    container.style.position = 'absolute';
    container.style.left = `${this.annotation.position.x}px`;
    container.style.top = `${this.annotation.position.y}px`;
    container.style.pointerEvents = 'none';
    container.style.zIndex = '2147483646';

    container.appendChild(svg);
    container.appendChild(deleteBtn);

    // Show delete button on hover (only when NOT in draw mode)
    container.addEventListener('mouseenter', () => {
      const rootContainer = document.getElementById('noted-extension-root');
      if (rootContainer && rootContainer.getAttribute('data-draw-mode') === 'true') {
        return; // Don't show delete button in draw mode
      }
      deleteBtn.style.display = 'flex';
    });
    container.addEventListener('mouseleave', () => {
      deleteBtn.style.display = 'none';
    });

    // Attach event listeners (use hitArea for dragging)
    this.attachEventListeners(container, hitArea, deleteBtn);

    this.element = container;
    return container;
  }

  /**
   * Calculate bounding box from points
   * @param {Array} points - Array of {x, y} points
   * @returns {Object} Bounding box {x, y, width, height}
   */
  calculateBoundingBox(points) {
    if (!points || points.length === 0) {
      return { x: 0, y: 0, width: 100, height: 100 };
    }

    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    // Add padding
    const padding = 10;

    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2
    };
  }

  /**
   * Attach event listeners for dragging
   */
  attachEventListeners(container, hitArea, deleteBtn) {
    let dragStartMouseX, dragStartMouseY;
    let dragStartPosX, dragStartPosY;

    // Update cursor based on Alt key state
    const updateCursor = (e) => {
      const container = document.getElementById('noted-extension-root');
      if (container && container.getAttribute('data-draw-mode') === 'true') {
        // In draw mode, show grab cursor when Alt is held
        hitArea.style.cursor = e.altKey ? 'grab' : 'crosshair';
      } else {
        hitArea.style.cursor = 'grab';
      }
    };

    hitArea.addEventListener('mouseenter', (e) => {
      updateCursor(e);
    });

    hitArea.addEventListener('mousemove', (e) => {
      if (!this.isDragging) {
        updateCursor(e);
      }
    });

    hitArea.addEventListener('mousedown', (e) => {
      const container = document.getElementById('noted-extension-root');

      // In draw mode, only allow dragging if Alt key is pressed
      if (container && container.getAttribute('data-draw-mode') === 'true') {
        if (!e.altKey) {
          return; // Let the event pass through to canvas for drawing
        }
        // Alt is pressed - allow dragging even in draw mode
      }

      this.isDragging = true;
      hitArea.style.cursor = 'grabbing';

      dragStartMouseX = e.clientX;
      dragStartMouseY = e.clientY;
      dragStartPosX = this.annotation.position.x;
      dragStartPosY = this.annotation.position.y;

      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const deltaX = e.clientX - dragStartMouseX;
      const deltaY = e.clientY - dragStartMouseY;

      this.annotation.position.x = dragStartPosX + deltaX;
      this.annotation.position.y = dragStartPosY + deltaY;

      container.style.left = this.annotation.position.x + 'px';
      container.style.top = this.annotation.position.y + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        hitArea.style.cursor = 'grab';

        // If in draw mode, update the canvas history BEFORE saving
        const rootContainer = document.getElementById('noted-extension-root');
        if (rootContainer && rootContainer.getAttribute('data-draw-mode') === 'true') {
          const drawMode = this.manager.drawMode;
          if (drawMode && drawMode.drawingEngine) {
            // Find the history entry and update point positions
            const historyEntry = drawMode.drawingEngine.history.find(
              entry => entry.annotationId === this.annotation.id
            );
            if (historyEntry) {
              // Update all points by the delta
              const deltaX = this.annotation.position.x - dragStartPosX;
              const deltaY = this.annotation.position.y - dragStartPosY;

              historyEntry.points = historyEntry.points.map(p => ({
                x: p.x + deltaX,
                y: p.y + deltaY,
                timestamp: p.timestamp
              }));

              // Update the annotation's content points too
              this.annotation.content.points = historyEntry.points;

              // Redraw canvas with updated positions
              drawMode.drawingEngine.redrawFromHistory();

              // Set flag to skip storage reload - we've already updated the canvas
              this.manager.skipNextStorageReload = true;
            }
          }
        }

        // Now save the annotation (this triggers storage reload)
        this.saveAnnotation();
      }
    });

    // Delete button
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();

      // Delete the annotation
      this.manager.deleteAnnotation(this.annotation.id);

      // If in draw mode, also remove from canvas history
      const rootContainer = document.getElementById('noted-extension-root');
      if (rootContainer && rootContainer.getAttribute('data-draw-mode') === 'true') {
        // Find this annotation in the drawing engine history and remove it
        const drawMode = this.manager.drawMode;
        if (drawMode && drawMode.drawingEngine) {
          // Remove the history entry that matches this annotation ID
          const historyIndex = drawMode.drawingEngine.history.findIndex(
            entry => entry.annotationId === this.annotation.id
          );
          if (historyIndex !== -1) {
            drawMode.drawingEngine.history.splice(historyIndex, 1);
            // Adjust historyIndex if needed
            if (drawMode.drawingEngine.historyIndex >= historyIndex) {
              drawMode.drawingEngine.historyIndex--;
            }
            // Redraw canvas without the deleted stroke
            drawMode.drawingEngine.redrawFromHistory();
          }
        }
      }
    });
  }

  /**
   * Save annotation to storage
   */
  async saveAnnotation() {
    try {
      await this.manager.updateAnnotation(this.annotation);
    } catch (error) {
      console.error('Noted: Error saving drawing annotation:', error);
    }
  }
}

/**
 * Drawing Engine - Handles canvas drawing with smoothing
 */
class DrawingEngine {
  constructor() {
    this.points = [];
    this.isDrawing = false;
    this.strokeColor = '#FFF4CC';  // Default yellow
    this.strokeWidth = 4;
    this.canvas = null;
    this.ctx = null;
    this.drawPending = false;
    this.history = [];  // For undo/redo
    this.historyIndex = -1;
  }

  /**
   * Initialize canvas for drawing
   */
  initializeCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'noted-drawing-canvas';
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      cursor: crosshair;
      pointer-events: auto;
      z-index: 2147483648;
    `;

    this.ctx = this.canvas.getContext('2d');
    return this.canvas;
  }

  /**
   * Start drawing
   */
  startDrawing(x, y) {
    this.isDrawing = true;
    this.points = [{ x, y, timestamp: Date.now() }];
  }

  /**
   * Add point while drawing
   */
  addPoint(x, y) {
    if (!this.isDrawing) return;

    this.points.push({ x, y, timestamp: Date.now() });

    // Throttle: only redraw every 16ms (60fps)
    if (!this.drawPending) {
      this.drawPending = true;
      requestAnimationFrame(() => {
        this.drawSmoothedPath();
        this.drawPending = false;
      });
    }
  }

  /**
   * Draw smoothed path using Catmull-Rom spline
   */
  drawSmoothedPath() {
    if (this.points.length < 2) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // First, redraw all completed drawings from history
    this.redrawFromHistory();

    // Then draw the current stroke
    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.strokeWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.beginPath();
    this.ctx.moveTo(this.points[0].x, this.points[0].y);

    // Draw smooth curves through points
    for (let i = 0; i < this.points.length - 1; i++) {
      const p0 = this.points[Math.max(i - 1, 0)];
      const p1 = this.points[i];
      const p2 = this.points[i + 1];
      const p3 = this.points[Math.min(i + 2, this.points.length - 1)];

      // Draw smooth curve through p1 to p2 using p0 and p3 as control points
      const segments = 10;
      for (let t = 0; t <= segments; t++) {
        const u = t / segments;
        const point = this.catmullRom(p0, p1, p2, p3, u);
        this.ctx.lineTo(point.x, point.y);
      }
    }

    this.ctx.stroke();
  }

  /**
   * Catmull-Rom spline interpolation
   * @param {Object} p0, p1, p2, p3 - Control points
   * @param {number} t - Parameter (0 to 1)
   * @returns {Object} Interpolated point {x, y}
   */
  catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;

    const x = 0.5 * (
      (2 * p1.x) +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
    );

    const y = 0.5 * (
      (2 * p1.y) +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    );

    return { x, y };
  }

  /**
   * Finish drawing and convert to SVG
   * @returns {Object} Drawing data
   */
  finishDrawing() {
    this.isDrawing = false;

    if (this.points.length < 2) {
      return null;
    }

    // Convert to SVG path
    const svgPath = this.convertToSVG();

    // If we're in the middle of history (after undo), truncate the future
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    // Save to history for undo/redo
    this.history.push({
      points: [...this.points],
      svgPath,
      strokeColor: this.strokeColor,
      strokeWidth: this.strokeWidth
    });
    this.historyIndex = this.history.length - 1;

    const drawingData = {
      points: this.points,
      svgPath,
      strokeColor: this.strokeColor,
      strokeWidth: this.strokeWidth
    };

    // Clear points for next drawing
    this.points = [];

    return drawingData;
  }

  /**
   * Convert points to SVG path using Catmull-Rom splines
   * @returns {string} SVG path string
   */
  convertToSVG() {
    if (this.points.length < 2) return '';

    let path = `M ${this.points[0].x} ${this.points[0].y}`;

    for (let i = 0; i < this.points.length - 1; i++) {
      const p0 = this.points[Math.max(i - 1, 0)];
      const p1 = this.points[i];
      const p2 = this.points[i + 1];
      const p3 = this.points[Math.min(i + 2, this.points.length - 1)];

      // Create cubic bezier curve approximation of Catmull-Rom
      const cp1 = {
        x: p1.x + (p2.x - p0.x) / 6,
        y: p1.y + (p2.y - p0.y) / 6
      };
      const cp2 = {
        x: p2.x - (p3.x - p1.x) / 6,
        y: p2.y - (p3.y - p1.y) / 6
      };

      path += ` C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p2.x} ${p2.y}`;
    }

    return path;
  }

  /**
   * Undo last drawing
   */
  undo() {
    if (this.historyIndex >= 0) {
      this.historyIndex--;
      this.redrawFromHistory();
    }
  }

  /**
   * Redo drawing
   */
  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.redrawFromHistory();
    }
  }

  /**
   * Redraw canvas from history
   */
  redrawFromHistory() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Only redraw if there are strokes to show
    if (this.historyIndex < 0) {
      return; // Canvas is cleared, nothing to draw
    }

    for (let i = 0; i <= this.historyIndex; i++) {
      const drawing = this.history[i];
      this.ctx.strokeStyle = drawing.strokeColor;
      this.ctx.lineWidth = drawing.strokeWidth;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      this.ctx.beginPath();
      this.ctx.moveTo(drawing.points[0].x, drawing.points[0].y);

      for (let j = 0; j < drawing.points.length - 1; j++) {
        const p0 = drawing.points[Math.max(j - 1, 0)];
        const p1 = drawing.points[j];
        const p2 = drawing.points[j + 1];
        const p3 = drawing.points[Math.min(j + 2, drawing.points.length - 1)];

        const segments = 10;
        for (let t = 0; t <= segments; t++) {
          const u = t / segments;
          const point = this.catmullRom(p0, p1, p2, p3, u);
          this.ctx.lineTo(point.x, point.y);
        }
      }

      this.ctx.stroke();
    }
  }

  /**
   * Clear canvas
   */
  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

/**
 * Draw Mode Controller - Handles drawing annotation creation mode
 */
class DrawModeController {
  constructor(manager) {
    this.manager = manager;
    this.isActive = false;
    this.overlay = null;
    this.drawingEngine = new DrawingEngine();
    this.canvas = null;
    this.colorPalette = null;
    this.brushSelector = null;
    this.currentDrawings = [];  // Temporary storage during session
  }

  /**
   * Activate draw mode
   */
  activate() {
    if (this.isActive) return;

    console.log('Noted: Draw mode activated');
    this.isActive = true;

    // Disable all annotation interactions during draw mode
    const annotationContainer = document.getElementById('noted-extension-root');
    if (annotationContainer) {
      annotationContainer.setAttribute('data-draw-mode', 'true');
      // Disable pointer events on all child annotations
      const annotations = annotationContainer.querySelectorAll('.noted-text-annotation, .noted-drawing-container');
      annotations.forEach(el => {
        el.style.pointerEvents = 'none';
      });
      // Also disable the SVG hit areas specifically (they have inline pointer-events)
      const hitAreas = annotationContainer.querySelectorAll('.noted-drawing-annotation path[stroke="transparent"]');
      hitAreas.forEach(hitArea => {
        hitArea.style.pointerEvents = 'none';
      });
    }

    // Create canvas
    this.canvas = this.drawingEngine.initializeCanvas();
    document.body.appendChild(this.canvas);

    // Show UI
    this.showColorPalette();
    this.showBrushSelector();
    this.showInstruction();

    // Attach event listeners
    this.attachDrawingListeners();
    this.attachKeyboardListeners();
  }

  /**
   * Deactivate draw mode
   */
  async deactivate() {
    if (!this.isActive) return;

    console.log('Noted: Draw mode deactivated');
    this.isActive = false;

    // Save any current drawing BEFORE removing canvas
    if (this.drawingEngine.points.length > 0) {
      await this.saveCurrentDrawing();
    }

    // Clear drawing engine history (strokes are saved as annotations)
    this.drawingEngine.history = [];
    this.drawingEngine.historyIndex = -1;
    this.drawingEngine.points = [];

    // Remove canvas
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
    }

    // Re-enable annotation interactions
    const annotationContainer = document.getElementById('noted-extension-root');
    if (annotationContainer) {
      annotationContainer.removeAttribute('data-draw-mode');
      // Re-enable pointer events on all child annotations
      const annotations = annotationContainer.querySelectorAll('.noted-text-annotation, .noted-drawing-container');
      annotations.forEach(el => {
        el.style.pointerEvents = '';
      });
      // Re-enable the SVG hit areas
      const hitAreas = annotationContainer.querySelectorAll('.noted-drawing-annotation path[stroke="transparent"]');
      hitAreas.forEach(hitArea => {
        hitArea.style.pointerEvents = 'stroke';
      });
    }

    // Remove UI
    this.removeUI();
  }

  /**
   * Attach drawing event listeners
   */
  attachDrawingListeners() {
    this.canvas.addEventListener('mousedown', (e) => {
      this.drawingEngine.startDrawing(e.clientX, e.clientY);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      // Only add points when actually drawing
      if (this.drawingEngine.isDrawing) {
        this.drawingEngine.addPoint(e.clientX, e.clientY);
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      // Only save if we were actually drawing
      if (this.drawingEngine.isDrawing) {
        this.saveCurrentDrawing();
      }
    });

    // Also handle mouse leaving the canvas
    this.canvas.addEventListener('mouseleave', () => {
      if (this.drawingEngine.isDrawing) {
        this.saveCurrentDrawing();
      }
    });
  }

  /**
   * Attach keyboard listeners for undo/redo and ESC
   */
  attachKeyboardListeners() {
    this.keydownHandler = (e) => {
      // Change cursor to grab when Alt is held
      if (e.key === 'Alt') {
        if (this.canvas) {
          this.canvas.style.cursor = 'grab';
        }
      }

      // ESC to exit
      if (e.key === 'Escape') {
        this.deactivate();
        return;
      }

      // Undo: Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();

        // Get the annotation ID before undoing
        const currentEntry = this.drawingEngine.history[this.drawingEngine.historyIndex];
        if (currentEntry && currentEntry.annotationId) {
          // Delete the SVG annotation
          this.manager.deleteAnnotation(currentEntry.annotationId);
        }

        // Undo on canvas
        this.drawingEngine.undo();
        return;
      }

      // Redo: Ctrl+Y or Cmd+Shift+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        this.drawingEngine.redo();
        return;
      }
    };

    this.keyupHandler = (e) => {
      // Restore cursor when Alt is released
      if (e.key === 'Alt') {
        if (this.canvas) {
          this.canvas.style.cursor = 'crosshair';
        }
      }
    };

    document.addEventListener('keydown', this.keydownHandler);
    document.addEventListener('keyup', this.keyupHandler);
  }

  /**
   * Save current drawing as annotation
   */
  async saveCurrentDrawing() {
    const drawingData = this.drawingEngine.finishDrawing();

    if (!drawingData) return;

    // Calculate position (top-left of bounding box)
    const xs = drawingData.points.map(p => p.x);
    const ys = drawingData.points.map(p => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);

    const annotation = {
      id: this.manager.generateId(),
      type: 'drawing',
      url: window.location.href,
      position: {
        x: minX - 10,
        y: minY - 10
      },
      content: {
        svgPath: drawingData.svgPath,
        strokeColor: drawingData.strokeColor,
        strokeWidth: drawingData.strokeWidth,
        points: drawingData.points
      },
      createdAt: Date.now(),
      modifiedAt: Date.now()
    };

    console.log('Noted: Saving drawing annotation', annotation.id);
    await this.manager.addAnnotation(annotation, false);  // No auto-focus for drawings
    console.log('Noted: Drawing annotation saved and rendered', annotation.id);

    // Store the annotation ID with the history entry for undo/redo
    const lastHistoryEntry = this.drawingEngine.history[this.drawingEngine.historyIndex];
    if (lastHistoryEntry) {
      lastHistoryEntry.annotationId = annotation.id;
    }

    // Don't clear canvas - keep strokes visible for undo
    // They will be cleared when exiting draw mode
  }

  /**
   * Show color palette
   */
  showColorPalette() {
    const colors = [
      { name: 'Yellow', hex: '#FFF4CC' },
      { name: 'Orange', hex: '#FFCC99' },
      { name: 'Pink', hex: '#FFB3D9' },
      { name: 'Green', hex: '#B3E6B3' },
      { name: 'Blue', hex: '#99CCFF' },
      { name: 'Purple', hex: '#D9B3E6' },
      { name: 'Gray', hex: '#CCCCCC' },
      { name: 'White', hex: '#FFFFFF' }
    ];

    this.colorPalette = document.createElement('div');
    this.colorPalette.className = 'noted-draw-color-palette';
    this.colorPalette.innerHTML = '<div class="noted-draw-ui-label">Color:</div>';

    const colorContainer = document.createElement('div');
    colorContainer.style.display = 'flex';
    colorContainer.style.gap = '6px';

    colors.forEach(color => {
      const colorOption = document.createElement('div');
      colorOption.className = 'noted-draw-color-option';
      colorOption.style.background = color.hex;
      colorOption.title = color.name;

      if (color.hex === this.drawingEngine.strokeColor) {
        colorOption.classList.add('selected');
      }

      colorOption.addEventListener('click', () => {
        this.drawingEngine.strokeColor = color.hex;
        document.querySelectorAll('.noted-draw-color-option').forEach(el => {
          el.classList.remove('selected');
        });
        colorOption.classList.add('selected');
      });

      colorContainer.appendChild(colorOption);
    });

    this.colorPalette.appendChild(colorContainer);
    document.body.appendChild(this.colorPalette);
  }

  /**
   * Show brush size selector
   */
  showBrushSelector() {
    const sizes = [2, 4, 6, 8, 12];

    this.brushSelector = document.createElement('div');
    this.brushSelector.className = 'noted-draw-brush-selector';
    this.brushSelector.innerHTML = '<div class="noted-draw-ui-label">Brush Size:</div>';

    const sizeContainer = document.createElement('div');
    sizeContainer.style.display = 'flex';
    sizeContainer.style.gap = '6px';

    sizes.forEach(size => {
      const sizeOption = document.createElement('div');
      sizeOption.className = 'noted-draw-size-option';
      sizeOption.textContent = size;
      sizeOption.title = `${size}px`;

      if (size === this.drawingEngine.strokeWidth) {
        sizeOption.classList.add('selected');
      }

      sizeOption.addEventListener('click', () => {
        this.drawingEngine.strokeWidth = size;
        document.querySelectorAll('.noted-draw-size-option').forEach(el => {
          el.classList.remove('selected');
        });
        sizeOption.classList.add('selected');
      });

      sizeContainer.appendChild(sizeOption);
    });

    this.brushSelector.appendChild(sizeContainer);
    document.body.appendChild(this.brushSelector);
  }

  /**
   * Show instruction banner
   */
  showInstruction() {
    const instruction = document.createElement('div');
    instruction.className = 'noted-instruction';
    instruction.textContent = 'Draw on the page • Alt+drag to move strokes • Ctrl+Z to undo • ESC to finish';
    document.body.appendChild(instruction);
  }

  /**
   * Remove all UI elements
   */
  removeUI() {
    if (this.colorPalette) {
      this.colorPalette.remove();
      this.colorPalette = null;
    }

    if (this.brushSelector) {
      this.brushSelector.remove();
      this.brushSelector = null;
    }

    const instruction = document.querySelector('.noted-instruction');
    if (instruction) {
      instruction.remove();
    }

    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }

    if (this.keyupHandler) {
      document.removeEventListener('keyup', this.keyupHandler);
      this.keyupHandler = null;
    }
  }
}

// Make available globally
window.DrawingAnnotation = DrawingAnnotation;
window.DrawingEngine = DrawingEngine;
window.DrawModeController = DrawModeController;
