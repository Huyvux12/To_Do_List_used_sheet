// ============================================
// TO-DO LIST APP - Personal Use
// Lưu trữ bằng localStorage + Google Sheets sync
// ============================================

// DOM Elements
const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');
const emptyState = document.getElementById('emptyState');
const filterBtns = document.querySelectorAll('.filter-btn');
const priorityBtns = document.querySelectorAll('.priority-btn');

// New elements
const prioritySelect = document.getElementById('prioritySelect');
const dueDateInput = document.getElementById('dueDateInput');
const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');
const darkModeBtn = document.getElementById('darkModeBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');
const helpModal = document.getElementById('helpModal');
const closeHelp = document.getElementById('closeHelp');
const colorBtns = document.querySelectorAll('.color-btn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');

// Sync elements
const syncStatus = document.getElementById('syncStatus');
const syncNowBtn = document.getElementById('syncNowBtn');
const apiUrlInput = document.getElementById('apiUrlInput');
const saveApiBtn = document.getElementById('saveApiBtn');

// Progress elements
const dateLabel = document.getElementById('dateLabel');
const greeting = document.getElementById('greeting');
const progressPercent = document.getElementById('progressPercent');
const progressCount = document.getElementById('progressCount');
const progressFill = document.getElementById('progressFill');
const countAll = document.getElementById('countAll');
const countPending = document.getElementById('countPending');
const countCompleted = document.getElementById('countCompleted');

// State
let tasks = [];
let settings = {
    theme: 'light',
    colorScheme: 'purple'
};
let currentFilter = 'all';
let currentPriorityFilter = 'all';
let searchQuery = '';
let editingTaskId = null;

// ============================================
// KHỞI TẠO
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    loadSettings();
    applySettings();
    updateDateTime();
    renderTasks();
    updateProgress();
    setupEventListeners();
});

// ============================================
// NGÀY GIỜ & LỜI CHÀO
// ============================================
function updateDateTime() {
    const now = new Date();
    
    // Tên thứ trong tuần
    const days = ['CHỦ NHẬT', 'THỨ HAI', 'THỨ BA', 'THỨ TƯ', 'THỨ NĂM', 'THỨ SÁU', 'THỨ BẢY'];
    const dayName = days[now.getDay()];
    
    // Ngày tháng
    const day = now.getDate();
    const month = now.getMonth() + 1;
    
    dateLabel.textContent = `📅 ${dayName}, ${day} THÁNG ${month}`;
    
    // Lời chào theo giờ
    const hour = now.getHours();
    let greetingText = '';
    
    if (hour >= 5 && hour < 12) {
        greetingText = 'Buổi sáng tốt lành!';
    } else if (hour >= 12 && hour < 18) {
        greetingText = 'Buổi chiều vui vẻ!';
    } else if (hour >= 18 && hour < 22) {
        greetingText = 'Buổi tối vui vẻ!';
    } else {
        greetingText = 'Làm việc khuya nhé!';
    }
    
    greeting.textContent = greetingText;
}

// ============================================
// LOCAL STORAGE
// ============================================
function saveTasks() {
    localStorage.setItem('todoTasks', JSON.stringify(tasks));
}

function loadTasks() {
    const saved = localStorage.getItem('todoTasks');
    tasks = saved ? JSON.parse(saved) : [];
    
    // Migrate old tasks (add missing fields)
    tasks = tasks.map(task => ({
        ...task,
        priority: task.priority || 'medium',
        dueDate: task.dueDate || null,
        note: task.note || '',
        order: task.order || 0,
        updatedAt: task.updatedAt || task.createdAt
    }));
}

function saveSettings() {
    localStorage.setItem('todoSettings', JSON.stringify(settings));
}

function loadSettings() {
    const saved = localStorage.getItem('todoSettings');
    if (saved) {
        settings = { ...settings, ...JSON.parse(saved) };
    }
}

function applySettings() {
    // Apply theme
    document.body.dataset.theme = settings.theme;
    darkModeBtn.textContent = settings.theme === 'dark' ? '☀️' : '🌙';
    
    // Apply color scheme
    document.body.dataset.color = settings.colorScheme;
    colorBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === settings.colorScheme);
    });
}

