// Text Engine - Handles text annotation creation and interaction
// Manages sticky note UI, editing, dragging, and resizing

class TextAnnotation {
  constructor(annotation, manager) {
    this.annotation = annotation;
    this.manager = manager;
    this.element = null;
    this.isDragging = false;
    this.isResizing = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.resizeStartWidth = 0;
    this.resizeStartHeight = 0;
    this.resizeStartX = 0;
    this.resizeStartY = 0;
  }

  /**
   * Render the text annotation
   * @returns {HTMLElement} The annotation element
   */
  render() {
    const container = document.createElement('div');
    container.className = 'noted-text-annotation';
    container.dataset.annotationId = this.annotation.id;

    // Position
    container.style.position = 'absolute';
    container.style.left = `${this.annotation.position.x}px`;
    container.style.top = `${this.annotation.position.y}px`;
    container.style.width = `${this.annotation.position.width}px`;
    container.style.minHeight = `${this.annotation.position.height}px`;

    // Styling
    container.style.background = this.annotation.content.backgroundColor || '#FFF4CC';
    container.style.pointerEvents = 'auto';
    container.style.cursor = 'move';

    // Content area
    const content = document.createElement('div');
    content.className = 'noted-annotation-content';
    content.contentEditable = true;
    content.innerHTML = this.annotation.content.text || '';

    // Apply saved font size if exists
    if (this.annotation.content.fontSize) {
      content.style.fontSize = this.annotation.content.fontSize + 'px';
    }

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'noted-delete-btn';
    deleteBtn.innerHTML = '✕';
    deleteBtn.title = 'Delete annotation';

    // Toolbar (with delete button)
    const toolbar = this.createToolbar(deleteBtn);

    // Resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'noted-resize-handle';

    // Assemble
    container.appendChild(toolbar);
    container.appendChild(content);
    container.appendChild(resizeHandle);

    // Attach event listeners
    this.attachEventListeners(container, content, resizeHandle, deleteBtn);

    this.element = container;
    return container;
  }

