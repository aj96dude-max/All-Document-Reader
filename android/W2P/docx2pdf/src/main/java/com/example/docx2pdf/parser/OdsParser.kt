package com.example.docx2pdf.parser

import android.content.Context
import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.withContext
import org.xmlpull.v1.XmlPullParser
import org.xmlpull.v1.XmlPullParserFactory
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.util.zip.ZipInputStream

/**
 * Parser for ODS files (OpenDocument Spreadsheet).
 * Extracts tabular data from content.xml and emits it as TableRows.
 */
class OdsParser : DocumentParser {
    override suspend fun parse(context: Context, inputUri: Uri): UnifiedDocumentState {
        return withContext(Dispatchers.IO) {
            val tempDir = File(context.cacheDir, "ods_temp_${System.currentTimeMillis()}")
            tempDir.mkdirs()
            
            var contentFile: File? = null
            
            context.contentResolver.openInputStream(inputUri)?.use { stream ->
                ZipInputStream(stream).use { zis ->
                    var entry = zis.nextEntry
                    while (entry != null) {
                        if (entry.name == "content.xml") {
                            contentFile = File(tempDir, "content.xml")
                            FileOutputStream(contentFile).use { fos ->
                                zis.copyTo(fos)
                            }
                            break
                        }
                        zis.closeEntry()
                        entry = zis.nextEntry
                    }
                }
            }
            
            val flow = flow {
                try {
                    if (contentFile != null && contentFile!!.exists()) {
                        val factory = XmlPullParserFactory.newInstance()
                        factory.isNamespaceAware = true
                        val parser = factory.newPullParser()
                        parser.setInput(FileInputStream(contentFile), "UTF-8")
                        
                        var event = parser.eventType
                        var currentRow = mutableListOf<String>()
                        var currentCellText = StringBuilder()
                        
                        while (event != XmlPullParser.END_DOCUMENT) {
                            when (event) {
                                XmlPullParser.START_TAG -> {
                                    val tag = parser.name
                                    if (tag == "table-row") {
                                        currentRow = mutableListOf()
                                    } else if (tag == "table-cell") {
                                        currentCellText = StringBuilder()
                                    } else if (tag == "p") {
                                        if (currentCellText.isNotEmpty()) {
                                            currentCellText.append("\n")
                                        }
                                    }
                                }
                                XmlPullParser.TEXT -> {
                                    val text = parser.text?.trim()
                                    if (!text.isNullOrEmpty()) {
                                        currentCellText.append(text)
                                    }
                                }
                                XmlPullParser.END_TAG -> {
                                    val tag = parser.name
                                    if (tag == "table-cell") {
                                        currentRow.add(currentCellText.toString())
                                    } else if (tag == "table-row") {
                                        if (currentRow.isNotEmpty() && currentRow.any { it.isNotBlank() }) {
                                            emit(DocumentElement.TableRow(currentRow.toList()))
                                        }
                                    }
                                }
                            }
                            event = parser.next()
                        }
                    }
                } finally {
                    tempDir.deleteRecursively()
                }
            }
            
            UnifiedDocumentState.StreamState(flow)
        }
    }
}
