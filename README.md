# 📝 To-Do List - Personal










![Preview](https://img.shields.io/badge/Status-Active-success) ![License](https://img.shields.io/badge/License-MIT-blue)

## ✨ Tính năng

### Cơ bản
- ➕ Thêm công việc mới
- ✅ Đánh dấu hoàn thành (click checkbox)
- ✏️ Sửa task (double-click)
- 🗑️ Xóa công việc
- 📊 Thanh tiến độ hiển thị % hoàn thành
- 📅 Hiển thị ngày tháng tiếng Việt + lời chào

### Quản lý task
- 🔴🟡🟢 Mức độ ưu tiên (Cao / Trung bình / Thấp)
- 📆 Deadline với cảnh báo quá hạn
- 🔍 Tìm kiếm task
- 🔘 Filter: Tất cả / Đang làm / Đã xong
- 📊 Filter theo mức ưu tiên

### Giao diện
- 🌙 Dark mode
- 🎨 5 theme màu (Purple, Blue, Green, Orange, Pink)
- 📱 Responsive mobile
- ⌨️ Keyboard shortcuts

### Dữ liệu
- 💾 Tự động lưu localStorage
- ☁️ Đồng bộ Google Sheets (tùy chọn)
- 📤 Export JSON backup
- 📥 Import JSON restore

## ⌨️ Phím tắt

| Phím | Chức năng |
|------|-----------|
| `N` | Thêm task mới |
| `/` | Tìm kiếm |
| `D` | Bật/tắt Dark mode |
| `?` | Hiện trợ giúp |
| `Escape` | Đóng modal / Hủy edit |
| `Enter` | Lưu khi đang sửa |

## 📁 Cấu trúc thư mục

```
ToDoList/
├── index.html          # Cấu trúc HTML
├── style.css           # Giao diện & themes
├── script.js           # Logic chính
├── api.js              # Google Sheets API module
├── config.js           # Cấu hình API URL (không commit)
├── config.example.js   # Template config
├── .gitignore          # Ignore config.js
└── README.md           # Hướng dẫn (file này)
```

## 🚀 Cài đặt & Deploy

### Bước 1: Clone/Download

```bash
git clone https://github.com/YOUR_USERNAME/todolist.git
cd todolist
```

### Bước 2: Cấu hình (Tùy chọn - nếu dùng Google Sheets sync)

```bash
# Copy template config
cp config.example.js config.js

# Mở config.js và điền Apps Script URL
```

### Bước 3: Push lên GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/todolist.git
git push -u origin main
```

### Bước 4: Bật GitHub Pages

1. Vào repository → **Settings**
2. Sidebar → **Pages**
3. Source: **Deploy from a branch**
4. Branch: `main` / `(root)`
5. Click **Save**

### Bước 5: Truy cập

```
https://YOUR_USERNAME.github.io/todolist/
```

## ☁️ Đồng bộ Google Sheets (Tùy chọn)

Nếu muốn sync data giữa các thiết bị:

### 1. Tạo Google Sheet

1. Tạo Spreadsheet mới tại [sheets.google.com](https://sheets.google.com)
2. Đổi tên Sheet1 thành: `Tasks`
3. Thêm header hàng 1:

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| id | text | completed | priority | category | dueDate | note | order | createdAt | updatedAt |

### 2. Tạo Apps Script

1. **Extensions** → **Apps Script**
2. Paste code từ file `apps-script.gs` (xem bên dưới)
3. Thay `SHEET_ID` bằng ID sheet của bạn
4. **Deploy** → **New deployment** → **Web app**
5. Who has access: **Anyone**
6. Copy URL

### 3. Cấu hình trong app

1. Tạo file `config.js`:

```javascript
const CONFIG = {
    API_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec'
};
```

2. Thêm `config.js` vào `.gitignore` để không commit URL

### Apps Script Code

<details>
<summary>Click để xem code Apps Script</summary>

```javascript
const SHEET_ID = 'YOUR_SHEET_ID_HERE';
const SHEET_NAME = 'Tasks';

function doGet(e) { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) return output.setContent(JSON.stringify({ success: false, error: 'Sheet not found' }));
    
    let action = e.parameter.action;
    
    if (e.postData && e.postData.contents) {
      const body = JSON.parse(e.postData.contents);
      if (body.action) action = body.action;
      if (action === 'syncAll') return output.setContent(JSON.stringify(syncAll(sheet, body)));
    }
    
    let result;
    switch(action) {
      case 'getTasks': result = getTasks(sheet); break;
      case 'addTask': result = addTask(sheet, e.parameter); break;
      case 'updateTask': result = updateTask(sheet, e.parameter); break;
      case 'deleteTask': result = deleteTask(sheet, e.parameter); break;
      case 'ping': result = { success: true, message: 'API is working!' }; break;
      default: result = { success: false, error: 'Invalid action' };
    }
    return output.setContent(JSON.stringify(result));
  } catch (error) {
    return output.setContent(JSON.stringify({ success: false, error: error.message }));
  }
}