  /**
   * Create formatting toolbar
   * @param {HTMLElement} deleteBtn - Delete button element
   * @returns {HTMLElement} Toolbar element
   */
  createToolbar(deleteBtn) {
    const toolbar = document.createElement('div');
    toolbar.className = 'noted-toolbar';

    // Color picker button
    const colorBtn = document.createElement('button');
    colorBtn.className = 'noted-toolbar-btn';
    colorBtn.innerHTML = '🎨';
    colorBtn.title = 'Change color';
    colorBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showColorPicker(e);
    });

    // Bold button
    const boldBtn = document.createElement('button');
    boldBtn.className = 'noted-toolbar-btn';
    boldBtn.innerHTML = '<strong>B</strong>';
    boldBtn.title = 'Bold';
    boldBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.execCommand('bold');
    });

    // Font size increase button
    const fontIncreaseBtn = document.createElement('button');
    fontIncreaseBtn.className = 'noted-toolbar-btn';
    fontIncreaseBtn.innerHTML = '<span style="font-size: 16px; font-weight: 600;">H</span>';
    fontIncreaseBtn.title = 'Increase font size';
    fontIncreaseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.changeFontSize('increase');
    });

    // Font size decrease button
    const fontDecreaseBtn = document.createElement('button');
    fontDecreaseBtn.className = 'noted-toolbar-btn';
    fontDecreaseBtn.innerHTML = '<span style="font-size: 11px; font-weight: 600;">H</span>';
    fontDecreaseBtn.title = 'Decrease font size';
    fontDecreaseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.changeFontSize('decrease');
    });

    // Bullet list button
    const bulletBtn = document.createElement('button');
    bulletBtn.className = 'noted-toolbar-btn';
    bulletBtn.innerHTML = '≡';
    bulletBtn.title = 'Bullet list';
    bulletBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.execCommand('insertUnorderedList');
    });

    // Left side buttons
    toolbar.appendChild(colorBtn);
    toolbar.appendChild(boldBtn);
    toolbar.appendChild(fontDecreaseBtn);
    toolbar.appendChild(fontIncreaseBtn);
    toolbar.appendChild(bulletBtn);

    // Right side delete button
    toolbar.appendChild(deleteBtn);

    return toolbar;
  }

  /**
   * Change font size
   * @param {string} direction - 'increase' or 'decrease'
   */
  changeFontSize(direction) {
    const content = this.element.querySelector('.noted-annotation-content');
    const currentSize = parseInt(window.getComputedStyle(content).fontSize) || 14;

    let newSize;
    if (direction === 'increase') {
      newSize = Math.min(currentSize + 2, 32); // Max 32px
    } else {
      newSize = Math.max(currentSize - 2, 10); // Min 10px
    }

    content.style.fontSize = newSize + 'px';

    // Save font size to annotation
    if (!this.annotation.content.fontSize) {
      this.annotation.content.fontSize = 14;
    }
    this.annotation.content.fontSize = newSize;
    this.saveAnnotation();
  }

  /**
   * Show color picker
   * @param {Event} e - Click event
   */
  showColorPicker(e) {
    // Remove existing picker
    const existingPicker = document.querySelector('.noted-color-picker');
    if (existingPicker) {
      existingPicker.remove();
      return;
    }

    const colors = [
      { name: 'Yellow', hex: '#FFF4CC' },      // Desaturated -10%
      { name: 'Orange', hex: '#FFCC99' },      // Desaturated -10%
      { name: 'Pink', hex: '#FFB3D9' },        // Desaturated -10%
      { name: 'Green', hex: '#B3E6B3' },       // Desaturated -10%
      { name: 'Blue', hex: '#99CCFF' },        // Desaturated -10%
      { name: 'Purple', hex: '#D9B3E6' },      // Desaturated -10%
      { name: 'Gray', hex: '#CCCCCC' },        // Desaturated -10%
      { name: 'White', hex: '#FFFFFF' }
    ];

    const picker = document.createElement('div');
    picker.className = 'noted-color-picker';

    colors.forEach(color => {
      const colorOption = document.createElement('div');
      colorOption.className = 'noted-color-option';
      colorOption.style.background = color.hex;
      colorOption.title = color.name;

      colorOption.addEventListener('click', () => {
        this.changeColor(color.hex);
        picker.remove();
      });

      picker.appendChild(colorOption);
    });

    this.element.appendChild(picker);
  }

  /**
   * Change annotation background color
   * @param {string} color - Hex color code
   */
  changeColor(color) {
    this.annotation.content.backgroundColor = color;
    this.element.style.background = color;
    this.saveAnnotation();
  }

  /**
   * Attach event listeners
   */
  attachEventListeners(container, content, resizeHandle, deleteBtn) {
    // Dragging
    container.addEventListener('mousedown', (e) => {
      if (e.target === content ||
          e.target === resizeHandle ||
          e.target.classList.contains('noted-toolbar-btn') ||
          e.target === deleteBtn) {
        return;
      }

      this.isDragging = true;
      this.dragStartX = e.clientX - this.annotation.position.x;
      this.dragStartY = e.clientY - this.annotation.position.y;

      container.style.cursor = 'grabbing';
      e.preventDefault();
    });

    // Resizing
    resizeHandle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      this.isResizing = true;
      this.resizeStartWidth = this.annotation.position.width;
      this.resizeStartHeight = this.annotation.position.height;
      this.resizeStartX = e.clientX;
      this.resizeStartY = e.clientY;
      e.preventDefault();
    });

    // Mouse move (global)
    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.annotation.position.x = e.clientX - this.dragStartX;
        this.annotation.position.y = e.clientY - this.dragStartY;

        container.style.left = this.annotation.position.x + 'px';
        container.style.top = this.annotation.position.y + 'px';
      }

      if (this.isResizing) {
        const deltaX = e.clientX - this.resizeStartX;
        const deltaY = e.clientY - this.resizeStartY;

        this.annotation.position.width = Math.max(100, this.resizeStartWidth + deltaX);
        this.annotation.position.height = Math.max(80, this.resizeStartHeight + deltaY);

        container.style.width = this.annotation.position.width + 'px';
        container.style.minHeight = this.annotation.position.height + 'px';
      }
    });

    // Mouse up (global)
    document.addEventListener('mouseup', () => {
      if (this.isDragging || this.isResizing) {
        this.isDragging = false;
        this.isResizing = false;
        container.style.cursor = 'move';
        this.saveAnnotation();
      }
    });

    // Content editing
    content.addEventListener('input', () => {
      this.annotation.content.text = content.innerHTML;
      this.annotation.modifiedAt = Date.now();

      // Auto-save after 500ms of no typing
      clearTimeout(this.saveTimeout);
      this.saveTimeout = setTimeout(() => {
        this.saveAnnotation();
      }, 500);
    });

    // Prevent drag when editing
    content.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });

    // Delete button
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Delete this annotation?')) {
        this.manager.deleteAnnotation(this.annotation.id);
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
      console.error('Noted: Error saving text annotation:', error);
    }
  }

  /**
   * Focus the content area for immediate typing
   */
  focus() {
    const content = this.element.querySelector('.noted-annotation-content');
    if (content) {
      // Use a longer timeout to ensure DOM is fully ready
      setTimeout(() => {
        content.focus();
        // Place cursor at the end (empty content will show placeholder)
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(content);
        range.collapse(false); // Collapse to end
        selection.removeAllRanges();
        selection.addRange(range);
      }, 100);
    }
  }
}

