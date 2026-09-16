package com.example.docx2pdf.parser

import android.content.Context
import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.xmlpull.v1.XmlPullParser
import org.xmlpull.v1.XmlPullParserFactory
import java.io.InputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream

/**
 * A zero-dependency EPUB parser.
 * It performs three passes over the ZIP archive:
 * 1. Find `META-INF/container.xml` to locate the OPF file.
 * 2. Find the OPF file to parse the manifest (file map) and spine (reading order).
 * 3. Extract the HTML/XHTML files in reading order, strip images, and concatenate into a single HtmlState.
 */
class EpubParser : DocumentParser {
    override suspend fun parse(context: Context, inputUri: Uri): UnifiedDocumentState {
        return withContext(Dispatchers.IO) {
            try {
            val factory = XmlPullParserFactory.newInstance()
            factory.isNamespaceAware = true

            // Pass 1: Find OPF path
            var opfPath = ""
            context.contentResolver.openInputStream(inputUri)?.use { stream ->
                val zipInputStream = ZipInputStream(stream)
                while (true) {
                    val entry = zipInputStream.nextEntry ?: break
                    if (entry.name == "META-INF/container.xml") {
                        opfPath = getOpfPath(zipInputStream, factory)
                        break
                    }
                    zipInputStream.closeEntry()
                }
            }

            if (opfPath.isEmpty()) {
                throw IllegalArgumentException("Invalid EPUB: META-INF/container.xml not found or OPF path missing.")
            }

            // Pass 2: Parse OPF for manifest and spine
            val manifest = mutableMapOf<String, String>() // id -> href
            val spine = mutableListOf<String>() // list of ids

            context.contentResolver.openInputStream(inputUri)?.use { stream ->
                val zipInputStream = ZipInputStream(stream)
                while (true) {
                    val entry = zipInputStream.nextEntry ?: break
                    if (entry.name == opfPath) {
                        parseOpf(zipInputStream, factory, manifest, spine)
                        break
                    }
                    zipInputStream.closeEntry()
                }
            }

            // Determine the base path of the OPF to resolve relative HTML paths
            val opfBasePath = if (opfPath.contains("/")) opfPath.substringBeforeLast("/") + "/" else ""

            // Build the ordered list of HTML paths to extract
            val htmlPathsToExtract = spine.mapNotNull { id -> manifest[id] }.map { href ->
                opfBasePath + href
            }

            // Pass 3: Extract HTML contents and parse text
            val htmlBuilder = StringBuilder()
            htmlBuilder.append("<html><body>")

            context.contentResolver.openInputStream(inputUri)?.use { stream ->
                val zipInputStream = ZipInputStream(stream)
                
                val extractedHtml = mutableMapOf<String, String>()
                val targetPaths = htmlPathsToExtract.toSet()

                while (true) {
                    val entry = zipInputStream.nextEntry ?: break
                    val decodedName = try { java.net.URLDecoder.decode(entry.name, "UTF-8") } catch(e: Exception) { entry.name }
                    if (targetPaths.contains(entry.name) || targetPaths.contains(decodedName)) {
                        val html = String(zipInputStream.readBytes(), Charsets.UTF_8)
                        extractedHtml[entry.name] = html
                        extractedHtml[decodedName] = html
                    }
                    zipInputStream.closeEntry()
                }

                for (path in htmlPathsToExtract) {
                    val decodedPath = try { java.net.URLDecoder.decode(path, "UTF-8") } catch(e: Exception) { path }
                    val html = extractedHtml[path] ?: extractedHtml[decodedPath]
                    if (html != null) {
                        val bodyContent = extractBody(html)
                        val stripped = stripImages(bodyContent)
                        htmlBuilder.append("<div style='page-break-after: always;'>")
                        htmlBuilder.append(stripped)
                        htmlBuilder.append("</div>")
                    }
                }
            }
            
            htmlBuilder.append("</body></html>")
            
            
            UnifiedDocumentState.HtmlState(htmlContent = htmlBuilder.toString())
            } catch (e: Throwable) {
                android.util.Log.e("EpubParser", "Failed to parse EPUB", e)
                throw Exception(e.message, e)
            }
        }
    }

    private fun getOpfPath(inputStream: InputStream, factory: XmlPullParserFactory): String {
        var opfPath = ""
        try {
            val parser = factory.newPullParser()
            parser.setInput(inputStream, "UTF-8")
            var eventType = parser.eventType
            while (eventType != XmlPullParser.END_DOCUMENT) {
                if (eventType == XmlPullParser.START_TAG && parser.name == "rootfile") {
                    opfPath = parser.getAttributeValue(null, "full-path") ?: ""
                    break
                }
                eventType = parser.next()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return opfPath
    }

    private fun parseOpf(
        inputStream: InputStream,
        factory: XmlPullParserFactory,
        manifest: MutableMap<String, String>,
        spine: MutableList<String>
    ) {
        try {
            val parser = factory.newPullParser()
            parser.setInput(inputStream, "UTF-8")
            var eventType = parser.eventType
            var inManifest = false
            var inSpine = false

            while (eventType != XmlPullParser.END_DOCUMENT) {
                when (eventType) {
                    XmlPullParser.START_TAG -> {
                        when (parser.name) {
                            "manifest" -> inManifest = true
                            "spine" -> inSpine = true
                            "item" -> {
                                if (inManifest) {
                                    val id = parser.getAttributeValue(null, "id")
                                    val href = parser.getAttributeValue(null, "href")
                                    if (id != null && href != null) {
                                        manifest[id] = href
                                    }
                                }
                            }
                            "itemref" -> {
                                if (inSpine) {
                                    val idref = parser.getAttributeValue(null, "idref")
                                    if (idref != null) {
                                        spine.add(idref)
                                    }
                                }
                            }
                        }
                    }
                    XmlPullParser.END_TAG -> {
                        when (parser.name) {
                            "manifest" -> inManifest = false
                            "spine" -> inSpine = false
                        }
                    }
                }
                eventType = parser.next()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun stripImages(html: String): String {
        // Strip <img> and <image> tags to prevent broken links in the local HTML preview
        return html.replace(Regex("<img[^>]*>", RegexOption.IGNORE_CASE), "")
                   .replace(Regex("<image[^>]*>", RegexOption.IGNORE_CASE), "")
                   .replace(Regex("</image>", RegexOption.IGNORE_CASE), "")
    }

    private fun extractBody(html: String): String {
        val bodyRegex = Regex("<body[^>]*>(.*?)</body>", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL))
        val match = bodyRegex.find(html)
        return match?.groupValues?.get(1) ?: html
    }
}
