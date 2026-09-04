# AGENT.md — React Native Development Guidelines

> **Project:** AllDocumentReader  
> **Framework:** React Native 0.87.1 · TypeScript 6.x · React 19.x  
> **Target:** Android (primary), iOS (secondary)

This file contains coding standards, best practices, and project-specific instructions for any AI agent or developer working on this codebase.

---

## 1. Project-Specific Rules

### 1.1 Always Read Context First
- **Read `project_context.md`** before making any changes to understand the full architecture, navigation structure, services, and type system.
- **Read `README.md`** for setup and run instructions.

### 1.2 Update Documentation on Major Changes
When making changes that affect the project structure, add new screens/services/components, or change dependencies:
- **Update `project_context.md`** — Reflect new files, services, navigation routes, or architecture changes.
- **Update `README.md`** — Reflect new features, setup steps, or dependency changes.

### 1.3 W2P Module
- The `W2P/` directory is a **separate standalone Android module** for offline document-to-PDF conversion.
- It is **not currently integrated** into the React Native app but is planned for future use.
- **Do not modify W2P** unless specifically asked. Do not import or reference it from the main app code yet.

### 1.4 Native Module
- The app uses a custom Kotlin native module `FileScannerModule` for all file system operations (scan, delete, rename, share, keep screen on).
- **Never bypass the native module** with JS-only file operations. All file I/O that touches user documents must go through `services/FileScanner.ts` → native bridge.
- The legacy `utils/fileScanner.ts` (uses `react-native-fs`) is **deprecated and unused** — do not extend or reference it.

---

## 2. TypeScript Best Practices

### 2.1 Strict Typing
```typescript
// ✅ Always type props, state, and function parameters
type Props = NativeStackScreenProps<RootStackParamList, 'FileViewer'>;

const DocumentViewerScreen: React.FC<Props> = ({ route, navigation }) => {
  const [currentFile, setCurrentFile] = useState<ScannedFile>(file);
};

// ❌ Never use `any` unless absolutely unavoidable
const data: any = fetchData(); // AVOID
```

### 2.2 Navigation Typing
```typescript
// ✅ Always use typed navigation
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
const navigation = useNavigation<NavigationProp>();

// When adding new screens, update RootStackParamList in src/types/types.ts
```

### 2.3 Type Definitions
- All shared types go in `src/types/types.ts`.
- Service-specific types (like `TrashedFile`, `AppSettings`) can be co-located in their service file.
- Export types that are used across multiple files.

---

## 3. Component Patterns

### 3.1 Functional Components Only
```typescript
// ✅ Always use functional components with hooks
const MyComponent: React.FC<MyProps> = ({ title, onPress }) => {
  return <View>...</View>;
};

// ❌ Never use class components
class MyComponent extends React.Component {} // AVOID
```

### 3.2 Component Organization
Follow the established directory structure:
```
src/components/
├── common/          # Shared primitives (Loading, etc.)
├── home/            # HomeScreen-specific components
├── ui/              # List items, action menus, modals
├── viewer/          # DocumentViewer sub-components
├── settings/        # Settings-specific components
├── CustomHeader.tsx # Top-level shared components
├── FileListHeader.tsx
└── SideMenu.tsx
```

**Rules:**
- Screen-specific components go in their feature subdirectory (`home/`, `viewer/`, `settings/`).
- Shared/reusable components go in `common/` or `ui/`.
- Top-level components that span multiple screens stay in `components/` root.

### 3.3 Component File Structure
```typescript
// 1. Imports (React, RN, navigation, services, types)
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// 2. Type definitions (props, local types)
type Props = { title: string; onPress: () => void; };

// 3. Component definition
const MyComponent: React.FC<Props> = ({ title, onPress }) => {
  // hooks first
  const [state, setState] = useState('');

  // effects
  useEffect(() => { /* ... */ }, []);

  // handlers
  const handlePress = () => { /* ... */ };

  // render
  return <View style={styles.container}>...</View>;
};

// 4. Styles (always at bottom, always StyleSheet.create)
const styles = StyleSheet.create({
  container: { flex: 1 },
});

// 5. Export
export default MyComponent;
```

---

## 4. Styling Guidelines

### 4.1 Always Use StyleSheet.create
```typescript
// ✅ Correct — uses StyleSheet.create
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F8' },
});

// ❌ Avoid inline styles for anything non-trivial
<View style={{ flex: 1, backgroundColor: '#F5F6F8' }}> // Only for dynamic values
```

