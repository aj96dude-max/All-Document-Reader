package com.example.docx2pdf.parser

import android.content.Context
import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.InputStreamReader

/**
 * A parser that handles direct HTML files (.html, .htm).
 * Reads the HTML content directly for rendering in the WebView.
 */
class HtmlParser : DocumentParser {

    override suspend fun parse(context: Context, inputUri: Uri): UnifiedDocumentState {
        return withContext(Dispatchers.IO) {
            val htmlContentBuilder = StringBuilder()
            context.contentResolver.openInputStream(inputUri)?.use { stream ->
                InputStreamReader(stream, Charsets.UTF_8).use { reader ->
                    var charsRead: Int
                    val buffer = CharArray(4096)
                    while (reader.read(buffer).also { charsRead = it } != -1) {
                        htmlContentBuilder.append(buffer, 0, charsRead)
                    }
                }
            }
            
            // To prevent massive string payload, we write it to a temp file and return the Uri
            val tempFile = java.io.File.createTempFile("html_preview_", ".html", context.cacheDir)
            tempFile.writeText(htmlContentBuilder.toString())
            
            UnifiedDocumentState.HtmlState(fileUri = Uri.fromFile(tempFile))
        }
    }
}
