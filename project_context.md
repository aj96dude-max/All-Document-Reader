# AllDocumentReader — Project Context

> **Last Updated:** 2026-09-08  
> **Version:** 0.0.1  
> **Platform:** Android (React Native)

---

## 1. Overview

**AllDocumentReader** is a React Native mobile application that lets users scan, browse, view, and manage documents stored on their Android device. It supports PDF, Word, Excel, PowerPoint, TXT, EPUB, RTF, and 30+ additional file formats via offline document-to-PDF conversion. The app provides native-level file scanning via a custom Kotlin bridge module (`FileScannerModule`), a built-in PDF viewer, a text file viewer, favorites, recent documents, trash (30-day auto-delete), dark mode theming, and user settings.

---

## 2. Tech Stack

| Layer              | Technology                                                                 |
|--------------------|---------------------------------------------------------------------------| 
| **Framework**      | React Native `0.87.1` (New Architecture)                                  |
| **Language**       | TypeScript `6.x`, Kotlin (native Android modules)                         |
| **React**          | React `19.2.3`                                                            |
| **Navigation**     | `@react-navigation/native` `7.x`, `native-stack` `7.x`, `bottom-tabs` `7.x` |
| **PDF Viewer**     | `react-native-pdf` `7.x`                                                 |
| **File I/O**       | `react-native-blob-util` `0.24.x` (persistent JSON storage, file reads)  |
| **SVG Icons**      | `react-native-svg` `15.x` + `react-native-svg-transformer` `1.x`         |
| **Animations**     | `lottie-react-native` `7.x` (loading, conversion, empty state)           |
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
├── metro.config.js                 # Metro config with react-native-svg-transformer
├── babel.config.js                 # Babel config
├── jest.config.js                  # Jest config
├── .eslintrc.js                    # ESLint config
├── .prettierrc.js                  # Prettier config
│
├── src/                            # ★ Main application source code
│   ├── App.tsx                     # Root component — ThemeProvider + SafeAreaProvider + AppNavigator
│   ├── declarations.d.ts          # SVG module type declarations for react-native-svg-transformer
│   │
│   ├── navigation/                 # ★ Navigation layer (extracted from App.tsx)
│   │   └── AppNavigator.tsx       # Stack + Tab navigators, SideMenu overlay, SVG tab icons
│   │
│   ├── screens/                    # Screen components
│   │   ├── SplashScreen.tsx        # Animated splash with auto-nav
│   │   ├── HomeScreen.tsx          # Home tab — tools grid + recent docs + permission modal
│   │   ├── FileListScreen.tsx      # File listing by type — scan, search, actions
│   │   ├── DocumentViewerScreen.tsx# PDF/TXT/converted viewer with toolbar actions
│   │   ├── FavoriteScreen.tsx      # Favorited files list
│   │   ├── SettingScreen.tsx       # App theme, keep screen on, trash, privacy, share, rate
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
│   │   │   ├── DeleteConfirmationModal.tsx  # ★ Animated delete confirmation dialog
│   │   │   ├── FilePermissionModal.tsx # ★ Custom file-access permission prompt (allow/skip)
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
│   │       ├── Loading.tsx         # Full-screen loading spinner (Lottie-based)
│   │       └── index.ts           # Barrel export
│   │
│   ├── services/                   # Business logic & data persistence
│   │   ├── FileScanner.ts         # Native module bridge — scan, delete, rename, share, keepScreenOn, permissions
│   │   ├── DocConverterService.ts # W2P converter bridge — document-to-PDF conversion + caching
│   │   ├── FavoritesService.ts    # Favorites CRUD (favorites.json)
│   │   ├── RecentDocumentsService.ts # Recent docs CRUD (recent_documents.json, max 50)
│   │   ├── TrashService.ts        # Trash CRUD with 30-day auto-delete (trash.json)
│   │   ├── SettingsService.ts     # Settings persistence (keepScreenOn, theme) + utility actions (share, rate, privacy)
│   │   └── fileHelpers.ts         # Formatting utils (bytes, dates, SVG icon components, file type colors)
│   │
│   ├── theme/                      # ★ Theming system (dark mode support)
│   │   ├── ThemeContext.tsx        # React Context provider — ThemeMode (light/dark/system), ColorPalette
│   │   └── colors.ts              # ColorPalette interface, lightColors, darkColors definitions
│   │
│   ├── types/                      # TypeScript type definitions
│   │   └── types.ts               # ScannedFile, RootStackParamList
│   │
│   └── utils/                      # Utility functions
│       └── fileScanner.ts         # JS-based file scanner (legacy — uses react-native-fs, not actively used)
│
├── Assets/                         # Static assets
│   ├── svgicons/                  # ★ SVG icon library (58 icons)
│   │                              #   Tab icons: home, home_active, favorite, favorite_active, settings, settings_active
│   │                              #   File type icons: pdf_circle, word_circle, xlsx_circle, pptx_circle, txtx, epub, rtf, All
│   │                              #   Action icons: search, share, delete_file, delete_forever, border_color, close, cancel
│   │                              #   Theme icons: light, dark
│   │                              #   Viewer icons: chevron_backward, arrow_drop_down, black_favorite, un_favorite, etc.
│   │                              #   Settings icons: wb_incandescent, security, family_star, storage
│   │                              #   UI: folder (permission modal), Empty Folder, App Icon
│   │
│   ├── anim/                      # ★ Lottie JSON animation files
│   │   ├── loading-animation.json         # General loading spinner
│   │   ├── Converting PDF Jason.json      # PDF conversion progress
│   │   ├── After converting done lootie.json  # Conversion complete
│   │   └── Empety Documents Jason File.json   # Empty document state
│   │
│   └── splash/                    # Splash screen assets
│       └── vector_12.png         # Splash vector graphic
│
├── design/                         # ★ UI design mockup screenshots (35 images)
│                                   # Reference screens: Main Screen (9 variants), Dark Mode, Splash,
│                                   # Settings, Favorites, Trash, Document Viewer, Search, Popup,
│                                   # Side Menu, File Access Permission, Delete Model,
│                                   # Convert to PDF, Jump To Page, Onboarding (3 screens),
│                                   # Showing All Files, Empty File, App Icon
│
├── android/                        # Android native project
│   └── app/src/main/java/com/alldocumentreader/
│       ├── FileScannerModule.kt   # ★ Custom native module (file scanning via MediaStore, delete, rename, share, keepScreenOn)
│       ├── DocConverterModule.kt  # ★ W2P bridge module (offline document-to-PDF conversion)
│       ├── FileScannerPackage.kt  # React Native package registration (both modules)
│       ├── MainActivity.kt       # Main activity
│       └── MainApplication.kt    # Application class
│
│   ├── W2P/                        # ★ Standalone Android module: OfflineDocConverter
│   │                               #   Converts various document formats to PDF (offline, zero-dependency)
│   │                               #   INTEGRATED into the React Native app via DocConverterModule
│   │   ├── app/                       # Android app module (demo/test shell)
│   │   ├── docx2pdf/                  # Core conversion library (included as Gradle dependency)
│   │   ├── presentation/              # Presentation layer
│   │   └── README.md                  # Detailed docs on supported formats
│
├── error/                          # Design reference images (list design, list_item)
│
├── __tests__/                      # Jest test directory
├── ios/                            # iOS project (placeholder — not primary target)
└── .git/                           # Git repository
```

---

## 4. Navigation Architecture

Navigation is defined in `src/navigation/AppNavigator.tsx` (extracted from `App.tsx`).

```
NavigationContainer
└── Stack.Navigator (RootStackParamList)
    ├── "Splash"    → SplashScreen         (auto-navigates to MainTabs)
    ├── "MainTabs"  → Tab.Navigator
    │   ├── "Home"     → HomeScreen        (tools grid + recent docs + permission flow)
    │   ├── "Favorite" → FavoriteScreen    (favorited files)
    │   └── "Setting"  → SettingScreen     (theme, keep screen on, trash, privacy, share, rate)
    ├── "FileList"  → FileListScreen       (params: { fileType: string })
    ├── "FileViewer"→ DocumentViewerScreen (params: { file: ScannedFile })
    └── "Trash"     → TrashScreen          (trashed files with auto-delete countdown)