### 4.2 Color Palette (Project Standard)
```typescript
// Backgrounds
'#F5F6F8'  // Primary screen background
'#F4F5F7'  // Viewer/content background
'#F4F7FB'  // Splash background
'#FFFFFF'  // Card/modal backgrounds

// Text
'#111827'  // Primary text (headings, body)
'#1F2937'  // Secondary text (menu items)
'#4B5563'  // Body/subtitle text
'#6B7280'  // Muted/placeholder text
'#A7A7A7'  // Inactive tab text

// Accent
'#ED1C24'  // Active tab / primary accent (red)
'#EF4444'  // Error/destructive text

// File type backgrounds (use fileHelpers.ts)
'#FFE5E7'  // PDF
'#DBEAFE'  // Word
'#D1FAE5'  // Excel
'#FFEDD5'  // PPT
'#E2E8F0'  // TXT
'#EDE9FE'  // EPUB
'#FCE7F3'  // RTF
```

### 4.3 No External Styling Libraries
This project uses **vanilla React Native StyleSheet** only. Do not introduce Tailwind, styled-components, NativeWind, or similar.

---

## 5. State Management

### 5.1 Local State with Hooks
- Use `useState` for component-local state.
- Use `useEffect` for side effects (data loading, subscriptions).
- Use `useCallback` for memoized callbacks passed to child components.
- Use `useRef` for imperative handles (e.g., PDF ref).

### 5.2 No Global State Library
This project intentionally does **not** use Redux, Zustand, MobX, or Context for global state. Data persistence is handled by service files writing to JSON. If global state becomes necessary in the future, prefer **React Context + useReducer** over external libraries.

### 5.3 Data Loading Pattern
```typescript
// ✅ Standard data loading pattern used throughout the project
const [data, setData] = useState<DataType[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useFocusEffect(
  useCallback(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const result = await someService();
        if (isMounted) setData(result);
      } catch (err: any) {
        if (isMounted) setError(err?.message || 'Failed to load');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [dependency])
);
```

---

## 6. Services & Data Layer

### 6.1 Service Structure
All business logic and persistence lives in `src/services/`:
- Services are **pure TypeScript modules** exporting async functions.
- No classes — use plain exported functions.
- Each service manages its own JSON file via `react-native-blob-util`.

### 6.2 Persistence Pattern
```typescript
// ✅ Standard JSON persistence pattern
import ReactNativeBlobUtil from 'react-native-blob-util';

const FILE_PATH = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/data.json`;

async function loadData(): Promise<DataType[]> {
  const exists = await ReactNativeBlobUtil.fs.exists(FILE_PATH);
  if (!exists) return [];
  const content = await ReactNativeBlobUtil.fs.readFile(FILE_PATH, 'utf8');
  if (!content?.trim()) return [];
  const parsed = JSON.parse(content);
  return Array.isArray(parsed) ? parsed : [];
}

async function saveData(data: DataType[]): Promise<void> {
  await ReactNativeBlobUtil.fs.writeFile(FILE_PATH, JSON.stringify(data), 'utf8');
}
```

### 6.3 Error Handling
```typescript
// ✅ Always wrap service calls in try/catch
try {
  const result = await serviceFunction();
} catch (error: any) {
  console.error('Descriptive error message:', error);
  // Show user-facing Alert when appropriate
  Alert.alert('Title', error?.message || 'Fallback message');
}
```

---

## 7. Navigation Best Practices

### 7.1 Adding New Screens
1. Create the screen component in `src/screens/`.
2. Add the route params to `RootStackParamList` in `src/types/types.ts`.
3. Register the screen in `App.tsx` Stack/Tab navigator.
4. Update `project_context.md` navigation section.

### 7.2 Screen Navigation
```typescript
// ✅ Type-safe navigation
navigation.navigate('FileList', { fileType: 'pdf' });
navigation.navigate('FileViewer', { file: scannedFile });
navigation.goBack();
navigation.replace('MainTabs'); // For one-way transitions (splash → main)
```

### 7.3 useFocusEffect for Data Refresh
```typescript
// ✅ Use useFocusEffect to reload data when screen comes into focus
import { useFocusEffect } from '@react-navigation/native';

useFocusEffect(
  useCallback(() => {
    loadData();
  }, [])
);
```

---

## 8. Performance Guidelines

### 8.1 Lists
```typescript
// ✅ Always use FlatList for long lists (not ScrollView + map)
<FlatList
  data={files}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <FileListItem file={item} />}
  showsVerticalScrollIndicator={false}
