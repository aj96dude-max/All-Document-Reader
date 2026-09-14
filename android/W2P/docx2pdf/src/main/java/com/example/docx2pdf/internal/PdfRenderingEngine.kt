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
        private const val MARGIN = 40f
        private const val PDF_MARGIN = 50f
    }

    suspend fun process(state: UnifiedDocumentState, outputUri: Uri) {
        when (state) {
            is UnifiedDocumentState.HtmlState -> renderHtmlToPdf(state.htmlContent, outputUri, state.landscape)
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
                        // Simple column rendering for CSV/TSV
                        val columnWidth = (A4_WIDTH - 2 * MARGIN) / element.columns.size.coerceAtLeast(1)
                        var currentX = MARGIN
                        for (column in element.columns) {
                            currentCanvas.drawText(column, currentX, currentY, textPaint)
                            currentX += columnWidth
                        }
                        currentY += lineHeight
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
    htmlContent: String,
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
            val layoutParams = android.view.ViewGroup.LayoutParams(
                contentWidth.toInt(),
                contentHeight.toInt()
            )

            webView.layoutParams = layoutParams

            webView.alpha = 0.01f

            rootView.addView(webView)

            webView.settings.apply {
                javaScriptEnabled = false
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
                            // CREATE PDF
                            // ==========================================

                            val pdfDocument = PdfDocument()

                            val pageInfo =
                                PdfDocument.PageInfo.Builder(
                                    pageWidth,
                                    pageHeight,
                                    1
                                ).create()

                            // IMPORTANT:
                            // Only this much HTML can fit on one page.
                            val pageContentHeight =
                                contentHeight.toInt()

                            var contentOffset = 0

                            while (
                                contentOffset < totalContentHeight
                            ) {

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
                                // This is what actually enforces the
                                // margins — without it, content bleeds
                                // past contentWidth/contentHeight and
                                // pages can show overlapping slices.
                                // ======================================

                                canvas.clipRect(
                                    0f,
                                    contentOffset.toFloat(),
                                    contentWidth,
                                    contentOffset.toFloat() + contentHeight
                                )

                                // Draw HTML
                                view.draw(canvas)

                                canvas.restore()

                                pdfDocument.finishPage(page)

                                // Move only by the usable content height
                                contentOffset += pageContentHeight
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

                            rootView.removeView(webView)

                            continuation.resume(Unit)

                        } catch (e: Exception) {

                            rootView.removeView(webView)

                            continuation.resumeWithException(e)
                        }

                    }, 1500)
                }
            }

            webView.loadDataWithBaseURL(
                null,
                htmlContent,
                "text/html",
                "UTF-8",
                null
            )

            continuation.invokeOnCancellation {

                rootView.removeView(webView)
                webView.destroy()
            }
        }
    }
}

}
