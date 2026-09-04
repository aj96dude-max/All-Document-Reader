package com.example.docx2pdf.parser

import android.content.Context
import android.net.Uri

/**
 * A pass-through parser for PDF files.
 * It simply returns the input URI wrapped in a PdfState, allowing the 
 * rendering engine to bypass drawing and just copy the file.
 */
class PdfParser : DocumentParser {
    override suspend fun parse(context: Context, inputUri: Uri): UnifiedDocumentState {
        return UnifiedDocumentState.PdfState(inputUri)
    }
}