```

**Tab Bar Icons:** SVG icons imported from `Assets/svgicons/` — each tab has active/inactive SVG variants (e.g., `home.svg` / `home_active.svg`). Tab bar colors are driven by the theme (`colors.primary` / `colors.iconInactive`).

**Side Menu** is rendered as an overlay `<Modal>` inside `<NavigationContainer>`, controlled via `isSideMenuVisible` state in `AppNavigator.tsx`. It provides: Privacy Policy, Share with Friends, and Rate Us actions.

**App.tsx** is a thin root that composes `<ThemeProvider>` → `<SafeAreaProvider>` → `<AppNavigator />` and calls `initSettings()` on mount.

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
- **`checkStoragePermission()`** — Checks if storage permission is already granted (Android 11+ vs ≤29)
- **`requestStoragePermission(showExplanationAlert?)`** — Handles Android 11+ (`MANAGE_EXTERNAL_STORAGE`), Android ≤29 (`READ/WRITE_EXTERNAL_STORAGE`), Android 30-32 (`READ_EXTERNAL_STORAGE`). Supports silent mode (no alert) for custom UI modal flow.
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
- **Settings:** `keepScreenOn` (boolean, default: `true`), `theme` (`ThemeMode`, default: `'system'`)
- **Utility actions:** `openPrivacyPolicy()`, `shareApp()`, `rateApp()`
- **Init:** `initSettings()` — Called on app start, applies saved `keepScreenOn` setting
- **Native helpers:** `applyKeepScreenOn()`, `isNativeKeepScreenOn()`

### 6.6 DocConverterService (`services/DocConverterService.ts`)
TypeScript bridge to the native `DocConverterModule` (W2P library). Provides:
- **`isConvertibleExtension(ext)`** — Check if a file extension can be converted to PDF
- **`convertToPdf(inputUri, fileName)`** — Convert a document to PDF, with file-based caching
- **`clearConversionCache()`** — Clear all cached converted PDFs
- **`CONVERTIBLE_EXTENSIONS`** — Array of 40+ supported extensions (`.docx`, `.pptx`, `.xlsx`, `.epub`, `.rtf`, `.md`, `.csv`, images, source code, etc.)
- Cache location: `CacheDir/converted_pdfs/` — uses URI-based hash keys to avoid re-conversion

### 6.7 fileHelpers (`services/fileHelpers.ts`)
Pure utility functions:
- `formatBytes()`, `formatDate()`, `formatTime()`
- `getIconForExtension()` — Returns SVG React component for file type (imports from `Assets/svgicons/`)
- `getBgColorForExtension()` — Returns background color hex for file type

---

## 7. Native Android Modules

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
| `app_settings.json` | `AppSettings` object (`{ keepScreenOn: boolean, theme: ThemeMode }`) |

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
| Markdown | `.md` | ✅ Convert to PDF → built-in viewer (W2P) |
| Spreadsheet | `.csv`, `.tsv` | ✅ Convert to PDF → built-in viewer (W2P) |
| Data | `.json`, `.xml` | ✅ Convert to PDF → built-in viewer (W2P) |
| LaTeX | `.tex` | ✅ Convert to PDF → built-in viewer (W2P) |
| Images | `.jpg`, `.png`, `.webp`, `.gif`, `.bmp` | ✅ Convert to PDF → built-in viewer (W2P) |
| Source Code | `.java`, `.kt`, `.py`, `.c`, `.cpp`, `.html`, `.js`, `.css`, `.yaml`, `.yml`, `.sh`, `.swift`, `.rb`, `.go`, `.rs`, `.php` | ✅ Convert to PDF → built-in viewer (W2P) |

---

## 10. W2P Module (Integrated)

The `android/W2P/` directory contains **OfflineDocConverter** — a standalone Android/Kotlin library for converting documents to PDF offline. It is **integrated into the React Native app** as a local Gradle module dependency.

**Integration architecture:** `android/W2P/docx2pdf` → Gradle dependency → `DocConverterModule.kt` (native bridge) → `DocConverterService.ts` (JS service with caching) → `DocumentViewerScreen.tsx` (convert-then-view flow).

**Supported formats:** `.docx`, `.pptx`, `.xlsx`, `.epub`, `.rtf`, `.md`, `.txt`, `.tex`, `.csv`, `.tsv`, `.json`, `.xml`, images, source code files, and native PDF pass-through.

**Caching:** Converted PDFs are cached in `CacheDir/converted_pdfs/` using URI-based hash keys. Repeated opens of the same file use the cached PDF without re-conversion.

---

## 11. Theming System

The app supports **light**, **dark**, and **system** (follows device setting) theme modes.

### Architecture

- **`src/theme/ThemeContext.tsx`** — React Context provider (`ThemeProvider`) that exposes `mode`, `isDark`, `colors`, and `setMode()`. Loads persisted theme from `app_settings.json` on mount.
- **`src/theme/colors.ts`** — Defines the `ColorPalette` interface and exports `lightColors` and `darkColors` objects.
- **`src/App.tsx`** — Wraps the entire app in `<ThemeProvider>`.
- **Components** — Access theme via the `useTheme()` hook; styles are generated dynamically using `getStyles(colors)` pattern with `React.useMemo()`.

### ColorPalette Interface

```typescript
interface ColorPalette {
  background: string;      // Screen background
  surface: string;         // Card/content surfaces
  surfaceElevated: string; // Elevated surfaces (tab bar, modals)
  text: string;            // Primary text
  textSecondary: string;   // Secondary/subtitle text
  textTertiary: string;    // Muted/placeholder text
  primary: string;         // Accent color (#ED1C24 red)
  border: string;          // Border/divider lines
  icon: string;            // Active icon color
  iconInactive: string;    // Inactive icon color
  red: string;             // Destructive/error color
  overlay: string;         // Modal backdrop overlay
}
```

### Color Values

| Token | Light | Dark |
|-------|-------|------|
| `background` | `#F5F6F8` | `#141414` |
| `surface` | `#FFFFFF` | `#1C1C1C` |
| `surfaceElevated` | `#FFFFFF` | `#262626` |
| `text` | `#1C1C1C` | `#F3F4F6` |
| `textSecondary` | `#6B7280` | `#9CA3AF` |
| `textTertiary` | `#A7A7A7` | `#6B7280` |
| `primary` | `#ED1C24` | `#ED1C24` |
| `border` | `#E5E7EB` | `#374151` |

