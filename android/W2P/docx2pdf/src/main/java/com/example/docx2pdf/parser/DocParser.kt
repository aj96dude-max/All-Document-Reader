package com.example.docx2pdf.parser

import android.content.Context
import android.net.Uri
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.apache.poi.hwpf.extractor.WordExtractor
import java.io.InputStream

/**
 * Parser for legacy DOC files (Office 97-2003).
 * Extracts text using Apache POI Scratchpad and wraps it in a simple HTML document.
 */
class DocParser : DocumentParser {
    
    companion object {
        private const val TAG = "DocParser"
    }

    override suspend fun parse(context: Context, inputUri: Uri): UnifiedDocumentState {
        val htmlContent = withContext(Dispatchers.IO) {
            val resolver = context.contentResolver
            var inputStream: InputStream? = null
            var extractor: WordExtractor? = null
            try {
                inputStream = resolver.openInputStream(inputUri)
                    ?: throw IllegalArgumentException("Could not open InputStream for $inputUri")

                extractor = WordExtractor(inputStream)
                val text = extractor.text

                // Encode HTML entities
                val encodedText = text.replace("&", "&amp;")
                                      .replace("<", "&lt;")
                                      .replace(">", "&gt;")
                                      .replace("\n", "<br>")

                // Wrap the extracted text in a clean A4 styled document
                val html = """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { 
                            font-family: 'Arial', sans-serif; 
                            padding: 40px; 
                            color: black; 
                            background: white; 
                            margin: 0;
                        }
                        p { line-height: 1.5; margin-bottom: 10px; }
                    </style>
                </head>
                <body>
                    <p>${encodedText}</p>
                </body>
                </html>
                """.trimIndent()

                html
            } catch (e: Exception) {
                Log.e(TAG, "Error during DOC -> HTML conversion", e)
                throw e
            } finally {
                extractor?.close()
                inputStream?.close()
            }
        }
        
        return UnifiedDocumentState.HtmlState(htmlContent)
    }
}
