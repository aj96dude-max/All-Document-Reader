# 📄 All Document Reader — Newbie Guide & App Overview

Welcome to the **All Document Reader**! This document breaks down how the app works, its architecture, and its technology stack in a beginner-friendly way.

---

## 1. What is the App?
**All Document Reader** is an Android mobile application that acts as a centralized hub for all your files. Instead of needing Microsoft Word for `.docx`, Adobe Acrobat for `.pdf`, and a separate app for eBooks, this app lets you **scan, view, manage, and convert** them all in one place.

It supports standard formats like PDF and TXT directly, and uses an offline conversion engine to transform over 30+ formats (like Word, Excel, PowerPoint, EPUB) into PDFs on-the-fly so you can view them seamlessly.

---

## 2. How It Works (The Newbie Workflow)
Here is the step-by-step journey of how the app functions when you open it:

1. **Permission Check**: When you open the app, it asks for Storage Permissions. 
2. **Scanning**: Once granted, a native Android module rapidly scans your phone's hard drive to find every document hidden in folders (Downloads, WhatsApp Documents, etc.).
3. **Categorization**: It sorts the files automatically into categories (PDFs, Word files, Excel files, etc.) and displays them in a clean list.
4. **Viewing (The Magic part)**: 
   - If you tap a **PDF or TXT** file, the app opens it instantly using its built-in viewers.
   - If you tap a **Word, Excel, or PPT** file, the app's internal engine (called the `W2P` offline converter) silently converts it into a PDF in the background. It then caches it (saves it temporarily) and opens it. To the user, it just feels like the app natively reads Word documents!
5. **Management**: You can tap the "three dots" next to any file to favorite it, rename it, share it with friends, or move it to a 30-day Trash bin.

---

## 3. Tech Stack & Languages (Front-End vs. Back-End)

Unlike a website that connects to a cloud server, this app is completely offline. 

### 📱 Front-End (UI & Display)
The front-end is what you see and interact with. It is built using **React Native**, which allows developers to write mobile apps using web technologies.
- **Languages**: TypeScript, JavaScript, JSX.
- **Framework**: React Native 0.87 (the newest architecture).
- **Styling**: Custom Theme system with a built-in Dark Mode that automatically matches your phone's settings.
- **Icons & Animations**: Uses crisp **SVG** files for icons and **Lottie** (JSON-based animations) for things like the loading spinner and "Empty Folder" graphics.

### ⚙️ "Back-End" (Native Android Modules)
Because React Native can't scan a phone's hard drive very fast on its own, the app uses custom native code to do the heavy lifting.
- **Languages**: Kotlin, Java.
- **File Scanner**: A custom Kotlin module (`FileScannerModule.kt`) talks directly to the Android OS (`MediaStore`) to scan files in milliseconds.
- **Converter Engine**: A massive internal Kotlin library (`W2P / OfflineDocConverter`) parses legacy formats and converts them to PDFs without needing an internet connection.

---

## 4. User Interface (UI) & Screens
The app is split into easy-to-navigate screens:

- **Splash Screen**: A beautiful animated intro screen.
- **Home Tab**: Shows a grid of colorful buttons (PDF, Word, Excel, etc.) and a list of your "Recently Opened" files.
- **File List Screen**: Displays all files of a specific type (e.g., all PDFs) with a search bar at the top.
- **Viewer Screen**: The actual reader where you swipe through pages. It includes a bottom toolbar to quickly favorite or jump to a specific page.
- **Trash Screen**: A recycle bin where deleted files live for 30 days before permanently disappearing.
- **Settings Screen**: Lets you toggle Dark Mode, keep the screen awake while reading, and view the privacy policy.

---

## 5. Key Dependencies
Here are the major third-party open-source tools the app relies on:
- **`react-navigation`**: Handles moving between screens (like going from Home to Settings).
- **`react-native-pdf`**: The core engine that renders PDF pages onto the screen.
- **`react-native-blob-util`**: Used to save settings, favorites, and trash lists as simple JSON files on the phone's storage.
- **`lottie-react-native`**: Powers the smooth animations in the app.
- **`Apache POI` (Native)**: A Java library used under-the-hood to extract text from old Microsoft Office formats.

## Summary
The **All Document Reader** is a hybrid app. It uses **React Native (TypeScript)** to render a gorgeous, smooth, and animated User Interface, while securely passing heavy workloads (like file scanning and document conversion) down to **Kotlin** modules for maximum performance.