### File Type Background Colors (unchanged across themes)

| Type | Color |
|------|-------|
| PDF | `#FFE5E7` |
| Word | `#DBEAFE` |
| Excel | `#D1FAE5` |
| PPT | `#FFEDD5` |
| TXT | `#E2E8F0` |
| EPUB | `#EDE9FE` |
| RTF | `#FCE7F3` |

---

## 12. Icon & Asset System

### SVG Icons (`Assets/svgicons/`)
All UI icons are SVG files imported as React components via `react-native-svg-transformer`. The Metro config (`metro.config.js`) is configured to treat `.svg` files as source extensions. Type declarations are in `src/declarations.d.ts`.

**Icon categories (58 files):**
- **Tab bar:** `home.svg`, `home_active.svg`, `favorite.svg`, `favorite_active.svg`, `settings.svg`, `settings_active.svg`
- **File types:** `pdf_circle.svg`, `word_circle.svg`, `xlsx_circle.svg`, `pptx_circle.svg`, `txtx.svg`, `epub.svg`, `rtf.svg`, `All.svg`
- **Actions:** `search.svg`, `share.svg`, `delete_file.svg`, `delete_forever.svg`, `border_color.svg`, `close.svg`, `cancel.svg`, `restore_from_trash.svg`, `clear_all.svg`
- **Theme:** `light.svg`, `dark.svg`
- **Navigation/viewer:** `chevron_backward.svg`, `arrow_drop_down.svg`, `black_favorite.svg`, `un_favorite.svg`, `heart_minus.svg`, `picture_as_pdf.svg`, `black_picture_as_pdf.svg`
- **Settings:** `wb_incandescent.svg`, `security.svg`, `family_star.svg`, `storage.svg`
- **UI:** `folder.svg` (permission modal), `Empty Folder.svg` (empty state), `App Icon.svg`

