package com.example.docx2pdf.parser

import android.content.Context
import android.graphics.Bitmap
import android.net.Uri
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.DataInputStream
import java.io.File
import java.io.FileOutputStream

/**
 * Pure Kotlin parser for Photoshop (.psd) files.
 * Supports basic 8-bit RGB Uncompressed and RLE compressed PSD files.
 */
class PsdParser : DocumentParser {
    
    companion object {
        private const val TAG = "PsdParser"
    }

    override suspend fun parse(context: Context, inputUri: Uri): UnifiedDocumentState {
        return withContext(Dispatchers.IO) {
            val resolver = context.contentResolver
            
            var bitmap: Bitmap? = null
            
            resolver.openInputStream(inputUri)?.use { stream ->
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
                val height = din.readInt()
                val width = din.readInt()
                val depth = din.readShort().toInt()
                val colorMode = din.readShort().toInt()
                
                if (depth != 8 || colorMode != 3) {
                    throw IllegalArgumentException("Only 8-bit RGB PSDs are supported (depth=$depth, mode=$colorMode)")
                }
                
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
                
                val pixels = IntArray(width * height)
                val channelData = Array(channels) { ByteArray(width * height) }
                
                if (compression == 0) {
                    // Raw
                    for (c in 0 until channels) {
                        din.readFully(channelData[c])
                    }
                } else if (compression == 1) {
                    // RLE
                    val scanlineByteCounts = IntArray(height * channels)
                    for (i in scanlineByteCounts.indices) {
                        scanlineByteCounts[i] = din.readShort().toInt()
                    }
                    
                    for (c in 0 until channels) {
                        var pixelIndex = 0
                        for (y in 0 until height) {
                            var x = 0
                            while (x < width) {
                                val len = din.readByte().toInt()
                                if (len in 0..127) {
                                    val count = len + 1
                                    din.read(channelData[c], pixelIndex, count)
                                    pixelIndex += count
                                    x += count
                                } else if (len in -127..-1) {
                                    val count = -len + 1
                                    val b = din.readByte()
                                    for (i in 0 until count) {
                                        channelData[c][pixelIndex++] = b
                                    }
                                    x += count
                                }
                            }
                        }
                    }
                } else {
                    throw IllegalArgumentException("Unsupported PSD compression: $compression")
                }
                
                for (i in 0 until width * height) {
                    val r = channelData[0][i].toInt() and 0xFF
                    val g = channelData.getOrNull(1)?.get(i)?.toInt()?.and(0xFF) ?: r
                    val b = channelData.getOrNull(2)?.get(i)?.toInt()?.and(0xFF) ?: r
                    val a = if (channels >= 4) channelData[3][i].toInt() and 0xFF else 255
                    pixels[i] = (a shl 24) or (r shl 16) or (g shl 8) or b
                }
                
                bitmap = Bitmap.createBitmap(pixels, width, height, Bitmap.Config.ARGB_8888)
            }
            
            if (bitmap == null) {
                throw IllegalArgumentException("Failed to decode PSD image")
            }
            
            val tempDir = File(context.cacheDir, "psd_temp")
            tempDir.mkdirs()
            val tempFile = File(tempDir, "parsed_${System.currentTimeMillis()}.png")
            
            FileOutputStream(tempFile).use { out ->
                bitmap!!.compress(Bitmap.CompressFormat.PNG, 100, out)
            }
            
            bitmap!!.recycle()
            System.gc()
            
            val outputUri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                tempFile
            )
            
            UnifiedDocumentState.ImageState(outputUri)
        }
    }
}
