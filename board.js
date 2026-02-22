const tools = document.querySelectorAll('.toolbar-btn');
const shapesSubmenu = document.getElementById('shapesSubmenu');
const shapeOptions = document.querySelectorAll('.shape-option');
let currentTool = 'select';

tools.forEach(tool => {
    tool.addEventListener('click', () => {
        if (!tool.dataset.tool) return;

        if (tool.dataset.tool === 'shapes') {
            shapesSubmenu.classList.toggle('show');
        } else {
            shapesSubmenu.classList.remove('show');
        }
        tools.forEach(t => t.classList.remove('active'));
        tool.classList.add('active');
        currentTool = tool.dataset.tool;
        document.body.dataset.currentTool = currentTool;
        console.log(`Tool selected: ${currentTool}`);
        updateCursor();
    });
});

shapeOptions.forEach(option => {
    option.addEventListener('click', (e) => {
        e.stopPropagation();

        // Update selection state
        shapeOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');

        const shapeType = option.dataset.shape;
        window.lastSelectedShape = shapeType;
        console.log(`Shape selected: ${shapeType}`);
    });
});

// Close submenu when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('#toolShapes') && !e.target.closest('#shapesSubmenu')) {
        shapesSubmenu.classList.remove('show');
    }
});

function updateCursor() {
    const canvas = document.getElementById('canvasArea');

    canvas.style.touchAction = '';

    switch (currentTool) {
        case 'text':
            canvas.style.cursor = 'text';
            break;
        case 'checklist':
            canvas.style.cursor = 'crosshair';
            break;
        case 'image':
        case 'link':
            canvas.style.cursor = 'crosshair';
            break;
        case 'pen':
            canvas.style.cursor = 'crosshair';
            canvas.style.touchAction = 'none'; // CRITICAL: prevents scrolling from hijacking the pen stroke
            break;
        case 'select':
            canvas.style.cursor = 'default';
            break;
        case 'trash':
            const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#635BFF';
            const encodedColor = accentColor.replace('#', '%23');
            canvas.style.cursor = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='${encodedColor}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M3 6h18'/><path d='M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6'/><path d='M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2'/><line x1='10' y1='11' x2='10' y2='17'/><line x1='14' y1='11' x2='14' y2='17'/></svg>") 12 12, crosshair`;
            break;
        default:
            canvas.style.cursor = 'crosshair';
    }
}

function switchToSelectTool() {
    tools.forEach(t => t.classList.remove('active'));
    const selectTool = document.querySelector('.toolbar-btn[data-tool="select"]');
    if (selectTool) {
        selectTool.classList.add('active');
        currentTool = 'select';
        document.body.dataset.currentTool = 'select';
        updateCursor();
    }
}


// ZOOM CONTROLS

const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const zoomLevelDisplay = document.getElementById('zoomLevel');
const canvasContent = document.getElementById('canvasContent');

let zoomLevel = 100;
const ZOOM_STEP = 10;
const MIN_ZOOM = 10;
const MAX_ZOOM = 300;

function updateZoom() {
    zoomLevelDisplay.textContent = `${zoomLevel}%`;
    canvasContent.style.transform = `scale(${zoomLevel / 100})`;
}

zoomInBtn.addEventListener('click', () => {
    if (zoomLevel < MAX_ZOOM) {
        zoomLevel += ZOOM_STEP;
        updateZoom();
    }
});

zoomOutBtn.addEventListener('click', () => {
    if (zoomLevel > MIN_ZOOM) {
        zoomLevel -= ZOOM_STEP;
        updateZoom();
    }
});

// UNDO / REDO

const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');

function updateUndoRedoButtons(canUndo, canRedo) {
    undoBtn.classList.toggle('disabled', !canUndo);
    undoBtn.style.opacity = canUndo ? '' : '0.35';
    redoBtn.classList.toggle('disabled', !canRedo);
    redoBtn.style.opacity = canRedo ? '' : '0.35';
}

updateUndoRedoButtons(false, false);

if (window.UndoRedo) {
    window.UndoRedo.setOnStackChange(updateUndoRedoButtons);
}

undoBtn.addEventListener('click', () => {
    if (window.UndoRedo) window.UndoRedo.undo();
});

redoBtn.addEventListener('click', () => {
    if (window.UndoRedo) window.UndoRedo.redo();
});

// Keyboard shortcuts: Cmd+Z (undo), Cmd+Shift+Z (redo)
window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
            if (window.UndoRedo) window.UndoRedo.redo();
        } else {
            if (window.UndoRedo) window.UndoRedo.undo();
        }
    }
});

// CANVAS INTERACTION (Mock & Core Tools)

const canvasArea = document.getElementById('canvasArea');

let emptyMessageHidden = false;
function hideEmptyMessage() {
    if (emptyMessageHidden) return;
    const msg = document.querySelector('.empty-canvas-message');
    if (msg) {
        msg.style.display = 'none';
        emptyMessageHidden = true;
    }
}

// PEN TOOL LOGIC
let isDrawing = false;
let currentDrawingPoints = [];
let drawingOverlay = null;
let drawingPath = null;

function updateDrawingPath() {
    if (!drawingPath || currentDrawingPoints.length === 0) return;
    const d = currentDrawingPoints.map((p, i) => {
        return (i === 0 ? 'M' : 'L') + ` ${p.x} ${p.y}`;
    }).join(' ');
    drawingPath.setAttribute('d', d);
}

function finalizeDrawing() {
    if (currentDrawingPoints.length < 2) {
        if (drawingOverlay) drawingOverlay.remove();
        return;
    }

    const xs = currentDrawingPoints.map(p => p.x);
    const ys = currentDrawingPoints.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    if (maxX - minX < 5 && maxY - minY < 5) {
        if (drawingOverlay) drawingOverlay.remove();
        return;
    }

    const padding = 4;
    const width = Math.max(10, maxX - minX + padding * 2);
    const height = Math.max(10, maxY - minY + padding * 2);
    const left = minX - padding;
    const top = minY - padding;

    const element = document.createElement('div');
    element.className = 'canvas-element shape-element drawing-element';
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'none');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    const relativeD = currentDrawingPoints.map((p, i) => {
        return (i === 0 ? 'M' : 'L') + ` ${p.x - left} ${p.y - top}`;
    }).join(' ');

    path.setAttribute('d', relativeD);
    svg.appendChild(path);
    element.appendChild(svg);

    const colorInput = document.getElementById('fmtColorInput');
    if (colorInput) {
        element.style.color = colorInput.value;
    }

    canvasContent.appendChild(element);

    hideEmptyMessage();

    if (window.UndoRedo) {
        window.UndoRedo.pushAction({ type: 'create', element: element, parent: canvasContent });
    }

    if (drawingOverlay) drawingOverlay.remove();

    window.DragResize.makeElementDraggable(element);
    window.DragResize.makeElementResizable(element);

    window.DragResize.selectElement(element);
}

