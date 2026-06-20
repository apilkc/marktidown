// Application State
let filesQueue = [];
let activePreviewId = null;
let previewMode = 'raw'; // 'raw' or 'rendered'
const MAX_CONCURRENT = 3;
let activeConversions = 0;

// DOM Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('file-list');
const emptyState = document.getElementById('empty-state');
const queueCount = document.getElementById('queue-count');
const clearQueueBtn = document.getElementById('clear-queue');
const downloadZipBtn = document.getElementById('download-zip');

const previewFilename = document.getElementById('preview-filename');
const previewControls = document.getElementById('preview-controls');
const previewEmpty = document.getElementById('preview-empty');
const previewCodeWrapper = document.getElementById('preview-code-wrapper');
const previewCode = document.getElementById('preview-code');
const previewRendered = document.getElementById('preview-rendered');

const btnToggleRaw = document.getElementById('btn-toggle-raw');
const btnToggleRendered = document.getElementById('btn-toggle-rendered');
const btnCopy = document.getElementById('btn-copy');
const btnDownloadSingle = document.getElementById('btn-download-single');

// Event Listeners
dropZone.addEventListener('click', (e) => {
    if (e.target !== fileInput) {
        fileInput.click();
    }
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('dragend', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
        addFilesToQueue(e.dataTransfer.files);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        addFilesToQueue(e.target.files);
        fileInput.value = ''; // Reset input so same file can be uploaded again
    }
});

clearQueueBtn.addEventListener('click', () => {
    filesQueue = [];
    activePreviewId = null;
    activeConversions = 0;
    updateQueueUI();
    resetPreviewUI();
});

downloadZipBtn.addEventListener('click', downloadAllAsZip);

btnToggleRaw.addEventListener('click', () => setPreviewMode('raw'));
btnToggleRendered.addEventListener('click', () => setPreviewMode('rendered'));
btnCopy.addEventListener('click', copyPreviewToClipboard);
btnDownloadSingle.addEventListener('click', downloadSingleFile);

