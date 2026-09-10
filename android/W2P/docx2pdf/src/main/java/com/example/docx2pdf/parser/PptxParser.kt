package com.example.docx2pdf.parser

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.xmlpull.v1.XmlPullParser
import org.xmlpull.v1.XmlPullParserFactory
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.util.zip.ZipInputStream
import kotlin.math.roundToInt

/**
 * PPTX -> HTML parser.
 *
 * Key fixes vs the previous version:
 *  1. srgbClr/sysClr values were never actually captured ("#" with nothing appended) -> all colors lost.
 *  2. The slide wrapper had no `position: relative` + explicit width/height, so every absolutely
 *     positioned shape resolved against the page instead of its own slide -> slides bled into each other.
 *  3. Relationship files were read from a hardcoded, non-existent ".rels" path instead of
 *     "slideN.xml.rels" -> image/layout relationships were empty for (almost) every slide.
 *  4. Group shapes (grpSp/grpSpPr with chOff/chExt) were not handled at all, so any shape nested in a
 *     group used its local group-space coordinates as if they were slide coordinates.
 *  5. Placeholder shapes that omit their own off/ext (title/body placeholders almost always do this)
 *     were not resolved against the slide layout / slide master, so they collapsed to (0,0).
 *  6. Shapes were forced into a centered flex box regardless of the deck's actual text alignment.
 *  7. Images were always re-encoded as JPEG, destroying alpha on PNG logos/icons.
 */
class PptxParser : DocumentParser {

    // ---------- small data holders ----------

    private data class RelInfo(val type: String, val target: File)

    private data class ShapeGeom(val x: Double, val y: Double, val w: Double, val h: Double)

    private data class PhKey(val type: String?, val idx: String?) {
        fun candidates(): List<String> = listOfNotNull(
            if (type != null && idx != null) "$type#$idx" else null,
            if (type != null) "type:$type" else null,
            if (idx != null) "idx:$idx" else null
        )
    }

    /** Maps a child (group-local) coordinate space onto an already-resolved absolute-px rectangle. */
    private data class GroupTransform(
        val offX: Double, val offY: Double, val extW: Double, val extH: Double,
        val chOffX: Double, val chOffY: Double, val chExtW: Double, val chExtH: Double
    ) {
        fun apply(x: Double, y: Double, w: Double, h: Double): ShapeGeom {
            val sx = if (chExtW != 0.0) extW / chExtW else 1.0
            val sy = if (chExtH != 0.0) extH / chExtH else 1.0
            return ShapeGeom(
                x = offX + (x - chOffX) * sx,
                y = offY + (y - chOffY) * sy,
                w = w * sx,
                h = h * sy
            )
        }
    }

    private fun emu(v: Long?): Double = if (v == null) 0.0 else v / 9525.0