canvasArea.addEventListener('pointerdown', (e) => {
    console.log('[PEN] pointerdown triggered', { tool: document.body.dataset.currentTool, button: e.button });
    if (document.body.dataset.currentTool !== 'pen') return;
    if (e.button !== 0) return;

    e.preventDefault();
    canvasArea.setPointerCapture(e.pointerId);

    isDrawing = true;
    const rect = canvasContent.getBoundingClientRect();
    const scale = zoomLevel / 100; const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    currentDrawingPoints = [{ x, y }];

    console.log('[PEN] Drawing started at', x, y);

    drawingOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    drawingOverlay.setAttribute('class', 'drawing-overlay');

    drawingPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    const colorInput = document.getElementById('fmtColorInput');
    if (colorInput) {
        drawingPath.style.stroke = colorInput.value;
    }

    drawingOverlay.appendChild(drawingPath);
    canvasContent.appendChild(drawingOverlay);

    updateDrawingPath();
});

canvasArea.addEventListener('pointermove', (e) => {
    if (!isDrawing || document.body.dataset.currentTool !== 'pen') return;
    e.preventDefault();

    const rect = canvasContent.getBoundingClientRect();
    const scale = zoomLevel / 100;
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    currentDrawingPoints.push({ x, y });
    updateDrawingPath();
});

function handlePointerEnd(e) {
    if (!isDrawing) return;
    isDrawing = false;

    if (e && e.pointerId) {
        try {
            canvasArea.releasePointerCapture(e.pointerId);
        } catch (err) { }
    }

    finalizeDrawing();
    drawingOverlay = null;
    drawingPath = null;
    currentDrawingPoints = [];
}

window.addEventListener('pointerup', handlePointerEnd);
window.addEventListener('pointercancel', handlePointerEnd);

canvasArea.addEventListener('click', (e) => {
    const currentTool = document.body.dataset.currentTool;
    if (currentTool === 'pen') return;

    if (e.target !== canvasArea && e.target !== canvasContent && currentTool !== 'text') return;

    const rect = canvasContent.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentTool === 'text') {
        createMockTextElement(x, y);
    } else if (currentTool === 'checklist') {
        createChecklistElement(x, y);
    } else if (currentTool === 'image') {
        createImageElement(x, y);
    } else if (currentTool === 'link') {
        createLinkElement(x, y);
    } else if (currentTool === 'shapes') {
        const shapeType = window.lastSelectedShape || 'square';
        createShapeElement(shapeType, x, y);
    }
});

document.addEventListener('click', (e) => {
    if (e.target.closest('.link-popup') ||
        e.target.closest('.link-add-btn') ||
        e.target.closest('.link-icon')) {
        return;
    }

    document.querySelectorAll('.link-popup').forEach(popup => {
        popup.style.display = 'none';
    });
});

// TEXT FORMAT TOOLBAR

