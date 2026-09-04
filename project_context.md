# AllDocumentReader — Project Context

> **Last Updated:** 2026-09-04  
> **Version:** 0.0.1  
> **Platform:** Android (React Native)

---

## 1. Overview

**AllDocumentReader** is a React Native mobile application that lets users scan, browse, view, and manage documents stored on their Android device. It supports PDF, Word, Excel, PowerPoint, TXT, EPUB, and RTF file formats. The app provides native-level file scanning via a custom Kotlin bridge module (`FileScannerModule`), a built-in PDF viewer, a text file viewer, favorites, recent documents, trash (30-day auto-delete), and user settings.

---

## 2. Tech Stack

| Layer              | Technology                                                                 |
|--------------------|---------------------------------------------------------------------------|
| **Framework**      | React Native `0.87.1` (New Architecture)                                  |
| **Language**       | TypeScript `6.x`, Kotlin (native Android module)                          |
| **React**          | React `19.2.3`                                                            |
| **Navigation**     | `@react-navigation/native` `7.x`, `native-stack` `7.x`, `bottom-tabs` `7.x` |
| **PDF Viewer**     | `react-native-pdf` `7.x`                                                 |
| **File I/O**       | `react-native-blob-util` `0.24.x` (persistent JSON storage, file reads)  |
| **Safe Area**      | `react-native-safe-area-context` `5.x`                                   |
| **Screen Mgmt**    | `react-native-screens` `4.x`                                             |
| **JS Engine**      | Hermes (default)                                                          |
| **Build System**   | Gradle (Android), Metro Bundler                                           |
| **Tooling**        | ESLint, Prettier, Jest                                                    |
| **Node Requirement** | `>= 22.11.0`                                                           |

---

## 3. Project Structure

