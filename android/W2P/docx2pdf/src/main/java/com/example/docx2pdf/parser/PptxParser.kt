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
import org.apache.poi.xslf.usermodel.XMLSlideShow
import org.apache.poi.xslf.usermodel.XSLFTextShape
import java.io.InputStream

/**
 * Native parser for modern PPTX files.
 * Extracts text and anchor coordinates using Apache POI XMLSlideShow
 * and draws them directly to a PdfDocument Canvas, bypassing Graphics2D.
 */
class PptxParser : DocumentParser {

    companion object {
        private const val TAG = "PptxParser"
    }

    override suspend fun parse(context: Context, inputUri: Uri): UnifiedDocumentState {
        return UnifiedDocumentState.CustomPdfState { ctx, outputUri ->
            withContext(Dispatchers.IO) {
                ctx.contentResolver.openInputStream(inputUri)?.use { inputStream ->
                    ctx.contentResolver.openOutputStream(outputUri)?.use { outputStream ->
                        val pdfDocument = PdfDocument()
                        
                        try {
                            val pptx = XMLSlideShow(inputStream)
                            val getPageSizeMethod = pptx.javaClass.getMethod("getPageSize")
                            val pageSize = getPageSizeMethod.invoke(pptx)!!
                            val pageWidth = (pageSize.javaClass.getMethod("getWidth").invoke(pageSize) as Double).toInt()
                            val pageHeight = (pageSize.javaClass.getMethod("getHeight").invoke(pageSize) as Double).toInt()

                            val paint = Paint().apply {
                                color = Color.BLACK
                                textSize = 12f
                                isAntiAlias = true
                            }

                            for ((index, slide) in pptx.slides.withIndex()) {
                                val pageInfo = PdfDocument.PageInfo.Builder(pageWidth, pageHeight, index + 1).create()
                                val page = pdfDocument.startPage(pageInfo)
                                val canvas = page.canvas

                                // Fill background with white
                                canvas.drawColor(Color.WHITE)

                                for (shape in slide.shapes) {
                                    if (shape is XSLFTextShape) {
                                        val text = shape.text ?: continue
                                        val getAnchorMethod = shape.javaClass.getMethod("getAnchor")
                                        val anchor = getAnchorMethod.invoke(shape) ?: continue
                                        
                                        // anchor is java.awt.geom.Rectangle2D, bypass compiler check with reflection
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
                            Log.e(TAG, "Failed to natively render PPTX", e)
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
