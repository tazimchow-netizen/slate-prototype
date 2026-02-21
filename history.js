// UNDO / REDO HISTORY SYSTEM


(function () {
    const undoStack = [];
    const redoStack = [];
    const MAX_HISTORY = 50;

    // Callbacks for UI updates (set by board.js)
    let onStackChange = null;

    /**
     * Push an action onto the undo stack.
     * Clears the redo stack (standard behavior).
     *
     * Action format:
     * {
     *   type: 'create' | 'delete' | 'move' | 'resize' | 'rotate',
     *   element: <DOM element>,
     *   parent: <parent node> (for create/delete),
     *   before: { left, top, width, height, transform } (for move/resize/rotate),
     *   after:  { left, top, width, height, transform } (for move/resize/rotate),
     * }
     */
    function pushAction(action) {
        undoStack.push(action);
        if (undoStack.length > MAX_HISTORY) {
            undoStack.shift();
        }
        // Any new action invalidates the redo stack
        redoStack.length = 0;
        notifyChange();
    }

    function undo() {
        if (undoStack.length === 0) return;

        const action = undoStack.pop();

        // Deselect anything currently selected
        if (window.DragResize) {
            window.DragResize.deselectAll();
        }

        switch (action.type) {
            case 'create':
                // Undo creation = remove the element
                if (action.element && action.element.parentNode) {
                    action.element.remove();
                }
                break;

            case 'delete':
                // Undo deletion = re-insert the element
                if (action.element && action.parent) {
                    action.parent.appendChild(action.element);
                }
                break;

            case 'move':
                // Restore previous position
                if (action.element) {
                    action.element.style.left = action.before.left;
                    action.element.style.top = action.before.top;
                }
                break;

            case 'resize':
                // Restore previous dimensions and position
                if (action.element) {
                    action.element.style.left = action.before.left;
                    action.element.style.top = action.before.top;
                    action.element.style.width = action.before.width;
                    action.element.style.height = action.before.height;
                }
                break;

            case 'rotate':
                // Restore previous transform
                if (action.element) {
                    action.element.style.transform = action.before.transform;
                }
                break;
        }

        redoStack.push(action);
        notifyChange();
    }

    function redo() {
        if (redoStack.length === 0) return;

        const action = redoStack.pop();

        // Deselect anything currently selected
        if (window.DragResize) {
            window.DragResize.deselectAll();
        }

        switch (action.type) {
            case 'create':
                // Redo creation = re-insert the element
                if (action.element && action.parent) {
                    action.parent.appendChild(action.element);
                }
                break;

            case 'delete':
                // Redo deletion = remove the element again
                if (action.element && action.element.parentNode) {
                    action.element.remove();
                }
                break;

            case 'move':
                // Re-apply new position
                if (action.element) {
                    action.element.style.left = action.after.left;
                    action.element.style.top = action.after.top;
                }
                break;

            case 'resize':
                // Re-apply new dimensions and position
                if (action.element) {
                    action.element.style.left = action.after.left;
                    action.element.style.top = action.after.top;
                    action.element.style.width = action.after.width;
                    action.element.style.height = action.after.height;
                }
                break;

            case 'rotate':
                // Re-apply new transform
                if (action.element) {
                    action.element.style.transform = action.after.transform;
                }
                break;
        }

        undoStack.push(action);
        notifyChange();
    }

    function canUndo() {
        return undoStack.length > 0;
    }

    function canRedo() {
        return redoStack.length > 0;
    }

    function setOnStackChange(callback) {
        onStackChange = callback;
    }

    function notifyChange() {
        if (onStackChange) {
            onStackChange(canUndo(), canRedo());
        }
    }

    // Export
    window.UndoRedo = {
        pushAction,
        undo,
        redo,
        canUndo,
        canRedo,
        setOnStackChange
    };
})();
