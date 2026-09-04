package com.example.docx2pdf.parser

import android.content.Context
import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.InputStreamReader

/**
 * A stream-based parser for Markdown (.md) files.
 * Extracts text and applies basic styling like Headers.
 */
class MarkdownParser : DocumentParser {
    override suspend fun parse(context: Context, inputUri: Uri): UnifiedDocumentState {
        return withContext(Dispatchers.IO) {
            val flow = flow {
                val inputStream = context.contentResolver.openInputStream(inputUri)
                    ?: throw IllegalArgumentException("Could not open InputStream for $inputUri")
                
                inputStream.use { stream ->
                    BufferedReader(InputStreamReader(stream)).use { reader ->
                        var line: String? = reader.readLine()
                        while (line != null) {
                            val trimmed = line.trimStart()
                            var text = line
                            var isHeader = false
                            
                            if (trimmed.startsWith("#")) {
                                isHeader = true
                                text = trimmed.replace(Regex("^#+\\s*"), "")
                            }
                            
                            // Basic bold stripping (doesn't support inline styles perfectly, but cleans it up)
                            val isBold = text.contains("**")
                            text = text.replace("**", "")

                            emit(DocumentElement.TextLine(
                                text = text,
                                isHeader = isHeader,
                                isBold = isBold
                            ))
                            line = reader.readLine()
                        }
                    }
                }
            }
            UnifiedDocumentState.StreamState(flow)
        }
    }
}
