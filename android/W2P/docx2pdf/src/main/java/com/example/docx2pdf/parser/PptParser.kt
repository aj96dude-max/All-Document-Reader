package com.example.docx2pdf.parser

import android.content.Context
import android.net.Uri
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.withContext
import org.apache.poi.poifs.filesystem.POIFSFileSystem
import java.io.File
import java.io.FileOutputStream
import java.nio.charset.Charset

/**
 * Parser for legacy PPT files (Office 97-2003).
 * Copies the OLE file locally (ContentResolver streams hang inside POIFS),
 * extracts slide text and JPEG/PNG pictures, and emits PagedState so rendering
 * never goes through WebView.
 */
class PptParser : DocumentParser {

    companion object {
        private const val TAG = "PptParser"
        private const val RECORD_SLIDE_PERSIST_ATOM = 1011
        private const val RECORD_SLIDE_LIST_WITH_TEXT = 4080
        private const val RECORD_TEXT_CHARS_ATOM = 4000
        private const val RECORD_TEXT_BYTES_ATOM = 4008
        private const val CONTAINER_VER = 0xF
        private const val MAX_PICTURE_BYTES = 8 * 1024 * 1024
    }

    override suspend fun parse(context: Context, inputUri: Uri): UnifiedDocumentState {
        return withContext(Dispatchers.IO) {
            val tempDir = File(context.cacheDir, "ppt_temp_${System.currentTimeMillis()}")
            val sourceFile = File(context.cacheDir, "ppt_src_${System.currentTimeMillis()}.ppt")
            tempDir.mkdirs()

            try {
                context.contentResolver.openInputStream(inputUri)?.use { input ->
                    FileOutputStream(sourceFile).use { output -> input.copyTo(output) }
                } ?: throw IllegalArgumentException("Could not open InputStream for $inputUri")

                val slides = mutableListOf<StringBuilder>()
                val pictureFiles = mutableListOf<Pair<File, String>>()

                POIFSFileSystem(sourceFile, true).use { fs ->
                    if (!fs.root.hasEntry("PowerPoint Document")) {
                        throw IllegalArgumentException("Invalid PPT: PowerPoint Document stream missing")
                    }

                    fs.createDocumentInputStream("PowerPoint Document").use { docStream ->
                        val data = docStream.readBytes()
                        walkRecords(data, 0, data.size, slides, collectText = false)
                    }

                    if (slides.isEmpty() || slides.all { it.isBlank() }) {
                        slides.clear()
                        fs.createDocumentInputStream("PowerPoint Document").use { docStream ->
                            val data = docStream.readBytes()
                            walkRecords(data, 0, data.size, slides, collectText = true)
                        }
                    }

                    if (slides.isEmpty()) slides.add(StringBuilder("(Empty presentation)"))

                    if (fs.root.hasEntry("Pictures")) {
                        fs.createDocumentInputStream("Pictures").use { picStream ->
                            extractPictures(picStream.readBytes(), tempDir, pictureFiles)
                        }
                    }
                }

                val pageWidth = 960.0
                val pageHeight = 540.0

                val pagesFlow = flow {
                    try {
                        slides.forEachIndexed { index, text ->
                            val shapes = mutableListOf<SlideShape>()
                            shapes.add(SlideShape.Rectangle(0.0, 0.0, pageWidth, pageHeight, "#FFFFFF"))
                            val body = text.toString().trim()
                            val header = "Slide ${index + 1}"
                            val paragraphs = mutableListOf(
                                SlideShape.TextBlock.Paragraph(
                                    listOf(
                                        SlideShape.TextBlock.Run(
                                            header, "#333333", 18.0, isBold = true, isItalic = false, isUnderline = false
                                        )
                                    ),
                                    "left"
                                )
                            )
                            if (body.isNotBlank()) {
                                paragraphs.add(
                                    SlideShape.TextBlock.Paragraph(
                                        listOf(
                                            SlideShape.TextBlock.Run(
                                                body, "#111111", 16.0, isBold = false, isItalic = false, isUnderline = false
                                            )
                                        ),
                                        "left"
                                    )
                                )
                            }
                            shapes.add(
                                SlideShape.TextBlock(36.0, 28.0, pageWidth - 72.0, pageHeight - 56.0, paragraphs)
                            )
                            emit(shapes.toList())
                        }

                        for ((file, mime) in pictureFiles) {
                            if (!file.exists()) continue
                            emit(
                                listOf(
                                    SlideShape.Rectangle(0.0, 0.0, pageWidth, pageHeight, "#FFFFFF"),
                                    SlideShape.Image(40.0, 30.0, pageWidth - 80.0, pageHeight - 60.0, file, mime)
                                )
                            )
                        }
                    } finally {
                        tempDir.deleteRecursively()
                        sourceFile.delete()
                    }
                }

                UnifiedDocumentState.PagedState(pagesFlow, pageWidth, pageHeight)
            } catch (e: Exception) {
                Log.e(TAG, "Error during PPT parsing", e)
                tempDir.deleteRecursively()
                sourceFile.delete()
                throw e
            }
        }
    }