const textFormatToolbar = document.createElement('div');
textFormatToolbar.className = 'text-format-toolbar';
textFormatToolbar.style.display = 'none';
textFormatToolbar.innerHTML = `
    <div class="fmt-color-wrapper">
        <button class="fmt-btn fmt-color-btn" id="fmtColorBtn" title="Text Color" aria-label="Text Color" aria-haspopup="true" aria-expanded="false">
            <span class="fmt-color-label">A</span>
            <div class="fmt-color-indicator" id="fmtColorIndicator"></div>
        </button>
        <div class="fmt-color-panel" id="fmtColorPanel" role="dialog" aria-label="Color Picker">
            <div class="fmt-color-grid" role="grid">
                <button class="fmt-swatch" data-color="#000000" style="background-color: #000000" title="Black" role="gridcell" tabindex="0"></button>
                <button class="fmt-swatch" data-color="#4B4B4B" style="background-color: #4B4B4B" title="Dark Gray" role="gridcell" tabindex="0"></button>
                <button class="fmt-swatch" data-color="#7C7C7C" style="background-color: #7C7C7C" title="Gray" role="gridcell" tabindex="0"></button>
                <button class="fmt-swatch" data-color="#A5A5A5" style="background-color: #A5A5A5" title="Light Gray" role="gridcell" tabindex="0"></button>
                <button class="fmt-swatch" data-color="#D1D1D1" style="background-color: #D1D1D1" title="Silver" role="gridcell" tabindex="0"></button>
                <button class="fmt-swatch" data-color="#FFFFFF" style="background-color: #FFFFFF" title="White" role="gridcell" tabindex="0"></button>
                
                <button class="fmt-swatch" data-color="#FF5B5B" style="background-color: #FF5B5B" title="Red" role="gridcell" tabindex="0"></button>
                <button class="fmt-swatch" data-color="#FF9B5B" style="background-color: #FF9B5B" title="Orange" role="gridcell" tabindex="0"></button>
                <button class="fmt-swatch" data-color="#FFD65B" style="background-color: #FFD65B" title="Yellow" role="gridcell" tabindex="0"></button>
                <button class="fmt-swatch" data-color="#9BFF5B" style="background-color: #9BFF5B" title="Green" role="gridcell" tabindex="0"></button>
                <button class="fmt-swatch" data-color="#5BFFD6" style="background-color: #5BFFD6" title="Aqua" role="gridcell" tabindex="0"></button>
                <button class="fmt-swatch" data-color="#5BB2FF" style="background-color: #5BB2FF" title="Blue" role="gridcell" tabindex="0"></button>
                
                <button class="fmt-swatch" data-color="#7A5BFF" style="background-color: #7A5BFF" title="Purple" role="gridcell" tabindex="0"></button>
                <button class="fmt-swatch" data-color="#D65BFF" style="background-color: #D65BFF" title="Pink" role="gridcell" tabindex="0"></button>
                <button class="fmt-swatch" data-color="#FF5BD6" style="background-color: #FF5BD6" title="Rose" role="gridcell" tabindex="0"></button>
                <button class="fmt-swatch" data-color="#5B63FF" style="background-color: #5B63FF" title="Indigo" role="gridcell" tabindex="0"></button>
                <button class="fmt-swatch" data-color="#5BD6FF" style="background-color: #5BD6FF" title="Sky" role="gridcell" tabindex="0"></button>
                <button class="fmt-swatch" data-color="#FF5B9B" style="background-color: #FF5B9B" title="Coral" role="gridcell" tabindex="0"></button>
            </div>
            <div class="fmt-hex-row">
                <span class="fmt-hex-label">HEX</span>
                <input type="text" class="fmt-hex-input" id="fmtHexInput" placeholder="#000000" maxlength="7">
            </div>
        </div>
    </div>
    <div class="fmt-separator"></div>
    <button class="fmt-btn fmt-style-btn" id="fmtBoldBtn" title="Bold" aria-label="Bold">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
            <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
        </svg>
    </button>
    <button class="fmt-btn fmt-style-btn" id="fmtItalicBtn" title="Italic" aria-label="Italic">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" x2="10" y1="4" y2="4"/>
            <line x1="14" x2="5" y1="20" y2="20"/>
            <line x1="15" x2="9" y1="4" y2="20"/>
        </svg>
    </button>
    <div class="fmt-separator"></div>
    <div class="fmt-size-wrapper">
        <button class="fmt-size-btn" id="fmtSizeBtn" title="Font Size" aria-label="Font Size" aria-haspopup="listbox" aria-expanded="false">
            <span class="fmt-size-value" id="fmtSizeValue">16</span>
            <svg class="fmt-size-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div class="fmt-size-dropdown" id="fmtSizeDropdown" role="listbox" aria-label="Font Size Options">
            <div class="fmt-size-option" data-size="10" role="option" tabindex="0">10</div>
            <div class="fmt-size-option" data-size="12" role="option" tabindex="0">12</div>
            <div class="fmt-size-option active" data-size="16" role="option" tabindex="0" aria-selected="true">16</div>
            <div class="fmt-size-option" data-size="20" role="option" tabindex="0">20</div>
            <div class="fmt-size-option" data-size="24" role="option" tabindex="0">24</div>
            <div class="fmt-size-option" data-size="36" role="option" tabindex="0">36</div>
            <div class="fmt-size-option" data-size="48" role="option" tabindex="0">48</div>
            <div class="fmt-size-option" data-size="64" role="option" tabindex="0">64</div>
        </div>
    </div>
    <div class="fmt-separator"></div>
    <button class="fmt-btn fmt-list-btn" id="fmtListBtn" title="Bulleted List" aria-label="Bulleted List">
        <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M3.25 6.5A.75.75 0 0 1 4 5.75h1a.75.75 0 0 1 0 1.5H4a.75.75 0 0 1-.75-.75m4 0A.75.75 0 0 1 8 5.75h12a.75.75 0 0 1 0 1.5H8a.75.75 0 0 1-.75-.75m-4 5.5a.75.75 0 0 1 .75-.75h1a.75.75 0 0 1 0 1.5H4a.75.75 0 0 1-.75-.75m4 0a.75.75 0 0 1 .75-.75h12a.75.75 0 0 1 0 1.5H8a.75.75 0 0 1-.75-.75m-4 5.5a.75.75 0 0 1 .75-.75h1a.75.75 0 0 1 0 1.5H4a.75.75 0 0 1-.75-.75m4 0a.75.75 0 0 1 .75-.75h12a.75.75 0 0 1 0 1.5H8a.75.75 0 0 1-.75-.75"/>
        </svg>
    </button>
`;
canvasContent.appendChild(textFormatToolbar);

let currentTextElement = null;

function positionTextToolbar(textEl) {
    if (!textEl) return;
    const elRect = textEl.getBoundingClientRect();
    const canvasRect = canvasContent.getBoundingClientRect();
    const toolbarWidth = textFormatToolbar.offsetWidth || 280;

    const elCenterX = elRect.left - canvasRect.left + elRect.width / 2;
    const left = elCenterX - toolbarWidth / 2;
    const top = elRect.top - canvasRect.top - 72;

    textFormatToolbar.style.left = `${left}px`;
    textFormatToolbar.style.top = `${top}px`;
}

function showTextToolbar(textEl) {
    currentTextElement = textEl;
    positionTextToolbar(textEl);
    textFormatToolbar.style.display = 'flex';
    updateToolbarState();
}

function hideTextToolbar() {
    textFormatToolbar.style.display = 'none';
    const panel = textFormatToolbar.querySelector('#fmtColorPanel');
    if (panel) panel.classList.remove('open');
    const sizeDD = textFormatToolbar.querySelector('#fmtSizeDropdown');
    if (sizeDD) sizeDD.classList.remove('open');
    currentTextElement = null;
}

function updateToolbarState() {
    if (!currentTextElement) return;

    const boldBtn = document.getElementById('fmtBoldBtn');
    const italicBtn = document.getElementById('fmtItalicBtn');
    const listBtn = document.getElementById('fmtListBtn');

    boldBtn.classList.toggle('active', document.queryCommandState('bold'));
    italicBtn.classList.toggle('active', document.queryCommandState('italic'));
    listBtn.classList.toggle('active', document.queryCommandState('insertUnorderedList'));
}

const fmtColorIndicator = textFormatToolbar.querySelector('#fmtColorIndicator');
const fmtColorBtn = textFormatToolbar.querySelector('.fmt-color-btn');
const fmtColorPanel = textFormatToolbar.querySelector('#fmtColorPanel');
const fmtHexInput = textFormatToolbar.querySelector('#fmtHexInput');

let savedSelection = null;

function saveSelection() {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
        savedSelection = sel.getRangeAt(0).cloneRange();
    }
}

function restoreSelection() {
    if (savedSelection && currentTextElement) {
        currentTextElement.focus();
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedSelection);
    }
}

fmtColorBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    saveSelection();
    const sizeDD = textFormatToolbar.querySelector('#fmtSizeDropdown');
    if (sizeDD) sizeDD.classList.remove('open');

    const isOpen = fmtColorPanel.classList.contains('open');
    if (isOpen) {
        fmtColorPanel.classList.remove('open');
        fmtColorBtn.setAttribute('aria-expanded', 'false');
    } else {
        fmtColorPanel.classList.add('open');
        fmtColorBtn.setAttribute('aria-expanded', 'true');
        const firstSwatch = fmtColorPanel.querySelector('.fmt-swatch');
        if (firstSwatch) {
            firstSwatch.tabIndex = 0;
            firstSwatch.focus();
        }
    }
});