```
AllDocumentReader/
├── index.js                        # App entry point — registers <App />
├── app.json                        # App name: "AllDocumentReader"
├── package.json                    # Dependencies & scripts
├── tsconfig.json                   # Extends @react-native/typescript-config
├── metro.config.js                 # Default Metro config
├── babel.config.js                 # Babel config
├── jest.config.js                  # Jest config
├── .eslintrc.js                    # ESLint config
├── .prettierrc.js                  # Prettier config
│
├── src/                            # ★ Main application source code
│   ├── App.tsx                     # Root component — navigation setup
│   ├── screens/                    # Screen components
│   │   ├── SplashScreen.tsx        # Animated splash with auto-nav (2.5s)
│   │   ├── HomeScreen.tsx          # Home tab — tools grid + recent docs
│   │   ├── FileListScreen.tsx      # File listing by type — scan, search, actions
│   │   ├── DocumentViewerScreen.tsx# PDF/TXT viewer with toolbar actions
│   │   ├── FavoriteScreen.tsx      # Favorited files list
│   │   ├── SettingScreen.tsx       # App settings
│   │   ├── TrashScreen.tsx         # Trashed files (30-day auto-delete)
│   │   └── AllFiles.tsx            # (minimal — placeholder/stub)
│   │
│   ├── components/                 # Reusable UI components
│   │   ├── CustomHeader.tsx        # App header bar with menu button
│   │   ├── FileListHeader.tsx      # File list screen header with search & back
│   │   ├── SideMenu.tsx            # Animated drawer menu (Privacy, Share, Rate)
│   │   ├── PDFViewerScreen.tsx     # (stub — not actively used)
│   │   │
│   │   ├── home/                   # Home screen components
│   │   │   ├── toolsContainer.tsx  # 2×4 grid of file type tool cards
│   │   │   ├── tool.tsx            # Single tool card component
│   │   │   ├── RecentDocuments.tsx # Recent documents list section
│   │   │   └── EmptyDocState.tsx   # Empty state illustration
│   │   │
│   │   ├── ui/                     # Shared UI components (lists, modals)
│   │   │   ├── FileListItem.tsx    # Single file row in file lists
│   │   │   ├── FileActionMenuModal.tsx  # Long-press 3-dot action menu
│   │   │   ├── TrashListItem.tsx   # Trash file row with days remaining
│   │   │   └── TrashActionMenuModal.tsx # Trash action menu (restore/delete)
│   │   │
│   │   ├── viewer/                 # Document viewer sub-components
│   │   │   ├── DocumentHeader.tsx  # Viewer header (title, back, share)
│   │   │   ├── DocumentBottomToolbar.tsx # Bottom toolbar (fav, rename, delete, jump)
│   │   │   ├── JumpToPageModal.tsx # Jump-to-page modal with stepper
│   │   │   ├── RenameModal.tsx     # Rename file modal
│   │   │   ├── PageIndicator.tsx   # Current/total page overlay badge
│   │   │   └── TextDocumentViewer.tsx # Plain text file renderer
│   │   │
│   │   ├── settings/               # Settings components
│   │   │   └── SettingItem.tsx     # Individual setting row (switch/link)
│   │   │
│   │   └── common/                 # Common shared components
│   │       ├── Loading.tsx         # Full-screen loading spinner
│   │       └── index.ts           # Barrel export
│   │
│   ├── services/                   # Business logic & data persistence
│   │   ├── FileScanner.ts         # Native module bridge — scan, delete, rename, share, keepScreenOn
│   │   ├── DocConverterService.ts # W2P converter bridge — document-to-PDF conversion + caching
│   │   ├── FavoritesService.ts    # Favorites CRUD (favorites.json)
│   │   ├── RecentDocumentsService.ts # Recent docs CRUD (recent_documents.json, max 50)
│   │   ├── TrashService.ts        # Trash CRUD with 30-day auto-delete (trash.json)
│   │   ├── SettingsService.ts     # Settings persistence + utility actions (share, rate, privacy)
│   │   └── fileHelpers.ts         # Formatting utils (bytes, dates, icons, colors)
│   │
│   ├── types/                      # TypeScript type definitions
│   │   └── types.ts               # ScannedFile, RootStackParamList
│   │
│   └── utils/                      # Utility functions
│       └── fileScanner.ts         # JS-based file scanner (legacy — uses react-native-fs, not actively used)
│
├── Assets/                         # Static image assets
│   ├── app_icon.png               # App icon
│   ├── loading.gif                # Loading animation
│   ├── clear_all.png              # Clear all icon
│   ├── home/                      # Home screen tool icons (pdf, word, excel, ppt, txt, epub, rtf, allfiles)
│   ├── icons/                     # Action icons (search, share, delete, favorite, etc.)
│   ├── tabs/                      # Bottom tab bar icons (home, favorite, settings — active/inactive)
│   └── splash/                    # Splash screen vector graphic
│
├── android/                        # Android native project
│   └── app/src/main/java/com/alldocumentreader/
│       ├── FileScannerModule.kt   # ★ Custom native module (file scanning via MediaStore, delete, rename, share, keepScreenOn)
│       ├── DocConverterModule.kt  # ★ W2P bridge module (offline document-to-PDF conversion)
│       ├── FileScannerPackage.kt  # React Native package registration (both modules)
│       ├── MainActivity.kt       # Main activity
│       └── MainApplication.kt    # Application class
│
├── W2P/                            # ★ Standalone Android module: OfflineDocConverter
│   │                               #   Converts various document formats to PDF (offline, zero-dependency)
│   │                               #   INTEGRATED into the React Native app via DocConverterModule
│   ├── app/                       # Android app module (demo/test shell)
│   ├── docx2pdf/                  # Core conversion library (included as Gradle dependency)
│   ├── presentation/              # Presentation layer
│   └── README.md                  # Detailed docs on supported formats
│
├── ui/                             # UI design mockup screenshots (30 images)
│                                   # Reference screens: Main Screen, Splash, Settings, Favorites,
│                                   # Trash, Document Viewer, Search, Popup, Side Menu, etc.
│
├── error/                          # Design reference images (list design, list_item)
│
├── __tests__/                      # Jest test directory
├── ios/                            # iOS project (placeholder — not primary target)
└── .git/                           # Git repository
```

---

## 4. Navigation Architecture

```
NavigationContainer
└── Stack.Navigator (RootStackParamList)
    ├── "Splash"    → SplashScreen         (auto-navigates to MainTabs after 2.5s)
    ├── "MainTabs"  → Tab.Navigator
    │   ├── "Home"     → HomeScreen        (tools grid + recent documents)
    │   ├── "Favorite" → FavoriteScreen    (favorited files)
    │   └── "Setting"  → SettingScreen     (keep screen on, trash, privacy, share, rate)
    ├── "FileList"  → FileListScreen       (params: { fileType: string })
    ├── "FileViewer"→ DocumentViewerScreen (params: { file: ScannedFile })
    └── "Trash"     → TrashScreen          (trashed files with auto-delete countdown)
```

**Side Menu** is rendered as an overlay `<Modal>` inside `<NavigationContainer>`, controlled via `isSideMenuVisible` state in `App.tsx`. It provides: Privacy Policy, Share with Friends, and Rate Us actions.

---

## 5. Core Type Definitions

```typescript
// src/types/types.ts

type ScannedFile = {
  id: string;
  name: string;
  uri: string;        // content:// URI from native MediaStore
  mimeType: string;
  extension: string;
  size: number;
  modifiedDate: number; // epoch ms
};

type RootStackParamList = {
  Splash: undefined;
  MainTabs: undefined;
  FileList: { fileType: string };
  FileViewer: { file: ScannedFile };
  Trash: undefined;
};
```

