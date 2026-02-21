// DRAG & RESIZE SYSTEM FOR CANVAS ELEMENTS
// Performance-optimized with RAF and GPU acceleration

let selectedElement = null;
let isDragging = false;
let isResizing = false;
let dragStartX = 0;
let dragStartY = 0;
let elementStartX = 0;
let elementStartY = 0;
let resizeDirection = null;
let resizeStartWidth = 0;
let resizeStartHeight = 0;
let resizeStartX = 0;
let resizeStartY = 0;
let isRotating = false;
let rotateStartAngle = 0;
let elementStartRotation = 0;
let rotateCenterX = 0;
let rotateCenterY = 0;

let rafId = null;
let pendingUpdate = null;

const MIN_WIDTH = 50;
const MIN_HEIGHT = 50;

// The 8 cursor directions in 45° increments, starting from north (0°)
const CURSOR_DIRECTIONS = ['n-resize', 'ne-resize', 'e-resize', 'se-resize', 's-resize', 'sw-resize', 'w-resize', 'nw-resize'];
// Base angle for each handle direction (degrees from north, clockwise)
const HANDLE_BASE_ANGLES = { n: 0, ne: 45, e: 90, se: 135, s: 180, sw: 225, w: 270, nw: 315 };

function getScale() {
    const canvasContent = document.getElementById('canvasContent');
    if (!canvasContent) return 1;
    const transform = canvasContent.style.transform;
    const match = transform && transform.match(/scale\(([^)]+)\)/);
    return match ? parseFloat(match[1]) : 1;
}

function updateResizeCursors(element) {
    const rotation = getRotation(element);
    const handles = element.querySelectorAll('.resize-handle');
    handles.forEach(handle => {
        const dir = handle.dataset.direction;
        if (!dir || !(dir in HANDLE_BASE_ANGLES)) return;
        const effectiveAngle = ((HANDLE_BASE_ANGLES[dir] + rotation) % 360 + 360) % 360;
        const index = Math.round(effectiveAngle / 45) % 8;
        handle.style.setProperty('cursor', CURSOR_DIRECTIONS[index], 'important');
    });
}

// SELECTION SYSTEM

function selectElement(element) {
    if (selectedElement && selectedElement !== element) {
        deselectElement(selectedElement);
    }

    selectedElement = element;
    element.classList.add('selected');

    if (!element.querySelector('.resize-handles')) {
        addResizeHandles(element);
    }
    updateResizeCursors(element);

    document.dispatchEvent(new CustomEvent('element-selected', { detail: { element } }));
}

function deselectElement(element) {
    if (!element) return;

    element.classList.remove('selected');

    const handles = element.querySelector('.resize-handles');
    if (handles) {
        handles.remove();
    }
    document.dispatchEvent(new CustomEvent('element-deselected', { detail: { element } }));
}

function deselectAll() {
    if (selectedElement) {
        deselectElement(selectedElement);
        selectedElement = null;
    }
}

function deleteSelectedElement() {
    if (!selectedElement) return;

    const elementToDelete = selectedElement;
    const parentNode = elementToDelete.parentNode;
    deselectAll();
    elementToDelete.remove();

    if (window.UndoRedo) {
        window.UndoRedo.pushAction({ type: 'delete', element: elementToDelete, parent: parentNode });
    }
}

// RESIZE HANDLES

function addResizeHandles(element) {
    const handlesContainer = document.createElement('div');
    handlesContainer.className = 'resize-handles';
    handlesContainer.contentEditable = 'false';

    const directions = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

    directions.forEach(direction => {
        const handle = document.createElement('div');
        handle.className = `resize-handle resize-handle-${direction}`;
        handle.dataset.direction = direction;

        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            startResize(e, element, direction);
        });

        handlesContainer.appendChild(handle);
    });

    if (element.classList.contains('canvas-shape')) {
        const rotationLine = document.createElement('div');
        rotationLine.className = 'rotation-line';
        handlesContainer.appendChild(rotationLine);

        const rotateHandle = document.createElement('div');
        rotateHandle.className = 'rotation-handle';
        rotateHandle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            startRotate(e, element);
        });
        handlesContainer.appendChild(rotateHandle);
    }

    element.appendChild(handlesContainer);
}

// DRAG FUNCTIONALITY

function makeElementDraggable(element) {
    element.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('resize-handle') ||
            e.target.classList.contains('rotation-handle') ||
            e.target.classList.contains('rotation-line') ||
            e.target.tagName === 'INPUT' ||
            e.target.tagName === 'TEXTAREA' ||
            e.target.contentEditable === 'true') {
            return;
        }

        const currentTool = document.body.dataset.currentTool;
        if (currentTool !== 'select') return;

        e.preventDefault();
        startDrag(e, element);
    });

    element.addEventListener('click', (e) => {
        const currentTool = document.body.dataset.currentTool;
        if (currentTool !== 'text') {
            e.stopPropagation();
        }
        if (currentTool === 'trash') {
            element.remove();
            if (selectedElement === element) {
                selectedElement = null;
            }
            return;
        }

        selectElement(element);
    });
}

