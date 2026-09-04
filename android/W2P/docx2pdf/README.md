# docx2pdf - Offline Android Converter

A standalone, 100% offline Android library module written in Kotlin for converting `.docx` files to `.pdf` files strictly on-device.

## Overview

This library leverages **Apache POI** to parse Word Document XML structures and uses Android's native **`android.graphics.pdf.PdfDocument`** to draw the text onto a PDF canvas. 

Because it operates entirely on the device, it provides total data privacy for end-users and functions without any internet connection.

## Key Features
*   **100% Offline:** No HTTP calls, no cloud APIs.
*   **Coroutine Powered:** Exposes a clean `suspend` function that runs on `Dispatchers.IO` to keep your UI thread completely free.
*   **Safe Handling:** Handles memory responsibly using `StaticLayout` and stream-based I/O.
*   **Easy Integration:** Exposes a single `OfflineDocConverter` facade.

## Quick Start

See the `docs/` folder for detailed guides:
1. [Offline Usage Guide](docs/offline_usage_guide.md) - How to implement this in your app.
2. [Dependencies & ProGuard](docs/dependencies.md) - Why we use specific dependencies and ProGuard rules.

## Basic Usage

```kotlin
val result = OfflineDocConverterImpl.convertWordToPdf(
    context = applicationContext,
    inputUri = inputDocxUri,
    outputUri = outputPdfUri
)
```
