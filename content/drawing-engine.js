// Drawing Engine - Handles freehand drawing annotations
// Manages canvas drawing, smoothing, SVG conversion, and interaction

class DrawingAnnotation {
  constructor(annotation, manager) {
    this.annotation = annotation;
    this.manager = manager;
    this.element = null;
    this.svgElement = null;
    this.pathElement = null;
    this.hitAreaElement = null;
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
    this.attachEventListeners(container, svg, hitArea, path, deleteBtn);

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
  attachEventListeners(container, svgElement, hitArea, pathElement, deleteBtn) {
    this.element = container;
    this.svgElement = svgElement;
    this.pathElement = pathElement;
    this.hitAreaElement = hitArea;

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

    document.addEventListener('mouseup', async () => {
      if (this.isDragging) {
        this.isDragging = false;
        hitArea.style.cursor = 'grab';

        const deltaX = this.annotation.position.x - dragStartPosX;
        const deltaY = this.annotation.position.y - dragStartPosY;

        const drawMode = this.manager.drawMode;
        const drawingEngine = drawMode?.drawingEngine;
        let historyEntry = null;

        if (drawingEngine) {
          historyEntry = drawingEngine.history.find(
            entry => entry.annotationId === this.annotation.id
          ) || null;
        }

        const sourcePoints = historyEntry?.points || this.annotation.content?.points || [];
        let updatedPoints = null;

        if ((deltaX !== 0 || deltaY !== 0) && sourcePoints.length > 0) {
          updatedPoints = sourcePoints.map(point => ({
            x: point.x + deltaX,
            y: point.y + deltaY,
            timestamp: point.timestamp
          }));

          if (historyEntry) {
            historyEntry.points = updatedPoints;
          }

          this.annotation.content.points = updatedPoints;

          const updatedPath = drawingEngine
            ? drawingEngine.convertPointsToSVG(updatedPoints)
            : (() => {
                const tempEngine = new DrawingEngine();
                tempEngine.points = updatedPoints;
                return tempEngine.convertToSVG();
              })();

          if (historyEntry) {
            historyEntry.svgPath = updatedPath;
          }

          this.annotation.content.svgPath = updatedPath;

          if (pathElement) {
            pathElement.setAttribute('d', updatedPath);
          }
          if (hitArea) {
            hitArea.setAttribute('d', updatedPath);
          }

          const bbox = this.calculateBoundingBox(updatedPoints);
          if (svgElement) {
            svgElement.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
            svgElement.setAttribute('width', bbox.width);
            svgElement.setAttribute('height', bbox.height);
          }

          if (deleteBtn) {
            const xs = updatedPoints.map(p => p.x);
            const ys = updatedPoints.map(p => p.y);
            const minX = Math.min(...xs);
            const minY = Math.min(...ys);
            const lastPoint = updatedPoints[updatedPoints.length - 1];
            deleteBtn.style.left = `${lastPoint.x - minX - 12}px`;
            deleteBtn.style.top = `${lastPoint.y - minY - 12}px`;
          }

          if (historyEntry && drawingEngine) {
            drawingEngine.redrawFromHistory();
          }

          this.manager.skipNextStorageReload = true;
        } else if (historyEntry && drawingEngine) {
          drawingEngine.redrawFromHistory();
        }

        if (deltaX !== 0 || deltaY !== 0) {
          if (this.annotation.anchor) {
            this.annotation.anchor.strategy = 'page';

            if (typeof this.annotation.anchor.pageX === 'number' &&
                typeof this.annotation.anchor.pageY === 'number') {
              this.annotation.anchor.pageX += deltaX;
              this.annotation.anchor.pageY += deltaY;
            } else {
              this.annotation.anchor.pageX = this.annotation.position.x;
              this.annotation.anchor.pageY = this.annotation.position.y;
            }
          }
        }

        this.annotation.modifiedAt = Date.now();

        // Now save the annotation (this triggers storage reload)
        await this.saveAnnotation();
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
    this.drawStartScrollX = 0;
    this.drawStartScrollY = 0;
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
    this.drawStartScrollX = window.pageXOffset || document.documentElement.scrollLeft;
    this.drawStartScrollY = window.pageYOffset || document.documentElement.scrollTop;
    this.points = [{
      x,
      y,
      timestamp: Date.now(),
      scrollX: this.drawStartScrollX,
      scrollY: this.drawStartScrollY
    }];
  }

  /**
   * Add point while drawing
   */
  addPoint(x, y) {
    if (!this.isDrawing) return;

    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    this.points.push({
      x,
      y,
      timestamp: Date.now(),
      scrollX,
      scrollY
    });

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

    // Convert stored viewport points to page coordinates
    const pagePoints = this.points.map(point => {
      const pointScrollX = point.scrollX !== undefined ? point.scrollX : this.drawStartScrollX;
      const pointScrollY = point.scrollY !== undefined ? point.scrollY : this.drawStartScrollY;
      return {
        x: point.x + pointScrollX,
        y: point.y + pointScrollY,
        timestamp: point.timestamp
      };
    });

    // Convert to SVG path using page coordinates
    const svgPath = this.convertPointsToSVG(pagePoints);

    // If we're in the middle of history (after undo), truncate the future
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    // Save to history for undo/redo
    this.history.push({
      points: pagePoints,
      svgPath,
      strokeColor: this.strokeColor,
      strokeWidth: this.strokeWidth
    });
    this.historyIndex = this.history.length - 1;

    const drawingData = {
      points: pagePoints,
      svgPath,
      strokeColor: this.strokeColor,
      strokeWidth: this.strokeWidth
    };

    // Clear points for next drawing
    this.points = [];

    return drawingData;
  }

  /**
   * Convert an arbitrary set of points into an SVG path
   * @param {Array} points - Array of {x, y}
   * @returns {string} SVG path string
   */
  convertPointsToSVG(points) {
    if (!points || points.length < 2) return '';

    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(i + 2, points.length - 1)];

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
   * Convert points to SVG path using Catmull-Rom splines
   * @returns {string} SVG path string
   */
  convertToSVG() {
    const points = this.points.map(point => {
      const pointScrollX = point.scrollX !== undefined ? point.scrollX : (this.drawStartScrollX || 0);
      const pointScrollY = point.scrollY !== undefined ? point.scrollY : (this.drawStartScrollY || 0);
      return {
        x: point.x + pointScrollX,
        y: point.y + pointScrollY
      };
    });
    return this.convertPointsToSVG(points);
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

    const currentScrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;

    for (let i = 0; i <= this.historyIndex; i++) {
      const drawing = this.history[i];
      this.ctx.strokeStyle = drawing.strokeColor;
      this.ctx.lineWidth = drawing.strokeWidth;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      const viewportPoints = drawing.points.map(point => ({
        x: point.x - currentScrollX,
        y: point.y - currentScrollY
      }));

      if (viewportPoints.length < 2) {
        continue;
      }

      this.ctx.beginPath();
      this.ctx.moveTo(viewportPoints[0].x, viewportPoints[0].y);

      for (let j = 0; j < viewportPoints.length - 1; j++) {
        const p0 = viewportPoints[Math.max(j - 1, 0)];
        const p1 = viewportPoints[j];
        const p2 = viewportPoints[j + 1];
        const p3 = viewportPoints[Math.min(j + 2, viewportPoints.length - 1)];

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
    this.scrollHandler = null;
    this.colorContainer = null;
    this.sizeContainer = null;
    this.colorOptions = null;
    this.sizeOptions = null;
    this.sizeCircles = null;
    this.sectionLabels = null;
    this.panelSections = null;
    this.panelAspectRatio = 1.35;
  }

  /**
   * Activate draw mode
   */
  async activate() {
    if (this.isActive) return;

    // Check for infinite scroll
    if (AnchorEngine.isInfiniteScrollPage()) {
      const shouldContinue = await this.manager.showInfiniteScrollWarning();
      if (!shouldContinue) {
        console.log('Noted: Draw mode cancelled (infinite scroll warning)');
        return;
      }
    }

    console.log('Noted: Draw mode activated', {
      existingHistory: this.drawingEngine.history.length,
      skipNextStorageReload: this.manager.skipNextStorageReload
    });
    this.isActive = true;

    // Disable all annotation interactions during draw mode
    this.setAnnotationPointerEvents(false);

    // Create canvas
    this.canvas = this.drawingEngine.initializeCanvas();
    document.body.appendChild(this.canvas);

    // Show UI
    this.showControlPanel();
    this.showInstruction();

    // Attach event listeners
    this.attachDrawingListeners();
    this.attachKeyboardListeners();

    this.scrollHandler = () => {
      if (!this.canvas) return;
      this.drawingEngine.redrawFromHistory();

      if (this.drawingEngine.isDrawing) {
        this.drawingEngine.drawSmoothedPath();
      }
    };

    window.addEventListener('scroll', this.scrollHandler, { passive: true });
    window.addEventListener('resize', this.scrollHandler);
  }

  /**
   * Deactivate draw mode
   */
  async deactivate() {
    if (!this.isActive) return;

    console.log('Noted: Draw mode deactivated', {
      historyLength: this.drawingEngine.history.length,
      historyIndex: this.drawingEngine.historyIndex,
      skipNextStorageReload: this.manager.skipNextStorageReload
    });
    this.isActive = false;

    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
      window.removeEventListener('resize', this.scrollHandler);
      this.scrollHandler = null;
    }

    // Save any current drawing BEFORE removing canvas
    if (this.drawingEngine.points.length > 0) {
      await this.saveCurrentDrawing();
    }

    // Clear drawing engine history (strokes are saved as annotations)
    console.log('Noted: Clearing canvas history');
    this.drawingEngine.history = [];
    this.drawingEngine.historyIndex = -1;
    this.drawingEngine.points = [];

    // Remove canvas
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
    }

    // Re-enable annotation interactions
    this.setAnnotationPointerEvents(true);

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

    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    const topLeftPageX = minX - 10;
    const topLeftPageY = minY - 10;
    const topLeftViewportX = topLeftPageX - scrollX;
    const topLeftViewportY = topLeftPageY - scrollY;

    // Generate anchor data for robust positioning
    const anchor = AnchorEngine.generateAnchor(
      topLeftViewportX,
      topLeftViewportY,
      this.manager.viewportWidth,
      this.manager.viewportHeight
    );

    // Force page-based anchor aligned with annotation origin
    anchor.strategy = 'page';
    anchor.pageX = topLeftPageX;
    anchor.pageY = topLeftPageY;
    anchor.offsetX = 0;
    anchor.offsetY = 0;
    delete anchor.elementPageX;
    delete anchor.elementPageY;

    // Generate page fingerprint for change detection
    const pageFingerprint = AnchorEngine.generatePageFingerprint();

    const annotation = {
      id: this.manager.generateId(),
      type: 'drawing',
      url: this.manager.currentURL,

      // Anchoring data (Phase 4)
      anchor: anchor,
      pageFingerprint: pageFingerprint,

      // Position in page coordinates (container is position: absolute)
      position: {
        x: topLeftPageX,
        y: topLeftPageY
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

    // Skip storage reload to prevent canvas/SVG desync
    this.manager.skipNextStorageReload = true;

    await this.manager.addAnnotation(annotation, false);  // No auto-focus for drawings
    console.log('Noted: Drawing annotation saved and rendered', annotation.id);

    // Ensure newly rendered annotations remain transparent to pointer events during draw mode
    this.setAnnotationPointerEvents(false);

    // Store the annotation ID with the history entry for undo/redo
    const lastHistoryEntry = this.drawingEngine.history[this.drawingEngine.historyIndex];
    if (lastHistoryEntry) {
      lastHistoryEntry.annotationId = annotation.id;
    }

    // Don't clear canvas - keep strokes visible for undo
    // They will be cleared when exiting draw mode
  }

  /**
   * Show combined control panel with color palette and brush size selector
   */
  showControlPanel() {
    // Create panel container
    this.controlPanel = document.createElement('div');
    this.controlPanel.className = 'noted-draw-control-panel';

    // Create drag handle at top
    const dragHandle = document.createElement('div');
    dragHandle.className = 'noted-draw-panel-handle';
    dragHandle.innerHTML = '<div class="noted-draw-handle-lines">≡</div>';
    this.controlPanel.appendChild(dragHandle);

    // Add colors section
    const colorsSection = document.createElement('div');
    colorsSection.className = 'noted-draw-section';

    const colorLabel = document.createElement('div');
    colorLabel.className = 'noted-draw-ui-label';
    colorLabel.textContent = 'Color:';
    colorsSection.appendChild(colorLabel);

    const colorContainer = document.createElement('div');
    colorContainer.className = 'noted-draw-color-grid';

    const colors = [
      { name: 'Red', hex: '#FFB3B3' },
      { name: 'Yellow', hex: '#FFF4CC' },
      { name: 'Orange', hex: '#FFCC99' },
      { name: 'Pink', hex: '#FFB3D9' },
      { name: 'Green', hex: '#B3E6B3' },
      { name: 'Blue', hex: '#99CCFF' },
      { name: 'Purple', hex: '#D9B3E6' },
      { name: 'Gray', hex: '#CCCCCC' },
      { name: 'Black', hex: '#000000' },
      { name: 'Brown', hex: '#D2B48C' },
      { name: 'Turquoise', hex: '#AFEEEE' },
      { name: 'White', hex: '#FFFFFF' }
    ];

    colors.forEach(color => {
      const colorOption = document.createElement('div');
      colorOption.className = 'noted-draw-color-option';
      colorOption.style.background = color.hex;
      colorOption.title = color.name;
      colorOption.dataset.baseSize = '32';

      // Add border for white color
      if (color.hex === '#FFFFFF') {
        colorOption.style.border = '2px solid #E0E0E0';
      }

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

    colorsSection.appendChild(colorContainer);
    this.controlPanel.appendChild(colorsSection);

    // Add divider
    const divider = document.createElement('div');
    divider.className = 'noted-draw-divider';
    this.controlPanel.appendChild(divider);

    // Add brush size section
    const brushSection = document.createElement('div');
    brushSection.className = 'noted-draw-section';

    const brushLabel = document.createElement('div');
    brushLabel.className = 'noted-draw-ui-label';
    brushLabel.textContent = 'Brush Size:';
    brushSection.appendChild(brushLabel);

    const sizeContainer = document.createElement('div');
    sizeContainer.className = 'noted-draw-size-grid';

    const sizes = [
      { value: 2, displaySize: 6 },
      { value: 4, displaySize: 10 },
      { value: 6, displaySize: 14 },
      { value: 8, displaySize: 18 },
      { value: 12, displaySize: 24 }
    ];

    sizes.forEach(size => {
      const sizeOption = document.createElement('div');
      sizeOption.className = 'noted-draw-size-option';
      sizeOption.title = `${size.value}px`;
      // Create a solid black circle inside
      const circle = document.createElement('div');
      circle.className = 'noted-draw-size-circle';
      circle.style.width = `${size.displaySize}px`;
      circle.style.height = `${size.displaySize}px`;
      circle.dataset.baseSize = size.displaySize.toString();
      sizeOption.appendChild(circle);

      if (size.value === this.drawingEngine.strokeWidth) {
        sizeOption.classList.add('selected');
      }

      sizeOption.addEventListener('click', () => {
        this.drawingEngine.strokeWidth = size.value;
        document.querySelectorAll('.noted-draw-size-option').forEach(el => {
          el.classList.remove('selected');
        });
        sizeOption.classList.add('selected');
      });

      sizeContainer.appendChild(sizeOption);
    });

    brushSection.appendChild(sizeContainer);
    this.controlPanel.appendChild(brushSection);

    // Resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'noted-draw-resize-handle';
    this.controlPanel.appendChild(resizeHandle);

    // Add to document
    document.body.appendChild(this.controlPanel);

    this.colorContainer = colorContainer;
    this.sizeContainer = sizeContainer;
    this.colorOptions = Array.from(colorContainer.querySelectorAll('.noted-draw-color-option'));
    this.sizeOptions = Array.from(sizeContainer.querySelectorAll('.noted-draw-size-option'));
    this.sizeCircles = Array.from(sizeContainer.querySelectorAll('.noted-draw-size-circle'));
    this.sectionLabels = Array.from(this.controlPanel.querySelectorAll('.noted-draw-ui-label'));
    this.panelSections = Array.from(this.controlPanel.querySelectorAll('.noted-draw-section'));

    // Make panel draggable and resizable
    this.makePanelDraggable(dragHandle);
    // Resize currently disabled; remove handle for now
    resizeHandle.style.display = 'none';

    const rect = this.controlPanel.getBoundingClientRect();
    if (rect.height > 0) {
      this.panelAspectRatio = rect.width / rect.height;
    }
    const initialWidth = rect.width;
    this.applyPanelScale(initialWidth);
  }

  /**
   * Make control panel draggable by the handle
   */
  makePanelDraggable(handle) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    handle.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = this.controlPanel.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;

      handle.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      this.controlPanel.style.left = `${startLeft + deltaX}px`;
      this.controlPanel.style.top = `${startTop + deltaY}px`;
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        handle.style.cursor = 'grab';
      }
    });

    // Change cursor on hover
    handle.addEventListener('mouseenter', () => {
      handle.style.cursor = 'grab';
    });
  }

  setAnnotationPointerEvents(enable) {
    const annotationContainer = document.getElementById('noted-extension-root');
    if (!annotationContainer) return;

    if (enable) {
      annotationContainer.removeAttribute('data-draw-mode');
    } else {
      annotationContainer.setAttribute('data-draw-mode', 'true');
    }

    const annotations = annotationContainer.querySelectorAll('.noted-text-annotation, .noted-drawing-container');
    annotations.forEach(el => {
      el.style.pointerEvents = enable ? '' : 'none';
    });

    const hitAreas = annotationContainer.querySelectorAll('.noted-drawing-annotation path[stroke="transparent"]');
    hitAreas.forEach(hitArea => {
      hitArea.style.pointerEvents = enable ? 'stroke' : 'none';
    });
  }

  /**
   * Make control panel resizable from the bottom-right handle
   */
  makePanelResizable(handle) {
    let isResizing = false;
    let startX, startY, startWidth, startHeight;
    const minWidth = 220;
    const maxWidth = 420;
    const minHeight = 200;
    const maxHeight = 420;

    handle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = this.controlPanel.getBoundingClientRect();
      startWidth = rect.width;
      startHeight = rect.height;
      if (rect.height > 0) {
        this.panelAspectRatio = rect.width / rect.height;
      }

      document.body.style.userSelect = 'none';
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      const ratio = this.panelAspectRatio || (startWidth / Math.max(startHeight, 1));
      const widthLowerBound = Math.max(minWidth, minHeight * ratio);
      const widthUpperBound = Math.min(maxWidth, maxHeight * ratio);

      const widthFromWidth = startWidth + deltaX;
      const widthFromHeight = (startHeight + deltaY) * ratio;
      const dominant = Math.abs(deltaY) > Math.abs(deltaX) ? widthFromHeight : widthFromWidth;

      const clamp = (min, value, max) => Math.max(min, Math.min(max, value));
      const newWidth = clamp(widthLowerBound, dominant, widthUpperBound);
      const newHeight = clamp(minHeight, newWidth / ratio, maxHeight);

      this.controlPanel.style.width = `${newWidth}px`;
      this.controlPanel.style.height = `${newHeight}px`;
      this.applyPanelScale(newWidth);
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.userSelect = '';
        const rect = this.controlPanel.getBoundingClientRect();
        if (rect.height > 0) {
          this.panelAspectRatio = rect.width / rect.height;
        }
        this.applyPanelScale(rect.width);
      }
    });
  }

  /**
   * Apply responsive sizing for panel contents based on width
   * @param {number} width - Current panel width
   */
  applyPanelScale(width) {
    if (!this.controlPanel) return;

    const baseWidth = 260;
    const minScale = 0.8;
    const maxScale = 1.4;
    const clamp = (min, value, max) => Math.max(min, Math.min(max, value));
    const scale = clamp(minScale, width / baseWidth, maxScale);

    const colorColumns = width < 240 ? 5 : 6;
    const colorSize = clamp(24, 32 * scale, 48);
    const colorGap = clamp(6, 8 * scale, 14);
    const sectionPadding = clamp(10, 12 * scale, 18);
    const labelSize = clamp(10, 12 * scale, 16);
    const labelSpacing = clamp(6, 8 * scale, 12);
    const sizeGap = clamp(8, 10 * scale, 16);
    const outerCircle = clamp(32, 40 * scale, 60);
    const innerBase = clamp(12, 18 * scale, 28);

    this.controlPanel.style.setProperty('--panel-scale', scale.toFixed(3));
    this.controlPanel.style.setProperty('--panel-color-columns', `${colorColumns}`);
    this.controlPanel.style.setProperty('--panel-color-size', `${colorSize}px`);
    this.controlPanel.style.setProperty('--panel-color-gap', `${colorGap}px`);
    this.controlPanel.style.setProperty('--panel-section-padding', `${sectionPadding}px`);
    this.controlPanel.style.setProperty('--panel-label-size', `${labelSize}px`);
    this.controlPanel.style.setProperty('--panel-label-spacing', `${labelSpacing}px`);
    this.controlPanel.style.setProperty('--panel-size-gap', `${sizeGap}px`);
    this.controlPanel.style.setProperty('--panel-size-circle', `${outerCircle}px`);
    this.controlPanel.style.setProperty('--panel-size-circle-inner', `${innerBase}px`);

    if (this.sizeCircles) {
      const maxInner = innerBase * 1.6;
      const minInner = innerBase * 0.6;
      this.sizeCircles.forEach(circle => {
        const base = parseFloat(circle.dataset.baseSize || '12');
        const size = clamp(minInner, base * (scale / 1.5 + 0.3), maxInner);
        circle.style.width = `${size}px`;
        circle.style.height = `${size}px`;
      });
    }
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
    // Remove control panel
    if (this.controlPanel) {
      this.controlPanel.remove();
      this.controlPanel = null;
      this.colorContainer = null;
      this.sizeContainer = null;
      this.colorOptions = null;
      this.sizeOptions = null;
      this.sizeCircles = null;
      this.sectionLabels = null;
      this.panelSections = null;
      this.panelAspectRatio = 1.35;
    }

    // Remove instruction banner
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
