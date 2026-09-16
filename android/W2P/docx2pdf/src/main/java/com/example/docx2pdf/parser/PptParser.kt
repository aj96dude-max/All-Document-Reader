package com.example.docx2pdf.parser

import android.content.Context
import android.net.Uri
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.InputStream

/**
 * Parser for legacy PPT files (Office 97-2003).
 * Extracts text using Apache POI Scratchpad and wraps it in a simple HTML document.
 */
class PptParser : DocumentParser {
    
    companion object {
        private const val TAG = "PptParser"
    }

    override suspend fun parse(context: Context, inputUri: Uri): UnifiedDocumentState {
        val htmlContent = withContext(Dispatchers.IO) {
            val resolver = context.contentResolver
            var inputStream: InputStream? = null
            try {
                inputStream = resolver.openInputStream(inputUri)
                    ?: throw IllegalArgumentException("Could not open InputStream for $inputUri")

                // Legacy PPT (Office 97-2003) relies on java.awt graphics classes
                // that are completely absent from the Android SDK. Attempting to parse them
                // via Apache POI ExtractorFactory will crash the AndroidRuntime with a
                // fatal ExceptionInInitializerError/NoClassDefFoundError before it can be caught.
                // Therefore, we bypass extraction entirely and return a graceful fallback HTML.
                
                val errorHtml = """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: 'Arial', sans-serif; padding: 40px; text-align: center; color: #333; }
                        h2 { color: #d9534f; }
                    </style>
                </head>
                <body>
                    <h2>Legacy PPT Not Supported</h2>
                    <p>The older <strong>.ppt</strong> (Office 97-2003) format requires desktop graphics libraries that are unavailable on Android.</p>
                    <p>Please open this file in PowerPoint and save it as a modern <strong>.pptx</strong> file to convert it offline.</p>
                </body>
                </html>
                """.trimIndent()
                return@withContext errorHtml
            } catch (e: Throwable) {
                Log.e(TAG, "Error handling PPT", e)
                return@withContext "<html><body>Error handling PPT</body></html>"
            } finally {
                inputStream?.close()
            }
        }
        
        return UnifiedDocumentState.HtmlState(htmlContent)
    }
}