fmtColorBtn.addEventListener('click', (e) => {
    e.stopPropagation();
});

const swatches = Array.from(fmtColorPanel.querySelectorAll('.fmt-swatch'));
swatches.forEach((swatch, idx) => {
    const handleAction = () => {
        applyTextColor(swatch.dataset.color);
        fmtColorPanel.classList.remove('open');
        fmtColorBtn.setAttribute('aria-expanded', 'false');
        fmtColorBtn.focus();
    };

    swatch.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleAction();
    });
    swatch.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    swatch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault(); e.stopPropagation();
            handleAction();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            const nextIdx = (idx + 1) % swatches.length;
            swatches[nextIdx].focus();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const prevIdx = (idx - 1 + swatches.length) % swatches.length;
            swatches[prevIdx].focus();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIdx = (idx + 6) % swatches.length;
            swatches[nextIdx].focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIdx = (idx - 6 + swatches.length) % swatches.length;
            swatches[prevIdx].focus();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            fmtColorPanel.classList.remove('open');
            fmtColorBtn.setAttribute('aria-expanded', 'false');
            fmtColorBtn.focus();
        } else if (e.key === 'Tab') {
            if ((!e.shiftKey && idx === swatches.length - 1)) {
                // Let it tab to the HEX input, don't close yet
            } else if (e.shiftKey && idx === 0) {
                fmtColorPanel.classList.remove('open');
                fmtColorBtn.setAttribute('aria-expanded', 'false');
            }
        }
    });
});

// HEX input
fmtHexInput.addEventListener('pointerdown', (e) => e.stopPropagation());
fmtHexInput.addEventListener('click', (e) => e.stopPropagation());
fmtHexInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault(); e.stopPropagation();
        let hex = fmtHexInput.value.trim();
        if (!hex.startsWith('#')) hex = '#' + hex;
        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
            applyTextColor(hex);
            fmtColorPanel.classList.remove('open');
        }
    }
});

function applyTextColor(color) {
    fmtColorIndicator.style.backgroundColor = color;
    fmtHexInput.value = color.toUpperCase();
    if (!currentTextElement) return;

    const wasEditable = currentTextElement.contentEditable === 'true';

    currentTextElement.contentEditable = true;
    currentTextElement.focus();

    if (savedSelection) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedSelection);
    }

    const sel = window.getSelection();
    const hasExplicitSelection = sel.rangeCount > 0 && !sel.isCollapsed &&
        currentTextElement.contains(sel.anchorNode);

    if (hasExplicitSelection) {
        document.execCommand('foreColor', false, color);
    } else {
        const range = document.createRange();
        range.selectNodeContents(currentTextElement);
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('foreColor', false, color);
        sel.collapseToEnd();
    }

    if (!wasEditable) {
        currentTextElement.contentEditable = false;
    }
    savedSelection = null;
}

fmtColorPanel.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); });
fmtColorPanel.addEventListener('click', (e) => e.stopPropagation());

function applyCommandToAll(element, command) {
    element.contentEditable = true;
    element.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand(command);
    // On some mobile devices, we need to ensure the toolbar stays relevant
    if (window.innerWidth <= 768) {
        positionTextToolbar(element);
    }
}

const fmtBoldBtn = document.getElementById('fmtBoldBtn');
fmtBoldBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); });
fmtBoldBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentTextElement) {
        currentTextElement.focus();
        const sel = window.getSelection();
        if (!sel.toString()) {
            applyCommandToAll(currentTextElement, 'bold');
        } else {
            document.execCommand('bold');
        }
        updateToolbarState();
    }
});

const fmtItalicBtn = document.getElementById('fmtItalicBtn');
fmtItalicBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); });
fmtItalicBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentTextElement) {
        currentTextElement.focus();
        const sel = window.getSelection();
        if (!sel.toString()) {
            applyCommandToAll(currentTextElement, 'italic');
        } else {
            document.execCommand('italic');
        }
        updateToolbarState();
    }
});

const fmtSizeBtn = document.getElementById('fmtSizeBtn');
const fmtSizeValue = document.getElementById('fmtSizeValue');
const fmtSizeDropdown = document.getElementById('fmtSizeDropdown');

function toggleSizeDropdown(forceClose = false) {
    const isOpen = fmtSizeDropdown.classList.contains('open');
    if (forceClose || isOpen) {
        fmtSizeDropdown.classList.remove('open');
        fmtSizeBtn.setAttribute('aria-expanded', 'false');
    } else {
        fmtColorPanel.classList.remove('open');
        fmtSizeDropdown.classList.add('open');
        fmtSizeBtn.setAttribute('aria-expanded', 'true');
        const activeOpt = fmtSizeDropdown.querySelector('.fmt-size-option.active') ||
            fmtSizeDropdown.querySelector('.fmt-size-option');
        if (activeOpt) {
            activeOpt.tabIndex = 0;
            activeOpt.focus();
        }
    }
}

fmtSizeBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleSizeDropdown();
});

fmtSizeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
});

fmtSizeBtn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === ' ') {
        e.preventDefault();
        toggleSizeDropdown();
    }
});

const sizeOptions = Array.from(fmtSizeDropdown.querySelectorAll('.fmt-size-option'));
sizeOptions.forEach((opt, idx) => {
    const selectOption = () => {
        const size = opt.dataset.size;
        fmtSizeValue.textContent = size;
        if (currentTextElement) {
            currentTextElement.style.fontSize = size + 'px';
        }
        sizeOptions.forEach(o => {
            o.classList.remove('active');
            o.setAttribute('aria-selected', 'false');
        });
        opt.classList.add('active');
        opt.setAttribute('aria-selected', 'true');
        toggleSizeDropdown(true);
        fmtSizeBtn.focus();
    };

    opt.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectOption();
    });
    opt.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    opt.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            selectOption();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIdx = (idx + 1) % sizeOptions.length;
            sizeOptions[nextIdx].focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIdx = (idx - 1 + sizeOptions.length) % sizeOptions.length;
            sizeOptions[prevIdx].focus();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            toggleSizeDropdown(true);
            fmtSizeBtn.focus();
        } else if (e.key === 'Tab') {
            if ((!e.shiftKey && idx === sizeOptions.length - 1) || (e.shiftKey && idx === 0)) {
                toggleSizeDropdown(true);
            }
        }
    });
});

