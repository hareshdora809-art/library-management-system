# 📚 Alexandria - Modern Library Management System & Applications

A complete multi-platform **Library Management System** available as:
1. **🖥️ Native Desktop Application** (Python + Tkinter / TTK + SQLite)
2. **📱 Installable Progressive Web App (PWA)** (Add to Dock / Home Screen / Standalone window)
3. **🌐 Web Application Suite** (Full REST API + SQLite or Browser Storage)

---

## 🚀 How to Run

### 1. 🖥️ Launch the Native Desktop App
Run the native desktop GUI with custom modern styling, sidebar navigation, dialogs, and direct SQLite database connectivity:

```bash
cd /Users/gudahareshdora/.gemini/antigravity/scratch/library-management-system
python3 desktop_app.py
```
> **macOS Double-Click Shortcut**: You can also simply double-click the included executable:  
> **`Alexandria_Library.command`** in Finder!

---

### 2. 📱 Install as a Desktop / Mobile App (PWA)
1. Start the server:
   ```bash
   python3 server.py
   ```
2. Open **[http://localhost:8000](http://localhost:8000)** in Safari, Chrome, Edge, or Firefox.
3. Click the **"📲 Install Alexandria App"** button in the left sidebar:
   - **On Mac Safari**: Choose `File` → `Add to Dock...` to create a native standalone macOS app icon.
   - **On Chrome / Edge**: Click `Install Alexandria LMS` in the address bar.
   - **On Mobile**: Choose `Add to Home Screen`.

---

### 3. 🌐 Run the Web Application
```bash
python3 server.py
```
Then visit **[http://localhost:8000](http://localhost:8000)** in any browser.

---

### 4. ⚡ Universal Launcher
You can use `run_app.py` to launch either format:
```bash
# Launch Desktop GUI:
python3 run_app.py --gui

# Launch Web Server & auto-open browser:
python3 run_app.py --web
```

---

## 📁 Project Architecture

```text
library-management-system/
├── Alexandria_Library.command # Double-clickable macOS launcher
├── desktop_app.py             # Python native Desktop GUI (Tkinter + SQLite)
├── run_app.py                 # Universal app launcher (--gui / --web)
├── server.py                  # Python standard-library REST API & static server
├── library.db                 # SQLite database file (shared between Desktop & Web)
├── README.md                  # Comprehensive documentation
└── public/                    # PWA & Web Application
    ├── index.html             # UI with Tailwind CSS & PWA metadata
    ├── manifest.json          # PWA Web App Manifest
    ├── sw.js                  # Service Worker for offline app caching
    ├── icons/
    │   └── icon.svg           # Scalable application icon artwork
    ├── css/
    │   └── styles.css         # 3D book cover styles, badges, animations
    └── js/
        ├── api.js             # API client with auto-fallback to LocalStorage
        ├── sample-data.js     # Seed catalog of books, members, loans
        └── app.js             # Core reactive UI logic & PWA installer
```

---

## 🛠️ Features Breakdown

| Feature | Desktop App | PWA / Web App |
|---|:---:|:---:|
| **Dashboard KPIs & Activity** | ✅ | ✅ |
| **Catalog Search & Filtering** | ✅ | ✅ |
| **Add / Edit / Delete Books** | ✅ | ✅ |
| **Circulation (Issue / Return)** | ✅ | ✅ |
| **Automatic Overdue Fines ($0.50/day)**| ✅ | ✅ |
| **Patron / Member Management** | ✅ | ✅ |
| **Persistent SQLite Storage** | ✅ | ✅ |
| **Dark Mode & Styling** | Modern Dark/Slate | Dark & Light Switchable |
| **Zero External pip Dependencies** | ✅ | ✅ |