// ============================================
// QUẢN LÝ TASK
// ============================================
function addTask() {
    const text = taskInput.value.trim();
    
    if (!text) {
        taskInput.focus();
        return;
    }
    
    const newTask = {
        id: Date.now(),
        text: text,
        completed: false,
        priority: prioritySelect.value,
        dueDate: dueDateInput.value || null,
        note: '',
        order: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    tasks.unshift(newTask);
    saveTasks();
    renderTasks();
    updateProgress();
    
    // Reset form
    taskInput.value = '';
    prioritySelect.value = 'medium';
    dueDateInput.value = '';
    taskInput.focus();
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        task.updatedAt = new Date().toISOString();
        saveTasks();
        renderTasks();
        updateProgress();
        
        // Celebration for 100%
        checkCelebration();
    }
}

function deleteTask(id) {
    if (!confirm('Xóa task này?')) return;
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
    updateProgress();
}

function startEditTask(id) {
    editingTaskId = id;
    renderTasks();
    
    // Focus on input
    const input = document.querySelector('.task-edit-input');
    if (input) {
        input.focus();
        input.select();
    }
}

function saveEditTask(id, newText) {
    const task = tasks.find(t => t.id === id);
    if (task && newText.trim()) {
        task.text = newText.trim();
        task.updatedAt = new Date().toISOString();
        saveTasks();
    }
    editingTaskId = null;
    renderTasks();
}

function cancelEdit() {
    editingTaskId = null;
    renderTasks();
}

function updateTaskPriority(id, priority) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.priority = priority;
        task.updatedAt = new Date().toISOString();
        saveTasks();
        renderTasks();
    }
}