fmtSizeDropdown.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); });
fmtSizeDropdown.addEventListener('click', (e) => e.stopPropagation());

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (fmtSizeDropdown.classList.contains('open')) {
            toggleSizeDropdown(true);
            fmtSizeBtn.focus();
        }
        if (fmtColorPanel.classList.contains('open')) {
            fmtColorPanel.classList.remove('open');
            fmtColorBtn.setAttribute('aria-expanded', 'false');
            fmtColorBtn.focus();
        }
    }
});

document.addEventListener('pointerdown', (e) => {
    if (!textFormatToolbar.contains(e.target)) {
        fmtColorPanel.classList.remove('open');
        fmtColorBtn.setAttribute('aria-expanded', 'false');
        fmtSizeDropdown.classList.remove('open');
        fmtSizeBtn.setAttribute('aria-expanded', 'false');
    }
});

document.getElementById('fmtListBtn').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentTextElement) {
        currentTextElement.focus();
        document.execCommand('insertUnorderedList');
        updateToolbarState();
    }
});

document.getElementById('fmtListBtn').addEventListener('click', (e) => {
    e.stopPropagation();
});

textFormatToolbar.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
});
textFormatToolbar.addEventListener('click', (e) => {
    e.stopPropagation();
});

// Watch for .selected class changes on canvas elements (robust fallback)
const selectionObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const el = mutation.target;
            if (!el.classList.contains('canvas-element')) continue;

            if (el.classList.contains('selected') && el.classList.contains('canvas-text')) {
                showTextToolbar(el);
            } else if (!el.classList.contains('selected') && el === currentTextElement) {
                hideTextToolbar();
            }
        }
    }
});

selectionObserver.observe(canvasContent, {
    attributes: true,
    subtree: true,
    attributeFilter: ['class']
});

document.addEventListener('element-selected', (e) => {
    const el = e.detail.element;
    if (el && el.classList.contains('canvas-text')) {
        showTextToolbar(el);
    } else {
        hideTextToolbar();
    }
});

document.addEventListener('element-deselected', (e) => {
    const el = e.detail.element;
    if (el && el === currentTextElement) {
        hideTextToolbar();
    }

    const saveStatus = document.querySelector('.save-status');
    if (saveStatus) {
        saveStatus.classList.remove('show');
        void saveStatus.offsetWidth;
        saveStatus.classList.add('show');
        setTimeout(() => saveStatus.classList.remove('show'), 2000);
    }
});

const toolbarRepositionObserver = new MutationObserver(() => {
    if (currentTextElement && textFormatToolbar.style.display !== 'none') {
        positionTextToolbar(currentTextElement);
    }
});

toolbarRepositionObserver.observe(canvasContent, {
    attributes: true,
    subtree: true,
    attributeFilter: ['style']
});

document.addEventListener('selectionchange', () => {
    if (currentTextElement && currentTextElement.contentEditable === 'true') {
        updateToolbarState();
    }
});

// TEXT ELEMENT

function createMockTextElement(x, y) {
    const textEl = document.createElement('div');
    textEl.className = 'canvas-element canvas-text';
    textEl.contentEditable = false;
    textEl.innerHTML = 'Enter text';
    textEl.style.left = `${x}px`;
    textEl.style.top = `${y}px`;

    canvasContent.appendChild(textEl);

    hideEmptyMessage();

    if (window.UndoRedo) {
        window.UndoRedo.pushAction({ type: 'create', element: textEl, parent: canvasContent });
    }
    if (window.DragResize) {
        window.DragResize.makeElementDraggable(textEl);
        window.DragResize.makeElementResizable(textEl);
    }

    textEl.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        textEl.contentEditable = true;
        textEl.focus();
        const range = document.createRange();
        range.selectNodeContents(textEl);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    });

    textEl.addEventListener('blur', (e) => {
        if (e.relatedTarget && textFormatToolbar.contains(e.relatedTarget)) {
            return;
        }
        textEl.contentEditable = false;
        if (textEl.textContent.trim() === '' || textEl.textContent === 'Enter text') {
            textEl.remove();
            hideTextToolbar();
        }
    });

    switchToSelectTool();
}

function syncInput(inputEl) {
    if (!inputEl) return inputEl;
    if (inputEl.value) inputEl.setAttribute('value', inputEl.value);

    inputEl.addEventListener('input', (e) => {
        e.target.setAttribute('value', e.target.value);
    });

    if (inputEl.type === 'checkbox') {
        if (inputEl.checked) inputEl.setAttribute('checked', 'true');
        inputEl.addEventListener('change', (e) => {
            if (e.target.checked) {
                e.target.setAttribute('checked', 'true');
            } else {
                e.target.removeAttribute('checked');
            }
        });
    }
    return inputEl;
}

function createChecklistElement(x, y) {
    const checklistEl = document.createElement('div');
    checklistEl.className = 'canvas-element canvas-checklist';
    checklistEl.style.left = `${x}px`;
    checklistEl.style.top = `${y}px`;
    checklistEl.style.width = '250px';
    checklistEl.style.height = '200px';

    const title = syncInput(document.createElement('input'));
    title.className = 'checklist-title';
    title.type = 'text';
    title.value = 'Checklist';
    title.setAttribute('value', 'Checklist');
    title.placeholder = 'Checklist title';

    title.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            title.blur();
            if (window.DragResize) {
                window.DragResize.deselectAll();
            }
        }
    });

    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'checklist-items';

    for (let i = 1; i <= 3; i++) {
        itemsContainer.appendChild(createChecklistItem(`Item ${i}`));
    }

    const addBtn = document.createElement('button');
    addBtn.className = 'checklist-add-btn';
    addBtn.textContent = '+ Add item';
    addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const newItem = createChecklistItem('');
        itemsContainer.appendChild(newItem);
        newItem.querySelector('input[type="text"]').focus();
    });

    checklistEl.appendChild(title);
    checklistEl.appendChild(itemsContainer);
    checklistEl.appendChild(addBtn);

    canvasContent.appendChild(checklistEl);

    hideEmptyMessage();

    if (window.UndoRedo) {
        window.UndoRedo.pushAction({ type: 'create', element: checklistEl, parent: canvasContent });
    }

    if (window.DragResize) {
        window.DragResize.makeElementDraggable(checklistEl);
        window.DragResize.makeElementResizable(checklistEl);
    }
    switchToSelectTool();
}

