package com.example.docx2pdf.parser

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.net.Uri
import com.caverock.androidsvg.SVG
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Parser for SVG files.
 * Uses the androidsvg library to parse the SVG and render it to a Bitmap.
 */
class SvgParser : DocumentParser {
    override suspend fun parse(context: Context, inputUri: Uri): UnifiedDocumentState {
        return withContext(Dispatchers.IO) {
            context.contentResolver.openInputStream(inputUri)?.use { inputStream ->
                val svg = SVG.getFromInputStream(inputStream)
                
                // Determine dimensions. If not specified in SVG, default to A4 size.
                val width = if (svg.documentWidth > 0) svg.documentWidth else 595f
                val height = if (svg.documentHeight > 0) svg.documentHeight else 842f
                
                // Cap the size to prevent OOM
                val scale = minOf(1f, 2048f / maxOf(width, height))
                val targetWidth = (width * scale).toInt().coerceAtLeast(1)
                val targetHeight = (height * scale).toInt().coerceAtLeast(1)
                
                val bitmap = Bitmap.createBitmap(targetWidth, targetHeight, Bitmap.Config.ARGB_8888)
                val canvas = Canvas(bitmap)
                canvas.drawColor(Color.WHITE) // White background
                
                // Draw SVG onto canvas
                if (svg.documentWidth > 0 && svg.documentHeight > 0) {
                    svg.documentWidth = targetWidth.toFloat()
                    svg.documentHeight = targetHeight.toFloat()
                } else {
                    svg.setDocumentWidth(targetWidth.toFloat())
                    svg.setDocumentHeight(targetHeight.toFloat())
                }
                
                svg.renderToCanvas(canvas)
                
                val tempDir = java.io.File(context.cacheDir, "svg_temp")
                tempDir.mkdirs()
                val tempFile = java.io.File(tempDir, "parsed_${System.currentTimeMillis()}.png")
                java.io.FileOutputStream(tempFile).use { out ->
                    bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
                }
                bitmap.recycle()
                
                val outputUri = androidx.core.content.FileProvider.getUriForFile(
                    context,
                    "${context.packageName}.fileprovider",
                    tempFile
                )
                
                UnifiedDocumentState.ImageState(outputUri)
            } ?: throw IllegalArgumentException("Could not open InputStream for $inputUri")
        }
    }
}
