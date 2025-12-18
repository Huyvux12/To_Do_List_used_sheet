// ============================================
// GOOGLE SHEETS API MODULE
// Đồng bộ dữ liệu với Google Sheets
// ============================================

const API = {
    // Load URL từ config.js hoặc localStorage
    BASE_URL: '',
    
    // Khởi tạo - load URL từ config hoặc localStorage
    init() {
        // Ưu tiên 1: Load từ CONFIG (config.js)
        if (typeof CONFIG !== 'undefined' && CONFIG.API_URL) {
            this.BASE_URL = CONFIG.API_URL;
        }
        // Ưu tiên 2: Load từ localStorage
        else {
            const saved = localStorage.getItem('apiUrl');
            if (saved) this.BASE_URL = saved;
        }
    },
    
    // Kiểm tra đã config API chưa
    isConfigured() {
        return this.BASE_URL && this.BASE_URL.length > 0 && !this.BASE_URL.includes('YOUR_SCRIPT_ID');
    },
    
    // ============================================
    // API CALLS
    // ============================================
    
    async getTasks() {
        if (!this.isConfigured()) return { success: false, error: 'API not configured' };
        
        try {
            const response = await fetch(`${this.BASE_URL}?action=getTasks`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API getTasks error:', error);
            return { success: false, error: error.message };
        }
    },
    
    async addTask(task) {
        if (!this.isConfigured()) return { success: false, error: 'API not configured' };
        
        try {
            const params = new URLSearchParams({
                action: 'addTask',
                id: task.id,
                text: task.text,
                completed: task.completed,
                priority: task.priority,
                category: task.category || 'other',
                dueDate: task.dueDate || '',
                note: task.note || '',
                order: task.order || 0
            });
            
            const response = await fetch(`${this.BASE_URL}?${params}`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API addTask error:', error);
            return { success: false, error: error.message };
        }
    },
    
    async updateTask(id, field, value) {
        if (!this.isConfigured()) return { success: false, error: 'API not configured' };
        
        try {
            const params = new URLSearchParams({
                action: 'updateTask',
                id: id,
                field: field,
                value: value
            });
            
            const response = await fetch(`${this.BASE_URL}?${params}`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API updateTask error:', error);
            return { success: false, error: error.message };
        }
    },
    
    async deleteTask(id) {
        if (!this.isConfigured()) return { success: false, error: 'API not configured' };
        
        try {
            const params = new URLSearchParams({
                action: 'deleteTask',
                id: id
            });
            
            const response = await fetch(`${this.BASE_URL}?${params}`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API deleteTask error:', error);
            return { success: false, error: error.message };
        }
    },
    
    async syncAll(tasks) {
        if (!this.isConfigured()) return { success: false, error: 'API not configured' };
        
        try {
            const response = await fetch(this.BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain', // Apps Script doesn't support JSON content-type well
                },
                body: JSON.stringify({
                    action: 'syncAll',
                    tasks: tasks
                })
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API syncAll error:', error);
            return { success: false, error: error.message };
        }
    }
};

// ============================================
// SYNC MANAGER - Hybrid Mode
// Local first + background sync
// ============================================

const SyncManager = {
    pendingChanges: [],
    isSyncing: false,
    lastSyncAt: null,
    
    // Khởi tạo
    init() {
        this.loadPendingChanges();
        this.lastSyncAt = localStorage.getItem('lastSyncAt');
        
        // Sync khi có mạng trở lại
        window.addEventListener('online', () => this.syncPendingChanges());
        
        // Sync định kỳ mỗi 5 phút
        setInterval(() => this.syncPendingChanges(), 5 * 60 * 1000);
    },
    
    // Lưu thay đổi pending
    savePendingChanges() {
        localStorage.setItem('pendingChanges', JSON.stringify(this.pendingChanges));
    },
    
    loadPendingChanges() {
        const saved = localStorage.getItem('pendingChanges');
        this.pendingChanges = saved ? JSON.parse(saved) : [];
    },
    
    // Thêm thay đổi vào queue
    addChange(type, data) {
        if (!API.isConfigured()) return;
        
        this.pendingChanges.push({
            type,
            data,
            timestamp: Date.now()
        });
        this.savePendingChanges();
        
        // Debounce sync
        this.debouncedSync();
    },
    
    // Debounce để gom nhiều thay đổi
    debouncedSync: debounce(function() {
        SyncManager.syncPendingChanges();
    }, 2000),
    
    // Sync các thay đổi pending
    async syncPendingChanges() {
        if (!API.isConfigured() || this.isSyncing || this.pendingChanges.length === 0) {
            return;
        }
        
        if (!navigator.onLine) {
            console.log('Offline - sync later');
            return;
        }
        
        this.isSyncing = true;
        console.log(`Syncing ${this.pendingChanges.length} changes...`);
        
        try {
            // Group changes và sync
            for (const change of this.pendingChanges) {
                let result;
                
                switch (change.type) {
                    case 'add':
                        result = await API.addTask(change.data);
                        break;
                    case 'update':
                        result = await API.updateTask(change.data.id, change.data.field, change.data.value);
                        break;
                    case 'delete':
                        result = await API.deleteTask(change.data.id);
                        break;
                }
                
                if (!result.success) {
                    console.error('Sync failed:', result.error);
                    // Giữ lại change để retry sau
                    continue;
                }
            }
            
            // Clear pending changes nếu thành công
            this.pendingChanges = [];
            this.savePendingChanges();
            
            this.lastSyncAt = new Date().toISOString();
            localStorage.setItem('lastSyncAt', this.lastSyncAt);
            
            console.log('Sync completed!');
        } catch (error) {
            console.error('Sync error:', error);
        } finally {
            this.isSyncing = false;
        }
    },
    
    // Full sync - lấy data từ server
    async fullSync() {
        if (!API.isConfigured()) {
            return { success: false, error: 'API not configured' };
        }
        
        try {
            const result = await API.getTasks();
            if (result.success) {
                return { success: true, tasks: result.tasks };
            }
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Push all local data lên server
    async pushAll(tasks) {
        if (!API.isConfigured()) {
            return { success: false, error: 'API not configured' };
        }
        
        return await API.syncAll(tasks);
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================
// EXPORT
// ============================================

// Khởi tạo API và SyncManager khi load
document.addEventListener('DOMContentLoaded', () => {
    API.init();
    SyncManager.init();
});

// Expose to global scope for use in script.js
window.API = API;
window.SyncManager = SyncManager;
