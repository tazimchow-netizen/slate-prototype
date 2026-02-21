

// LOGO INTERACTIVITY

const logoButton = document.getElementById('logoButton');
if (logoButton) {
    logoButton.addEventListener('click', () => {
        window.location.reload();
    });
}

// BOARD MANAGEMENT

const createBoardBtn = document.getElementById('createBoardBtn');
const modalOverlay = document.getElementById('modalOverlay');
const createBoardModal = document.getElementById('createBoardModal');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const createBoardForm = document.getElementById('createBoardForm');
const boardNameInput = document.getElementById('boardName');
const boardNameError = document.getElementById('boardNameError');
const boardsGrid = document.getElementById('boardsGrid');

let boards = JSON.parse(localStorage.getItem('slate-boards')) || [];

boards = boards.map(board => {
    if (!board.lastOpenedAt) {
        board.lastOpenedAt = board.createdAt;
    }
    if (!board.lastEditedAt) {
        board.lastEditedAt = board.createdAt;
    }
    return board;
});

if (boards.length > 0) {
    localStorage.setItem('slate-boards', JSON.stringify(boards));
}

let currentSearchQuery = '';

function openModal() {
    modalOverlay.classList.add('show');
    boardNameInput.focus();
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modalOverlay.classList.remove('show');
    createBoardForm.reset();
    boardNameError.textContent = '';
    document.body.style.overflow = '';
}

createBoardBtn.addEventListener('click', openModal);

modalCloseBtn.addEventListener('click', closeModal);
modalCancelBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        closeModal();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('show')) {
        closeModal();
    }
});

createBoardForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const boardName = boardNameInput.value.trim();
    if (!boardName) {
        boardNameError.textContent = 'Board name is required';
        return;
    }

    if (boardName.length > 50) {
        boardNameError.textContent = 'Board name must be 50 characters or less';
        return;
    }

    const newBoard = {
        id: Date.now().toString(),
        name: boardName,
        createdAt: new Date().toISOString(),
        lastOpenedAt: new Date().toISOString(),
        lastEditedAt: new Date().toISOString(),
    };

    boards.unshift(newBoard);

    localStorage.setItem('slate-boards', JSON.stringify(boards));

    closeModal();
    renderBoards();
});

function formatRelativeTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) {
        return 'just now';
    } else if (diffMins < 60) {
        return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    } else {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
}

function renderBoards() {
    let filteredBoards = boards;
    if (currentSearchQuery) {
        filteredBoards = boards.filter(board =>
            board.name.toLowerCase().includes(currentSearchQuery.toLowerCase())
        );
    }

    filteredBoards.sort((a, b) => {
        const dateA = new Date(a.lastOpenedAt || a.createdAt);
        const dateB = new Date(b.lastOpenedAt || b.createdAt);
        return dateB - dateA;
    });

    if (boards.length === 0) {
        boardsGrid.classList.add('hidden');
        boardsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: var(--space-3xl); color: var(--color-text-muted);">
                <p>No boards yet. Click "+ Create Board" to get started.</p>
            </div>
        `;
        return;
    }

    if (filteredBoards.length === 0) {
        boardsGrid.classList.remove('hidden');
        boardsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: var(--space-3xl); color: var(--color-text-muted);">
                <p>No boards found matching "${escapeHtml(currentSearchQuery)}"</p>
            </div>
        `;
        return;
    }

    boardsGrid.classList.remove('hidden');

    boardsGrid.innerHTML = filteredBoards.map(board => {
        const lastEdited = formatRelativeTime(board.lastEditedAt || board.createdAt);
        const created = formatRelativeTime(board.createdAt);

        return `
      <div class="board-card" data-board-id="${board.id}" tabindex="0" role="button" aria-label="Open ${board.name} board">
        <div class="board-card-header">
          <div>
            <h3 class="board-card-title">${escapeHtml(board.name)}</h3>
            <p class="board-card-subtitle">Last edited ${lastEdited}</p>
          </div>
          <button class="board-card-menu" aria-label="Board options" data-board-id="${board.id}">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="8" cy="3" r="1.5" fill="currentColor"/>
              <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
              <circle cx="8" cy="13" r="1.5" fill="currentColor"/>
            </svg>
          </button>
        </div>
        <div class="board-card-footer">
          <div class="board-card-date">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11 2H3C2.44772 2 2 2.44772 2 3V11C2 11.5523 2.44772 12 3 12H11C11.5523 12 12 11.5523 12 11V3C12 2.44772 11.5523 2 11 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M9 1V3M5 1V3M2 5H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Created ${created}</span>
          </div>
        </div>
      </div>
    `;
    }).join('');

    document.querySelectorAll('.board-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.board-card-menu')) {
                return;
            }
            const boardId = card.dataset.boardId;
            openBoard(boardId);
        });

        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const boardId = card.dataset.boardId;
                openBoard(boardId);
            }
        });
    });

    document.querySelectorAll('.board-card-menu').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const boardId = btn.dataset.boardId;
            showContextMenu(e, boardId);
        });
    });
}


