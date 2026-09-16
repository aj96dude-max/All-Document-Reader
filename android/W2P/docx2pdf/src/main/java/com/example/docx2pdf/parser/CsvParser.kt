package com.example.docx2pdf.parser

import android.content.Context
import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.InputStreamReader

/**
 * Parser for delimited files (.csv, .tsv).
 * Reads the file line-by-line and splits by the specified delimiter.
 * Emits TableRows via a Flow to maintain a low memory footprint.
 */
class CsvParser(private val delimiter: String) : DocumentParser {
    override suspend fun parse(context: Context, inputUri: Uri): UnifiedDocumentState {
        return withContext(Dispatchers.IO) {
            val flow = flow {
                val inputStream = context.contentResolver.openInputStream(inputUri)
                    ?: throw IllegalArgumentException("Could not open InputStream for $inputUri")
                
                inputStream.use { stream ->
                    BufferedReader(InputStreamReader(stream)).use { reader ->
                        var line: String? = reader.readLine()
                        while (line != null) {
                            // Simple split. Doesn't handle complex CSV cases like quoted delimiters.
                            // Suitable for low-overhead tabular data.
                            val columns = line.split(delimiter).map { it.trim() }
                            emit(DocumentElement.TableRow(columns))
                            line = reader.readLine()
                        }
                    }
                }
            }
            UnifiedDocumentState.StreamState(flow)
        }
    }
}