---

## 6. Services Architecture

### 6.1 FileScanner (`services/FileScanner.ts`)
The primary bridge to the native `FileScannerModule` (Kotlin). Exposes:
- **`requestStoragePermission()`** — Handles Android 11+ (`MANAGE_EXTERNAL_STORAGE`), Android 10- (`READ/WRITE_EXTERNAL_STORAGE`)
- **`scanFiles(fileType)`** — Scans device via native MediaStore, filters out trashed files
- **`deleteFile(uri)`** — Permanently deletes a file on disk
- **`renameFile(uri, newName)`** — Renames file and returns updated `ScannedFile`
- **`shareFile(uri, mimeType, title)`** — Shares via Android Intent + FileProvider
- **`setKeepScreenOn(enable)` / `isKeepScreenOn()`** — Toggle Android `FLAG_KEEP_SCREEN_ON`

### 6.2 FavoritesService (`services/FavoritesService.ts`)
JSON file-based persistence at `DocumentDir/favorites.json`:
- `getFavorites()`, `addFavorite()`, `removeFavorite()`, `toggleFavorite()`, `isFavorite()`, `updateFavoriteFile()`

### 6.3 RecentDocumentsService (`services/RecentDocumentsService.ts`)
JSON file-based persistence at `DocumentDir/recent_documents.json` (max 50 entries):
- `getRecentDocuments()`, `addRecentDocument()`, `removeRecentDocument()`, `updateRecentDocument()`, `clearRecentDocuments()`

### 6.4 TrashService (`services/TrashService.ts`)
JSON file-based trash at `DocumentDir/trash.json` with **30-day auto-delete**:
- `getTrashFiles()` — Auto-purges expired (≥30 day) files on load
- `moveToTrash()` — Also removes from favorites & recents
- `restoreFromTrash()`, `deletePermanently()`, `clearAllTrash()`
- `getDaysRemaining()`, `formatDaysRemaining()` — Countdown helpers

### 6.5 SettingsService (`services/SettingsService.ts`)
JSON file-based settings at `DocumentDir/app_settings.json`:
- **Settings:** `keepScreenOn` (boolean, default: `true`)
- **Utility actions:** `openPrivacyPolicy()`, `shareApp()`, `rateApp()`
- **Init:** `initSettings()` — Called on app start, applies saved settings

### 6.6 DocConverterService (`services/DocConverterService.ts`)
TypeScript bridge to the native `DocConverterModule` (W2P library). Provides:
- **`isConvertibleExtension(ext)`** — Check if a file extension can be converted to PDF
- **`convertToPdf(inputUri, fileName)`** — Convert a document to PDF, with file-based caching
- **`clearConversionCache()`** — Clear all cached converted PDFs
- Cache location: `CacheDir/converted_pdfs/` — uses URI-based hash keys to avoid re-conversion

### 6.7 fileHelpers (`services/fileHelpers.ts`)
Pure utility functions:
- `formatBytes()`, `formatDate()`, `formatTime()`
- `getIconForExtension()`, `getBgColorForExtension()`
- `UNSUPPORTED_VIEWER_EXTENSIONS` — `['ppt','pptx','doc','docx','xls','xlsx']` (opened externally)

---

## 7. Native Android Module

### FileScannerModule.kt
A custom Kotlin native module (`com.alldocumentreader.FileScannerModule`) registered via `FileScannerPackage.kt`. Key capabilities:

| Method | Description |
|--------|-------------|
| `isAllFilesAccessGranted()` | Check if MANAGE_EXTERNAL_STORAGE is granted (Android 11+) |
| `requestAllFilesAccess()` | Opens system settings for all-files-access |
| `scanFiles(fileType)` | Queries `MediaStore.Files` for documents matching type |
| `deleteFile(uri)` | Deletes file via ContentResolver or direct File API |
| `renameFile(uri, newName)` | Renames via ContentResolver/File API, re-scans media |
| `shareFile(uri, mimeType, title)` | Shares via Intent + FileProvider |
| `setKeepScreenOn(enable)` | Sets/clears `FLAG_KEEP_SCREEN_ON` on current Activity window |
| `isKeepScreenOn()` | Checks if flag is currently set |

### DocConverterModule.kt
A custom Kotlin native module (`com.alldocumentreader.DocConverterModule`) that bridges the W2P `OfflineDocConverterImpl` library:

| Method | Description |
|--------|-------------|
| `convertToPdf(inputUri, outputPath)` | Converts a document to PDF offline, writes to the given output path |
| `isConversionSupported(extension)` | Checks if a file extension is supported for conversion |

