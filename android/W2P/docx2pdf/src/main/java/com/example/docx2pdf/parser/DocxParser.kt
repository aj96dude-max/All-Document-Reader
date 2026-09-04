package com.example.docx2pdf.parser

import android.content.Context
import android.net.Uri
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.zwobble.mammoth.DocumentConverter
import java.io.InputStream

/**
 * Parser for DOCX files.
 * Uses Mammoth to convert DOCX to HTML, matching the legacy implementation.
 */
class DocxParser : DocumentParser {
    
    companion object {
        private const val TAG = "DocxParser"
    }

    override suspend fun parse(context: Context, inputUri: Uri): UnifiedDocumentState {
        val htmlContent = withContext(Dispatchers.IO) {
            val resolver = context.contentResolver
            var inputStream: InputStream? = null
            try {
                inputStream = resolver.openInputStream(inputUri)
                    ?: throw IllegalArgumentException("Could not open InputStream for $inputUri")

                val converter = DocumentConverter()
                val result = converter.convertToHtml(inputStream)

                // Wrap the extracted HTML in a clean A4 styled document
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
                        img { max-width: 100%; height: auto; display: block; margin: 10px 0; }
                        table { border-collapse: collapse; width: 100%; margin: 10px 0; }
                        table, th, td { border: 1px solid black; padding: 8px; text-align: left; }
                        p { line-height: 1.5; margin-bottom: 10px; }
                        h1, h2, h3 { margin-top: 20px; margin-bottom: 10px; }
                    </style>
                </head>
                <body>
                    ${result.value}
                </body>
                </html>
                """.trimIndent()

                html
            } catch (e: Exception) {
                Log.e(TAG, "Error during DOCX -> HTML conversion", e)
                throw e
            } finally {
                inputStream?.close()
            }
        }
        
        return UnifiedDocumentState.HtmlState(htmlContent)
    }
}