// BOARD CONTEXT MENU

const contextMenu = document.getElementById('boardContextMenu');
let currentContextBoardId = null;

function showContextMenu(event, boardId) {
    currentContextBoardId = boardId;

    const buttonRect = event.target.closest('.board-card-menu').getBoundingClientRect();
    contextMenu.style.display = 'block';
    contextMenu.style.left = `${buttonRect.left}px`;
    contextMenu.style.top = `${buttonRect.bottom + 5}px`;

    setTimeout(() => {
        const menuRect = contextMenu.getBoundingClientRect();
        if (menuRect.right > window.innerWidth) {
            contextMenu.style.left = `${buttonRect.right - menuRect.width}px`;
        }
        if (menuRect.bottom > window.innerHeight) {
            contextMenu.style.top = `${buttonRect.top - menuRect.height - 5}px`;
        }
    }, 0);
}

function hideContextMenu() {
    contextMenu.style.display = 'none';
    currentContextBoardId = null;
}
document.getElementById('renameBoard').addEventListener('click', () => {
    const boardId = currentContextBoardId;
    hideContextMenu();
    openRenameModal(boardId);
});

document.getElementById('copyBoardLink').addEventListener('click', () => {
    const board = boards.find(b => b.id === currentContextBoardId);
    if (board) {
        const boardUrl = `${window.location.origin}${window.location.pathname.replace('dashboard.html', '')}board.html?id=${currentContextBoardId}`;
        navigator.clipboard.writeText(boardUrl).then(() => {
            const btn = document.getElementById('copyBoardLink');
            const originalText = btn.querySelector('span').textContent;
            btn.querySelector('span').textContent = 'Link Copied!';
            setTimeout(() => {
                btn.querySelector('span').textContent = originalText;
            }, 2000);
        });
    }
    hideContextMenu();
});

document.getElementById('deleteBoardMenu').addEventListener('click', () => {
    const boardId = currentContextBoardId;
    hideContextMenu();
    openDeleteModal(boardId);
});

document.addEventListener('click', (e) => {
    if (e.target.closest('.modal') || e.target.classList.contains('modal-overlay')) {
        return;
    }

    if (!contextMenu.contains(e.target) && !e.target.closest('.board-card-menu')) {
        hideContextMenu();
    }
});

// RENAME BOARD MODAL

const renameBoardModalOverlay = document.getElementById('renameBoardModalOverlay');
const renameBoardModal = document.getElementById('renameBoardModal');
const renameModalCloseBtn = document.getElementById('renameModalCloseBtn');
const renameModalCancelBtn = document.getElementById('renameModalCancelBtn');
const renameBoardForm = document.getElementById('renameBoardForm');
const renameBoardNameInput = document.getElementById('renameBoardName');
const renameBoardNameError = document.getElementById('renameBoardNameError');

function openRenameModal(boardId) {
    const board = boards.find(b => b.id === boardId);
    if (!board) return;

    currentContextBoardId = boardId;
    renameBoardNameInput.value = board.name;
    renameBoardModalOverlay.classList.add('show');
    renameBoardNameInput.focus();
    renameBoardNameInput.select();
    document.body.style.overflow = 'hidden';
}

