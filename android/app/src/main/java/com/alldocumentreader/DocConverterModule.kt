package com.alldocumentreader

import android.net.Uri
import android.util.Log
import com.example.docx2pdf.OfflineDocConverterImpl
import com.facebook.react.bridge.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.io.File

/**
 * React Native native module bridging the W2P OfflineDocConverter library.
 *
 * Provides offline document-to-PDF conversion capabilities to the JS layer.
 * Converted PDFs are written to the app's cache directory for in-app viewing.
 */
class DocConverterModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "DocConverterModule"

        // All extensions supported by the W2P DocumentParserFactory
        private val SUPPORTED_EXTENSIONS = setOf(
            // Text & Markup
            "txt", "tex", "json", "xml", "md",
            // Source Code
            "java", "kt", "py", "c", "cpp", "html", "js", "css",
            "yaml", "yml", "sh", "swift", "rb", "go", "rs", "php",
            // Delimited Data
            "csv", "tsv",
            // Rich Text / Office (modern formats)
            "rtf", "docx", "pptx", "xlsx", "epub",
            // Images
            "jpg", "jpeg", "png", "webp", "bmp", "gif",
            // PDF passthrough
            "pdf"
        )
    }

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun getName(): String = "DocConverterModule"

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        scope.cancel()
    }

    /**
     * Convert a document file to PDF.
     *
     * @param inputUri   content:// URI string of the source document
     * @param outputPath absolute file path for the output PDF
     * @param promise    resolves with the outputPath on success, rejects on failure
     */
    @ReactMethod
    fun convertToPdf(inputUri: String, outputPath: String, promise: Promise) {
        // Prefer currentActivity because PdfRenderingEngine requires it for WebView rendering.
        // Fallback to reactApplicationContext for other conversions if Activity is unavailable.
        val context = getCurrentActivity() ?: reactApplicationContext ?: run {
            promise.reject("E_NO_CONTEXT", "React application context and Activity are not available")
            return
        }

        scope.launch {
            try {
                val input = Uri.parse(inputUri)
                val outputFile = File(outputPath)

                // Ensure the parent directory exists
                outputFile.parentFile?.mkdirs()

                val output = Uri.fromFile(outputFile)

                Log.d(TAG, "Converting: $inputUri -> $outputPath")

                val result = OfflineDocConverterImpl.convertWordToPdf(context, input, output)

                result.fold(
                    onSuccess = {
                        Log.d(TAG, "Conversion successful: $outputPath")
                        promise.resolve(outputPath)
                    },
                    onFailure = { error ->
                        Log.e(TAG, "Conversion failed", error)
                        promise.reject(
                            "E_CONVERSION_FAILED",
                            error.message ?: "Document conversion failed",
                            error
                        )
                    }
                )
            } catch (e: Exception) {
                Log.e(TAG, "Unexpected error during conversion", e)
                promise.reject(
                    "E_CONVERSION_ERROR",
                    e.message ?: "An unexpected error occurred during conversion",
                    e
                )
            }
        }
    }

    /**
     * Check if a given file extension is supported for conversion.
     *
     * @param extension file extension (without dot), e.g. "docx"
     * @param promise   resolves with a boolean
     */
    @ReactMethod
    fun isConversionSupported(extension: String, promise: Promise) {
        val normalized = extension.lowercase().trim().removePrefix(".")
        promise.resolve(SUPPORTED_EXTENSIONS.contains(normalized))
    }
}