    override suspend fun parse(context: Context, inputUri: Uri): UnifiedDocumentState {
        return withContext(Dispatchers.IO) {
            val tempDir = File(context.cacheDir, "pptx_temp_${System.currentTimeMillis()}")
            try {
                tempDir.mkdirs()
                extractZip(context, inputUri, tempDir)

                val factory = XmlPullParserFactory.newInstance()
                factory.isNamespaceAware = true

                val slidesDir = File(tempDir, "ppt/slides")
                val slideRelsDir = File(tempDir, "ppt/slides/_rels")
                val mediaDir = File(tempDir, "ppt/media")

                var slideWidthPx = 960.0
                var slideHeightPx = 540.0
                val presFile = File(tempDir, "ppt/presentation.xml")
                if (presFile.exists()) {
                    try {
                        val pParser = factory.newPullParser()
                        pParser.setInput(FileInputStream(presFile), "UTF-8")
                        var pEvent = pParser.eventType
                        while (pEvent != XmlPullParser.END_DOCUMENT) {
                            if (pEvent == XmlPullParser.START_TAG && pParser.name == "sldSz") {
                                val cx = pParser.getAttributeValue(null, "cx")?.toLongOrNull()
                                val cy = pParser.getAttributeValue(null, "cy")?.toLongOrNull()
                                if (cx != null && cy != null) {
                                    slideWidthPx = emu(cx)
                                    slideHeightPx = emu(cy)
                                }
                                break
                            }
                            pEvent = pParser.next()
                        }
                    } catch (_: Exception) { }
                }

                val slideFiles = (slidesDir.listFiles { _, name -> name.startsWith("slide") && name.endsWith(".xml") }
                    ?: emptyArray()).sortedBy {
                    it.name.substringAfter("slide").substringBefore(".xml").toIntOrNull() ?: 0
                }

                val themeColorMap = parseThemeColors(File(tempDir, "ppt/theme/theme1.xml"), factory)

                val htmlBuilder = StringBuilder()
                htmlBuilder.append("<html><head><meta charset='utf-8'><style>")
                htmlBuilder.append("html,body { margin:0; padding:0; }")
                htmlBuilder.append("body { font-family: 'Calibri', 'Arial', sans-serif; }")
                htmlBuilder.append(".slide-page { page-break-after: always; display:flex; justify-content:center; background:#e6e6e6; padding: 12px 0; }")
                htmlBuilder.append(".slide { position: relative; overflow: hidden; box-sizing: border-box; background-color: #FFFFFF; }")
                htmlBuilder.append(".shape { position: absolute; overflow: hidden; box-sizing: border-box; padding: 2px 4px; }")
                htmlBuilder.append(".text-block { margin: 2px 0; font-size: 16pt; line-height: 1.2; }")
                htmlBuilder.append(".img-container { width:100%; height:100%; }")
                htmlBuilder.append("img { display:block; width: 100%; height: 100%; object-fit: contain; }")
                htmlBuilder.append("</style></head><body>")

                if (slideFiles.isEmpty()) {
                    htmlBuilder.append("<p>No slides found.</p>")
                }

                for (slideFile in slideFiles) {
                    val slideRels = parseRels(File(slideRelsDir, slideFile.name + ".rels"), slideFile.parentFile ?: tempDir)

                    // Resolve slide -> layout -> master chain for this specific slide.
                    val layoutFile = findRelTarget(slideRels, "slideLayout")
                    val layoutRels = layoutFile?.let {
                        parseRels(File(it.parentFile, "_rels/${it.name}.rels"), it.parentFile ?: tempDir)
                    } ?: emptyMap()
                    val masterFile = layoutFile?.let { findRelTarget(layoutRels, "slideMaster") }
                        ?: File(tempDir, "ppt/slideMasters/slideMaster1.xml").takeIf { it.exists() }
                    val masterRels = masterFile?.let {
                        parseRels(File(it.parentFile, "_rels/${it.name}.rels"), it.parentFile ?: tempDir)
                    } ?: emptyMap()

                    val masterPh = masterFile?.let { parsePlaceholderGeoms(it, factory) } ?: emptyMap()
                    val layoutPh = layoutFile?.let { parsePlaceholderGeoms(it, factory) } ?: emptyMap()
                    // Layout placeholder geometry should win over master; merge with layout taking priority.
                    val inheritedPh = masterPh + layoutPh

                    var masterBgColor: String? = null
                    var masterHtml = ""
                    if (masterFile != null && masterFile.exists()) {
                        val result = parseShapeTree(
                            FileInputStream(masterFile), factory, themeColorMap, masterRels, mediaDir,
                            inheritedPh = emptyMap(), slideW = slideWidthPx, slideH = slideHeightPx,
                            renderOnlyBackgroundShapes = true
                        )
                        masterHtml = result.html
                        masterBgColor = result.bgColor
                    }

                    val slideResult = parseShapeTree(
                        FileInputStream(slideFile), factory, themeColorMap, slideRels, mediaDir,
                        inheritedPh = inheritedPh, slideW = slideWidthPx, slideH = slideHeightPx,
                        renderOnlyBackgroundShapes = false
                    )

                    val finalBg = slideResult.bgColor ?: masterBgColor ?: "#FFFFFF"

                    htmlBuilder.append("<div class='slide-page'>")
                    htmlBuilder.append(
                        "<div class='slide' style='width:${px(slideWidthPx)}px; height:${px(slideHeightPx)}px; background-color:$finalBg;'>"
                    )
                    htmlBuilder.append(masterHtml)
                    htmlBuilder.append(slideResult.html)
                    htmlBuilder.append("</div></div>")
                }

                htmlBuilder.append("</body></html>")
                UnifiedDocumentState.HtmlState(htmlBuilder.toString())
            } catch (e: Exception) {
                e.printStackTrace()
                UnifiedDocumentState.HtmlState("<html><body><p>Error parsing presentation: ${e.message ?: e.javaClass.simpleName}</p></body></html>")
            } finally {
                tempDir.deleteRecursively()
            }
        }
    }