**Package ID:** `com.alldocumentreader`  
**Min SDK:** Defined in root `build.gradle` (`rootProject.ext.minSdkVersion`)

---

## 8. Data Persistence Strategy

All app data is persisted as **JSON files** in the app's `DocumentDir` (via `react-native-blob-util`):

| File | Purpose |
|------|---------|
| `favorites.json` | Array of `ScannedFile` objects marked as favorite |
| `recent_documents.json` | Array of `ScannedFile` (max 50, most-recent-first) |
| `trash.json` | Array of `TrashedFile` (extends `ScannedFile` + `trashedAt` epoch) |
| `app_settings.json` | `AppSettings` object (`{ keepScreenOn: boolean }`) |

---

## 9. Supported File Types

| Category | Extensions | Viewing Support |
|----------|-----------|-----------------|
| PDF | `.pdf` | ✅ Built-in viewer (`react-native-pdf`) |
| Plain Text | `.txt` | ✅ Built-in viewer (`TextDocumentViewer`) |
| Word | `.docx` | ✅ Convert to PDF → built-in viewer (W2P) |
| Word (legacy) | `.doc` | ✅ Convert to PDF → built-in viewer (W2P) |
| Excel | `.xlsx` | ✅ Convert to PDF → built-in viewer (W2P) |
| Excel (legacy) | `.xls` | ✅ Convert to PDF → built-in viewer (W2P) |
| PowerPoint | `.pptx` | ✅ Convert to PDF → built-in viewer (W2P) |
| PowerPoint (legacy) | `.ppt` | ✅ Convert to PDF → built-in viewer (W2P) |
| eBook | `.epub` | ✅ Convert to PDF → built-in viewer (W2P) |
| Rich Text | `.rtf` | ✅ Convert to PDF → built-in viewer (W2P) |

---

## 10. W2P Module (Integrated)

The `W2P/` directory contains **OfflineDocConverter** — a standalone Android/Kotlin library for converting documents to PDF offline. It is **integrated into the React Native app** as a local Gradle module dependency.

**Integration architecture:** `W2P/docx2pdf` → Gradle dependency → `DocConverterModule.kt` (native bridge) → `DocConverterService.ts` (JS service with caching) → `DocumentViewerScreen.tsx` (convert-then-view flow).

**Supported formats:** `.docx`, `.pptx`, `.xlsx`, `.epub`, `.rtf`, `.md`, `.txt`, `.tex`, `.csv`, `.tsv`, `.json`, `.xml`, images, source code files, and native PDF pass-through.

**Caching:** Converted PDFs are cached in `CacheDir/converted_pdfs/` using URI-based hash keys. Repeated opens of the same file use the cached PDF without re-conversion.

---

## 11. UI Design System

- **Color Palette:** Light theme — backgrounds `#F5F6F8` / `#F4F5F7` / `#F4F7FB`, text `#111827` / `#1F2937`, accent `#ED1C24` (tab active), muted `#6B7280` / `#A7A7A7`
- **File Type Colors:** PDF `#FFE5E7`, Word `#DBEAFE`, Excel `#D1FAE5`, PPT `#FFEDD5`, TXT `#E2E8F0`, EPUB `#EDE9FE`, RTF `#FCE7F3`
- **Animations:** Splash uses `Animated.timing` + `Animated.spring` for icon/text entrance; SideMenu uses `Animated.timing` for drawer slide + backdrop fade
- **Styling:** All styles use `StyleSheet.create()` — no external styling libraries

---

## 12. Scripts

```bash
npm start       # Start Metro dev server
npm run android  # Build & run on Android
npm run ios      # Build & run on iOS
npm run lint     # Run ESLint
npm test         # Run Jest tests
```

---

## 13. Key Conventions

1. **Component files** use PascalCase (e.g., `HomeScreen.tsx`, `SideMenu.tsx`)
2. **Service files** use PascalCase or camelCase (e.g., `FileScanner.ts`, `fileHelpers.ts`)
3. **All components** are functional components using hooks (`useState`, `useEffect`, `useCallback`, `useRef`)
4. **Navigation** is fully typed via `RootStackParamList`
5. **No state management library** — state is local to screens/components; services handle persistence
6. **File operations** go through the native `FileScannerModule` bridge, not the JS-based `utils/fileScanner.ts` (which is legacy/unused)
7. **Persistence** uses `react-native-blob-util` filesystem API to read/write JSON files
8. **Assets** are static `require()` imports from the `Assets/` directory

---

> **⚠️ Keep this document updated whenever major structural changes, new screens, services, or dependencies are added to the project.**
