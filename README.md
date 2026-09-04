# 📄 AllDocumentReader

A React Native Android app to scan, browse, view, and manage all your documents — PDF, Word, Excel, PowerPoint, TXT, EPUB, and RTF — in one place.

---

## ✨ Features

- **📂 File Scanning** — Scans the entire device storage for documents using a high-performance native Kotlin module (MediaStore API)
- **📖 Built-in PDF Viewer** — Read PDF files with page navigation, jump-to-page, and page indicator
- **📝 Text File Viewer** — View `.txt` files directly in-app
- **⭐ Favorites** — Mark documents as favorites for quick access
- **🕐 Recent Documents** — Automatically tracks your last 50 opened documents
- **🗑️ Trash** — Soft-delete with 30-day auto-purge and restore capability
- **✏️ Rename** — Rename files directly from the app
- **📤 Share** — Share documents via Android Intent
- **🔍 Search** — Search through file lists by name
- **⚙️ Settings** — Keep Screen On toggle, privacy policy, share app, rate us
- **📱 Side Menu** — Animated drawer with quick actions
- **🎨 Custom Splash Screen** — Animated splash with document-type watermarks

---

## 📸 Screenshots

The `ui/` directory contains design mockups for all screens:  
Splash, Home, File List, Document Viewer, Favorites, Settings, Trash, Search, Side Menu, and more.

---

## 🏗️ Tech Stack

| Technology | Version |
|------------|---------|
| React Native | 0.87.1 |
| React | 19.2.3 |
| TypeScript | 6.x |
| Kotlin | Native module |
| React Navigation | 7.x |
| react-native-pdf | 7.x |
| react-native-blob-util | 0.24.x |
| Hermes | Default JS engine |

---

## 📁 Project Structure

```
AllDocumentReader/
├── src/
│   ├── App.tsx                 # Root — navigation setup
│   ├── screens/                # 8 screens (Splash, Home, FileList, Viewer, Favorites, Settings, Trash, AllFiles)
│   ├── components/             # Reusable components organized by feature
│   │   ├── common/             # Loading spinner, shared primitives
│   │   ├── home/               # Tools grid, recent documents
│   │   ├── ui/                 # File list items, action menus
│   │   ├── viewer/             # Viewer header, toolbar, modals, page indicator
│   │   └── settings/           # Setting item component
│   ├── services/               # Business logic & JSON persistence
│   │   ├── FileScanner.ts      # Native module bridge
│   │   ├── FavoritesService.ts # Favorites CRUD
│   │   ├── RecentDocumentsService.ts
│   │   ├── TrashService.ts     # 30-day auto-delete trash
│   │   ├── SettingsService.ts  # App settings + utility actions
│   │   └── fileHelpers.ts      # Formatting utilities
│   ├── types/                  # TypeScript definitions
│   └── utils/                  # Utility functions
├── Assets/                     # Icons, tab images, splash graphics
├── android/                    # Android native project
│   └── .../FileScannerModule.kt  # Custom Kotlin native module
├── W2P/                        # OfflineDocConverter module (standalone, future integration)
├── project_context.md          # Full project context & architecture documentation
├── AGENT.md                    # Development guidelines & best practices
└── ui/                         # UI design mockup screenshots
```

> 📖 See [`project_context.md`](project_context.md) for comprehensive architecture details.  
> 🤖 See [`AGENT.md`](AGENT.md) for coding standards and best practices.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 22.11.0
- **JDK** 17+
- **Android Studio** with Android SDK
- **React Native CLI** environment set up ([guide](https://reactnative.dev/docs/set-up-your-environment))

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd AllDocumentReader

# Install dependencies
npm install
```

### Running the App

#### 1. Start Metro Bundler

```bash
npm start
```

#### 2. Run on Android

```bash
npm run android
```

#### 3. Run on iOS (secondary target)

```bash
# Install CocoaPods (first time only)
bundle install
bundle exec pod install

npm run ios
```

---

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start Metro dev server |
| `npm run android` | Build & run on Android device/emulator |
| `npm run ios` | Build & run on iOS simulator |
| `npm run lint` | Run ESLint checks |
| `npm test` | Run Jest tests |

---

## 🧭 Navigation

```
Stack Navigator
├── Splash Screen        → Auto-navigates after 2.5s
├── Main Tabs (Bottom Tab Navigator)
│   ├── Home             → File type tools grid + recent documents
│   ├── Favorites        → Starred files
│   └── Settings         → Keep Screen On, Trash, Privacy, Share, Rate
├── File List            → Filtered by type (pdf, word, excel, etc.)
├── Document Viewer      → PDF/TXT viewer with actions
└── Trash                → Soft-deleted files with 30-day countdown
```

---

## 📱 Supported File Types

| Format | Extensions | In-App Viewing |
|--------|-----------|----------------|
| PDF | `.pdf` | ✅ Built-in |
| Plain Text | `.txt` | ✅ Built-in |
| Word | `.doc`, `.docx` | Opens externally |
| Excel | `.xls`, `.xlsx` | Opens externally |
| PowerPoint | `.ppt`, `.pptx` | Opens externally |
| eBook | `.epub` | Scan only |
| Rich Text | `.rtf` | Scan only |

---

## 🔌 Native Module

The app includes a custom **Kotlin native module** (`FileScannerModule`) that provides:

- Device-wide file scanning via Android MediaStore API
- File delete, rename, and share via ContentResolver + Intent
- Keep Screen On toggle via WindowManager flags
- Android 11+ (API 30) `MANAGE_EXTERNAL_STORAGE` permission handling

---

## 📦 W2P — OfflineDocConverter (Future)

The `W2P/` directory contains a standalone Android module for **offline document-to-PDF conversion** supporting 30+ file formats. It is not yet integrated into the main app but is planned for future releases to enable in-app viewing and conversion of Word, Excel, PPT, and other formats.

---

## 🤝 Contributing

1. Read [`AGENT.md`](AGENT.md) for coding guidelines.
2. Read [`project_context.md`](project_context.md) for architecture context.
3. Follow the established patterns for components, services, and types.
4. Run `npm run lint` before submitting changes.
5. Update documentation when making structural changes.

---

## 📄 License

Private project — All rights reserved.