// Helper: Format File Size
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Helper: Get File Icon based on extension
function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    
    // PDF
    if (ext === 'pdf') {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
    }
    // Word Docs
    if (['docx', 'doc', 'odt'].includes(ext)) {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M16 13H8m8 4H8m-2-8h4"/></svg>`;
    }
    // Excel sheets
    if (['xlsx', 'xls', 'csv'].includes(ext)) {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 11h8m-8 4h8m-8-8h2"/></svg>`;
    }
    // Images
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
    }
    // Audio
    if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
    }
    // Video
    if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`;
    }
    
    // Default document icon
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
}

// Queue Management
function addFilesToQueue(filesList) {
    for (let i = 0; i < filesList.length; i++) {
        const file = filesList[i];
        
        // Skip duplicate files currently in queue
        if (filesQueue.some(item => item.name === file.name && item.size === file.size)) {
            continue;
        }

        const queueItem = {
            id: '_' + Math.random().toString(36).substr(2, 9),
            file: file,
            name: file.name,
            size: file.size,
            status: 'pending', // pending, converting, success, error
            content: null,
            error: null
        };
        
        filesQueue.push(queueItem);
    }
    
    updateQueueUI();
    processQueue();
}

function removeFileFromQueue(id) {
    // If we're removing the file being previewed, reset preview
    if (activePreviewId === id) {
        resetPreviewUI();
        activePreviewId = null;
    }
    
    filesQueue = filesQueue.filter(item => item.id !== id);
    updateQueueUI();
    processQueue();
}

function processQueue() {
    if (activeConversions >= MAX_CONCURRENT) return;
    
    const pendingItem = filesQueue.find(item => item.status === 'pending');
    if (!pendingItem) return;
    
    // Process the item
    pendingItem.status = 'converting';
    activeConversions++;
    updateQueueUI();
    
    const formData = new FormData();
    formData.append('file', pendingItem.file);
    
    fetch('/api/convert', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errData => {
                throw new Error(errData.error || 'Server error during conversion');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            pendingItem.status = 'success';
            pendingItem.content = data.content;
            
            // Auto preview the first converted file if nothing is actively previewed
            if (!activePreviewId) {
                previewFile(pendingItem.id);
            }
        } else {
            pendingItem.status = 'error';
            pendingItem.error = data.error || 'Unknown error';
        }
    })
    .catch(error => {
        pendingItem.status = 'error';
        pendingItem.error = error.message;
    })
    .finally(() => {
        activeConversions--;
        updateQueueUI();
        processQueue(); // Process next in queue
    });
    
    // Run concurrent conversions up to limit
    processQueue();
}

// UI Rendering
function updateQueueUI() {
    queueCount.textContent = filesQueue.length;
    
    if (filesQueue.length === 0) {
        emptyState.style.display = 'flex';
        fileList.style.display = 'none';
        clearQueueBtn.disabled = true;
        downloadZipBtn.disabled = true;
        return;
    }
    
    emptyState.style.display = 'none';
    fileList.style.display = 'block';
    clearQueueBtn.disabled = false;
    
    // Enable ZIP download if there are successful conversions
    const successCount = filesQueue.filter(item => item.status === 'success').length;
    downloadZipBtn.disabled = successCount === 0;
    
    // Re-render items (simple and clean approach)
    fileList.innerHTML = '';
    
    filesQueue.forEach(item => {
        const li = document.createElement('li');
        li.className = `file-item ${item.id === activePreviewId ? 'active' : ''}`;
        
        let statusHTML = '';
        if (item.status === 'pending') {
            statusHTML = `<span class="file-status status-pending">Pending</span>`;
        } else if (item.status === 'converting') {
            statusHTML = `<span class="file-status status-converting"><span class="spinner"></span> Converting...</span>`;
        } else if (item.status === 'success') {
            statusHTML = `
                <span class="file-status status-success">
                    <svg class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Completed
                </span>`;
        } else if (item.status === 'error') {
            statusHTML = `
                <span class="file-status status-error" title="${item.error || 'Error'}">
                    <svg class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    Failed
                </span>`;
        }
        
        let actionsHTML = '';
        if (item.status === 'success') {
            actionsHTML = `
                <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); previewFile('${item.id}')">Preview</button>
                <button class="btn btn-primary btn-sm btn-icon-only" onclick="event.stopPropagation(); downloadSingleFileById('${item.id}')" title="Download Markdown">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M12 3v12M8 11l4 4 4-4"/></svg>
                </button>
            `;
        }
        
        li.innerHTML = `
            <div class="file-icon">${getFileIcon(item.name)}</div>
            <div class="file-details">
                <div class="file-name" title="${item.name}">${item.name}</div>
                <div class="file-meta">
                    <span>${formatBytes(item.size)}</span>
                    ${statusHTML}
                </div>
            </div>
            <div class="file-actions">
                ${actionsHTML}
                <button class="btn-icon-only danger-hover" onclick="event.stopPropagation(); removeFileFromQueue('${item.id}')" title="Remove">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
            </div>
        `;
        
        // Clicking on a row opens preview (if successful)
        if (item.status === 'success') {
            li.style.cursor = 'pointer';
            li.addEventListener('click', () => previewFile(item.id));
        }
        
        fileList.appendChild(li);
    });
}

// Preview Panel Control
function previewFile(id) {
    const item = filesQueue.find(f => f.id === id);
    if (!item || item.status !== 'success') return;
    
    activePreviewId = id;
    
    // Update active highlight in file list
    const fileItems = fileList.querySelectorAll('.file-item');
    filesQueue.forEach((f, idx) => {
        if (f.id === id) {
            fileItems[idx]?.classList.add('active');
        } else {
            fileItems[idx]?.classList.remove('active');
        }
    });
    
    // Display controls & file info
    previewFilename.textContent = item.name;
    previewControls.style.display = 'flex';
    previewEmpty.style.display = 'none';
    
    renderPreview(item.content);
}

function resetPreviewUI() {
    previewFilename.textContent = 'Select a file from the queue';
    previewControls.style.display = 'none';
    previewEmpty.style.display = 'flex';
    previewCodeWrapper.style.display = 'none';
    previewRendered.style.display = 'none';
    previewCode.textContent = '';
    previewRendered.innerHTML = '';
}

function renderPreview(content) {
    if (previewMode === 'raw') {
        previewCodeWrapper.style.display = 'block';
        previewRendered.style.display = 'none';
        previewCode.textContent = content;
    } else {
        previewCodeWrapper.style.display = 'none';
        previewRendered.style.display = 'block';
        // Render Markdown to HTML using marked.js
        previewRendered.innerHTML = marked.parse(content || '');
    }
}

function setPreviewMode(mode) {
    if (previewMode === mode) return;
    previewMode = mode;
    
    if (mode === 'raw') {
        btnToggleRaw.classList.add('active');
        btnToggleRendered.classList.remove('active');
    } else {
        btnToggleRaw.classList.remove('active');
        btnToggleRendered.classList.add('active');
    }
    
    const activeItem = filesQueue.find(f => f.id === activePreviewId);
    if (activeItem) {
        renderPreview(activeItem.content);
    }
}

// Action Handlers
function copyPreviewToClipboard() {
    const activeItem = filesQueue.find(f => f.id === activePreviewId);
    if (!activeItem || !activeItem.content) return;
    
    navigator.clipboard.writeText(activeItem.content)
        .then(() => {
            const originalText = btnCopy.innerHTML;
            btnCopy.innerHTML = `
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span style="color: var(--success)">Copied!</span>
            `;
            setTimeout(() => {
                btnCopy.innerHTML = originalText;
            }, 2000);
        })
        .catch(err => {
            console.error('Failed to copy: ', err);
            alert('Failed to copy text.');
        });
}

function downloadSingleFile() {
    if (!activePreviewId) return;
    downloadSingleFileById(activePreviewId);
}

function downloadSingleFileById(id) {
    const item = filesQueue.find(f => f.id === id);
    if (!item || !item.content) return;
    
    const baseName = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
    const blob = new Blob([item.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${baseName}.md`;
    link.click();
    
    // Cleanup
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 100);
}

function downloadAllAsZip() {
    const successItems = filesQueue.filter(item => item.status === 'success' && item.content);
    if (successItems.length === 0) return;
    
    const zip = new JSZip();
    const nameTracker = {}; // Tracks naming collisions
    
    successItems.forEach(item => {
        let baseName = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
        
        // Clean base name for filesystem compatibility
        baseName = baseName.replace(/[\\/:*?"<>|]/g, '_');
        
        // Collision handling
        if (nameTracker[baseName]) {
            nameTracker[baseName]++;
            baseName = `${baseName}_${nameTracker[baseName]}`;
        } else {
            nameTracker[baseName] = 1;
        }
        
        zip.file(`${baseName}.md`, item.content);
    });
    
    downloadZipBtn.disabled = true;
    const originalHTML = downloadZipBtn.innerHTML;
    downloadZipBtn.innerHTML = `<span class="spinner"></span> Bundling...`;
    
    zip.generateAsync({ type: 'blob' })
    .then(content => {
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = `markitdown_conversions_${Date.now()}.zip`;
        link.click();
        
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 100);
    })
    .catch(err => {
        console.error('ZIP compilation error:', err);
        alert('Failed to generate ZIP file.');
    })
    .finally(() => {
        downloadZipBtn.disabled = false;
        downloadZipBtn.innerHTML = originalHTML;
    });
}
