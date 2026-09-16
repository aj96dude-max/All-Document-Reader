package com.example.docx2pdf.internal

import android.content.Context
import android.net.Uri
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import android.webkit.WebView
import android.webkit.WebViewClient
import android.util.Log
import com.example.docx2pdf.parser.DocumentElement
import com.example.docx2pdf.parser.UnifiedDocumentState
import com.example.docx2pdf.parser.SlideShape
import android.graphics.RectF
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Core engine responsible for rendering a [UnifiedDocumentState] to PDF.
 * Uses either WebView (for HTML state) or direct Canvas drawing (for Stream state).
 */
internal class PdfRenderingEngine(private val context: Context) {

    companion object {
        private const val TAG = "PdfRenderingEngine"
        // A4 dimensions at standard 72 DPI scale for PDFDocument (595 x 842)
        private const val A4_WIDTH = 794 // 96 DPI A4 width
        private const val A4_HEIGHT = 1123 // 96 DPI A4 height
        private const val MARGIN = 50f
        private const val PDF_MARGIN = 50f

        // JavaScript to measure Y-positions of all block-level elements.
        // Used by smart pagination to avoid cutting text lines at page breaks.
        private const val ELEMENT_BOUNDARY_JS = """(function() {
            var els = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, tr, li, pre, blockquote, img');
            var r = [];
            for (var i = 0; i < els.length; i++) {
                var rect = els[i].getBoundingClientRect();
                r.push(Math.round(rect.top + window.scrollY) + ',' + Math.round(rect.bottom + window.scrollY));
            }
            var h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, document.body.offsetHeight, document.documentElement.offsetHeight, document.body.clientHeight, document.documentElement.clientHeight);
            return h + '|' + r.join(';');
        })()"""
    }

    /**
     * Represents the vertical boundaries of a rendered HTML block element.
     */
    private data class ElementBoundary(val top: Int, val bottom: Int)

    /**
     * Parses the JSON-encoded string returned by [ELEMENT_BOUNDARY_JS].
     * Format: "top1,bottom1;top2,bottom2;..."
     */
    private fun parseElementBoundaries(boundariesStr: String, scale: Float): List<ElementBoundary> {
        if (boundariesStr.isBlank()) return emptyList()
        return boundariesStr.split(";").mapNotNull { pair ->
            val parts = pair.split(",")
            if (parts.size == 2) {
                val top = (parts[0].toFloatOrNull() ?: 0f) * scale
                val bottom = (parts[1].toFloatOrNull() ?: 0f) * scale
                if (bottom > top) {
                    ElementBoundary(top.toInt(), bottom.toInt())
                } else null
            } else null
        }.sortedBy { it.top }
    }

    /**
     * Finds the best page break point that avoids cutting through an element.
     *
     * Scans through [boundaries] to find elements that straddle [idealBottom].
     * If one is found, the break is moved to just before that element's top.
     * If the element is taller than a full page, the cut is accepted (unavoidable).
     *
     * @param pageTop      The Y-offset where the current page's content begins
     * @param idealBottom  The Y-offset where the page would end with fixed slicing
     * @param boundaries   Sorted list of element boundaries from the rendered HTML
     * @return The safe Y-offset to end the current page at
     */
    private fun findSafeBreakPoint(
        pageTop: Int,
        idealBottom: Int,
        boundaries: List<ElementBoundary>
    ): Int {
        // Default: use the full page height (same as original fixed behavior)
        var safeBreak = idealBottom

        for (boundary in boundaries) {
            // Skip elements entirely above the current page
            if (boundary.bottom <= pageTop) continue
            // Elements are sorted — stop when past the page bottom
            if (boundary.top >= idealBottom) break

            // Does this element straddle the page boundary?
            if (boundary.top < idealBottom && boundary.bottom > idealBottom) {
                // Move break to just before this element
                if (boundary.top > pageTop) {
                    safeBreak = boundary.top
                }
                // If boundary.top <= pageTop, the element is taller than a full page.
                // We cannot avoid the cut, so keep safeBreak = idealBottom.
                break
            }
        }

        return safeBreak
    }

