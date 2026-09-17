package com.example.docx2pdf.parser

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Color
import android.net.Uri
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.DataInputStream
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import kotlin.math.min

/**
 * Photoshop (.psd) parser.
 * Copies the file locally so section skips are reliable, then decodes the
 * 8-bit composite image (RGB or grayscale, raw or PackBits RLE).
 */
class PsdParser : DocumentParser {

    companion object {
        private const val TAG = "PsdParser"
        private const val MAX_EDGE = 2048
    }

    override suspend fun parse(context: Context, inputUri: Uri): UnifiedDocumentState {
        return withContext(Dispatchers.IO) {
            val tempDir = File(context.cacheDir, "psd_temp")
            tempDir.mkdirs()
            val sourceFile = File(tempDir, "source_${System.currentTimeMillis()}.psd")

            context.contentResolver.openInputStream(inputUri)?.use { input ->
                FileOutputStream(sourceFile).use { output -> input.copyTo(output) }
            } ?: throw IllegalArgumentException("Could not open InputStream for $inputUri")

            try {
                var inSampleSize = 1
                var lastError: Exception? = null
                while (inSampleSize <= 16) {
                    try {
                        val bitmap = decodePsd(sourceFile, inSampleSize)
                        val outFile = File(tempDir, "parsed_${System.currentTimeMillis()}.png")
                        FileOutputStream(outFile).use { out ->
                            bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
                        }
                        bitmap.recycle()
                        return@withContext UnifiedDocumentState.ImageState(Uri.fromFile(outFile))
                    } catch (oom: OutOfMemoryError) {
                        Log.w(TAG, "OOM decoding PSD, increasing downsample", oom)
                        inSampleSize *= 2
                        lastError = RuntimeException("Out of memory decoding PSD", oom)
                    } catch (e: Exception) {
                        lastError = e
                        break
                    }
                }
                throw lastError ?: IllegalArgumentException("Failed to decode PSD image")
            } finally {
                sourceFile.delete()
            }
        }
    }

    private fun decodePsd(file: File, requestedSample: Int): Bitmap {
        DataInputStream(FileInputStream(file)).use { din ->
            val signature = ByteArray(4)
            din.readFully(signature)
            if (String(signature, Charsets.US_ASCII) != "8BPS") {
                throw IllegalArgumentException("Not a valid PSD file")
            }

            val version = din.readUnsignedShort()
            if (version != 1) {
                throw IllegalArgumentException("Unsupported PSD version: $version (PSB is not supported)")
            }

            skipFully(din, 6)
            val channels = din.readUnsignedShort()
            val originalHeight = din.readInt()
            val originalWidth = din.readInt()
            val depth = din.readUnsignedShort()
            val colorMode = din.readUnsignedShort()

            if (originalWidth <= 0 || originalHeight <= 0) {
                throw IllegalArgumentException("Invalid PSD dimensions")
            }
            if (depth != 8) {
                throw IllegalArgumentException("Only 8-bit PSDs are supported (depth=$depth)")
            }
            if (colorMode != 3 && colorMode != 1) {
                throw IllegalArgumentException("Only RGB and Grayscale PSDs are supported (mode=$colorMode)")
            }

            var inSampleSize = requestedSample.coerceAtLeast(1)
            while ((originalWidth / inSampleSize) > MAX_EDGE || (originalHeight / inSampleSize) > MAX_EDGE) {
                inSampleSize *= 2
            }

            val height = (originalHeight / inSampleSize).coerceAtLeast(1)
            val width = (originalWidth / inSampleSize).coerceAtLeast(1)

            skipFully(din, unsignedInt(din.readInt()))
            skipFully(din, unsignedInt(din.readInt()))
            skipFully(din, unsignedInt(din.readInt()))

            val compression = din.readUnsignedShort()
            val usedChannels = min(channels, 4)
            val channelData = Array(usedChannels) { ByteArray(width * height) }

            when (compression) {
                0 -> {
                    for (c in 0 until channels) {
                        var destIndex = 0
                        for (y in 0 until originalHeight) {
                            for (x in 0 until originalWidth) {
                                val b = din.readByte()
                                if (c < usedChannels && y % inSampleSize == 0 && x % inSampleSize == 0 && destIndex < width * height) {
                                    channelData[c][destIndex++] = b
                                }
                            }
                        }
                    }
                }
                1 -> {
                    val scanlineByteCounts = IntArray(originalHeight * channels)
                    for (i in scanlineByteCounts.indices) {
                        scanlineByteCounts[i] = din.readUnsignedShort()
                    }
                    for (c in 0 until channels) {
                        var destIndex = 0
                        for (y in 0 until originalHeight) {
                            val countIndex = c * originalHeight + y
                            val packed = ByteArray(scanlineByteCounts[countIndex])
                            din.readFully(packed)
                            val row = unpackPackBits(packed, originalWidth)
                            if (c < usedChannels && y % inSampleSize == 0) {
                                var x = 0
                                while (x < originalWidth && destIndex < width * height) {
                                    if (x % inSampleSize == 0) {
                                        channelData[c][destIndex++] = row[x]
                                    }
                                    x++
                                }
                            }
                        }
                    }
                }
                else -> throw IllegalArgumentException("Unsupported PSD compression: $compression")
            }

            val pixels = IntArray(width * height)
            val grayscale = colorMode == 1
            for (i in pixels.indices) {
                if (grayscale) {
                    val g = channelData[0][i].toInt() and 0xFF
                    val a = if (usedChannels > 1) channelData[1][i].toInt() and 0xFF else 255
                    pixels[i] = Color.argb(a, g, g, g)
                } else {
                    val r = channelData[0][i].toInt() and 0xFF
                    val g = if (usedChannels > 1) channelData[1][i].toInt() and 0xFF else r
                    val b = if (usedChannels > 2) channelData[2][i].toInt() and 0xFF else r
                    val a = if (usedChannels > 3) channelData[3][i].toInt() and 0xFF else 255
                    pixels[i] = Color.argb(a, r, g, b)
                }
            }

            return Bitmap.createBitmap(pixels, width, height, Bitmap.Config.ARGB_8888)
        }
    }

    private fun unpackPackBits(packed: ByteArray, width: Int): ByteArray {
        val row = ByteArray(width)
        var src = 0
        var dst = 0
        while (src < packed.size && dst < width) {
            val len = packed[src++].toInt()
            when {
                len in 0..127 -> {
                    val count = len + 1
                    var i = 0
                    while (i < count && src < packed.size && dst < width) {
                        row[dst++] = packed[src++]
                        i++
                    }
                }
                len in -127..-1 -> {
                    if (src >= packed.size) break
                    val count = -len + 1
                    val b = packed[src++]
                    var i = 0
                    while (i < count && dst < width) {
                        row[dst++] = b
                        i++
                    }
                }
                else -> {
                    // -128 is a PackBits no-op
                }
            }
        }
        return row
    }

    private fun unsignedInt(value: Int): Long = value.toLong() and 0xFFFFFFFFL

    private fun skipFully(din: DataInputStream, count: Long) {
        var remaining = count
        val buffer = ByteArray(8192)
        while (remaining > 0) {
            val toRead = min(remaining, buffer.size.toLong()).toInt()
            din.readFully(buffer, 0, toRead)
            remaining -= toRead
        }
    }
}