### Lottie Animations (`Assets/anim/`)
4 Lottie JSON files for animated UI states:
- `loading-animation.json` — General loading spinner
- `Converting PDF Jason.json` — PDF conversion progress indicator
- `After converting done lootie.json` — Conversion completion
- `Empety Documents Jason File.json` — Empty document list state

### Splash Assets (`Assets/splash/`)
- `vector_12.png` — Splash screen vector graphic

---

## 13. Scripts

```bash
npm start       # Start Metro dev server
npm run android  # Build & run on Android
npm run ios      # Build & run on iOS
npm run lint     # Run ESLint
npm test         # Run Jest tests
```

---

## 14. Key Conventions

1. **Component files** use PascalCase (e.g., `HomeScreen.tsx`, `SideMenu.tsx`)
2. **Service files** use PascalCase or camelCase (e.g., `FileScanner.ts`, `fileHelpers.ts`)
3. **All components** are functional components using hooks (`useState`, `useEffect`, `useCallback`, `useRef`, `useMemo`)
4. **Navigation** is fully typed via `RootStackParamList` and defined in `src/navigation/AppNavigator.tsx`
5. **Theming** uses React Context (`useTheme()` hook) with dynamic style generation via `getStyles(colors)` pattern
6. **No state management library** — state is local to screens/components; services handle persistence; theme uses React Context
7. **File operations** go through the native `FileScannerModule` bridge, not the JS-based `utils/fileScanner.ts` (which is legacy/unused)
8. **Persistence** uses `react-native-blob-util` filesystem API to read/write JSON files
9. **Icons** are SVG components imported from `Assets/svgicons/` (not PNG `require()` — migrated to SVG)
10. **Animations** use Lottie JSON files (`lottie-react-native`) for loading/conversion states, and `Animated` API for transitions

---

> **⚠️ Keep this document updated whenever major structural changes, new screens, services, or dependencies are added to the project.**
