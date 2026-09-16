package com.example.docx2pdf.parser

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import android.net.Uri
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.apache.poi.hslf.usermodel.HSLFSlideShow
import org.apache.poi.hslf.usermodel.HSLFTextShape

/**
 * Native parser for legacy PPT files (Office 97-2003).
 * Extracts text and anchor coordinates using Apache POI HSLFSlideShow
 * and draws them directly to a PdfDocument Canvas, bypassing Graphics2D.
 */
class PptParser : DocumentParser {

    companion object {
        private const val TAG = "PptParser"
    }

    override suspend fun parse(context: Context, inputUri: Uri): UnifiedDocumentState {
        return UnifiedDocumentState.CustomPdfState { ctx, outputUri ->
            withContext(Dispatchers.IO) {
                ctx.contentResolver.openInputStream(inputUri)?.use { inputStream ->
                    ctx.contentResolver.openOutputStream(outputUri)?.use { outputStream ->
                        val pdfDocument = PdfDocument()
                        
                        try {
                            val ppt = HSLFSlideShow(inputStream)
                            val getPageSizeMethod = ppt.javaClass.getMethod("getPageSize")
                            val pageSize = getPageSizeMethod.invoke(ppt)!!
                            val pageWidth = (pageSize.javaClass.getMethod("getWidth").invoke(pageSize) as Double).toInt()
                            val pageHeight = (pageSize.javaClass.getMethod("getHeight").invoke(pageSize) as Double).toInt()

                            val paint = Paint().apply {
                                color = Color.BLACK
                                textSize = 12f
                                isAntiAlias = true
                            }

                            for ((index, slide) in ppt.slides.withIndex()) {
                                val pageInfo = PdfDocument.PageInfo.Builder(pageWidth, pageHeight, index + 1).create()
                                val page = pdfDocument.startPage(pageInfo)
                                val canvas = page.canvas

                                // Fill background with white
                                canvas.drawColor(Color.WHITE)

                                for (shape in slide.shapes) {
                                    if (shape is HSLFTextShape) {
                                        val text = shape.text ?: continue
                                        val getAnchorMethod = shape.javaClass.getMethod("getAnchor")
                                        val anchor = getAnchorMethod.invoke(shape) ?: continue
                                        
                                        // anchor is java.awt.Rectangle, bypass compiler check with reflection
                                        val x = (anchor.javaClass.getMethod("getX").invoke(anchor) as Double).toFloat()
                                        var y = (anchor.javaClass.getMethod("getY").invoke(anchor) as Double).toFloat()
                                        
                                        // Very simple text rendering (no word wrap to keep it simple, just split by newlines)
                                        val lines = text.split("\n")
                                        for (line in lines) {
                                            canvas.drawText(line, x, y + paint.textSize, paint)
                                            y += paint.textSize * 1.2f
                                        }
                                    }
                                }

                                pdfDocument.finishPage(page)
                            }
                            
                            pdfDocument.writeTo(outputStream)
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to natively render PPT", e)
                            throw e
                        } finally {
                            pdfDocument.close()
                        }
                    }
                }
            }
        }
    }
}