    private fun px(v: Double): Int = v.roundToInt()

    // ---------- zip extraction (zip-slip safe, unchanged behavior) ----------

    private fun extractZip(context: Context, inputUri: Uri, tempDir: File) {
        context.contentResolver.openInputStream(inputUri)?.use { stream ->
            ZipInputStream(stream).use { zis ->
                var entry = zis.nextEntry
                while (entry != null) {
                    val canonicalDestDir = tempDir.canonicalPath
                    val destFile = File(tempDir, entry.name)
                    val canonicalDestFile = destFile.canonicalPath
                    if (canonicalDestFile.startsWith(canonicalDestDir + File.separator)) {
                        if (entry.isDirectory) {
                            destFile.mkdirs()
                        } else {
                            destFile.parentFile?.mkdirs()
                            FileOutputStream(destFile).use { fos -> zis.copyTo(fos) }
                        }
                    }
                    zis.closeEntry()
                    entry = zis.nextEntry
                }
            }
        }
    }

    // ---------- relationship (.rels) parsing, resolved per-file (fixes bug #3) ----------

    /**
     * @param relsFile the "_rels/<part>.rels" file for a specific part (e.g. slide3.xml.rels)
     * @param partDir the directory containing the part itself (targets are resolved relative to this)
     */
    private fun parseRels(relsFile: File, partDir: File): Map<String, RelInfo> {
        val map = mutableMapOf<String, RelInfo>()
        if (!relsFile.exists()) return map
        try {
            val factory = XmlPullParserFactory.newInstance()
            factory.isNamespaceAware = true
            val parser = factory.newPullParser()
            parser.setInput(FileInputStream(relsFile), "UTF-8")
            var event = parser.eventType
            while (event != XmlPullParser.END_DOCUMENT) {
                if (event == XmlPullParser.START_TAG && parser.name == "Relationship") {
                    val id = parser.getAttributeValue(null, "Id")
                    val type = parser.getAttributeValue(null, "Type") ?: ""
                    val target = parser.getAttributeValue(null, "Target")
                    if (id != null && target != null) {
                        val resolved = if (target.startsWith("/")) {
                            File(partDir.parentFile?.parentFile ?: partDir, target.trimStart('/'))
                        } else {
                            File(partDir, target)
                        }
                        map[id] = RelInfo(type, resolved.canonicalFile)
                    }
                }
                event = parser.next()
            }
        } catch (_: Exception) { }
        return map
    }

    private fun findRelTarget(rels: Map<String, RelInfo>, typeSuffix: String): File? =
        rels.values.firstOrNull { it.type.endsWith(typeSuffix) }?.target?.takeIf { it.exists() }

    // ---------- theme colors (fixes bug #1) ----------

