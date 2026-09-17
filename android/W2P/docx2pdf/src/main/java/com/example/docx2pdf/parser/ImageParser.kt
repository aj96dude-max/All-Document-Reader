package com.example.docx2pdf.parser

import android.content.Context
import android.net.Uri

/**
 * A pass-through parser for Image files (.jpg, .png, .webp, etc.).
 * It simply returns the input URI wrapped in an ImageState, allowing the 
 * rendering engine to decode the image and draw it onto the PDF Canvas.
 */
class ImageParser : DocumentParser {
    override suspend fun parse(context: Context, inputUri: Uri): UnifiedDocumentState {
        return UnifiedDocumentState.ImageState(inputUri)
    }
}