// ============================================
// RENDER TASKS
// ============================================
function renderTasks() {
    let filteredTasks = [...tasks];
    
    // Apply status filter
    if (currentFilter === 'pending') {
        filteredTasks = filteredTasks.filter(t => !t.completed);
    } else if (currentFilter === 'completed') {
        filteredTasks = filteredTasks.filter(t => t.completed);
    }
    
    // Apply priority filter
    if (currentPriorityFilter !== 'all') {
        filteredTasks = filteredTasks.filter(t => t.priority === currentPriorityFilter);
    }
    
    // Apply search
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredTasks = filteredTasks.filter(t => 
            t.text.toLowerCase().includes(query)
        );
    }
    
    // Sort: priority high first, then by due date
    filteredTasks.sort((a, b) => {
        // Completed tasks go to bottom
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        
        // Priority order
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        
        // Due date (earlier first)
        if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        
        return 0;
    });
    
    // Clear list
    taskList.innerHTML = '';
    
    // Show empty state or tasks
    if (filteredTasks.length === 0) {
        emptyState.classList.add('show');
        if (searchQuery) {
            emptyState.querySelector('p').textContent = 'Không tìm thấy kết quả';
        } else {
            emptyState.querySelector('p').textContent = 'Chưa có công việc nào';
        }
    } else {
        emptyState.classList.remove('show');
        
        filteredTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item priority-${task.priority} ${task.completed ? 'completed' : ''} ${editingTaskId === task.id ? 'editing' : ''}`;
            li.dataset.id = task.id;
            
            if (editingTaskId === task.id) {
                // Edit mode
                li.innerHTML = `
                    <div class="task-checkbox" onclick="toggleTask(${task.id})">
                        <span class="check-icon">✓</span>
                    </div>
                    <div class="task-content">
                        <input type="text" class="task-edit-input" value="${escapeHtml(task.text)}" 
                            onkeydown="handleEditKeydown(event, ${task.id})"
                            onblur="saveEditTask(${task.id}, this.value)">
                    </div>
                `;
            } else {
                // Normal mode
                const dueInfo = getDueInfo(task.dueDate);
                const priorityLabels = { high: 'Cao', medium: 'TB', low: 'Thấp' };
                
                li.innerHTML = `
                    <div class="task-checkbox" onclick="toggleTask(${task.id})">
                        <span class="check-icon">✓</span>
                    </div>
                    <div class="task-content" ondblclick="startEditTask(${task.id})">
                        <span class="task-text">${escapeHtml(task.text)}</span>
                        <div class="task-meta">
                            ${task.dueDate ? `<span class="task-due ${dueInfo.class}">📅 ${dueInfo.text}</span>` : ''}
                            <span class="task-priority-badge ${task.priority}">${priorityLabels[task.priority]}</span>
                        </div>
                    </div>
                    <div class="task-actions">
                        <button class="task-action-btn" onclick="startEditTask(${task.id})" title="Sửa">✏️</button>
                        <button class="task-action-btn delete" onclick="deleteTask(${task.id})" title="Xóa">🗑️</button>
                    </div>
                `;
            }
            
            taskList.appendChild(li);
        });
    }
    
    updateFilterCounts();
}

function getDueInfo(dueDate) {
    if (!dueDate) return { text: '', class: '' };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        return { text: `Quá hạn ${-diffDays} ngày`, class: 'overdue' };
    } else if (diffDays === 0) {
        return { text: 'Hôm nay', class: 'today' };
    } else if (diffDays === 1) {
        return { text: 'Ngày mai', class: '' };
    } else if (diffDays <= 7) {
        return { text: `${diffDays} ngày nữa`, class: '' };
    } else {
        return { text: formatDate(dueDate), class: '' };
    }
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth() + 1}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function handleEditKeydown(event, id) {
    if (event.key === 'Enter') {
        event.preventDefault();
        saveEditTask(id, event.target.value);
    } else if (event.key === 'Escape') {
        cancelEdit();
    }
}

// ============================================
// FILTER
// ============================================
function updateFilterCounts() {
    const all = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = all - completed;
    
    countAll.textContent = all;
    countPending.textContent = pending;
    countCompleted.textContent = completed;
}

// ============================================
// PROGRESS BAR
// ============================================
function updateProgress() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    
    progressPercent.textContent = `${percent}%`;
    progressCount.textContent = `${completed}/${total} hoàn thành`;
    progressFill.style.width = `${percent}%`;
}

function checkCelebration() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    
    if (total > 0 && total === completed) {
        // Simple celebration - could add confetti later
        console.log('🎉 Congratulations! All tasks completed!');
    }
}

// ============================================
// DARK MODE
// ============================================
function toggleDarkMode() {
    settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
    saveSettings();
    applySettings();
}

// ============================================
// SEARCH
// ============================================
function handleSearch(query) {
    searchQuery = query.trim();
    renderTasks();
}

function clearSearchInput() {
    searchInput.value = '';
    searchQuery = '';
    renderTasks();
}

// ============================================
// SETTINGS
// ============================================
function openSettings() {
    settingsModal.classList.add('show');
}

function closeSettingsModal() {
    settingsModal.classList.remove('show');
}

function openHelp() {
    helpModal.classList.add('show');
}

function closeHelpModal() {
    helpModal.classList.remove('show');
}

function setColorScheme(color) {
    settings.colorScheme = color;
    saveSettings();
    applySettings();
}

// ============================================
// EXPORT / IMPORT
// ============================================
function exportData() {
    const data = {
        tasks: tasks,
        settings: settings,
        exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `todolist-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
}

function importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            if (data.tasks && Array.isArray(data.tasks)) {
                if (confirm(`Nhập ${data.tasks.length} tasks? Dữ liệu hiện tại sẽ được thay thế.`)) {
                    tasks = data.tasks;
                    if (data.settings) {
                        settings = { ...settings, ...data.settings };
                    }
                    saveTasks();
                    saveSettings();
                    applySettings();
                    renderTasks();
                    updateProgress();
                    closeSettingsModal();
                    alert('Nhập dữ liệu thành công!');
                }
            } else {
                alert('File không hợp lệ');
            }
        } catch (err) {
            alert('Lỗi đọc file: ' + err.message);
        }
    };
    reader.readAsText(file);
}

