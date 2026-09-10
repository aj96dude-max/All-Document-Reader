package com.example.docx2pdf.parser

import android.content.Context
import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.xmlpull.v1.XmlPullParser
import org.xmlpull.v1.XmlPullParserFactory
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream

/**
 * A zero-dependency parser for Excel (.xlsx) files.
 * Uses a two-pass ZIP streaming approach:
 * 1. Pass 1: Extract the shared string table (`xl/sharedStrings.xml`).
 * 2. Pass 2: Extract the rows and cells from all `xl/worksheets/sheet*.xml` files.
 * Generates an HTML representation to maintain grid layout, column padding, and wrap text.
 */
class XlsxParser : DocumentParser {
    override suspend fun parse(context: Context, inputUri: Uri): UnifiedDocumentState {
        return withContext(Dispatchers.IO) {
            
            // Pass 1: Extract Shared Strings
            val sharedStrings = mutableListOf<String>()
            
            context.contentResolver.openInputStream(inputUri)?.use { stream ->
                val zipInputStream = ZipInputStream(stream)
                
                val factory = XmlPullParserFactory.newInstance()
                factory.isNamespaceAware = true

                while (true) {
                    val entry = zipInputStream.nextEntry ?: break
                    if (entry.name == "xl/sharedStrings.xml") {
                        parseSharedStrings(zipInputStream, factory, sharedStrings)
                        break // We got what we need for pass 1
                    }
                    zipInputStream.closeEntry()
                }
            }

            // Pass 2: Extract Sheet Data to HTML
            val htmlBuilder = java.lang.StringBuilder()
            htmlBuilder.append("<!DOCTYPE html><html><head><meta charset=\"UTF-8\">")
            htmlBuilder.append("<style>")
            htmlBuilder.append("body { font-family: sans-serif; margin: 20px; } ")
            htmlBuilder.append("table { border-collapse: collapse; width: 100%; margin-bottom: 30px; } ")
            htmlBuilder.append("th, td { border: 1px solid #d0d7de; padding: 6px 12px; text-align: left; vertical-align: top; word-wrap: break-word; } ")
            htmlBuilder.append("h2 { font-size: 18px; margin-top: 20px; margin-bottom: 10px; color: #333; }")
            htmlBuilder.append("</style></head><body>")
            
            var sheetCount = 1

            context.contentResolver.openInputStream(inputUri)?.use { stream ->
                val zipInputStream = ZipInputStream(stream)
                
                val factory = XmlPullParserFactory.newInstance()
                factory.isNamespaceAware = true

                while (true) {
                    val entry = zipInputStream.nextEntry ?: break
                    if (entry.name.startsWith("xl/worksheets/sheet") && entry.name.endsWith(".xml")) {
                        htmlBuilder.append("<h2>Sheet $sheetCount</h2>")
                        htmlBuilder.append("<table>")
                        parseSheet(zipInputStream, factory, sharedStrings, htmlBuilder)
                        htmlBuilder.append("</table>")
                        sheetCount++
                    }
                    zipInputStream.closeEntry()
                }
            }
            
            htmlBuilder.append("</body></html>")
            
            UnifiedDocumentState.HtmlState(htmlBuilder.toString())
        }
    }

    private fun parseSharedStrings(
        zipInputStream: ZipInputStream,
        factory: XmlPullParserFactory,
        sharedStrings: MutableList<String>
    ) {
        try {
            val parser = factory.newPullParser()
            parser.setInput(zipInputStream, "UTF-8")
            
            var eventType = parser.eventType
            var inTextTag = false
            var currentText = StringBuilder()

            while (eventType != XmlPullParser.END_DOCUMENT) {
                when (eventType) {
                    XmlPullParser.START_TAG -> {
                        if (parser.name == "t") {
                            inTextTag = true
                        }
                    }
                    XmlPullParser.TEXT -> {
                        if (inTextTag) {
                            val text = parser.text
                            if (text != null) {
                                currentText.append(text)
                            }
                        }
                    }
                    XmlPullParser.END_TAG -> {
                        if (parser.name == "t") {
                            inTextTag = false
                        } else if (parser.name == "si") {
                            sharedStrings.add(currentText.toString())
                            currentText.clear()
                        }
                    }
                }
                eventType = parser.next()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun parseSheet(
        zipInputStream: ZipInputStream,
        factory: XmlPullParserFactory,
        sharedStrings: List<String>,
        htmlBuilder: StringBuilder
    ) {
        try {
            val parser = factory.newPullParser()
            parser.setInput(zipInputStream, "UTF-8")
            
            var eventType = parser.eventType
            var isSharedString = false
            var inValueTag = false
            var hasVNode = false
            var currentValue = StringBuilder()
            var currentColumnIndex = 0

            while (eventType != XmlPullParser.END_DOCUMENT) {
                when (eventType) {
                    XmlPullParser.START_TAG -> {
                        when (parser.name) {
                            "row" -> {
                                htmlBuilder.append("<tr>")
                                currentColumnIndex = 0
                            }
                            "c" -> {
                                val rAttr = parser.getAttributeValue(null, "r")
                                if (rAttr != null) {
                                    val colStr = rAttr.takeWhile { it.isLetter() }
                                    val colIdx = colStrToIdx(colStr)
                                    // Pad missing columns before this cell
                                    while (currentColumnIndex < colIdx) {
                                        htmlBuilder.append("<td></td>")
                                        currentColumnIndex++
                                    }
                                }
                                val type = parser.getAttributeValue(null, "t")
                                isSharedString = (type == "s")
                                hasVNode = false
                            }
                            "v" -> {
                                inValueTag = true
                                hasVNode = true
                            }
                        }
                    }
                    XmlPullParser.TEXT -> {
                        if (inValueTag) {
                            val text = parser.text
                            if (text != null) {
                                currentValue.append(text)
                            }
                        }
                    }
                    XmlPullParser.END_TAG -> {
                        when (parser.name) {
                            "v" -> {
                                inValueTag = false
                            }
                            "c" -> {
                                val rawValue = currentValue.toString()
                                val displayValue = if (hasVNode) {
                                    if (isSharedString) {
                                        val index = rawValue.toIntOrNull()
                                        if (index != null && index >= 0 && index < sharedStrings.size) {
                                            sharedStrings[index]
                                        } else rawValue
                                    } else rawValue
                                } else ""
                                
                                htmlBuilder.append("<td>").append(escapeHtml(displayValue)).append("</td>")
                                currentColumnIndex++
                                currentValue.clear()
                            }
                            "row" -> {
                                htmlBuilder.append("</tr>")
                            }
                        }
                    }
                }
                eventType = parser.next()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun colStrToIdx(colStr: String): Int {
        var idx = 0
        for (char in colStr.uppercase()) {
            idx = idx * 26 + (char - 'A' + 1)
        }
        return if (idx > 0) idx - 1 else 0
    }

    private fun escapeHtml(text: String): String {
        return text.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#039;")
    }
}
