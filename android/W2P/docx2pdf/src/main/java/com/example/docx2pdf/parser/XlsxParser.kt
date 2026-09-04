package com.example.docx2pdf.parser

import android.content.Context
import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.withContext
import org.xmlpull.v1.XmlPullParser
import org.xmlpull.v1.XmlPullParserFactory
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream

/**
 * A zero-dependency parser for Excel (.xlsx) files.
 * Uses a two-pass ZIP streaming approach:
 * 1. Pass 1: Extract the shared string table (`xl/sharedStrings.xml`).
 * 2. Pass 2: Extract the rows and cells (`xl/worksheets/sheet1.xml`), emitting TableRows via Flow.
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

            // Pass 2: Extract Sheet Data (Flow)
            val flow = flow {
                context.contentResolver.openInputStream(inputUri)?.use { stream ->
                    val zipInputStream = ZipInputStream(stream)
                    
                    val factory = XmlPullParserFactory.newInstance()
                    factory.isNamespaceAware = true

                    while (true) {
                        val entry = zipInputStream.nextEntry ?: break
                        if (entry.name.startsWith("xl/worksheets/sheet") && entry.name.endsWith(".xml")) {
                            // Parse sheet and emit rows
                            parseSheet(zipInputStream, factory, sharedStrings) { row ->
                                emit(DocumentElement.TableRow(row))
                            }
                            // We only process the first sheet we find to avoid massive documents,
                            // or we could process all of them. For now, just break after the first.
                            break
                        }
                        zipInputStream.closeEntry()
                    }
                }
            }
            
            UnifiedDocumentState.StreamState(flow)
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

    private suspend fun parseSheet(
        zipInputStream: ZipInputStream,
        factory: XmlPullParserFactory,
        sharedStrings: List<String>,
        onRowParsed: suspend (List<String>) -> Unit
    ) {
        try {
            val parser = factory.newPullParser()
            parser.setInput(zipInputStream, "UTF-8")
            
            var eventType = parser.eventType
            val currentRow = mutableListOf<String>()
            var isSharedString = false
            var inValueTag = false
            var currentValue = StringBuilder()

            while (eventType != XmlPullParser.END_DOCUMENT) {
                when (eventType) {
                    XmlPullParser.START_TAG -> {
                        when (parser.name) {
                            "c" -> {
                                // Cell start
                                val type = parser.getAttributeValue(null, "t")
                                isSharedString = (type == "s")
                            }
                            "v" -> {
                                inValueTag = true
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
                                val rawValue = currentValue.toString()
                                if (isSharedString) {
                                    val index = rawValue.toIntOrNull()
                                    if (index != null && index >= 0 && index < sharedStrings.size) {
                                        currentRow.add(sharedStrings[index])
                                    } else {
                                        currentRow.add(rawValue)
                                    }
                                } else {
                                    currentRow.add(rawValue)
                                }
                                currentValue.clear()
                            }
                            "row" -> {
                                onRowParsed(currentRow.toList())
                                currentRow.clear()
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
}
