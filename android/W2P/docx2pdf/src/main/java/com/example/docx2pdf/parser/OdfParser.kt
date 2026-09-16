package com.example.docx2pdf.parser

import android.content.Context
import android.net.Uri
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.xmlpull.v1.XmlPullParser
import org.xmlpull.v1.XmlPullParserFactory
import java.io.InputStream
import java.util.zip.ZipInputStream

/**
 * A zero-dependency ODF parser (ODT, ODP).
 * Extracts text content from `content.xml` within the zipped archive.
 */
class OdfParser : DocumentParser {

    companion object {
        private const val TAG = "OdfParser"
    }

    override suspend fun parse(context: Context, inputUri: Uri): UnifiedDocumentState {
        return withContext(Dispatchers.IO) {
            val htmlContentBuilder = StringBuilder()
            htmlContentBuilder.append("<html><head><style>body{font-family:sans-serif;padding:20px;}p{line-height:1.5;}</style></head><body>")

            var foundContent = false
            context.contentResolver.openInputStream(inputUri)?.use { stream ->
                val zipInputStream = ZipInputStream(stream)
                while (true) {
                    val entry = zipInputStream.nextEntry ?: break
                    if (entry.name == "content.xml") {
                        foundContent = true
                        parseContentXml(zipInputStream, htmlContentBuilder)
                        break
                    }
                    zipInputStream.closeEntry()
                }
            }

            if (!foundContent) {
                throw IllegalArgumentException("Invalid ODF document: content.xml not found")
            }

            htmlContentBuilder.append("</body></html>")
            UnifiedDocumentState.HtmlState(htmlContentBuilder.toString())
        }
    }

    private fun parseContentXml(inputStream: InputStream, builder: StringBuilder) {
        try {
            val factory = XmlPullParserFactory.newInstance()
            factory.isNamespaceAware = true
            val parser = factory.newPullParser()
            parser.setInput(inputStream, "UTF-8")

            var eventType = parser.eventType
            while (eventType != XmlPullParser.END_DOCUMENT) {
                when (eventType) {
                    XmlPullParser.START_TAG -> {
                        val name = parser.name
                        if (name == "p" || name == "h") {
                            builder.append("<p>")
                        }
                    }
                    XmlPullParser.TEXT -> {
                        val text = parser.text?.trim()
                        if (!text.isNullOrEmpty()) {
                            // Encode HTML entities
                            val encodedText = text.replace("&", "&amp;")
                                                  .replace("<", "&lt;")
                                                  .replace(">", "&gt;")
                            builder.append(encodedText)
                        }
                    }
                    XmlPullParser.END_TAG -> {
                        val name = parser.name
                        if (name == "p" || name == "h") {
                            builder.append("</p>")
                        }
                    }
                }
                eventType = parser.next()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing content.xml", e)
            throw e
        }
    }
}