function clearCompleted() {
    const completedCount = tasks.filter(t => t.completed).length;
    if (completedCount === 0) {
        alert('Không có task hoàn thành nào để xóa');
        return;
    }
    
    if (confirm(`Xóa ${completedCount} task đã hoàn thành?`)) {
        tasks = tasks.filter(t => !t.completed);
        saveTasks();
        renderTasks();
        updateProgress();
    }
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
function handleGlobalKeydown(e) {
    // Ignore if typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') {
            e.target.blur();
            cancelEdit();
        }
        return;
    }
    
    switch (e.key.toLowerCase()) {
        case 'n':
            e.preventDefault();
            taskInput.focus();
            break;
        case '/':
            e.preventDefault();
            searchInput.focus();
            break;
        case 'd':
            e.preventDefault();
            toggleDarkMode();
            break;
        case '?':
            e.preventDefault();
            openHelp();
            break;
        case 'escape':
            closeSettingsModal();
            closeHelpModal();
            break;
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    // Add task
    addBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });
    
    // Filter tabs
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });
    
    // Priority filter
    priorityBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            priorityBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPriorityFilter = btn.dataset.priority;
            renderTasks();
        });
    });
    
    // Search
    searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
    clearSearch.addEventListener('click', clearSearchInput);
    
    // Dark mode
    darkModeBtn.addEventListener('click', toggleDarkMode);
    
    // Settings
    settingsBtn.addEventListener('click', openSettings);
    closeSettings.addEventListener('click', closeSettingsModal);
    closeHelp.addEventListener('click', closeHelpModal);
    
    // Close modal on overlay click
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeSettingsModal();
    });
    helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) closeHelpModal();
    });
    
    // Color scheme
    colorBtns.forEach(btn => {
        btn.addEventListener('click', () => setColorScheme(btn.dataset.color));
    });
    
    // Export/Import
    exportBtn.addEventListener('click', exportData);
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            importData(e.target.files[0]);
            e.target.value = ''; // Reset
        }
    });
    
    // Clear completed
    clearCompletedBtn.addEventListener('click', clearCompleted);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleGlobalKeydown);
    
    // Sync
    syncNowBtn.addEventListener('click', syncNow);
    saveApiBtn.addEventListener('click', saveApiUrl);
    
    // Load API URL
    loadApiUrl();
}

// ============================================
// GOOGLE SHEETS SYNC
// ============================================
function loadApiUrl() {
    const savedUrl = localStorage.getItem('apiUrl');
    if (savedUrl) {
        apiUrlInput.value = savedUrl;
        if (window.API) {
            window.API.BASE_URL = savedUrl;
        }
        updateSyncStatus();
    }
}

function saveApiUrl() {
    const url = apiUrlInput.value.trim();
    if (url) {
        localStorage.setItem('apiUrl', url);
        if (window.API) {
            window.API.BASE_URL = url;
        }
        updateSyncStatus();
        alert('Đã lưu API URL!');
    }
}

function updateSyncStatus() {
    if (window.API && window.API.isConfigured()) {
        const lastSync = localStorage.getItem('lastSyncAt');
        if (lastSync) {
            const date = new Date(lastSync);
            syncStatus.textContent = `🟢 Đã kết nối | Sync: ${date.toLocaleTimeString('vi-VN')}`;
        } else {
            syncStatus.textContent = '🟡 Đã kết nối | Chưa sync';
        }
    } else {
        syncStatus.textContent = '⚪ Chưa kết nối';
    }
}

async function syncNow() {
    if (!window.API || !window.API.isConfigured()) {
        alert('Vui lòng nhập và lưu API URL trước!');
        return;
    }
    
    syncStatus.textContent = '🔄 Đang sync...';
    syncNowBtn.disabled = true;
    
    try {
        // Push all local tasks to server
        const result = await window.API.syncAll(tasks);
        
        if (result.success) {
            localStorage.setItem('lastSyncAt', new Date().toISOString());
            updateSyncStatus();
            alert(`Sync thành công! ${result.count || tasks.length} tasks đã được đồng bộ.`);
        } else {
            syncStatus.textContent = '🔴 Lỗi sync';
            alert('Lỗi sync: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        syncStatus.textContent = '🔴 Lỗi sync';
        alert('Lỗi: ' + error.message);
    } finally {
        syncNowBtn.disabled = false;
    }
}

// Cập nhật ngày giờ mỗi phút
setInterval(updateDateTime, 60000);