function startDrag(e, element) {
    isDragging = true;
    element.classList.add('dragging');
    element.classList.add('no-transition');

    dragStartX = e.clientX;
    dragStartY = e.clientY;

    elementStartX = parseFloat(element.style.left) || 0;
    elementStartY = parseFloat(element.style.top) || 0;

    beforeState = {
        left: element.style.left,
        top: element.style.top
    };

    selectElement(element);

    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
}

function onDragMove(e) {
    if (!isDragging) return;

    const scale = getScale();
    const deltaX = (e.clientX - dragStartX) / scale;
    const deltaY = (e.clientY - dragStartY) / scale;

    const newX = elementStartX + deltaX;
    const newY = elementStartY + deltaY;

    pendingUpdate = { x: newX, y: newY, rotation: getRotation(selectedElement) };

    if (!rafId) {
        rafId = requestAnimationFrame(() => {
            if (pendingUpdate && selectedElement) {
                selectedElement.style.left = `${pendingUpdate.x}px`;
                selectedElement.style.top = `${pendingUpdate.y}px`;
                selectedElement.style.transform = `rotate(${pendingUpdate.rotation}deg)`;
            }
            rafId = null;
        });
    }
}

function getRotation(element) {
    const transform = element.style.transform;
    const match = transform.match(/rotate\(([^deg)]+)deg\)/);
    return match ? parseFloat(match[1]) : 0;
}

function onDragEnd() {
    if (isDragging && selectedElement) {
        selectedElement.classList.remove('dragging');
        selectedElement.classList.remove('no-transition');

        if (beforeState && window.UndoRedo) {
            const afterLeft = selectedElement.style.left;
            const afterTop = selectedElement.style.top;
            if (afterLeft !== beforeState.left || afterTop !== beforeState.top) {
                window.UndoRedo.pushAction({
                    type: 'move',
                    element: selectedElement,
                    before: { left: beforeState.left, top: beforeState.top },
                    after: { left: afterLeft, top: afterTop }
                });
            }
        }
        beforeState = null;
    }

    isDragging = false;
    pendingUpdate = null;

    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }

    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
}

// RESIZE FUNCTIONALITY

function makeElementResizable(element) {
    element.style.position = 'absolute';
}

function startResize(e, element, direction) {
    e.preventDefault();
    e.stopPropagation();

    isResizing = true;
    resizeDirection = direction;

    element.classList.add('resizing');
    element.classList.add('no-transition');

    dragStartX = e.clientX;
    dragStartY = e.clientY;

    resizeStartWidth = element.offsetWidth;
    resizeStartHeight = element.offsetHeight;
    resizeStartX = parseFloat(element.style.left) || 0;
    resizeStartY = parseFloat(element.style.top) || 0;
    beforeState = {
        left: element.style.left,
        top: element.style.top,
        width: element.style.width,
        height: element.style.height
    };

    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', onResizeEnd);
}

function startRotate(e, element) {
    e.preventDefault();
    e.stopPropagation();

    selectElement(element);

    isRotating = true;
    element.classList.add('rotating');
    element.classList.add('no-transition');

    const rotateHandle = e.target;
    if (rotateHandle.classList.contains('rotation-handle')) {
        rotateHandle.classList.add('active');
    }

    const rect = element.getBoundingClientRect();
    rotateCenterX = rect.left + rect.width / 2;
    rotateCenterY = rect.top + rect.height / 2;

    rotateStartAngle = Math.atan2(e.clientY - rotateCenterY, e.clientX - rotateCenterX) * (180 / Math.PI);
    elementStartRotation = getRotation(element);

    beforeState = {
        transform: element.style.transform
    };

    document.addEventListener('mousemove', onRotateMove);
    document.addEventListener('mouseup', onRotateEnd);
}

function onRotateMove(e) {
    if (!isRotating || !selectedElement) return;

    const currentAngle = Math.atan2(e.clientY - rotateCenterY, e.clientX - rotateCenterX) * (180 / Math.PI);
    const rotation = elementStartRotation + (currentAngle - rotateStartAngle);

    pendingUpdate = {
        x: parseFloat(selectedElement.style.left),
        y: parseFloat(selectedElement.style.top),
        width: parseFloat(selectedElement.style.width),
        height: parseFloat(selectedElement.style.height),
        rotation: rotation
    };

    if (!rafId) {
        rafId = requestAnimationFrame(() => {
            if (pendingUpdate && selectedElement) {
                selectedElement.style.transform = `rotate(${pendingUpdate.rotation}deg)`;
            }
            rafId = null;
        });
    }
}

