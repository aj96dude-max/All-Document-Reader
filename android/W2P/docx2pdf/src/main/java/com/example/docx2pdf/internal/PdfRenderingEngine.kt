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
    }

    suspend fun process(state: UnifiedDocumentState, outputUri: Uri) {
        when (state) {
            is UnifiedDocumentState.HtmlState -> renderHtmlToPdf(state.htmlContent, outputUri)
            is UnifiedDocumentState.StreamState -> renderStreamToPdf(state, outputUri)
            is UnifiedDocumentState.ImageState -> renderImageToPdf(state, outputUri)
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

    private suspend fun renderHtmlToPdf(htmlContent: String, outputUri: Uri) {
        withContext(Dispatchers.Main) {
            // Must be called before any WebView is created to allow capturing the whole document
            try {
                WebView.enableSlowWholeDocumentDraw()
            } catch (e: Exception) {
                Log.w(TAG, "WebView.enableSlowWholeDocumentDraw() failed, continuing", e)
            }

            suspendCancellableCoroutine<Unit> { continuation ->
                val activity = context as? android.app.Activity
                    ?: throw IllegalStateException("PdfRenderingEngine requires an Activity context to render HTML layouts.")

                val webView = WebView(activity)
                val rootView = activity.window.decorView.findViewById<android.view.ViewGroup>(android.R.id.content)

                val layoutParams = android.view.ViewGroup.LayoutParams(A4_WIDTH, A4_HEIGHT)
                webView.layoutParams = layoutParams
                webView.alpha = 0.01f // Almost invisible, but > 0 to guarantee hardware render

                rootView.addView(webView)

                webView.settings.apply {
                    javaScriptEnabled = false
                    loadWithOverviewMode = true
                    useWideViewPort = true
                }

                webView.webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView, url: String) {
                        super.onPageFinished(view, url)
                        view.postDelayed({
                            try {
                                val widthSpec = android.view.View.MeasureSpec.makeMeasureSpec(A4_WIDTH, android.view.View.MeasureSpec.EXACTLY)
                                val heightSpec = android.view.View.MeasureSpec.makeMeasureSpec(0, android.view.View.MeasureSpec.UNSPECIFIED)

                                view.measure(widthSpec, heightSpec)
                                val contentHeight = view.measuredHeight
                                view.layout(0, 0, A4_WIDTH, contentHeight)

                                val pdfDocument = PdfDocument()
                                val pageInfo = PdfDocument.PageInfo.Builder(A4_WIDTH, A4_HEIGHT, 1).create()

                                var yOffset = 0
                                while (yOffset < contentHeight) {
                                    val page = pdfDocument.startPage(pageInfo)
                                    val canvas = page.canvas

                                    canvas.save()
                                    canvas.translate(0f, -yOffset.toFloat())
                                    view.draw(canvas)
                                    canvas.restore()
                                    pdfDocument.finishPage(page)

                                    yOffset += A4_HEIGHT
                                }

                                val outputStream = context.contentResolver.openOutputStream(outputUri)
                                    ?: throw IllegalArgumentException("Could not open OutputStream for $outputUri")

                                pdfDocument.writeTo(outputStream)
                                outputStream.close()
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

                webView.loadDataWithBaseURL(null, htmlContent, "text/html", "UTF-8", null)

                continuation.invokeOnCancellation {
                    rootView.removeView(webView)
                    webView.destroy()
                }
            }
        }
    }
}
