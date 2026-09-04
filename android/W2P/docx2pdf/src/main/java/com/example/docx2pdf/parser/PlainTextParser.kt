package com.example.docx2pdf.parser

import android.content.Context
import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.InputStreamReader

/**
 * Parser for plain text files (.txt, .tex).
 * Reads the file line-by-line using a BufferedReader and emits TextLines via a Flow
 * to ensure a low memory footprint.
 */
class PlainTextParser(private val isMonospace: Boolean = false) : DocumentParser {
    override suspend fun parse(context: Context, inputUri: Uri): UnifiedDocumentState {
        return withContext(Dispatchers.IO) {
            val flow = flow {
                val inputStream = context.contentResolver.openInputStream(inputUri)
                    ?: throw IllegalArgumentException("Could not open InputStream for $inputUri")
                
                inputStream.use { stream ->
                    BufferedReader(InputStreamReader(stream)).use { reader ->
                        var line: String? = reader.readLine()
                        while (line != null) {
                            emit(DocumentElement.TextLine(text = line, isMonospace = isMonospace))
                            line = reader.readLine()
                        }
                    }
                }
            }
            UnifiedDocumentState.StreamState(flow)
        }
    }
}