function createChecklistItem(text = '') {
    const item = document.createElement('div');
    item.className = 'checklist-item';

    const checkbox = syncInput(document.createElement('input'));
    checkbox.type = 'checkbox';
    checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        textInput.style.textDecoration = checkbox.checked ? 'line-through' : 'none';
        textInput.style.opacity = checkbox.checked ? '0.6' : '1';
    });

    const textInput = syncInput(document.createElement('input'));
    textInput.type = 'text';
    textInput.value = text;
    if (text) textInput.setAttribute('value', text);
    textInput.placeholder = 'New item';
    textInput.addEventListener('click', (e) => e.stopPropagation());

    textInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            textInput.blur();
            if (window.DragResize) {
                window.DragResize.deselectAll();
            }
        }
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'checklist-item-delete';
    deleteBtn.innerHTML = '×';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        item.remove();
    });

    item.appendChild(checkbox);
    item.appendChild(textInput);
    item.appendChild(deleteBtn);

    return item;
}

// IMAGE ELEMENT

function createImageElement(x, y) {
    const imageEl = document.createElement('div');
    imageEl.className = 'canvas-element canvas-image';
    imageEl.style.left = `${x}px`;
    imageEl.style.top = `${y}px`;
    imageEl.style.width = '280px';
    imageEl.style.height = '240px';

    const title = syncInput(document.createElement('input'));
    title.className = 'image-title';
    title.type = 'text';
    title.value = 'Image';
    title.setAttribute('value', 'Image');
    title.placeholder = 'Image title';
    title.addEventListener('click', (e) => e.stopPropagation());
    title.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            title.blur();
            if (window.DragResize) {
                window.DragResize.deselectAll();
            }
        }
    });

    const header = document.createElement('div');
    header.className = 'image-header';

    const menuBtn = document.createElement('button');
    menuBtn.className = 'image-menu-btn';
    menuBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8" cy="3" r="1.5" fill="currentColor"/>
            <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
            <circle cx="8" cy="13" r="1.5" fill="currentColor"/>
        </svg>
    `;
    menuBtn.setAttribute('aria-label', 'Image options');

    header.appendChild(title);
    header.appendChild(menuBtn);

    const display = document.createElement('div');
    display.className = 'image-display';

    const placeholder = document.createElement('div');
    placeholder.className = 'image-placeholder';
    placeholder.innerHTML = `
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
        <span>No image added</span>
    `;

    const options = document.createElement('div');
    options.className = 'image-options';
    options.style.display = 'none';
    const urlRow = document.createElement('div');
    urlRow.className = 'image-options-row';
    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.className = 'image-url-input';
    urlInput.placeholder = 'Paste image URL...';
    urlInput.addEventListener('click', (e) => e.stopPropagation());
    const loadBtn = document.createElement('button');
    loadBtn.className = 'image-options-btn';
    loadBtn.textContent = 'Load';
    urlRow.appendChild(urlInput);
    urlRow.appendChild(loadBtn);

    const divider = document.createElement('div');
    divider.className = 'image-options-divider';
    divider.innerHTML = '<span>or</span>';
    const uploadRow = document.createElement('div');
    uploadRow.className = 'image-options-row';
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    const uploadBtn = document.createElement('button');
    uploadBtn.className = 'image-options-btn image-upload-btn';
    uploadBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" x2="12" y1="3" y2="15" />
        </svg>
        Upload from device
    `;
    uploadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });
    uploadRow.appendChild(fileInput);
    uploadRow.appendChild(uploadBtn);

    options.appendChild(urlRow);
    options.appendChild(divider);
    options.appendChild(uploadRow);

    function loadImage(src) {
        const img = document.createElement('img');
        img.className = 'image-loaded';
        img.src = src;
        img.alt = title.value || 'Image';
        display.innerHTML = '';
        display.appendChild(img);
        display.classList.add('has-image');
        options.style.display = 'none';
    }

    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = options.style.display === 'none';
        options.style.display = isHidden ? 'flex' : 'none';
    });

    loadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = urlInput.value.trim();
        if (url) {
            loadImage(url);
        }
    });

    urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            const url = urlInput.value.trim();
            if (url) {
                loadImage(url);
            }
        }
    });

    fileInput.addEventListener('change', (e) => {
        e.stopPropagation();
        const file = fileInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                loadImage(ev.target.result);
            };
            reader.readAsDataURL(file);
        }
    });

    display.appendChild(placeholder);

    imageEl.appendChild(header);
    imageEl.appendChild(display);
    imageEl.appendChild(options);

    canvasContent.appendChild(imageEl);

    hideEmptyMessage();

    if (window.UndoRedo) {
        window.UndoRedo.pushAction({ type: 'create', element: imageEl, parent: canvasContent });
    }
    if (window.DragResize) {
        window.DragResize.makeElementDraggable(imageEl);
        window.DragResize.makeElementResizable(imageEl);
    }
    switchToSelectTool();
}