    private fun walkRecords(
        data: ByteArray,
        start: Int,
        end: Int,
        slides: MutableList<StringBuilder>,
        collectText: Boolean
    ) {
        var offset = start
        var guard = 0
        val maxSteps = ((end - start) / 4).coerceAtLeast(8)
        while (offset + 8 <= end && guard++ < maxSteps) {
            val info = readUShortLE(data, offset)
            val recType = readUShortLE(data, offset + 2)
            val recLen = readIntLE(data, offset + 4).toLong() and 0xFFFFFFFFL
            val recVer = info and 0x000F
            val recInstance = (info shr 4) and 0x0FFF
            val bodyStart = offset + 8
            val bodyEnd = (bodyStart + recLen).coerceAtMost(end.toLong()).toInt()
            if (bodyEnd < bodyStart) break

            val isContainer = recVer == CONTAINER_VER

            when (recType) {
                RECORD_SLIDE_LIST_WITH_TEXT -> {
                    if (recInstance == 0 && isContainer) {
                        walkRecords(data, bodyStart, bodyEnd, slides, collectText = true)
                    }
                }
                RECORD_SLIDE_PERSIST_ATOM -> {
                    if (collectText) slides.add(StringBuilder())
                }
                RECORD_TEXT_CHARS_ATOM -> {
                    if (collectText) {
                        appendSlideText(slides, decodeUtf16Le(data, bodyStart, bodyEnd))
                    }
                }
                RECORD_TEXT_BYTES_ATOM -> {
                    if (collectText) {
                        appendSlideText(slides, decodeCompressedAnsi(data, bodyStart, bodyEnd))
                    }
                }
                else -> {
                    if (isContainer && bodyEnd > bodyStart) {
                        walkRecords(data, bodyStart, bodyEnd, slides, collectText)
                    }
                }
            }

            val next = if (bodyEnd > offset) bodyEnd else offset + 8
            if (next <= offset) break
            offset = next
        }
    }

    private fun appendSlideText(slides: MutableList<StringBuilder>, text: String) {
        val cleaned = text.replace('\u000B', '\n').replace('\r', '\n').trim()
        if (cleaned.isEmpty()) return
        if (slides.isEmpty()) slides.add(StringBuilder())
        val sb = slides.last()
        if (sb.isNotEmpty()) sb.append('\n')
        sb.append(cleaned)
    }

    private fun extractPictures(
        data: ByteArray,
        tempDir: File,
        out: MutableList<Pair<File, String>>
    ) {
        var offset = 0
        var index = 0
        var guard = 0
        while (offset + 8 <= data.size && guard++ < data.size) {
            val recLen = readIntLE(data, offset + 4).toLong() and 0xFFFFFFFFL
            val bodyStart = offset + 8
            val bodyEnd = (bodyStart + recLen).coerceAtMost(data.size.toLong()).toInt()
            if (bodyEnd <= bodyStart) {
                offset += 8
                continue
            }

            val sliceEnd = minOf(bodyEnd, bodyStart + MAX_PICTURE_BYTES)
            val payload = data.copyOfRange(bodyStart, sliceEnd)
            val image = findEmbeddedImage(payload)
            if (image != null) {
                val ext = if (image.first == "image/png") "png" else "jpg"
                val file = File(tempDir, "pic_${index++}.$ext")
                FileOutputStream(file).use { it.write(image.second) }
                out.add(file to image.first)
            }

            offset = bodyEnd
        }
    }

    private fun findEmbeddedImage(payload: ByteArray): Pair<String, ByteArray>? {
        val pngSig = byteArrayOf(0x89.toByte(), 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)
        val pngAt = indexOf(payload, pngSig)
        if (pngAt >= 0) {
            return "image/png" to payload.copyOfRange(pngAt, payload.size)
        }
        val jpgAt = indexOfJpeg(payload)
        if (jpgAt >= 0) {
            return "image/jpeg" to payload.copyOfRange(jpgAt, payload.size)
        }
        return null
    }

    private fun indexOf(data: ByteArray, needle: ByteArray): Int {
        outer@ for (i in 0..data.size - needle.size) {
            for (j in needle.indices) {
                if (data[i + j] != needle[j]) continue@outer
            }
            return i
        }
        return -1
    }

    private fun indexOfJpeg(data: ByteArray): Int {
        for (i in 0 until data.size - 2) {
            if (data[i] == 0xFF.toByte() && data[i + 1] == 0xD8.toByte() && data[i + 2] == 0xFF.toByte()) {
                return i
            }
        }
        return -1
    }

    private fun decodeUtf16Le(data: ByteArray, start: Int, end: Int): String {
        var length = end - start
        if (length <= 0) return ""
        if (length % 2 != 0) length -= 1
        return String(data, start, length, Charset.forName("UTF-16LE")).replace("\u0000", "")
    }

    private fun decodeCompressedAnsi(data: ByteArray, start: Int, end: Int): String {
        if (end <= start) return ""
        return String(data, start, end - start, Charsets.ISO_8859_1).replace("\u0000", "")
    }

    private fun readUShortLE(data: ByteArray, offset: Int): Int {
        return (data[offset].toInt() and 0xFF) or ((data[offset + 1].toInt() and 0xFF) shl 8)
    }

    private fun readIntLE(data: ByteArray, offset: Int): Int {
        return (data[offset].toInt() and 0xFF) or
            ((data[offset + 1].toInt() and 0xFF) shl 8) or
            ((data[offset + 2].toInt() and 0xFF) shl 16) or
            ((data[offset + 3].toInt() and 0xFF) shl 24)
    }
}