function onRotateEnd() {
    if (isRotating && selectedElement) {
        selectedElement.classList.remove('rotating');
        selectedElement.classList.remove('no-transition');

        const rotateHandle = selectedElement.querySelector('.rotation-handle');
        if (rotateHandle) {
            rotateHandle.classList.remove('active');
        }
        updateResizeCursors(selectedElement);

        if (beforeState && window.UndoRedo) {
            const afterTransform = selectedElement.style.transform;
            if (afterTransform !== beforeState.transform) {
                window.UndoRedo.pushAction({
                    type: 'rotate',
                    element: selectedElement,
                    before: { transform: beforeState.transform },
                    after: { transform: afterTransform }
                });
            }
        }
        beforeState = null;
    }

    isRotating = false;
    pendingUpdate = null;

    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }

    document.removeEventListener('mousemove', onRotateMove);
    document.removeEventListener('mouseup', onRotateEnd);
}

function onResizeMove(e) {
    if (!isResizing || !selectedElement) return;

    const scale = getScale();
    const deltaX = (e.clientX - dragStartX) / scale;
    const deltaY = (e.clientY - dragStartY) / scale;

    const angleDeg = getRotation(selectedElement);
    const angle = angleDeg * (Math.PI / 180);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const localDX = deltaX * cos + deltaY * sin;
    const localDY = -deltaX * sin + deltaY * cos;

    let dw = 0, dh = 0;
    let ax = 0.5, ay = 0.5;

    switch (resizeDirection) {
        case 'e': dw = localDX; ax = 0; ay = 0.5; break;
        case 'w': dw = -localDX; ax = 1; ay = 0.5; break;
        case 's': dh = localDY; ax = 0.5; ay = 0; break;
        case 'n': dh = -localDY; ax = 0.5; ay = 1; break;
        case 'se': dw = localDX; dh = localDY; ax = 0; ay = 0; break;
        case 'sw': dw = -localDX; dh = localDY; ax = 1; ay = 0; break;
        case 'ne': dw = localDX; dh = -localDY; ax = 0; ay = 1; break;
        case 'nw': dw = -localDX; dh = -localDY; ax = 1; ay = 1; break;
    }

    const newWidth = Math.max(MIN_WIDTH, resizeStartWidth + dw);
    const newHeight = Math.max(MIN_HEIGHT, resizeStartHeight + dh);

    const oldCx = resizeStartX + resizeStartWidth / 2;
    const oldCy = resizeStartY + resizeStartHeight / 2;
    const oldAnchorRelX = ax * resizeStartWidth - resizeStartWidth / 2;
    const oldAnchorRelY = ay * resizeStartHeight - resizeStartHeight / 2;
    const anchorCanvasX = oldCx + oldAnchorRelX * cos - oldAnchorRelY * sin;
    const anchorCanvasY = oldCy + oldAnchorRelX * sin + oldAnchorRelY * cos;

    const newAnchorRelX = ax * newWidth - newWidth / 2;
    const newAnchorRelY = ay * newHeight - newHeight / 2;
    const newCx = anchorCanvasX - newAnchorRelX * cos + newAnchorRelY * sin;
    const newCy = anchorCanvasY - newAnchorRelX * sin - newAnchorRelY * cos;

    const newX = newCx - newWidth / 2;
    const newY = newCy - newHeight / 2;

    // Store pending update
    pendingUpdate = { width: newWidth, height: newHeight, x: newX, y: newY, rotation: angleDeg };

    // Use RAF for smooth, GPU-accelerated updates
    if (!rafId) {
        rafId = requestAnimationFrame(() => {
            if (pendingUpdate && selectedElement) {
                selectedElement.style.width = `${pendingUpdate.width}px`;
                selectedElement.style.height = `${pendingUpdate.height}px`;
                selectedElement.style.left = `${pendingUpdate.x}px`;
                selectedElement.style.top = `${pendingUpdate.y}px`;
                selectedElement.style.transform = `rotate(${pendingUpdate.rotation}deg)`;
            }
            rafId = null;
        });
    }
}

function onResizeEnd() {
    if (isResizing && selectedElement) {
        selectedElement.classList.remove('resizing');
        selectedElement.classList.remove('no-transition');

        if (beforeState && window.UndoRedo) {
            const afterState = {
                left: selectedElement.style.left,
                top: selectedElement.style.top,
                width: selectedElement.style.width,
                height: selectedElement.style.height
            };
            if (afterState.left !== beforeState.left || afterState.top !== beforeState.top ||
                afterState.width !== beforeState.width || afterState.height !== beforeState.height) {
                window.UndoRedo.pushAction({
                    type: 'resize',
                    element: selectedElement,
                    before: { ...beforeState },
                    after: afterState
                });
            }
        }
        beforeState = null;
    }

    isResizing = false;
    resizeDirection = null;
    pendingUpdate = null;

    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }

    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', onResizeEnd);
}


// INITIALIZATION

document.addEventListener('click', (e) => {
    if (e.target.id === 'canvasArea' || e.target.id === 'canvasContent') {
        deselectAll();
    }
});

window.DragResize = {
    makeElementDraggable,
    makeElementResizable,
    selectElement,
    deselectElement,
    deselectAll,
    deleteSelectedElement
};
