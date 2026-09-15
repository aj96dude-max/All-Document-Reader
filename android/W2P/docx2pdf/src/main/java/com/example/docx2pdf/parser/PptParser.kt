package com.example.docx2pdf.parser

import android.content.Context
import android.net.Uri
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.apache.poi.hslf.usermodel.HSLFSlideShow
import org.apache.poi.hslf.usermodel.HSLFTextShape
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
            var ppt: HSLFSlideShow? = null
            try {
                inputStream = resolver.openInputStream(inputUri)
                    ?: throw IllegalArgumentException("Could not open InputStream for $inputUri")

                ppt = HSLFSlideShow(inputStream)
                val textBuilder = StringBuilder()
                for (slide in ppt.slides) {
                    for (shape in slide.shapes) {
                        if (shape is HSLFTextShape) {
                            textBuilder.append(shape.text).append("\n")
                        }
                    }
                }
                val text = textBuilder.toString()

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
                Log.e(TAG, "Error during PPT -> HTML conversion", e)
                throw e
            } finally {
                ppt?.close()
                inputStream?.close()
            }
        }
        
        return UnifiedDocumentState.HtmlState(htmlContent)
    }
}
