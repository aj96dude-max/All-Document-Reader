# 📄 AllDocumentReader

A React Native Android app to scan, browse, view, and manage all your documents — PDF, Word, Excel, PowerPoint, TXT, EPUB, and RTF — in one place. Features offline document-to-PDF conversion, dark mode, and a native Kotlin file scanner.

---

## ✨ Features

- **📂 File Scanning** — Scans the entire device storage for documents using a high-performance native Kotlin module (MediaStore API)
- **📖 Built-in PDF Viewer** — Read PDF files with page navigation, jump-to-page, and page indicator
- **📝 Text File Viewer** — View `.txt` files directly in-app
- **🔄 Document Conversion** — Offline conversion of Word, Excel, PPT, EPUB, RTF (and 30+ other formats) to PDF for in-app viewing via the W2P module
- **⭐ Favorites** — Mark documents as favorites for quick access
- **🕐 Recent Documents** — Automatically tracks your last 50 opened documents
- **🗑️ Trash** — Soft-delete with 30-day auto-purge and restore capability
- **✏️ Rename** — Rename files directly from the app
- **📤 Share** — Share documents via Android Intent
- **🔍 Search** — Search through file lists by name
- **🌗 Dark Mode** — System-aware theming with manual light/dark/system toggle
- **⚙️ Settings** — App Theme, Keep Screen On, Trash, Privacy Policy, Share, Rate Us
- **📱 Side Menu** — Animated drawer with quick actions
- **🎨 Custom Splash Screen** — Animated splash with Lottie animations
- **🔒 Permission Modal** — Custom file-access permission dialog with skip/allow flow

---

## 📸 Screenshots

The `design/` directory contains design mockups for all screens:  
Splash, Home, File List, Document Viewer, Favorites, Settings, Trash, Search, Side Menu, Dark Mode, Onboarding, and more (35 images).

---

## 🏗️ Tech Stack

| Technology | Version |
|------------|---------|
| React Native | 0.87.1 |
| React | 19.2.3 |
| TypeScript | 6.x |
| Kotlin | Native modules |
| React Navigation | 7.x |
| react-native-pdf | 7.x |
| react-native-blob-util | 0.24.x |
| react-native-svg | 15.x |
| lottie-react-native | 7.x |
| Hermes | Default JS engine |

---

## 📁 Project Structure

```
AllDocumentReader/
├── src/
│   ├── App.tsx                     # Root — ThemeProvider + SafeAreaProvider + AppNavigator
│   ├── declarations.d.ts           # SVG module type declarations
│   ├── navigation/
│   │   └── AppNavigator.tsx        # Stack + Tab navigator setup, SideMenu overlay
│   ├── screens/                    # 8 screens
│   │   ├── SplashScreen.tsx        # Animated splash with auto-nav
│   │   ├── HomeScreen.tsx          # Home tab — tools grid + recent docs + permission modal
│   │   ├── FileListScreen.tsx      # File listing by type — scan, search, actions
│   │   ├── DocumentViewerScreen.tsx# PDF/TXT/converted doc viewer with toolbar
│   │   ├── FavoriteScreen.tsx      # Favorited files list
│   │   ├── SettingScreen.tsx       # App theme, keep screen on, trash, privacy, share, rate
│   │   ├── TrashScreen.tsx         # Trashed files (30-day auto-delete)
│   │   └── AllFiles.tsx            # Placeholder stub
│   ├── components/                 # Reusable components organized by feature
│   │   ├── common/                 # Loading spinner (Lottie-based), shared primitives
│   │   ├── home/                   # Tools grid, recent documents, empty state
│   │   ├── ui/                     # File list items, action menus, modals
│   │   ├── viewer/                 # Viewer header, toolbar, modals, page indicator
│   │   ├── settings/               # Setting item component
│   │   ├── CustomHeader.tsx        # App header bar with menu button
│   │   ├── FileListHeader.tsx      # File list screen header with search & back
│   │   └── SideMenu.tsx            # Animated drawer menu
│   ├── services/                   # Business logic & JSON persistence
│   │   ├── FileScanner.ts          # Native module bridge (scan, delete, rename, share, keepScreenOn)
│   │   ├── DocConverterService.ts  # W2P converter bridge (document-to-PDF + caching)
│   │   ├── FavoritesService.ts     # Favorites CRUD
│   │   ├── RecentDocumentsService.ts
│   │   ├── TrashService.ts         # 30-day auto-delete trash
│   │   ├── SettingsService.ts      # App settings (keepScreenOn, theme) + utility actions
│   │   └── fileHelpers.ts          # Formatting utilities (bytes, dates, SVG icons, colors)
│   ├── theme/                      # Theming system
│   │   ├── ThemeContext.tsx         # React Context provider for light/dark/system theme
│   │   └── colors.ts               # ColorPalette interface, lightColors, darkColors
│   ├── types/
│   │   └── types.ts                # ScannedFile, RootStackParamList
│   └── utils/
│       └── fileScanner.ts          # Legacy JS-based file scanner (deprecated, unused)
├── Assets/                         # Static assets
│   ├── svgicons/                   # SVG icons (58 files — tabs, file types, actions, tools)
│   ├── anim/                       # Lottie JSON animations (loading, converting, empty state, done)
│   └── splash/                     # Splash screen assets
├── design/                         # UI design mockup screenshots (35 images)
├── android/                        # Android native project
│   ├── app/src/main/java/com/alldocumentreader/
│   │   ├── FileScannerModule.kt    # Custom native module (MediaStore scanning, file ops)
│   │   ├── DocConverterModule.kt   # W2P bridge module (offline document-to-PDF conversion)
│   │   ├── FileScannerPackage.kt   # React Native package registration (both modules)
│   │   ├── MainActivity.kt        # Main activity
│   │   └── MainApplication.kt     # Application class
│   └── W2P/                        # OfflineDocConverter Android module (integrated)
│       ├── docx2pdf/               # Core conversion library (Gradle dependency)
│       └── ...
├── project_context.md              # Full project context & architecture documentation
├── AGENT.md                        # Development guidelines & best practices
└── README.md                       # This file
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

SideMenu (overlay <Modal> inside NavigationContainer)
```

