package com.example.docx2pdf.parser

import android.content.Context
import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.InputStreamReader

/**
 * Parser for EML files.
 * Reads headers (From, To, Subject, Date) and then the body.
 */
class EmlParser : DocumentParser {
    override suspend fun parse(context: Context, inputUri: Uri): UnifiedDocumentState {
        return withContext(Dispatchers.IO) {
            val flow = flow {
                context.contentResolver.openInputStream(inputUri)?.use { stream ->
                    BufferedReader(InputStreamReader(stream)).use { reader ->
                        var isBody = false
                        var line = reader.readLine()
                        while (line != null) {
                            if (!isBody) {
                                if (line.trim().isEmpty()) {
                                    isBody = true
                                    emit(DocumentElement.TextLine("", isHeader = false))
                                } else {
                                    // Header line
                                    val lower = line.lowercase()
                                    if (lower.startsWith("from:") || lower.startsWith("to:") || 
                                        lower.startsWith("subject:") || lower.startsWith("date:")) {
                                        emit(DocumentElement.TextLine(line, isBold = true))
                                    }
                                }
                            } else {
                                emit(DocumentElement.TextLine(line))
                            }
                            line = reader.readLine()
                        }
                    }
                }
            }
            UnifiedDocumentState.StreamState(flow)
        }
    }
}
