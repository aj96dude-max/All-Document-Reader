package com.example.docx2pdf.parser

import android.content.Context
import android.net.Uri
import kotlinx.coroutines.flow.Flow

/**
 * Represents a parsed element from a stream-based document.
 */
sealed class DocumentElement {
    /**
     * A simple line of text, optionally with basic bold/italic formatting.
     */
    data class TextLine(
        val text: String,
        val isBold: Boolean = false,
        val isItalic: Boolean = false,
        val isHeader: Boolean = false,
        val isMonospace: Boolean = false
    ) : DocumentElement()

    /**
     * A row of tabular data from a CSV or TSV file.
     */
    data class TableRow(
        val columns: List<String>
    ) : DocumentElement()
}

/**
 * Represents a drawn shape on a single slide page.
 */
sealed class SlideShape {
    data class TextBlock(
        val x: Double, val y: Double, val w: Double, val h: Double,
        val paragraphs: List<Paragraph>
    ) : SlideShape() {
        data class Paragraph(
            val runs: List<Run>,
            val align: String?
        )
        data class Run(
            val text: String,
            val color: String?,
            val fontSizePt: Double?,
            val isBold: Boolean, val isItalic: Boolean, val isUnderline: Boolean
        )
    }

    data class Rectangle(
        val x: Double, val y: Double, val w: Double, val h: Double,
        val bgColor: String?,
        val cornerRadius: Double? = null
    ) : SlideShape()

    data class Ellipse(
        val x: Double, val y: Double, val w: Double, val h: Double,
        val bgColor: String?
    ) : SlideShape()

    data class Image(
        val x: Double, val y: Double, val w: Double, val h: Double,
        val imageFile: java.io.File,
        val mimeType: String
    ) : SlideShape()
}


/**
 * Unified data state that the rendering engine understands.
 */
sealed class UnifiedDocumentState {
    /**
     * Used for DOCX or formats that naturally parse to HTML. 
     * Will be rendered using the WebView engine.
     */
    data class HtmlState(val htmlContent: String) : UnifiedDocumentState()

    /**
     * Represents raw text or tabular data that can be drawn natively line-by-line.
     */
    data class StreamState(val elements: Flow<DocumentElement>) : UnifiedDocumentState()
    
    /**
     * Represents a document that is already a PDF, storing its URI for direct copying or rendering.
     */
    data class PdfState(val uri: Uri) : UnifiedDocumentState()
    
    /**
     * Represents an image document, storing its URI so it can be decoded into a Bitmap and drawn to the PDF.
     */
    data class ImageState(val uri: Uri) : UnifiedDocumentState()

    /**
     * Represents a paginated document consisting of distinct pages, each with its own shapes.
     * Pages are emitted lazily.
     */
    data class PagedState(
        val pages: Flow<List<SlideShape>>,
        val pageWidthPx: Double,
        val pageHeightPx: Double
    ) : UnifiedDocumentState()
}

/**
 * Interface for all document parsers.
 */
interface DocumentParser {
    /**
     * Parses the file at [inputUri] and returns its representation as a [UnifiedDocumentState].
     * 
     * @param context Application context to resolve URIs.
     * @param inputUri The URI of the file to parse.
     */
    suspend fun parse(context: Context, inputUri: Uri): UnifiedDocumentState
}
