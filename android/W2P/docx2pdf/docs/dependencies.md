# Dependencies

This project uses a minimal set of dependencies to ensure it remains lightweight, fast, and 100% offline.

## Core Libraries

| Library | Version | Purpose | Offline Status |
| :--- | :--- | :--- | :--- |
| **Kotlin Coroutines** | `1.7.3` | Used to manage background threads (`Dispatchers.IO`). Ensures that the heavy DOCX parsing and PDF generation does not freeze the Android UI. | ✅ 100% Offline |
| **Apache POI OOXML** | `5.2.3` | Used to parse the `.docx` (XML structure) file formats. Reads paragraphs, text runs, and basic styling. | ✅ 100% Offline |
| **Android PdfDocument** | Native (API 19+) | Native Android API (`android.graphics.pdf.PdfDocument`) used to draw text onto a PDF canvas and generate the final file. | ✅ 100% Offline |
| **AndroidX Core KTX** | `1.12.0` | Standard Android Kotlin extensions for cleaner code. | ✅ 100% Offline |

## ProGuard / R8 Rules

Apache POI was originally designed for Java Desktop environments and includes references to `java.awt` (Abstract Window Toolkit) and `javax.xml`. Because these libraries are not available on Android, this module includes specialized ProGuard rules to safely ignore these missing classes during compilation.

```pro
-dontwarn java.awt.**
-dontwarn javax.xml.**
-keep class org.apache.poi.** { *; }
```
These rules are bundled into the module's `consumer-rules.pro` file, meaning any app that imports this library will automatically inherit these safety rules without any extra configuration.