/**
 * Text Mode Controller - Handles text annotation creation mode
 */
class TextModeController {
  constructor(manager) {
    this.manager = manager;
    this.isActive = false;
    this.overlay = null;
  }

  /**
   * Activate text annotation mode
   */
  activate() {
    if (this.isActive) return;

    console.log('Noted: Text mode activated');
    this.isActive = true;

    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'noted-text-mode-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      cursor: text;
      z-index: 2147483646;
      pointer-events: auto;
    `;

    // Click to create annotation
    this.overlay.addEventListener('click', (e) => {
      this.createAnnotationAt(e.clientX, e.clientY);
    });

    // ESC to cancel
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this.deactivate();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    document.body.appendChild(this.overlay);

    // Show instruction
    this.showInstruction();
  }

  /**
   * Deactivate text annotation mode
   */
  deactivate() {
    if (!this.isActive) return;

    console.log('Noted: Text mode deactivated');
    this.isActive = false;

    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }

    // Remove instruction
    const instruction = document.querySelector('.noted-instruction');
    if (instruction) {
      instruction.remove();
    }
  }

  /**
   * Show instruction banner
   */
  showInstruction() {
    const instruction = document.createElement('div');
    instruction.className = 'noted-instruction';
    instruction.textContent = 'Click anywhere to add a text annotation (ESC to cancel)';
    document.body.appendChild(instruction);
  }

  /**
   * Create annotation at specific position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  createAnnotationAt(x, y) {
    const annotation = {
      id: this.manager.generateId(),
      type: 'text',
      url: window.location.href,
      position: {
        x: x,
        y: y,
        width: 250,
        height: 150
      },
      content: {
        text: '',  // Empty text so placeholder shows and can be typed over
        backgroundColor: '#FFF4CC',  // Match yellow from palette (10% desaturated)
        formatting: {}
      },
      createdAt: Date.now(),
      modifiedAt: Date.now()
    };

    this.manager.addAnnotation(annotation);
    this.deactivate();
  }
}

// Make available globally
window.TextAnnotation = TextAnnotation;
window.TextModeController = TextModeController;