    private fun parseThemeColors(themeFile: File, factory: XmlPullParserFactory): Map<String, String> {
        val themeColorMap = mutableMapOf<String, String>()
        if (!themeFile.exists()) return themeColorMap
        try {
            val themeParser = factory.newPullParser()
            themeParser.setInput(FileInputStream(themeFile), "UTF-8")
            var tEvent = themeParser.eventType
            var currentSchemeKey: String? = null
            while (tEvent != XmlPullParser.END_DOCUMENT) {
                if (tEvent == XmlPullParser.START_TAG) {
                    val tName = themeParser.name
                    if (tName == "dk1" || tName == "lt1" || tName == "dk2" || tName == "lt2" ||
                        tName.startsWith("accent") || tName == "hlink" || tName == "folHlink"
                    ) {
                        currentSchemeKey = tName
                    } else if (tName == "srgbClr" && currentSchemeKey != null) {
                        themeParser.getAttributeValue(null, "val")?.let { themeColorMap[currentSchemeKey!!] = "#$it" }
                    } else if (tName == "sysClr" && currentSchemeKey != null) {
                        themeParser.getAttributeValue(null, "lastClr")?.let { themeColorMap[currentSchemeKey!!] = "#$it" }
                    }
                } else if (tEvent == XmlPullParser.END_TAG) {
                    val tName = themeParser.name
                    if (tName == "dk1" || tName == "lt1" || tName == "dk2" || tName == "lt2" ||
                        tName.startsWith("accent") || tName == "hlink" || tName == "folHlink"
                    ) {
                        currentSchemeKey = null
                    }
                }
                tEvent = themeParser.next()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return themeColorMap
    }

    // ---------- placeholder geometry from layout/master (fixes bug #5) ----------

    private fun parsePlaceholderGeoms(file: File, factory: XmlPullParserFactory): Map<String, ShapeGeom> {
        val map = mutableMapOf<String, ShapeGeom>()
        if (!file.exists()) return map
        try {
            val parser = factory.newPullParser()
            parser.setInput(FileInputStream(file), "UTF-8")
            var event = parser.eventType
            var inSpPr = false
            var phType: String? = null
            var phIdx: String? = null
            var x: Double? = null; var y: Double? = null; var w: Double? = null; var h: Double? = null
            while (event != XmlPullParser.END_DOCUMENT) {
                when (event) {
                    XmlPullParser.START_TAG -> {
                        when (parser.name) {
                            "sp" -> { phType = null; phIdx = null; x = null; y = null; w = null; h = null }
                            "ph" -> {
                                phType = parser.getAttributeValue(null, "type")
                                phIdx = parser.getAttributeValue(null, "idx")
                            }
                            "spPr" -> inSpPr = true
                            "off" -> if (inSpPr) {
                                x = emu(parser.getAttributeValue(null, "x")?.toLongOrNull())
                                y = emu(parser.getAttributeValue(null, "y")?.toLongOrNull())
                            }
                            "ext" -> if (inSpPr) {
                                w = emu(parser.getAttributeValue(null, "cx")?.toLongOrNull())
                                h = emu(parser.getAttributeValue(null, "cy")?.toLongOrNull())
                            }
                        }
                    }
                    XmlPullParser.END_TAG -> {
                        when (parser.name) {
                            "spPr" -> inSpPr = false
                            "sp" -> {
                                if (x != null && y != null && w != null && h != null && (phType != null || phIdx != null)) {
                                    val geom = ShapeGeom(x!!, y!!, w!!, h!!)
                                    val key = PhKey(phType, phIdx)
                                    for (c in key.candidates()) map.putIfAbsent(c, geom)
                                }
                            }
                        }
                    }
                }
                event = parser.next()
            }
        } catch (_: Exception) { }
        return map
    }

    private fun lookupInherited(map: Map<String, ShapeGeom>, type: String?, idx: String?): ShapeGeom? {
        val key = PhKey(type, idx)
        for (c in key.candidates()) map[c]?.let { return it }
        return null
    }

    // ---------- slide/layout/master shape-tree parsing ----------

    private data class ShapeTreeResult(val html: String, val bgColor: String?)

    private fun parseShapeTree(
        inputStream: java.io.InputStream,
        factory: XmlPullParserFactory,
        themeColorMap: Map<String, String>,
        rels: Map<String, RelInfo>,
        mediaDir: File,
        inheritedPh: Map<String, ShapeGeom>,
        slideW: Double,
        slideH: Double,
        renderOnlyBackgroundShapes: Boolean
    ): ShapeTreeResult {
        val parser = factory.newPullParser()
        parser.setInput(inputStream, "UTF-8")

        var event = parser.eventType
        var inBg = false
        var inSpPr = false
        var inGrpSpPr = false
        var inRPr = false
        var inPPr = false

        var slideBgColor: String? = null

        // current shape state
        var shapeBgColor: String? = null
        var shapeType: String? = null
        var offX: Double? = null; var offY: Double? = null; var extW: Double? = null; var extH: Double? = null
        var chOffX = 0.0; var chOffY = 0.0; var chExtW = 0.0; var chExtH = 0.0
        var phType: String? = null
        var phIdx: String? = null
        var hasText = false

        var currentTextColor: String? = null
        var currentFontPt: Double? = null
        var isBold = false
        var isItalic = false
        var isUnderline = false
        var currentAlign: String? = null

        val groupStack = ArrayDeque<GroupTransform>()
        val html = StringBuilder()

        // Resolves a (x,y,w,h) given in the current local coordinate space into absolute slide px.
        fun toAbs(x: Double, y: Double, w: Double, h: Double): ShapeGeom {
            return if (groupStack.isEmpty()) ShapeGeom(x, y, w, h) else groupStack.last().apply(x, y, w, h)
        }

        while (event != XmlPullParser.END_DOCUMENT) {
            when (event) {
                XmlPullParser.START_TAG -> {
                    when (val tag = parser.name) {
                        "bg" -> inBg = true
                        "spPr" -> inSpPr = true
                        "grpSpPr" -> inGrpSpPr = true
                        "rPr", "defRPr" -> inRPr = true
                        "pPr" -> inPPr = true
                        "ph" -> {
                            phType = parser.getAttributeValue(null, "type")
                            phIdx = parser.getAttributeValue(null, "idx")
                        }
                        "srgbClr" -> {
                            parser.getAttributeValue(null, "val")?.let { v ->
                                val hex = "#$v"
                                if (inBg) slideBgColor = hex
                                else if (inRPr) currentTextColor = hex
                                else if (inSpPr) shapeBgColor = hex
                            }
                        }
                        "schemeClr" -> {
                            parser.getAttributeValue(null, "val")?.let { schemeVal ->
                                val resolved = themeColorMap[schemeVal] ?: resolveThemeColor(schemeVal)
                                if (resolved != null) {
                                    if (inBg) slideBgColor = resolved
                                    else if (inRPr) currentTextColor = resolved
                                    else if (inSpPr) shapeBgColor = resolved
                                }
                            }
                        }
                        "off" -> {
                            val x = parser.getAttributeValue(null, "x")?.toLongOrNull()
                            val y = parser.getAttributeValue(null, "y")?.toLongOrNull()
                            if ((inSpPr || inGrpSpPr) && x != null && y != null) {
                                offX = emu(x); offY = emu(y)
                            }
                        }
                        "ext" -> {
                            val cx = parser.getAttributeValue(null, "cx")?.toLongOrNull()
                            val cy = parser.getAttributeValue(null, "cy")?.toLongOrNull()
                            if ((inSpPr || inGrpSpPr) && cx != null && cy != null) {
                                extW = emu(cx); extH = emu(cy)
                            }
                        }
                        "chOff" -> {
                            chOffX = emu(parser.getAttributeValue(null, "x")?.toLongOrNull())
                            chOffY = emu(parser.getAttributeValue(null, "y")?.toLongOrNull())
                        }
                        "chExt" -> {
                            chExtW = emu(parser.getAttributeValue(null, "cx")?.toLongOrNull())
                            chExtH = emu(parser.getAttributeValue(null, "cy")?.toLongOrNull())
                        }
                        "prstGeom" -> if (inSpPr) shapeType = parser.getAttributeValue(null, "prst")
                        "sp", "pic", "graphicFrame", "cxnSp" -> {
                            shapeBgColor = null; shapeType = null
                            offX = null; offY = null; extW = null; extH = null
                            phType = null; phIdx = null; hasText = false
                        }
                        "grpSp" -> {
                            offX = null; offY = null; extW = null; extH = null
                            chOffX = 0.0; chOffY = 0.0; chExtW = 0.0; chExtH = 0.0
                        }
                        "p" -> {
                            currentAlign = null
                            html.append("<div class='text-block'>")
                        }
                        "r" -> {
                            isBold = false; isItalic = false; isUnderline = false
                            currentTextColor = null; currentFontPt = null
                        }
                        "br" -> html.append("<br/>")
                        "rPr" -> {
                            for (i in 0 until parser.attributeCount) {
                                when (parser.getAttributeName(i)) {
                                    "b" -> if (parser.getAttributeValue(i) == "1") isBold = true
                                    "i" -> if (parser.getAttributeValue(i) == "1") isItalic = true
                                    "u" -> if (parser.getAttributeValue(i) != "none") isUnderline = true
                                    "sz" -> parser.getAttributeValue(i).toIntOrNull()?.let { currentFontPt = it / 100.0 }
                                }
                            }
                        }
                        "pPr" -> {
                            parser.getAttributeValue(null, "algn")?.let { a ->
                                currentAlign = when (a) {
                                    "ctr" -> "center"
                                    "r" -> "right"
                                    "just", "justLow" -> "justify"
                                    else -> "left"
                                }
                            }
                        }
                        "t" -> {
                            hasText = true
                            val text = parser.nextText()
                            var styled = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                            val styles = StringBuilder()
                            if (currentTextColor != null) styles.append("color:$currentTextColor;")
                            if (currentFontPt != null) styles.append("font-size:${currentFontPt}pt;")
                            if (isUnderline) styles.append("text-decoration:underline;")
                            if (styles.isNotEmpty()) styled = "<span style='$styles'>$styled</span>"
                            if (isBold) styled = "<b>$styled</b>"
                            if (isItalic) styled = "<i>$styled</i>"
                            html.append(styled)
                        }
                        "blip" -> {
                            var embedId: String? = null
                            for (i in 0 until parser.attributeCount) {
                                if (parser.getAttributeName(i) == "embed") {
                                    embedId = parser.getAttributeValue(i)
                                    break
                                }
                            }
                            val target = embedId?.let { rels[it]?.target }
                            if (target != null && target.exists()) {
                                val encoded = downsampleImageToBase64(target)
                                if (encoded != null) {
                                    html.append(
                                        "<div class='img-container'><img src='data:${encoded.first};base64,${encoded.second}' /></div>"
                                    )
                                }
                            }
                        }
                        else -> { /* no-op, keep exhaustive-ish */ }
                    }
                }
                XmlPullParser.END_TAG -> {
                    when (parser.name) {
                        "bg" -> inBg = false
                        "grpSpPr" -> {
                            inGrpSpPr = false
                            // Resolve this group's own box in the *current* (outer) coordinate space,
                            // then push a transform mapping its child space onto that resolved box.
                            val geom = toAbs(offX ?: 0.0, offY ?: 0.0, extW ?: slideW, extH ?: slideH)
                            groupStack.addLast(
                                GroupTransform(
                                    offX = geom.x, offY = geom.y, extW = geom.w, extH = geom.h,
                                    chOffX = chOffX, chOffY = chOffY,
                                    chExtW = if (chExtW != 0.0) chExtW else geom.w,
                                    chExtH = if (chExtH != 0.0) chExtH else geom.h
                                )
                            )
                        }
                        "spPr" -> {
                            inSpPr = false
                            var geom: ShapeGeom? = if (offX != null && offY != null && extW != null && extH != null) {
                                toAbs(offX!!, offY!!, extW!!, extH!!)
                            } else null

                            if (geom == null) {
                                // Inherit position/size from the layout, then the master, for placeholders
                                // that don't override their own geometry (this is the common case for
                                // title/body/subtitle placeholders).
                                lookupInherited(inheritedPh, phType, phIdx)?.let { geom = it }
                            }

                            val skip = renderOnlyBackgroundShapes && (phType != null || phIdx != null) && !hasText
                            if (!skip) {
                                val style = StringBuilder()
                                if (shapeBgColor != null) style.append("background-color:$shapeBgColor;")
                                if (shapeType == "ellipse") style.append("border-radius:50%;")
                                else if (shapeType == "roundRect") style.append("border-radius:12px;")
                                geom?.let {
                                    style.append("left:${px(it.x)}px;top:${px(it.y)}px;width:${px(it.w)}px;height:${px(it.h)}px;")
                                }
                                if (currentAlign != null) style.append("text-align:$currentAlign;")
                                html.append("<div class='shape' style='$style'>")
                            } else {
                                html.append("<!--placeholder-skip-->")
                            }
                        }
                        "sp", "pic", "cxnSp" -> {
                            val skip = renderOnlyBackgroundShapes && (phType != null || phIdx != null) && !hasText
                            html.append(if (skip) "" else "</div>")
                        }
                        "graphicFrame" -> html.append("</div>")
                        "grpSp" -> if (groupStack.isNotEmpty()) groupStack.removeLast()
                        "rPr", "defRPr" -> inRPr = false
                        "pPr" -> inPPr = false
                        "p" -> html.append("</div>")
                    }
                }
            }
            // nextText() already advances past the end tag of "t"; avoid double-advancing.
            event = if (event == XmlPullParser.START_TAG && parser.name == "t") parser.eventType else parser.next()
        }
        return ShapeTreeResult(html.toString(), slideBgColor)
    }

    // ---------- image handling (keeps alpha for PNG, fixes bug #7) ----------

    private fun downsampleImageToBase64(file: File): Pair<String, String>? {
        val isPng = file.extension.lowercase() in setOf("png", "gif", "bmp")
        val format = if (isPng) Bitmap.CompressFormat.PNG else Bitmap.CompressFormat.JPEG
        val mime = if (isPng) "image/png" else "image/jpeg"

        val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(file.absolutePath, options)
        if (options.outWidth <= 0 || options.outHeight <= 0) return null // unsupported (e.g. WMF/EMF)

        val reqWidth = 1600
        val reqHeight = 1600
        var inSampleSize = 1
        if (options.outHeight > reqHeight || options.outWidth > reqWidth) {
            val halfHeight = options.outHeight / 2
            val halfWidth = options.outWidth / 2
            while ((halfHeight / inSampleSize) >= reqHeight && (halfWidth / inSampleSize) >= reqWidth) {
                inSampleSize *= 2
            }
        }

        val decodeOptions = BitmapFactory.Options().apply { this.inSampleSize = inSampleSize }
        val bitmap = BitmapFactory.decodeFile(file.absolutePath, decodeOptions) ?: return null
        val outputStream = ByteArrayOutputStream()
        bitmap.compress(format, if (isPng) 100 else 85, outputStream)
        val bytes = outputStream.toByteArray()
        bitmap.recycle()
        return mime to Base64.encodeToString(bytes, Base64.NO_WRAP)
    }

    private fun resolveThemeColor(scheme: String): String? = when (scheme) {
        "tx1", "dk1" -> "#000000"
        "bg1", "lt1" -> "#FFFFFF"
        "tx2", "dk2" -> "#1F497D"
        "bg2", "lt2" -> "#EEECE1"
        "accent1" -> "#4F81BD"
        "accent2" -> "#C0504D"
        "accent3" -> "#9BBB59"
        "accent4" -> "#8064A2"
        "accent5" -> "#4BACC6"
        "accent6" -> "#F79646"
        "hlink" -> "#0000FF"
        "folHlink" -> "#800080"
        else -> null
    }
}