function createLinkItem(nameValue = '', urlValue = '', onEdit) {
    const item = document.createElement('div');
    item.className = 'link-item';
    item.title = `Open ${urlValue}`;

    item.addEventListener('click', (e) => {
        if (e.target.closest('.link-icon') || e.target.closest('.link-item-delete')) {
            return;
        }
        e.stopPropagation();
        if (urlValue) {
            const fullUrl = urlValue.match(/^https?:\/\//) ? urlValue : `https://${urlValue}`;
            window.open(fullUrl, '_blank');
        }
    });

    const icon = document.createElement('div');
    icon.className = 'link-icon';
    icon.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
    `;
    icon.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onEdit) onEdit(item, nameValue, urlValue);
    });

    const nameLabel = document.createElement('span');
    nameLabel.className = 'link-name';
    nameLabel.textContent = nameValue;

    item.dataset.name = nameValue;
    item.dataset.url = urlValue;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'link-item-delete';
    deleteBtn.innerHTML = '×';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        item.remove();
    });

    item.appendChild(icon);
    item.appendChild(nameLabel);
    item.appendChild(deleteBtn);

    return item;
}

function createLinkElement(x, y) {
    const linkEl = document.createElement('div');
    linkEl.className = 'canvas-element canvas-link';
    linkEl.style.left = `${x}px`;
    linkEl.style.top = `${y}px`;
    linkEl.style.width = '280px';
    linkEl.style.height = '180px';

    const title = syncInput(document.createElement('input'));
    title.className = 'link-title';
    title.type = 'text';
    title.value = 'Links';
    title.setAttribute('value', 'Links');
    title.placeholder = 'Group title';
    title.addEventListener('click', (e) => e.stopPropagation());
    title.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            title.blur();
            if (window.DragResize) {
                window.DragResize.deselectAll();
            }
        }
    });

    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'link-items';

    const popup = document.createElement('div');
    popup.className = 'link-popup';
    popup.style.display = 'none';
    popup.innerHTML = `
        <div class="link-popup-header">Add Link</div>
        <input type="text" class="link-popup-url" placeholder="Paste a URL link...">
        <input type="text" class="link-popup-name" placeholder="Name the link...">
        <button class="link-popup-confirm">Confirm</button>
    `;
    popup.addEventListener('click', (e) => e.stopPropagation());

    const popupHeader = popup.querySelector('.link-popup-header');
    const urlInput = popup.querySelector('.link-popup-url');
    const nameInput = popup.querySelector('.link-popup-name');
    const confirmBtn = popup.querySelector('.link-popup-confirm');

    let currentMode = 'add';
    let editingItem = null;

    const showPopup = (mode, item = null, name = '', url = '') => {
        currentMode = mode;
        editingItem = item;
        popupHeader.textContent = mode === 'add' ? 'Add Link' : 'Edit Link';
        urlInput.value = url;
        nameInput.value = name;
        popup.style.display = 'flex';
        urlInput.focus();
    };

    const onEditLink = (item, name, url) => {
        showPopup('edit', item, name, url);
    };

    confirmBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = urlInput.value.trim();
        const name = nameInput.value.trim() || 'Untitled Link';
        if (url) {
            if (currentMode === 'add') {
                itemsContainer.appendChild(createLinkItem(name, url, onEditLink));
            } else if (editingItem) {
                const newItem = createLinkItem(name, url, onEditLink);
                itemsContainer.replaceChild(newItem, editingItem);
            }
            popup.style.display = 'none';
        }
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'link-add-btn';
    addBtn.textContent = '+ Add link';
    addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = popup.style.display === 'none';
        if (isHidden) {
            showPopup('add');
        } else {
            popup.style.display = 'none';
        }
    });

    linkEl.appendChild(title);
    linkEl.appendChild(itemsContainer);
    linkEl.appendChild(addBtn);
    linkEl.appendChild(popup);

    canvasContent.appendChild(linkEl);

    hideEmptyMessage();

    if (window.UndoRedo) {
        window.UndoRedo.pushAction({ type: 'create', element: linkEl, parent: canvasContent });
    }

    if (window.DragResize) {
        window.DragResize.makeElementDraggable(linkEl);
        window.DragResize.makeElementResizable(linkEl);
    }

    switchToSelectTool();
}


// SHAPE ELEMENT


function createShapeElement(type, x, y) {
    const shapeEl = document.createElement('div');
    shapeEl.className = 'canvas-element canvas-shape';
    shapeEl.dataset.type = type;
    shapeEl.style.left = `${x}px`;
    shapeEl.style.top = `${y}px`;

    // Default sizes
    let width = 100;
    let height = 100;

    let svgPath = '';
    switch (type) {
        case 'square':
            svgPath = '<rect x="4" y="4" width="92" height="92" rx="4" />';
            break;
        case 'circle':
            svgPath = '<circle cx="50" cy="50" r="46" />';
            break;
        case 'oval':
            width = 120;
            height = 80;
            svgPath = '<ellipse cx="60" cy="40" rx="56" ry="36" />';
            break;
        case 'triangle':
            svgPath = '<path d="M50 4L96 92H4L50 4Z" />';
            break;
        case 'arrow':
            width = 120;
            height = 60;
            svgPath = `<path d="M10 30H110M110 30L85 10M110 30L85 50" stroke-linecap="round" stroke-linejoin="round" />`;
            break;
        case 'diamond':
            svgPath = '<path d="M50 4L96 50L50 96L4 50Z" />';
            break;
    }

    shapeEl.style.width = `${width}px`;
    shapeEl.style.height = `${height}px`;
    shapeEl.style.transform = 'rotate(0deg)';

    shapeEl.innerHTML = `
        <svg preserveAspectRatio="none" viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%;">
            ${svgPath}
        </svg>
    `;

    canvasContent.appendChild(shapeEl);

    hideEmptyMessage();

    if (window.UndoRedo) {
        window.UndoRedo.pushAction({ type: 'create', element: shapeEl, parent: canvasContent });
    }

    if (window.DragResize) {
        window.DragResize.makeElementDraggable(shapeEl);
        window.DragResize.makeElementResizable(shapeEl);
    }

    switchToSelectTool();
}



// CANVAS STATE PERSISTENCE & SHARE LINK

function attachRestoredListeners(el) {
    el.querySelectorAll('input').forEach(input => syncInput(input));

    if (el.classList.contains('canvas-text')) {
        el.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            el.contentEditable = true;
            el.focus();
            const range = document.createRange();
            range.selectNodeContents(el);
            const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
        });
        el.addEventListener('blur', (e) => {
            el.contentEditable = false;
            if (el.textContent.trim() === '' || el.textContent === 'Enter text') el.remove();
        });
    } else if (el.classList.contains('canvas-checklist')) {
        const title = el.querySelector('.checklist-title');
        if (title) title.addEventListener('keydown', (e) => { if (e.key === 'Enter') title.blur(); });

        const addBtn = el.querySelector('.checklist-add-btn');
        if (addBtn) addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            el.querySelector('.checklist-items').appendChild(createChecklistItem(''));
        });

        el.querySelectorAll('.checklist-item').forEach(item => {
            const cb = item.querySelector('input[type="checkbox"]');
            const txt = item.querySelector('input[type="text"]');
            const del = item.querySelector('.checklist-item-delete');
            if (cb && txt) cb.addEventListener('change', () => {
                txt.style.textDecoration = cb.checked ? 'line-through' : 'none';
                txt.style.opacity = cb.checked ? '0.6' : '1';
            });
            if (del) del.addEventListener('click', (e) => { e.stopPropagation(); item.remove(); });
            if (txt) txt.addEventListener('keydown', (e) => { if (e.key === 'Enter') txt.blur(); });
        });
    } else if (el.classList.contains('canvas-image')) {
        const menuBtn = el.querySelector('.image-menu-btn');
        const options = el.querySelector('.image-options');
        const title = el.querySelector('.image-title');
        const delBtn = document.createElement('button'); // In a robust app, we'd rebuild all closures

        if (title) title.addEventListener('keydown', (e) => { if (e.key === 'Enter') title.blur(); });
        if (menuBtn && options) menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            options.style.display = options.style.display === 'none' ? 'flex' : 'none';
        });
    } else if (el.classList.contains('canvas-link')) {
        const title = el.querySelector('.link-title');
        if (title) title.addEventListener('keydown', (e) => { if (e.key === 'Enter') title.blur(); });

        const addBtn = el.querySelector('.link-add-btn');
        const popup = el.querySelector('.link-popup');
        if (addBtn && popup) addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            popup.style.display = popup.style.display === 'none' ? 'flex' : 'none';
        });

        el.querySelectorAll('.link-item').forEach(item => {
            const del = item.querySelector('.link-item-delete');
            if (del) del.addEventListener('click', (e) => { e.stopPropagation(); item.remove(); });
            item.addEventListener('click', (e) => {
                if (e.target.closest('.link-icon') || e.target.closest('.link-item-delete')) return;
                const url = item.dataset.url;
                if (url) window.open(url.match(/^https?:\/\//) ? url : `https://${url}`, '_blank');
            });
        });
    }
}