Navigation is defined in `src/navigation/AppNavigator.tsx` and uses SVG icons for tab bar (active/inactive variants).

---

## 📱 Supported File Types

| Format | Extensions | In-App Viewing |
|--------|-----------|----------------|
| PDF | `.pdf` | ✅ Built-in viewer (`react-native-pdf`) |
| Plain Text | `.txt` | ✅ Built-in viewer (`TextDocumentViewer`) |
| Word | `.doc`, `.docx` | ✅ Convert to PDF → built-in viewer (W2P) |
| Excel | `.xls`, `.xlsx` | ✅ Convert to PDF → built-in viewer (W2P) |
| PowerPoint | `.ppt`, `.pptx` | ✅ Convert to PDF → built-in viewer (W2P) |
| eBook | `.epub` | ✅ Convert to PDF → built-in viewer (W2P) |
| Rich Text | `.rtf` | ✅ Convert to PDF → built-in viewer (W2P) |

Additional convertible formats: `.md`, `.csv`, `.tsv`, `.json`, `.xml`, `.tex`, images (`.jpg`, `.png`, `.webp`, `.gif`, `.bmp`), and source code files (`.java`, `.kt`, `.py`, `.c`, `.cpp`, `.html`, `.js`, `.css`, etc.).

---

## 🌗 Dark Mode

The app supports three theme modes: **Light**, **Dark**, and **System** (follows device setting).

- Theme is managed via React Context (`src/theme/ThemeContext.tsx`)
- Color palette is defined in `src/theme/colors.ts` with `lightColors` and `darkColors`
- Theme preference is persisted in `app_settings.json`
- Toggle available in Settings screen → "App Theme"

---

## 🔌 Native Modules

### FileScannerModule (Kotlin)

Custom native module (`com.alldocumentreader.FileScannerModule`) providing:

| Method | Description |
|--------|-------------|
| `isAllFilesAccessGranted()` | Check MANAGE_EXTERNAL_STORAGE (Android 11+) |
| `requestAllFilesAccess()` | Opens system settings for all-files-access |
| `scanFiles(fileType)` | Queries MediaStore for documents matching type |
| `deleteFile(uri)` | Deletes file via ContentResolver or File API |
| `renameFile(uri, newName)` | Renames via ContentResolver, re-scans media |
| `shareFile(uri, mimeType, title)` | Shares via Intent + FileProvider |
| `setKeepScreenOn(enable)` | Sets/clears `FLAG_KEEP_SCREEN_ON` |
| `isKeepScreenOn()` | Checks if flag is currently set |

### DocConverterModule (Kotlin)

Bridges the W2P `OfflineDocConverterImpl` library:

| Method | Description |
|--------|-------------|
| `convertToPdf(inputUri, outputPath)` | Converts a document to PDF offline |
| `isConversionSupported(extension)` | Checks if format is supported |

---

## 📦 W2P — OfflineDocConverter (Integrated)

The `android/W2P/` directory contains the **OfflineDocConverter** — an Android/Kotlin library for converting documents to PDF offline. It is **fully integrated** into the app as a local Gradle module dependency.

**Architecture:** `android/W2P/docx2pdf` → Gradle dependency → `DocConverterModule.kt` → `DocConverterService.ts` (with caching) → `DocumentViewerScreen.tsx` (convert-then-view flow).

**Caching:** Converted PDFs are cached in `CacheDir/converted_pdfs/` using URI-based hash keys to avoid re-conversion.

---

## 🎨 Icon & Asset System

- **SVG Icons** — All UI icons use SVG via `react-native-svg` + `react-native-svg-transformer` (58 SVG files in `Assets/svgicons/`)
- **Lottie Animations** — Loading spinner, document conversion progress, empty state, and completion animations (4 JSON files in `Assets/anim/`)
- **Metro Config** — Configured with `react-native-svg-transformer` to import `.svg` files as React components
- **Type Declarations** — SVG module types declared in `src/declarations.d.ts`

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
