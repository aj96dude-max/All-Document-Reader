package com.example.docx2pdf.parser

import android.content.Context
import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.withContext
import org.xmlpull.v1.XmlPullParser
import org.xmlpull.v1.XmlPullParserFactory
import java.io.InputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream

/**
 * A zero-dependency parser for .pptx files.
 * Extracts text from ppt/slides/slide*.xml by treating the .pptx as a ZIP archive.
 * Extracts text from <a:t> nodes.
 */
class PptxParser : DocumentParser {
    override suspend fun parse(context: Context, inputUri: Uri): UnifiedDocumentState {
        return withContext(Dispatchers.IO) {
            
            // Text data in a PPTX is very small, so we can extract it into memory
            // and sort it by slide number to ensure correct ordering.
            val slideTexts = mutableMapOf<Int, MutableList<String>>()

            val inputStream = context.contentResolver.openInputStream(inputUri)
                ?: throw IllegalArgumentException("Could not open InputStream for $inputUri")

            inputStream.use { stream ->
                val zipInputStream = ZipInputStream(stream)
                
                val factory = XmlPullParserFactory.newInstance()
                factory.isNamespaceAware = true

                while (true) {
                    val entry = zipInputStream.nextEntry ?: break
                    val name = entry.name
                    if (name.startsWith("ppt/slides/slide") && name.endsWith(".xml")) {
                        // Extract slide number from filename, e.g., "ppt/slides/slide12.xml" -> 12
                        val slideNumStr = name.substringAfter("slide").substringBefore(".xml")
                        val slideNum = slideNumStr.toIntOrNull() ?: 0
                        
                        val lines = extractTextFromSlideXml(zipInputStream, factory)
                        if (lines.isNotEmpty()) {
                            slideTexts[slideNum] = lines
                        }
                    }
                    zipInputStream.closeEntry()
                }
            }

            // Create a flow to emit the sorted slide texts
            val flow = flow {
                val sortedSlides = slideTexts.toSortedMap()
                for ((slideNum, lines) in sortedSlides) {
                    emit(DocumentElement.TextLine("--- Slide $slideNum ---", isBold = true))
                    for (line in lines) {
                        emit(DocumentElement.TextLine(line))
                    }
                    emit(DocumentElement.TextLine("")) // Blank line between slides
                }
                
                if (sortedSlides.isEmpty()) {
                    emit(DocumentElement.TextLine("No text found in this presentation."))
                }
            }
            
            UnifiedDocumentState.StreamState(flow)
        }
    }

    private fun extractTextFromSlideXml(
        inputStream: InputStream,
        factory: XmlPullParserFactory
    ): MutableList<String> {
        val lines = mutableListOf<String>()
        try {
            val parser = factory.newPullParser()
            // We do NOT close the inputStream here because ZipInputStream needs to continue to the next entry.
            // Using a non-closing wrapper or just not closing the parser stream is necessary.
            // XmlPullParser doesn't close the underlying stream by default.
            parser.setInput(inputStream, "UTF-8")

            var eventType = parser.eventType
            var currentText = StringBuilder()
            var inTextTag = false

            while (eventType != XmlPullParser.END_DOCUMENT) {
                when (eventType) {
                    XmlPullParser.START_TAG -> {
                        val tagName = parser.name
                        if (tagName == "p") {
                            if (currentText.isNotEmpty()) {
                                lines.add(currentText.toString())
                                currentText.clear()
                            }
                        } else if (tagName == "t") {
                            inTextTag = true
                        }
                    }
                    XmlPullParser.TEXT -> {
                        if (inTextTag) {
                            val text = parser.text
                            if (!text.isNullOrEmpty()) {
                                currentText.append(text)
                            }
                        }
                    }
                    XmlPullParser.END_TAG -> {
                        val tagName = parser.name
                        if (tagName == "p") {
                            if (currentText.isNotEmpty()) {
                                lines.add(currentText.toString())
                                currentText.clear()
                            }
                        } else if (tagName == "t") {
                            inTextTag = false
                            currentText.append(" ")
                        }
                    }
                }
                eventType = parser.next()
            }
            
            if (currentText.isNotEmpty()) {
                lines.add(currentText.toString())
            }

        } catch (e: Exception) {
            e.printStackTrace()
        }
        return lines
    }
}