function closeRenameModal() {
    renameBoardModalOverlay.classList.remove('show');
    renameBoardForm.reset();
    renameBoardNameError.textContent = '';
    document.body.style.overflow = '';
    currentContextBoardId = null;
}

renameModalCloseBtn.addEventListener('click', closeRenameModal);
renameModalCancelBtn.addEventListener('click', closeRenameModal);
renameBoardModalOverlay.addEventListener('click', (e) => {
    if (e.target === renameBoardModalOverlay) {
        closeRenameModal();
    }
});

renameBoardForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const newName = renameBoardNameInput.value.trim();
    if (!newName) {
        renameBoardNameError.textContent = 'Board name is required';
        return;
    }

    if (newName.length > 50) {
        renameBoardNameError.textContent = 'Board name must be 50 characters or less';
        return;
    }

    const board = boards.find(b => b.id === currentContextBoardId);
    if (board) {
        board.name = newName;
        board.lastEditedAt = new Date().toISOString();
        localStorage.setItem('slate-boards', JSON.stringify(boards));
        closeRenameModal();
        renderBoards();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (modalOverlay.classList.contains('show')) {
            closeModal();
        }
        if (renameBoardModalOverlay.classList.contains('show')) {
            closeRenameModal();
        }
        if (deleteBoardModalOverlay.classList.contains('show')) {
            closeDeleteModal();
        }
        if (contextMenu.style.display === 'block') {
            hideContextMenu();
        }
    }
});

function openBoard(boardId) {
    const board = boards.find(b => b.id === boardId);
    if (board) {
        board.lastOpenedAt = new Date().toISOString();
        localStorage.setItem('slate-boards', JSON.stringify(boards));

        window.location.href = `board.html?id=${boardId}`;
    }
}

// DELETE BOARD MODAL

const deleteBoardModalOverlay = document.getElementById('deleteBoardModalOverlay');
const deleteBoardModal = document.getElementById('deleteBoardModal');
const deleteModalCloseBtn = document.getElementById('deleteModalCloseBtn');
const deleteModalCancelBtn = document.getElementById('deleteModalCancelBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const deleteBoardNameSpan = document.getElementById('deleteBoardName');

function openDeleteModal(boardId) {
    const board = boards.find(b => b.id === boardId);
    if (!board) return;

    currentContextBoardId = boardId;
    deleteBoardNameSpan.textContent = board.name;
    deleteBoardModalOverlay.classList.add('show');
    document.body.style.overflow = 'hidden';

    setTimeout(() => deleteModalCancelBtn.focus(), 100);
}

function closeDeleteModal() {
    deleteBoardModalOverlay.classList.remove('show');
    document.body.style.overflow = '';
    currentContextBoardId = null;
}

function confirmDeleteBoard() {
    if (!currentContextBoardId) return;

    boards = boards.filter(b => b.id !== currentContextBoardId);
    localStorage.setItem('slate-boards', JSON.stringify(boards));
    closeDeleteModal();
    renderBoards();
}

deleteModalCloseBtn.addEventListener('click', closeDeleteModal);
deleteModalCancelBtn.addEventListener('click', closeDeleteModal);
confirmDeleteBtn.addEventListener('click', confirmDeleteBoard);

deleteBoardModalOverlay.addEventListener('click', (e) => {
    if (e.target === deleteBoardModalOverlay) {
        closeDeleteModal();
    }
});

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// SEARCH FUNCTIONALITY

const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');
searchInput.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value.trim();

    if (currentSearchQuery) {
        searchClear.style.display = 'flex';
    } else {
        searchClear.style.display = 'none';
    }

    renderBoards();
});

searchClear.addEventListener('click', () => {
    searchInput.value = '';
    currentSearchQuery = '';
    searchClear.style.display = 'none';
    searchInput.focus();
    renderBoards();
});

// INITIALIZE ON PAGE LOAD

document.addEventListener('DOMContentLoaded', () => {
    renderBoards();
});
