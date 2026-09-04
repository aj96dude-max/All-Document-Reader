# OfflineDocConverter

An extremely lightweight, 100% offline Android library for converting a wide array of document, data, and code formats into PDF files, complete with a live-preview feature.

## Supported File Formats

The `OfflineDocConverter` supports live previewing (with memory-safe truncation for massive files) and full PDF conversion for all of the following file types:

### Word Processing & Rich Text
*   **`.docx`** (Microsoft Word) - Rendered with visual fidelity via an off-screen WebView.
*   **`.epub`** (eBooks) - Unzips and processes the spine, rendering the book chapter-by-chapter into a continuous PDF while intelligently stripping broken images.
*   **`.rtf`** (Rich Text Format) - Custom lightweight stream parser that strips headers and extracts styled text.
*   **`.md`** (Markdown) - Custom parser supporting headers and basic text styling.
*   **`.txt`, `.tex`** (Plain Text) - Streamed line-by-line for zero-overhead parsing of massive files.

### Presentations & Spreadsheets
*   **`.pptx`** (Modern PowerPoint) - Zero-dependency ZIP/XML parser that safely extracts text slide-by-slide. *(Note: Older binary `.ppt` is intentionally not supported to avoid massive dependencies).*
*   **`.xlsx`** (Modern Excel) - Zero-dependency, two-pass ZIP parser that accurately renders spreadsheet data onto a tabular PDF grid.

### Images & Media
*   **`.jpg`, `.png`, `.webp`, `.gif`, `.bmp`** - Dynamically downsamples and renders images proportionally centered onto a crisp A4 PDF page, ensuring memory safety for huge photos.

### Data & Delimited Formats
*   **`.csv`, `.tsv`** (Delimited Data) - Safely streams and prints data cell-by-cell.
*   **`.json`, `.xml`** (Structured Data) - Streamed and rendered using a clean, monospaced font for readability.

### Source Code
*   **`.java`, `.kt`, `.py`, `.c`, `.cpp`, `.html`, `.js`, `.css`, `.yaml`, `.yml`, `.sh`, `.swift`, `.rb`, `.go`, `.rs`, `.php`** - Streamed and rendered cleanly with monospaced typography.

### Portable Document Format
*   **`.pdf`** - Native bypass mode. If the file is already a PDF, the app securely renders the first page as an image preview and then performs a lossless, direct byte-copy for conversion to maintain 100% of the original quality.

---

## Features
*   **100% Offline**: No network calls, no privacy risks.
*   **Zero-Dependency Parsing**: Aside from `.docx`, all modern formats (`.pptx`, `.xlsx`, `.md`, etc.) are parsed natively using Android's built-in `XmlPullParser` and `ZipInputStream`, ensuring your APK size stays small.
*   **Memory Safe**: Uses Kotlin Coroutines, `Flow`, and `BufferedReader` to process gigabyte-sized files (like massive `.csv` logs) efficiently without triggering an `OutOfMemoryError`.
*   **Live Preview**: Safely previews the first 500 lines of massive documents directly in the UI before you decide to convert.

---

## Licensing & Google Play Compliance

This library is designed for seamless integration into commercial Google Play apps. It strictly avoids encumbered licenses (like GPL) and relies on permissible open-source protocols:
*   **Android Native APIs (`WebView`, `XmlPullParser`, `ZipInputStream`, `PdfRenderer`)**: Covered under the [Apache License 2.0 / AOSP](https://source.android.com/docs/setup/about/licenses).
*   **Mammoth (DOCX Parser)**: Provided under the [2-Clause BSD License](https://opensource.org/licenses/BSD-2-Clause). 
    *   *Note: The Mammoth engine is pulled in as a Gradle dependency (`org.zwobble.mammoth:mammoth:1.4.0`) from Maven Central. Our custom wrapper logic for it resides locally at: `docx2pdf/src/main/java/com/example/docx2pdf/parser/DocxParser.kt`*
*   **Kotlin Coroutines**: Provided under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).