function getTasks(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: true, tasks: [] };
  const headers = data[0];
  const tasks = data.slice(1).filter(row => row[0]).map(row => {
    const task = {};
    headers.forEach((h, i) => {
      let v = row[i];
      if (v instanceof Date) v = Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
      if (h === 'completed') v = v === true || v === 'TRUE';
      task[h] = v;
    });
    return task;
  });
  return { success: true, tasks };
}

function addTask(sheet, p) {
  const id = p.id || Date.now();
  sheet.appendRow([id, p.text||'', p.completed==='true', p.priority||'medium', 
    p.category||'other', p.dueDate||'', p.note||'', p.order||0, new Date(), new Date()]);
  return { success: true, id };
}

function updateTask(sheet, p) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const col = headers.indexOf(p.field);
  if (col === -1) return { success: false, error: 'Invalid field' };
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(p.id)) {
      const val = p.field === 'completed' ? p.value === 'true' : p.value;
      sheet.getRange(i+1, col+1).setValue(val);
      sheet.getRange(i+1, 10).setValue(new Date());
      return { success: true };
    }
  }
  return { success: false, error: 'Not found' };
}

function deleteTask(sheet, p) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(p.id)) {
      sheet.deleteRow(i+1);
      return { success: true };
    }
  }
  return { success: false, error: 'Not found' };
}

function syncAll(sheet, body) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow-1, 10).clear();
  (body.tasks || []).forEach((t, i) => {
    sheet.appendRow([t.id, t.text, t.completed===true, t.priority||'medium', 
      t.category||'other', t.dueDate||'', t.note||'', t.order||i, t.createdAt||new Date(), new Date()]);
  });
  return { success: true, count: body.tasks?.length || 0 };
}
```

</details>

## 💡 Lưu ý

### Về localStorage
- Dữ liệu lưu trên trình duyệt của bạn
- **Mất dữ liệu** nếu: Clear browser data, đổi trình duyệt, đổi máy
- Phù hợp dùng cá nhân, 1 thiết bị

### Về Google Sheets sync
- Dữ liệu lưu trên Google Drive của bạn
- Sync giữa nhiều thiết bị
- **Quan trọng:** Không commit `config.js` lên Git (đã có trong `.gitignore`)

## 🛠️ Tùy chỉnh

| Muốn thay đổi | File | Vị trí |
|---------------|------|--------|
| Màu gradient | `style.css` | CSS variables `:root` |
| Font chữ | `index.html` | Google Fonts link |
| Lời chào | `script.js` | Function `updateDateTime()` |
| Theme colors | `style.css` | `--gradient-*` variables |

## 🔒 Bảo mật

- File `config.js` chứa API URL → **Không commit** lên Git
- Đã có `.gitignore` để tự động bỏ qua
- Nếu URL bị lộ → Tạo deployment mới trên Apps Script

## 📄 License

MIT License - Thoải mái sử dụng và chỉnh sửa.

---

Made with ❤️ for personal productivity