/>
```

### 8.2 Memoization
```typescript
// ✅ Memoize expensive computations and callbacks
const filteredFiles = useMemo(
  () => files.filter(f => f.name.includes(searchTerm)),
  [files, searchTerm]
);

const handlePress = useCallback(() => {
  navigation.navigate('FileViewer', { file });
}, [file, navigation]);
```

### 8.3 Image Optimization
- All icons are static PNG imports via `require()`.
- Always specify `width` and `height` on `<Image>`.
- Use `resizeMode="contain"` for icons.

### 8.4 Cleanup Effects
```typescript
// ✅ Always clean up effects with isMounted flag
useEffect(() => {
  let isMounted = true;
  const doWork = async () => {
    const result = await fetchData();
    if (isMounted) setState(result);
  };
  doWork();
  return () => { isMounted = false; };
}, []);
```

---

## 9. Native Module Interaction

### 9.1 Calling Native Methods
```typescript
// ✅ Always check native module availability
if (!FileScannerModule?.methodName) {
  throw new Error('FileScannerModule.methodName is not available.');
}

// ✅ Always request permissions before file operations
await requestStoragePermission();
const result = await FileScannerModule.someMethod(args);
```

### 9.2 Adding New Native Methods
1. Add the `@ReactMethod` in `FileScannerModule.kt`.
2. Add the TypeScript wrapper function in `services/FileScanner.ts`.
3. Handle permissions, errors, and null-safety.
4. Update `project_context.md` native module table.

---

## 10. Animations

### 10.1 Use Native Driver
```typescript
// ✅ Always set useNativeDriver: true for transform/opacity animations
Animated.timing(fadeAnim, {
  toValue: 1,
  duration: 300,
  useNativeDriver: true,  // Required for performance
}).start();
```

### 10.2 Animation Patterns
- **Fade in/out:** `Animated.timing` with opacity
- **Slide in/out:** `Animated.timing` with `translateX`/`translateY`
- **Spring bounce:** `Animated.spring` for natural feel (splash icon)
- **Parallel:** `Animated.parallel` for simultaneous animations
- **Sequential:** Chain via `.start(() => nextAnimation.start())`

---

## 11. File & Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Screen | PascalCase + `Screen` suffix | `HomeScreen.tsx`, `TrashScreen.tsx` |
| Component | PascalCase | `SideMenu.tsx`, `FileListItem.tsx` |
| Service | PascalCase + `Service` suffix | `FavoritesService.ts`, `TrashService.ts` |
| Utility | camelCase | `fileHelpers.ts`, `fileScanner.ts` |
| Type file | camelCase | `types.ts` |
| Asset | lowercase/kebab-case | `pdf_circle.png`, `home-active.png` |
| Directory | camelCase | `components/home/`, `services/` |

---

## 12. Testing

- Test framework: **Jest** with `@react-native/jest-preset`.
- Test files go in `__tests__/` directory.
- Name test files as `ComponentName.test.tsx` or `serviceName.test.ts`.

---

## 13. Git & Code Quality

- Run `npm run lint` before committing.
- Prettier formatting is enforced via `.prettierrc.js`.
- Avoid committing `node_modules/`, `android/app/build/`, or `.cxx/`.
- Keep `.gitignore` up to date.

---

## 14. Common Pitfalls to Avoid

1. **Don't use `any`** — Always type your variables, params, and return values.
2. **Don't create inline styles** for static properties — Use `StyleSheet.create`.
3. **Don't use `ScrollView` for long lists** — Use `FlatList` for virtualization.
4. **Don't forget cleanup** — Always use `isMounted` flag in async effects.
5. **Don't hard-code file paths** — Use `ReactNativeBlobUtil.fs.dirs.DocumentDir`.
6. **Don't bypass the native module** — All file I/O goes through `FileScanner.ts`.
7. **Don't mutate state directly** — Always create new arrays/objects for state updates.
8. **Don't forget to update navigation types** when adding screens.
9. **Don't introduce new dependencies** without justification — Prefer built-in solutions.
10. **Don't ignore errors** — Always log errors and show user-facing feedback where appropriate.

---

## 15. Dependency Management

- **Production dependencies** should be minimal and well-justified.
- Always check if React Native or existing deps already solve the problem.
- Pin major versions in `package.json`.
- Run `npm audit` periodically for security updates.
- Node version requirement: `>= 22.11.0`.

---

> **This document should be treated as the authoritative coding guideline for this project. Update it when new patterns or conventions are established.**
