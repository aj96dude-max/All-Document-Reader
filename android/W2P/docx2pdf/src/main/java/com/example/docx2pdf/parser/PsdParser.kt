package com.example.docx2pdf.parser

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.pdf.PdfDocument
import android.net.Uri
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.DataInputStream
import java.io.File
import java.io.FileOutputStream

/**
 * Pure Kotlin parser for Photoshop (.psd) files.
 * Supports basic 8-bit RGB Uncompressed and RLE compressed PSD files.
 * Safely downsamples images to prevent OOM errors and draws directly to PdfDocument.
 */
class PsdParser : DocumentParser {
    
    companion object {
        private const val TAG = "PsdParser"
    }

    override suspend fun parse(context: Context, inputUri: Uri): UnifiedDocumentState {
        return UnifiedDocumentState.CustomPdfState { ctx, outputUri ->
            withContext(Dispatchers.IO) {
                var inSampleSize = 1
                var success = false
                
                while (!success) {
                    try {
                        ctx.contentResolver.openInputStream(inputUri)?.use { stream ->
                            val din = DataInputStream(stream)
                            val signature = ByteArray(4)
                            din.readFully(signature)
                            if (String(signature) != "8BPS") {
                                throw IllegalArgumentException("Not a valid PSD file")
                            }
                            
                            val version = din.readShort()
                            if (version.toInt() != 1) {
                                throw IllegalArgumentException("Unsupported PSD version: $version")
                            }
                            
                            din.skipBytes(6) // Reserved
                            val channels = din.readShort().toInt()
                            val originalHeight = din.readInt()
                            val originalWidth = din.readInt()
                            val depth = din.readShort().toInt()
                            val colorMode = din.readShort().toInt()
                            
                            if (depth != 8 || colorMode != 3) {
                                throw IllegalArgumentException("Only 8-bit RGB PSDs are supported (depth=$depth, mode=$colorMode)")
                            }
                            
                            // Calculate initial inSampleSize based on 2048x2048 cap
                            while ((originalWidth / inSampleSize) > 2048 || (originalHeight / inSampleSize) > 2048) {
                                inSampleSize *= 2
                            }
                            
                            val height = originalHeight / inSampleSize
                            val width = originalWidth / inSampleSize
                            
                            // Skip Color Mode Data
                            val colorModeDataLen = din.readInt()
                            din.skipBytes(colorModeDataLen)
                            
                            // Skip Image Resources
                            val imageResLen = din.readInt()
                            din.skipBytes(imageResLen)
                            
                            // Skip Layer and Mask Information
                            val layerMaskLen = din.readInt()
                            din.skipBytes(layerMaskLen)
                            
                            // Image Data Section
                            val compression = din.readShort().toInt()
                            
                            // Only allocate downsampled buffers to save memory
                            val pixels = IntArray(width * height)
                            val channelData = Array(channels) { ByteArray(width * height) }
                            
                            if (compression == 0) {
                                // Raw
                                for (c in 0 until channels) {
                                    var destIndex = 0
                                    for (y in 0 until originalHeight) {
                                        for (x in 0 until originalWidth) {
                                            val b = din.readByte()
                                            if (y % inSampleSize == 0 && x % inSampleSize == 0 && destIndex < width * height) {
                                                channelData[c][destIndex++] = b
                                            }
                                        }
                                    }
                                }
                            } else if (compression == 1) {
                                // RLE
                                val scanlineByteCounts = IntArray(originalHeight * channels)
                                for (i in scanlineByteCounts.indices) {
                                    scanlineByteCounts[i] = din.readShort().toInt()
                                }
                                
                                for (c in 0 until channels) {
                                    var destIndex = 0
                                    for (y in 0 until originalHeight) {
                                        var x = 0
                                        while (x < originalWidth) {
                                            val len = din.readByte().toInt()
                                            if (len in 0..127) {
                                                val count = len + 1
                                                for (i in 0 until count) {
                                                    val b = din.readByte()
                                                    if (y % inSampleSize == 0 && x % inSampleSize == 0 && destIndex < width * height) {
                                                        channelData[c][destIndex++] = b
                                                    }
                                                    x++
                                                }
                                            } else if (len in -127..-1) {
                                                val count = -len + 1
                                                val b = din.readByte()
                                                for (i in 0 until count) {
                                                    if (y % inSampleSize == 0 && x % inSampleSize == 0 && destIndex < width * height) {
                                                        channelData[c][destIndex++] = b
                                                    }
                                                    x++
                                                }
                                            }
                                            // len == -128 is a no-op
                                        }
                                    }
                                }
                            } else {
                                throw IllegalArgumentException("Unsupported PSD compression: $compression")
                            }
                            
                            // Assemble RGB
                            for (i in pixels.indices) {
                                val r = channelData[0][i].toInt() and 0xFF
                                val g = if (channels > 1) channelData[1][i].toInt() and 0xFF else r
                                val b = if (channels > 2) channelData[2][i].toInt() and 0xFF else r
                                pixels[i] = Color.rgb(r, g, b)
                            }
                            
                            val bitmap = Bitmap.createBitmap(pixels, width, height, Bitmap.Config.ARGB_8888)
                            
                            // Draw to PDF immediately
                            ctx.contentResolver.openOutputStream(outputUri)?.use { outputStream ->
                                val pdfDocument = PdfDocument()
                                try {
                                    val pageInfo = PdfDocument.PageInfo.Builder(width, height, 1).create()
                                    val page = pdfDocument.startPage(pageInfo)
                                    val canvas = page.canvas
                                    
                                    canvas.drawBitmap(bitmap, 0f, 0f, null)
                                    
                                    pdfDocument.finishPage(page)
                                    pdfDocument.writeTo(outputStream)
                                } finally {
                                    pdfDocument.close()
                                }
                            }
                            
                            // Immediately recycle to prevent OOM
                            bitmap.recycle()
                            success = true
                        }
                    } catch (oom: OutOfMemoryError) {
                        Log.w(TAG, "OOM generating PSD PDF with sample size $inSampleSize. Retrying...", oom)
                        inSampleSize *= 2
                        if (inSampleSize > 16) {
                            throw RuntimeException("Could not decode PSD even with max downsampling", oom)
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Error generating PSD PDF", e)
                        throw e
                    }
                }
            }
        }
    }
}
