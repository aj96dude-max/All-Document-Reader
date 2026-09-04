# Offline Usage Guide for Clients

This guide explains how to use the `docx2pdf` Android library in your own application entirely offline. 

## 1. Importing the Library (AAR)

If you are using this library in another Android app, you can compile this module into an `.aar` (Android Archive) file, or include it directly as a Gradle module.

To use the `.aar` file without an IDE:
1. Build the AAR by running `./gradlew :docx2pdf:assembleRelease` in the project root.
2. The generated `.aar` will be located at `docx2pdf/build/outputs/aar/docx2pdf-release.aar`.
3. Copy this `.aar` file to your client app's `app/libs/` directory.
4. Add the following to your client app's `build.gradle`:
   ```gradle
   dependencies {
       implementation files('libs/docx2pdf-release.aar')
       // Ensure you have coroutines added in your app as well
       implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
   }
   ```

## 2. Using the Code

The library exposes a single, clean API: `OfflineDocConverter`.

### Requirements
- You need the `Uri` of the input DOCX file.
- You need the `Uri` of the destination PDF file.
- On modern Android (Android 10+), you should use the **Storage Access Framework (SAF)** (e.g., `ACTION_OPEN_DOCUMENT` and `ACTION_CREATE_DOCUMENT`) to get these URIs. You DO NOT need `<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />` if you use SAF.

### Kotlin Example

```kotlin
import android.net.Uri
import androidx.lifecycle.lifecycleScope
import com.example.docx2pdf.OfflineDocConverterImpl
import kotlinx.coroutines.launch

class MyActivity : AppCompatActivity() {

    // Call this function passing the URIs you get from ActivityResultLaunchers
    fun startConversion(inputDocxUri: Uri, outputPdfUri: Uri) {
        
        // Launch a coroutine (the library handles switching to the background IO thread)
        lifecycleScope.launch {
            
            val result = OfflineDocConverterImpl.convertWordToPdf(
                context = applicationContext,
                inputUri = inputDocxUri,
                outputUri = outputPdfUri
            )

            if (result.isSuccess) {
                // The PDF is successfully written to outputPdfUri!
                // You can notify the user or open the PDF viewer.
                println("Conversion successful!")
            } else {
                // Something went wrong (e.g., file corrupted, disk full)
                val error = result.exceptionOrNull()
                println("Conversion failed: ${error?.message}")
            }
        }
    }
}
```

## 3. Why it is 100% Offline
- **No Internet Permissions:** The library's `AndroidManifest.xml` does not request `<uses-permission android:name="android.permission.INTERNET" />`.
- **Local Streams:** It uses `context.contentResolver.openInputStream()` and `openOutputStream()`, which read and write data directly to the phone's local flash storage.
- **On-Device Engine:** Apache POI processes the XML structure of the DOCX locally in memory, and `PdfDocument` uses native Android C++ rendering pipelines to draw the PDF graphics locally. No data ever leaves the device.