    suspend fun process(state: UnifiedDocumentState, outputUri: Uri) {
        when (state) {
            is UnifiedDocumentState.HtmlState -> renderHtmlToPdf(state.htmlContent, state.fileUri, outputUri, state.landscape)
            is UnifiedDocumentState.StreamState -> renderStreamToPdf(state, outputUri)
            is UnifiedDocumentState.ImageState -> renderImageToPdf(state, outputUri)
            is UnifiedDocumentState.PagedState -> renderPagedToPdf(state, outputUri)
            is UnifiedDocumentState.PdfState -> {
                // Handled upstream in OfflineDocConverter
            }
        }
    }

    private suspend fun renderImageToPdf(state: UnifiedDocumentState.ImageState, outputUri: Uri) {
        withContext(Dispatchers.IO) {
            val pdfDocument = PdfDocument()
            val pageInfo = PdfDocument.PageInfo.Builder(A4_WIDTH, A4_HEIGHT, 1).create()
            val page = pdfDocument.startPage(pageInfo)
            
            var bitmap: android.graphics.Bitmap? = null
            context.contentResolver.openInputStream(state.uri)?.use { stream ->
                val options = android.graphics.BitmapFactory.Options()
                options.inJustDecodeBounds = true
                android.graphics.BitmapFactory.decodeStream(stream, null, options)
                
                var inSampleSize = 1
                val reqWidth = A4_WIDTH * 2 // allow 2x resolution for sharpness
                val reqHeight = A4_HEIGHT * 2
                
                if (options.outHeight > reqHeight || options.outWidth > reqWidth) {
                    val halfHeight = options.outHeight / 2
                    val halfWidth = options.outWidth / 2
                    while (halfHeight / inSampleSize >= reqHeight && halfWidth / inSampleSize >= reqWidth) {
                        inSampleSize *= 2
                    }
                }
                options.inJustDecodeBounds = false
                options.inSampleSize = inSampleSize
                
                // Must open stream again to decode actual bitmap
                context.contentResolver.openInputStream(state.uri)?.use { stream2 ->
                    bitmap = android.graphics.BitmapFactory.decodeStream(stream2, null, options)
                }
            }
            
            val finalBitmap = bitmap
            if (finalBitmap != null) {
                // Calculate scaling to fit A4 while maintaining aspect ratio
                val scale = minOf(
                    (A4_WIDTH - 2 * MARGIN) / finalBitmap.width.toFloat(),
                    (A4_HEIGHT - 2 * MARGIN) / finalBitmap.height.toFloat()
                )
                
                val scaledWidth = finalBitmap.width * scale
                val scaledHeight = finalBitmap.height * scale
                
                // Center the image
                val left = (A4_WIDTH - scaledWidth) / 2f
                val top = (A4_HEIGHT - scaledHeight) / 2f
                
                val src = android.graphics.Rect(0, 0, finalBitmap.width, finalBitmap.height)
                val dst = android.graphics.RectF(left, top, left + scaledWidth, top + scaledHeight)
                
                page.canvas.drawBitmap(finalBitmap, src, dst, null)
                finalBitmap.recycle()
            }
            
            pdfDocument.finishPage(page)
            
            context.contentResolver.openOutputStream(outputUri)?.use { out ->
                pdfDocument.writeTo(out)
            }
            pdfDocument.close()
        }
    }

    private suspend fun renderStreamToPdf(state: UnifiedDocumentState.StreamState, outputUri: Uri) {
        withContext(Dispatchers.IO) {
            val pdfDocument = PdfDocument()
            val pageInfo = PdfDocument.PageInfo.Builder(A4_WIDTH, A4_HEIGHT, 1).create()
            
            var currentPage = pdfDocument.startPage(pageInfo)
            var currentCanvas = currentPage.canvas

            val textPaint = Paint().apply {
                color = Color.BLACK
                textSize = 12f
                typeface = Typeface.create(Typeface.DEFAULT, Typeface.NORMAL)
            }

            val boldPaint = Paint(textPaint).apply {
                typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            }

            val italicPaint = Paint(textPaint).apply {
                typeface = Typeface.create(Typeface.DEFAULT, Typeface.ITALIC)
            }
            
            val boldItalicPaint = Paint(textPaint).apply {
                typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD_ITALIC)
            }

            val headerPaint = Paint(textPaint).apply {
                typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                textSize = 18f
            }

            val monospacePaint = Paint(textPaint).apply {
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.NORMAL)
            }

