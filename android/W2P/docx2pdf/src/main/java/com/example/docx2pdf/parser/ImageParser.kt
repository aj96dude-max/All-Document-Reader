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
        val path = inputUri.toString().lowercase()
        if (path.endsWith(".psd")) {
            val errorHtml = """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: 'Arial', sans-serif; padding: 40px; text-align: center; color: #333; }
                        h2 { color: #d9534f; }
                    </style>
                </head>
                <body>
                    <h2>PSD Format Not Supported</h2>
                    <p>Adobe Photoshop Document (.psd) files cannot be rendered natively offline on Android.</p>
                    <p>Please export this file to a standard image format (like PNG or JPG) to view and convert it.</p>
                </body>
                </html>
            """.trimIndent()
            return UnifiedDocumentState.HtmlState(errorHtml)
        }
        return UnifiedDocumentState.ImageState(inputUri)
    }
}
