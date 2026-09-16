package com.example.docx2pdf.parser

import android.content.Context
import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.util.zip.ZipInputStream

/**
 * Parser for CBZ files (Comic Book Zip).
 * Extracts images and emits them as pages.
 */
class CbzParser : DocumentParser {
    override suspend fun parse(context: Context, inputUri: Uri): UnifiedDocumentState {
        return withContext(Dispatchers.IO) {
            val tempDir = File(context.cacheDir, "cbz_temp_${System.currentTimeMillis()}")
            tempDir.mkdirs()
            
            val imageFiles = mutableListOf<File>()
            
            context.contentResolver.openInputStream(inputUri)?.use { stream ->
                ZipInputStream(stream).use { zis ->
                    var entry = zis.nextEntry
                    while (entry != null) {
                        if (!entry.isDirectory) {
                            val name = entry.name.lowercase()
                            if (name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".webp")) {
                                val outFile = File(tempDir, entry.name.substringAfterLast("/"))
                                FileOutputStream(outFile).use { fos ->
                                    zis.copyTo(fos)
                                }
                                imageFiles.add(outFile)
                            }
                        }
                        zis.closeEntry()
                        entry = zis.nextEntry
                    }
                }
            }
            
            // Sort alphabetically to maintain page order
            imageFiles.sortBy { it.name }
            
            val pageWidth = 800.0
            val pageHeight = 1200.0

            val flow = flow {
                try {
                    for (file in imageFiles) {
                        val mimeType = if (file.name.lowercase().endsWith(".png")) "image/png" else "image/jpeg"
                        val shape = SlideShape.Image(0.0, 0.0, pageWidth, pageHeight, file, mimeType)
                        emit(listOf(shape))
                    }
                } finally {
                    tempDir.deleteRecursively()
                }
            }
            
            UnifiedDocumentState.PagedState(flow, pageWidth, pageHeight)
        }
    }
}