function saveBoardState() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (!id) return;

    const elements = Array.from(document.getElementById('canvasContent').querySelectorAll('.canvas-element:not(.drawing-overlay)'));
    const data = elements.map(el => ({
        outerHTML: el.outerHTML,
        style: el.getAttribute('style') || ''
    }));

    localStorage.setItem(`slate-elements-${id}`, JSON.stringify(data));
}

function loadBoardState() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (!id) return;

    const savedData = localStorage.getItem(`slate-elements-${id}`);
    if (!savedData) return;

    try {
        const data = JSON.parse(savedData);
        if (!data || data.length === 0) return;

        const content = document.getElementById('canvasContent');
        content.querySelectorAll('.canvas-element').forEach(el => el.remove());

        data.forEach(item => {
            const temp = document.createElement('div');
            temp.innerHTML = item.outerHTML;
            const el = temp.firstElementChild;
            if (el) {
                el.setAttribute('style', item.style);
                content.appendChild(el);

                if (window.DragResize) {
                    window.DragResize.makeElementDraggable(el);
                    window.DragResize.makeElementResizable(el);
                }
                attachRestoredListeners(el);
            }
        });

        if (data.length > 0) hideEmptyMessage();
    } catch (e) {
        console.error('Failed to load board state', e);
    }
}

let saveTimeout = null;
function triggerAutoSave() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveBoardState();
    }, 1000);
}

// INITIALIZATION

document.addEventListener('DOMContentLoaded', () => {
    document.body.dataset.currentTool = 'select';

    window.lastSelectedShape = 'square';
    const defaultShape = document.querySelector('.shape-option[data-shape="square"]');
    if (defaultShape) defaultShape.classList.add('active');

    loadBoardState();

    const observer = new MutationObserver((mutations) => {
        let shouldSave = false;
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                shouldSave = true;
            } else if (mutation.type === 'attributes') {
                if (mutation.target.classList && !mutation.target.classList.contains('drawing-overlay')) {
                    shouldSave = true;
                }
            } else if (mutation.type === 'characterData') {
                shouldSave = true;
            }
        });

        if (shouldSave) {
            triggerAutoSave();
        }
    });

    observer.observe(document.getElementById('canvasContent'), {
        childList: true,
        attributes: true,
        attributeFilter: ['style', 'class', 'value', 'checked'],
        characterData: true,
        subtree: true
    });

    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
        shareBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(window.location.href);
                const originalText = shareBtn.textContent;
                shareBtn.textContent = 'Link Copied!';
                shareBtn.classList.add('copied');

                const saveStatus = document.querySelector('.save-status');
                if (saveStatus) {
                    const originalStatusText = saveStatus.textContent;
                    saveStatus.textContent = 'Link copied to clipboard';

                    saveStatus.classList.remove('show');
                    void saveStatus.offsetWidth;
                    saveStatus.classList.add('show');

                    setTimeout(() => {
                        saveStatus.classList.remove('show');
                        setTimeout(() => {
                            saveStatus.textContent = originalStatusText;
                        }, 300);
                    }, 3000);
                }

                setTimeout(() => {
                    shareBtn.textContent = originalText;
                    shareBtn.classList.remove('copied');
                }, 3000);
            } catch (err) {
                console.error('Failed to copy link', err);
            }
        });
    }

    const boardTitle = document.getElementById('boardTitle');
    const urlParams = new URLSearchParams(window.location.search);
    const boardId = urlParams.get('id');
    const boards = JSON.parse(localStorage.getItem('slate-boards')) || [];
    let currentBoard = null;

    if (boardId) {
        currentBoard = boards.find(b => b.id === boardId);
        if (currentBoard && boardTitle) {
            boardTitle.innerText = currentBoard.name;
            document.title = `${currentBoard.name} - Slate`;
        }
    }

    if (boardTitle) {
        boardTitle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                boardTitle.blur();
            }
        });

        boardTitle.addEventListener('blur', () => {
            const newName = boardTitle.innerText.trim();
            console.log('Board title saved:', newName);

            if (currentBoard && newName && newName !== currentBoard.name) {
                currentBoard.name = newName;
                currentBoard.lastEditedAt = new Date().toISOString();
                localStorage.setItem('slate-boards', JSON.stringify(boards));
                document.title = `${newName} - Slate`;
            }

            const saveStatus = document.querySelector('.save-status');
            if (saveStatus) {
                saveStatus.classList.remove('show');
                void saveStatus.offsetWidth;

                saveStatus.classList.add('show');

                setTimeout(() => {
                    saveStatus.classList.remove('show');
                }, 5000);
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        const isEditing = e.target.tagName === 'INPUT' ||
            e.target.tagName === 'TEXTAREA' ||
            e.target.isContentEditable ||
            e.target.closest('[contenteditable="true"]');

        if (isEditing) return;

        const key = e.key.toLowerCase();
        let toolToSelect = null;

        switch (key) {
            case 'v': toolToSelect = 'select'; break;
            case 't': toolToSelect = 'text'; break;
            case 'l': toolToSelect = 'checklist'; break;
            case 'i': toolToSelect = 'image'; break;
            case 'k': toolToSelect = 'link'; break;
            case 's': toolToSelect = 'shapes'; break;
            case 'p': toolToSelect = 'pen'; break;
            case 'd': toolToSelect = 'trash'; break;
        }

        if (toolToSelect) {
            const toolBtn = document.querySelector(`.toolbar-btn[data-tool="${toolToSelect}"]`);
            if (toolBtn) toolBtn.click();
        }
    });
});
