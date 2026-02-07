// Export Engine - Generates layered SVG from annotations
// Phase 6: Loaded as content script (no ES module exports)

class ExportEngine {
  /**
   * Export annotations to SVG with screenshot background.
   * @param {Array} annotations - Annotations to export
   * @param {Object} options - { format: 'blob'|'string' }
   * @returns {Blob|string} SVG output
   */
  async exportToSVG(annotations, options = {}) {
    const screenshot = await this.captureScreenshot();

    const width = window.innerWidth;
    const height = window.innerHeight;

    const svg = this.createSVGContainer(width, height);

    if (screenshot) {
      this.addBackgroundImage(svg, screenshot, width, height);
    }

    const annotationGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    annotationGroup.setAttribute('id', 'annotations-layer');

    const scrollX = window.pageXOffset || 0;
    const scrollY = window.pageYOffset || 0;

    annotations.forEach(annotation => {
      if (annotation.type === 'text') {
        this.addTextAnnotation(annotationGroup, annotation, scrollX, scrollY);
      } else if (annotation.type === 'drawing') {
        this.addDrawingAnnotation(annotationGroup, annotation, scrollX, scrollY);
      }
    });

    svg.appendChild(annotationGroup);

    if (options.format === 'blob') {
      return this.svgToBlob(svg);
    }

    return new XMLSerializer().serializeToString(svg);
  }

  createSVGContainer(width, height) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    const metadata = document.createElementNS('http://www.w3.org/2000/svg', 'metadata');
    metadata.textContent = JSON.stringify({
      generator: 'Noted Chrome Extension',
      url: window.location.href,
      exported: new Date().toISOString()
    });
    svg.appendChild(metadata);

    return svg;
  }

  addBackgroundImage(svg, screenshot, width, height) {
    const lockedGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    lockedGroup.setAttribute('id', 'background-layer');
    // Hint for SVG editors (Inkscape/Figma) to treat as locked
    lockedGroup.setAttributeNS('http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd', 'sodipodi:insensitive', 'true');

    const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    image.setAttribute('href', screenshot);
    image.setAttribute('x', '0');
    image.setAttribute('y', '0');
    image.setAttribute('width', width);
    image.setAttribute('height', height);
    image.setAttribute('id', 'background-screenshot');

    lockedGroup.appendChild(image);
    svg.appendChild(lockedGroup);
  }

  /**
   * Add text annotation using native SVG elements (not foreignObject).
   * Native SVG rect/text is much better supported in Figma than foreignObject.
   */
  addTextAnnotation(group, annotation, scrollX, scrollY) {
    const x = annotation.position.x - scrollX;
    const y = annotation.position.y - scrollY;
    const w = annotation.position.width || 200;
    const h = annotation.position.height || 100;

    // Background rectangle
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', w);
    rect.setAttribute('height', h);
    rect.setAttribute('rx', '8');
    rect.setAttribute('fill', annotation.content.backgroundColor || '#FFEB3B');
    rect.setAttribute('fill-opacity', '0.9');
    group.appendChild(rect);

    // Text content - extract plain text from HTML
    const plainText = this.extractPlainText(annotation.content.text || '');
    if (!plainText) return;

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x + 12);
    text.setAttribute('y', y + 24);
    text.setAttribute('font-family', 'system-ui, -apple-system, sans-serif');
    text.setAttribute('font-size', annotation.content.fontSize || '14');
    text.setAttribute('fill', '#000000');

    // Word-wrap into tspan lines
    const words = plainText.split(' ');
    let line = '';
    let lineY = y + 24;
    const maxWidth = w - 24;
    const charWidth = (annotation.content.fontSize || 14) * 0.5;

    words.forEach(word => {
      const testLine = line ? `${line} ${word}` : word;
      if (testLine.length * charWidth > maxWidth && line) {
        const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        tspan.setAttribute('x', x + 12);
        tspan.setAttribute('y', lineY);
        tspan.textContent = line;
        text.appendChild(tspan);
        line = word;
        lineY += 20;
      } else {
        line = testLine;
      }
    });

    if (line) {
      const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      tspan.setAttribute('x', x + 12);
      tspan.setAttribute('y', lineY);
      tspan.textContent = line;
      text.appendChild(tspan);
    }

    group.appendChild(text);
  }

  addDrawingAnnotation(group, annotation, scrollX, scrollY) {
    if (!annotation.content.svgPath) return;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('transform', `translate(${-scrollX}, ${-scrollY})`);
    path.setAttribute('d', annotation.content.svgPath);
    path.setAttribute('stroke', annotation.content.strokeColor || '#000000');
    path.setAttribute('stroke-width', annotation.content.strokeWidth || 4);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');

    group.appendChild(path);
  }

  /**
   * Capture screenshot via background service worker.
   * chrome.tabs.captureVisibleTab() is not available in content scripts.
   */
  async captureScreenshot() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CAPTURE_SCREENSHOT',
        format: 'png'
      });
      return response?.success ? response.dataUrl : null;
    } catch (error) {
      console.error('Noted: Screenshot capture failed:', error);
      return null;
    }
  }

  extractPlainText(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent || div.innerText || '').trim();
  }

  svgToBlob(svg) {
    const svgString = new XMLSerializer().serializeToString(svg);
    return new Blob([svgString], { type: 'image/svg+xml' });
  }
}

// Make available globally (content script context, not ES module)
const exportEngine = new ExportEngine();