            val lineHeight = textPaint.descent() - textPaint.ascent()
            val headerLineHeight = headerPaint.descent() - headerPaint.ascent()
            var currentY = MARGIN + lineHeight

            state.elements.collect { element ->
                // Calculate height required for this element
                val requiredHeight = if (element is DocumentElement.TextLine && element.isHeader) {
                    headerLineHeight
                } else {
                    lineHeight
                }

                // Pagination logic
                if (currentY + requiredHeight > A4_HEIGHT - MARGIN) {
                    pdfDocument.finishPage(currentPage)
                    currentPage = pdfDocument.startPage(pageInfo)
                    currentCanvas = currentPage.canvas
                    currentY = MARGIN + requiredHeight
                }

                when (element) {
                    is DocumentElement.TextLine -> {
                        val paintToUse = when {
                            element.isHeader -> headerPaint
                            element.isMonospace -> monospacePaint
                            element.isBold && element.isItalic -> boldItalicPaint
                            element.isBold -> boldPaint
                            element.isItalic -> italicPaint
                            else -> textPaint
                        }
                        currentCanvas.drawText(element.text, MARGIN, currentY, paintToUse)
                        currentY += if (element.isHeader) headerLineHeight else lineHeight
                    }
                    is DocumentElement.TableRow -> {
                        // Advanced Grid and Column rendering for CSV/TSV
                        val colCount = element.columns.size.coerceAtLeast(1)
                        val columnWidth = (A4_WIDTH - 2 * MARGIN) / colCount
                        
                        // First pass to calculate max height of this row
                        var maxRowHeight = lineHeight
                        val layouts = element.columns.map { columnText ->
                            val textLayout = android.text.StaticLayout.Builder.obtain(
                                columnText, 0, columnText.length, android.text.TextPaint(textPaint), columnWidth.toInt() - 10
                            ).setAlignment(android.text.Layout.Alignment.ALIGN_NORMAL).build()
                            
                            if (textLayout.height > maxRowHeight) {
                                maxRowHeight = textLayout.height.toFloat()
                            }
                            textLayout
                        }
                        
                        // Check pagination for the row height
                        if (currentY + maxRowHeight > A4_HEIGHT - MARGIN) {
                            pdfDocument.finishPage(currentPage)
                            currentPage = pdfDocument.startPage(pageInfo)
                            currentCanvas = currentPage.canvas
                            currentY = MARGIN + maxRowHeight
                        }
                        
                        // Grid Paint
                        val gridPaint = Paint().apply {
                            color = Color.LTGRAY
                            style = Paint.Style.STROKE
                            strokeWidth = 1f
                        }

                        var currentX = MARGIN
                        for ((index, layout) in layouts.withIndex()) {
                            // Draw cell borders
                            val cellRect = android.graphics.RectF(currentX, currentY - lineHeight, currentX + columnWidth, currentY - lineHeight + maxRowHeight + 10f)
                            currentCanvas.drawRect(cellRect, gridPaint)
                            
                            // Draw wrapped text
                            currentCanvas.save()
                            currentCanvas.translate(currentX + 5f, currentY - lineHeight + 5f)
                            layout.draw(currentCanvas)
                            currentCanvas.restore()
                            
                            currentX += columnWidth
                        }
                        
                        currentY += maxRowHeight + 10f
                    }
                }
            }

            pdfDocument.finishPage(currentPage)

            val outputStream = context.contentResolver.openOutputStream(outputUri)
                ?: throw IllegalArgumentException("Could not open OutputStream for $outputUri")
            
            outputStream.use {
                pdfDocument.writeTo(it)
            }
            pdfDocument.close()
        }
    }

    
    private suspend fun renderPagedToPdf(state: UnifiedDocumentState.PagedState, outputUri: Uri) {
        withContext(Dispatchers.IO) {
            val pdfDocument = PdfDocument()
            val pageInfo = PdfDocument.PageInfo.Builder(A4_WIDTH, A4_HEIGHT, 1).create()

            val scale = minOf(
                A4_WIDTH / state.pageWidthPx.toFloat(),
                A4_HEIGHT / state.pageHeightPx.toFloat()
            )
            val scaledWidth = state.pageWidthPx * scale
            val scaledHeight = state.pageHeightPx * scale
            val offsetX = (A4_WIDTH - scaledWidth) / 2f
            val offsetY = (A4_HEIGHT - scaledHeight) / 2f

            state.pages.collect { shapes ->
                val page = pdfDocument.startPage(pageInfo)
                val canvas = page.canvas

                canvas.save()
                canvas.translate(offsetX.toFloat(), offsetY.toFloat())
                canvas.scale(scale.toFloat(), scale.toFloat())

                for (shape in shapes) {
                    when (shape) {
                        is SlideShape.Rectangle -> {
                            val paint = Paint().apply {
                                if (shape.bgColor != null) {
                                    color = android.graphics.Color.parseColor(shape.bgColor)
                                    style = Paint.Style.FILL
                                } else {
                                    color = android.graphics.Color.TRANSPARENT
                                }
                            }
                            if (paint.color != android.graphics.Color.TRANSPARENT) {
                                val rectF = RectF(shape.x.toFloat(), shape.y.toFloat(), (shape.x + shape.w).toFloat(), (shape.y + shape.h).toFloat())
                                if (shape.cornerRadius != null && shape.cornerRadius > 0) {
                                    canvas.drawRoundRect(rectF, shape.cornerRadius.toFloat(), shape.cornerRadius.toFloat(), paint)
                                } else {
                                    canvas.drawRect(rectF, paint)
                                }
                            }
                        }
                        is SlideShape.Ellipse -> {
                            val paint = Paint().apply {
                                if (shape.bgColor != null) {
                                    color = android.graphics.Color.parseColor(shape.bgColor)
                                    style = Paint.Style.FILL
                                } else {
                                    color = android.graphics.Color.TRANSPARENT
                                }
                            }
                            if (paint.color != android.graphics.Color.TRANSPARENT) {
                                val rectF = RectF(shape.x.toFloat(), shape.y.toFloat(), (shape.x + shape.w).toFloat(), (shape.y + shape.h).toFloat())
                                canvas.drawOval(rectF, paint)
                            }
                        }
                        is SlideShape.Image -> {
                            var bitmap: android.graphics.Bitmap? = null
                            try {
                                bitmap = android.graphics.BitmapFactory.decodeFile(shape.imageFile.absolutePath)
                                if (bitmap != null) {
                                    val src = android.graphics.Rect(0, 0, bitmap.width, bitmap.height)
                                    val dst = RectF(shape.x.toFloat(), shape.y.toFloat(), (shape.x + shape.w).toFloat(), (shape.y + shape.h).toFloat())
                                    canvas.drawBitmap(bitmap, src, dst, null)
                                }
                            } finally {
                                bitmap?.recycle()
                            }
                        }
                        is SlideShape.TextBlock -> {
                            val spannable = android.text.SpannableStringBuilder()
                            
                            for (paragraph in shape.paragraphs) {
                                val paraStart = spannable.length
                                for (run in paragraph.runs) {
                                    val start = spannable.length
                                    spannable.append(run.text)
                                    val end = spannable.length
                                    
                                    val color = if (run.color != null) android.graphics.Color.parseColor(run.color) else android.graphics.Color.BLACK
                                    spannable.setSpan(android.text.style.ForegroundColorSpan(color), start, end, android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                                    
                                    val fontSize = (run.fontSizePt?.toFloat() ?: 16f) * 1.33f // pts to px approx
                                    spannable.setSpan(android.text.style.AbsoluteSizeSpan(fontSize.toInt(), false), start, end, android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                                    
                                    var style = android.graphics.Typeface.NORMAL
                                    if (run.isBold && run.isItalic) style = android.graphics.Typeface.BOLD_ITALIC
                                    else if (run.isBold) style = android.graphics.Typeface.BOLD
                                    else if (run.isItalic) style = android.graphics.Typeface.ITALIC
                                    
                                    if (style != android.graphics.Typeface.NORMAL) {
                                        spannable.setSpan(android.text.style.StyleSpan(style), start, end, android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                                    }
                                    
                                    if (run.isUnderline) {
                                        spannable.setSpan(android.text.style.UnderlineSpan(), start, end, android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                                    }
                                }
                                
                                val align = when (paragraph.align) {
                                    "center" -> android.text.Layout.Alignment.ALIGN_CENTER
                                    "right" -> android.text.Layout.Alignment.ALIGN_OPPOSITE
                                    else -> android.text.Layout.Alignment.ALIGN_NORMAL
                                }
                                spannable.setSpan(android.text.style.AlignmentSpan.Standard(align), paraStart, spannable.length, android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                                
                                if (paragraph !== shape.paragraphs.last()) {
                                    spannable.append("\n")
                                }
                            }
                            
                            val textPaint = android.text.TextPaint(Paint.ANTI_ALIAS_FLAG)
                            textPaint.density = 1f
                            
                            val staticLayout = android.text.StaticLayout(
                                spannable,
                                textPaint,
                                shape.w.toInt().coerceAtLeast(1),
                                android.text.Layout.Alignment.ALIGN_NORMAL,
                                1.2f, // line spacing multiplier
                                0f,   // line spacing add
                                true  // include pad
                            )
                            
                            canvas.save()
                            canvas.translate(shape.x.toFloat(), shape.y.toFloat())
                            staticLayout.draw(canvas)
                            canvas.restore()
                        }
                    }
                }

                canvas.restore()
                pdfDocument.finishPage(page)
            }

            val outputStream = context.contentResolver.openOutputStream(outputUri)
                ?: throw IllegalArgumentException("Could not open OutputStream for $outputUri")
            
            outputStream.use {
                pdfDocument.writeTo(it)
            }
            pdfDocument.close()
        }
    }

private suspend fun renderHtmlToPdf(
    htmlContent: String?,
    fileUri: Uri?,
    outputUri: Uri,
    landscape: Boolean = false
) {
    // Use landscape (swapped) dimensions for wide content like XLSX
    val pageWidth = if (landscape) A4_HEIGHT else A4_WIDTH
    val pageHeight = if (landscape) A4_WIDTH else A4_HEIGHT

    withContext(Dispatchers.Main) {

        try {
            WebView.enableSlowWholeDocumentDraw()
        } catch (e: Exception) {
            Log.w(
                TAG,
                "WebView.enableSlowWholeDocumentDraw() failed",
                e
            )
        }

        suspendCancellableCoroutine<Unit> { continuation ->

            val activity = context as? android.app.Activity
                ?: throw IllegalStateException(
                    "PdfRenderingEngine requires an Activity context."
                )

            val webView = WebView(activity)

            val rootView =
                activity.window.decorView.findViewById<android.view.ViewGroup>(
                    android.R.id.content
                )

            // ==========================================
            // MARGINS
            // ==========================================

            val leftMargin = 10f
            val rightMargin = 10f
            val topMargin = if (landscape) 20f else 50f
            val bottomMargin = if (landscape) 20f else 50f

            // ==========================================
            // USABLE PDF AREA
            // ==========================================

            val contentWidth =
                pageWidth - leftMargin - rightMargin

            val contentHeight =
                pageHeight - topMargin - bottomMargin

            // WebView width is only the usable width.
            val layoutParams = android.widget.FrameLayout.LayoutParams(
                contentWidth.toInt(),
                contentHeight.toInt()
            )
            webView.layoutParams = layoutParams
            
            // We intentionally do NOT add the WebView to the rootView. 
            // It will exist entirely off-screen in memory for PDF rendering.

            webView.settings.apply {
                allowFileAccess = true
                allowContentAccess = true
                javaScriptEnabled = true  // Required for element boundary measurement
                loadWithOverviewMode = true
                useWideViewPort = true
            }

            webView.webViewClient = object : WebViewClient() {

                override fun onPageFinished(
                    view: WebView,
                    url: String
                ) {
                    super.onPageFinished(view, url)

                    view.postDelayed({

                        try {

                            // ==========================================
                            // MEASURE HTML
                            // ==========================================

                            val widthSpec =
                                android.view.View.MeasureSpec.makeMeasureSpec(
                                    contentWidth.toInt(),
                                    android.view.View.MeasureSpec.EXACTLY
                                )

                            val heightSpec =
                                android.view.View.MeasureSpec.makeMeasureSpec(
                                    0,
                                    android.view.View.MeasureSpec.UNSPECIFIED
                                )

                            view.measure(
                                widthSpec,
                                heightSpec
                            )

                            val totalContentHeight =
                                view.measuredHeight

                            view.layout(
                                0,
                                0,
                                contentWidth.toInt(),
                                totalContentHeight
                            )

                            // ==========================================
                            // MEASURE ELEMENT BOUNDARIES VIA JS
                            // This detects where block elements (paragraphs,
                            // table rows, headings, etc.) are positioned,
                            // so we can avoid cutting them at page breaks.
                            // ==========================================

                            view.evaluateJavascript(ELEMENT_BOUNDARY_JS) { jsResult ->

                                try {

                                    val cleanedResult = jsResult?.trim()?.removeSurrounding("\"") ?: ""
                                    val parts = cleanedResult.split("|")
                                    val cssTotalHeight = parts.getOrNull(0)?.toFloatOrNull() ?: totalContentHeight.toFloat()
                                    
                                    // Calculate scale between Android View pixels and JS CSS pixels
                                    val scale = if (cssTotalHeight > 0) totalContentHeight.toFloat() / cssTotalHeight else 1f
                                    
                                    val boundariesStr = if (parts.size > 1) parts[1] else ""
                                    val boundaries = parseElementBoundaries(boundariesStr, scale)

                                    // ==========================================
                                    // CREATE PDF WITH SMART PAGINATION
                                    // ==========================================

                                    val pdfDocument = PdfDocument()

                                    val pageInfo =
                                        PdfDocument.PageInfo.Builder(
                                            pageWidth,
                                            pageHeight,
                                            1
                                        ).create()

                                    val pageContentHeight =
                                        contentHeight.toInt()

                                    var contentOffset = 0

                                    while (
                                        contentOffset < totalContentHeight
                                    ) {

                                        // Find a safe break point that avoids
                                        // cutting through any block element.
                                        val idealBottom =
                                            contentOffset + pageContentHeight

                                        val safeBottom =
                                            if (idealBottom >= totalContentHeight) {
                                                // Last page — no adjustment needed
                                                totalContentHeight
                                            } else if (boundaries.isEmpty()) {
                                                // No elements detected — fallback
                                                idealBottom
                                            } else {
                                                findSafeBreakPoint(
                                                    contentOffset,
                                                    idealBottom,
                                                    boundaries
                                                )
                                            }

                                        val page =
                                            pdfDocument.startPage(pageInfo)

                                        val canvas = page.canvas

                                        canvas.save()

                                        // ======================================
                                        // POSITION HTML INSIDE ALL 4 MARGINS
                                        // ======================================

                                        canvas.translate(
                                            leftMargin,
                                            topMargin - contentOffset
                                        )

                                        // ======================================
                                        // CLIP TO THIS PAGE'S CONTENT SLICE
                                        // Clip to safeBottom. This ensures that
                                        // any element straddling the page boundary
                                        // (which safeBottom avoided) is completely
                                        // excluded from this page, leaving whitespace
                                        // instead of a horizontally cut line.
                                        // ======================================

                                        canvas.clipRect(
                                            0f,
                                            contentOffset.toFloat(),
                                            contentWidth,
                                            safeBottom.toFloat()
                                        )

                                        // Draw HTML
                                        view.draw(canvas)

                                        canvas.restore()

                                        pdfDocument.finishPage(page)

                                        // Advance to the safe break point
                                        // (may be less than pageContentHeight
                                        // to avoid cutting an element)
                                        contentOffset = safeBottom
                                    }

                                    // ==========================================
                                    // WRITE PDF
                                    // ==========================================

                                    val outputStream =
                                        context.contentResolver
                                            .openOutputStream(outputUri)
                                            ?: throw IllegalArgumentException(
                                                "Could not open OutputStream for $outputUri"
                                            )

                                    outputStream.use {
                                        pdfDocument.writeTo(it)
                                    }

                                    pdfDocument.close()

                                    continuation.resume(Unit)

                                } catch (e: Exception) {

                                    continuation.resumeWithException(e)
                                }
                            }

                        } catch (e: Exception) {

                            continuation.resumeWithException(e)
                        }

                    }, 1500)
                }
            }

            if (fileUri != null) {
                webView.loadUrl(fileUri.toString())
            } else {
                webView.loadDataWithBaseURL(
                    null,
                    htmlContent ?: "",
                    "text/html",
                    "UTF-8",
                    null
                )
            }

            continuation.invokeOnCancellation {
                webView.destroy()
            }
        }
    }
}

}
