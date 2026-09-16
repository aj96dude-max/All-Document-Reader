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
import kotlin.math.roundToInt

class PptxParser : DocumentParser {

    private data class RelInfo(val type: String, val target: File)
    private data class ShapeGeom(val x: Double, val y: Double, val w: Double, val h: Double)

    private data class PhKey(val type: String?, val idx: String?) {
        fun candidates(): List<String> = listOfNotNull(
            if (type != null && idx != null) "$type#$idx" else null,
            if (type != null) "type:$type" else null,
            if (idx != null) "idx:$idx" else null
        )
    }

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
            var slideWidthPx = 960.0
            var slideHeightPx = 540.0
            
            try {
                tempDir.mkdirs()
                extractZip(context, inputUri, tempDir)

                val factory = XmlPullParserFactory.newInstance()
                factory.isNamespaceAware = true

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

                val slidesDir = File(tempDir, "ppt/slides")
                val slideRelsDir = File(tempDir, "ppt/slides/_rels")
                val mediaDir = File(tempDir, "ppt/media")

                val slideFiles = (slidesDir.listFiles { _, name -> name.startsWith("slide") && name.endsWith(".xml") }
                    ?: emptyArray()).sortedBy {
                    it.name.substringAfter("slide").substringBefore(".xml").toIntOrNull() ?: 0
                }

                val themeColorMap = parseThemeColors(File(tempDir, "ppt/theme/theme1.xml"), factory)

                val pagesFlow = flow {
                    try {
                        for (slideFile in slideFiles) {
                            val slideRels = parseRels(File(slideRelsDir, slideFile.name + ".rels"), slideFile.parentFile ?: tempDir)

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
                            val inheritedPh = masterPh + layoutPh

                            var masterBgColor: String? = null
                            var masterShapes = emptyList<SlideShape>()
                            if (masterFile != null && masterFile.exists()) {
                                val result = parseShapeTree(
                                    FileInputStream(masterFile), factory, themeColorMap, masterRels, mediaDir,
                                    inheritedPh = emptyMap(), slideW = slideWidthPx, slideH = slideHeightPx,
                                    renderOnlyBackgroundShapes = true
                                )
                                masterShapes = result.shapes
                                masterBgColor = result.bgColor
                            }

                            val slideResult = parseShapeTree(
                                FileInputStream(slideFile), factory, themeColorMap, slideRels, mediaDir,
                                inheritedPh = inheritedPh, slideW = slideWidthPx, slideH = slideHeightPx,
                                renderOnlyBackgroundShapes = false
                            )

                            val finalBg = slideResult.bgColor ?: masterBgColor ?: "#FFFFFF"

                            val allShapes = mutableListOf<SlideShape>()
                            allShapes.add(SlideShape.Rectangle(0.0, 0.0, slideWidthPx, slideHeightPx, bgColor = finalBg))
                            allShapes.addAll(masterShapes)
                            allShapes.addAll(slideResult.shapes)
                            
                            emit(allShapes.toList())
                        }
                    } finally {
                        tempDir.deleteRecursively()
                    }
                }

                UnifiedDocumentState.PagedState(pagesFlow, slideWidthPx, slideHeightPx)
            } catch (e: Exception) {
                e.printStackTrace()
                // In case of error before returning the flow, we must cleanup
                tempDir.deleteRecursively()
                throw e
            }
        }
    }

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
        } catch (_: Exception) {}
        return themeColorMap
    }

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

    private data class ShapeTreeResult(val shapes: List<SlideShape>, val bgColor: String?)

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
        var inDefRPr = false
        var inStyle = false
        
        var defFontPt: Double? = null
        var defTextColor: String? = null
        var defIsBold = false
        var defIsItalic = false
        var defIsUnderline = false

        var slideBgColor: String? = null

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
        val shapes = mutableListOf<SlideShape>()
        
        var currentShapeGeom: ShapeGeom? = null
        val currentParagraphs = mutableListOf<SlideShape.TextBlock.Paragraph>()
        var currentImageFile: java.io.File? = null
        var currentMimeType: String? = null
        var currentRuns = mutableListOf<SlideShape.TextBlock.Run>()

        fun toAbs(x: Double, y: Double, w: Double, h: Double): ShapeGeom {
            return if (groupStack.isEmpty()) ShapeGeom(x, y, w, h) else groupStack.last().apply(x, y, w, h)
        }

        while (event != XmlPullParser.END_DOCUMENT) {
            when (event) {
                XmlPullParser.START_TAG -> {
                    when (val tag = parser.name) {
                        "bg" -> inBg = true
                        "spPr", "xfrm" -> inSpPr = true
                        "grpSpPr" -> inGrpSpPr = true
                        "style" -> inStyle = true
                        "ph" -> {
                            phType = parser.getAttributeValue(null, "type")
                            phIdx = parser.getAttributeValue(null, "idx")
                        }
                        "srgbClr" -> {
                            parser.getAttributeValue(null, "val")?.let { v ->
                                val hex = "#$v"
                                if (inBg) slideBgColor = hex
                                else if (inRPr) currentTextColor = hex
                                else if (inDefRPr) defTextColor = hex
                                else if (inSpPr || inStyle) shapeBgColor = hex
                            }
                        }
                        "schemeClr" -> {
                            parser.getAttributeValue(null, "val")?.let { schemeVal ->
                                val resolved = themeColorMap[schemeVal] ?: resolveThemeColor(schemeVal)
                                if (resolved != null) {
                                    if (inBg) slideBgColor = resolved
                                    else if (inRPr) currentTextColor = resolved
                                    else if (inDefRPr) defTextColor = resolved
                                    else if (inSpPr || inStyle) shapeBgColor = resolved
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
                            currentShapeGeom = null
                            currentParagraphs.clear()
                            currentImageFile = null
                            currentMimeType = null
                        }
                        "grpSp" -> {
                            offX = null; offY = null; extW = null; extH = null
                            chOffX = 0.0; chOffY = 0.0; chExtW = 0.0; chExtH = 0.0
                        }
                        "p" -> {
                            currentAlign = null
                            currentRuns = mutableListOf()
                            defFontPt = null
                            defTextColor = null
                            defIsBold = false
                            defIsItalic = false
                            defIsUnderline = false
                        }
                        "r" -> {
                            isBold = defIsBold; isItalic = defIsItalic; isUnderline = defIsUnderline
                            currentTextColor = defTextColor; currentFontPt = defFontPt
                        }
                        "br" -> {
                            currentParagraphs.add(SlideShape.TextBlock.Paragraph(currentRuns.toList(), currentAlign))
                            currentRuns = mutableListOf()
                        }
                        "rPr" -> {
                            inRPr = true
                            for (i in 0 until parser.attributeCount) {
                                when (parser.getAttributeName(i)) {
                                    "b" -> if (parser.getAttributeValue(i) == "1") isBold = true
                                    "i" -> if (parser.getAttributeValue(i) == "1") isItalic = true
                                    "u" -> if (parser.getAttributeValue(i) != "none") isUnderline = true
                                    "sz" -> parser.getAttributeValue(i).toIntOrNull()?.let { currentFontPt = it / 100.0 }
                                }
                            }
                        }
                        "defRPr" -> {
                            inDefRPr = true
                            for (i in 0 until parser.attributeCount) {
                                when (parser.getAttributeName(i)) {
                                    "b" -> if (parser.getAttributeValue(i) == "1") defIsBold = true
                                    "i" -> if (parser.getAttributeValue(i) == "1") defIsItalic = true
                                    "u" -> if (parser.getAttributeValue(i) != "none") defIsUnderline = true
                                    "sz" -> parser.getAttributeValue(i).toIntOrNull()?.let { defFontPt = it / 100.0 }
                                }
                            }
                        }
                        "pPr" -> {
                            inPPr = true
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
                            currentRuns.add(SlideShape.TextBlock.Run(
                                text = text,
                                color = currentTextColor,
                                fontSizePt = currentFontPt,
                                isBold = isBold,
                                isItalic = isItalic,
                                isUnderline = isUnderline
                            ))
                        }
                        "blip" -> {
                            var embedId: String? = null
                            for (i in 0 until parser.attributeCount) {
                                val attrName = parser.getAttributeName(i)
                                if (attrName == "embed" || attrName.endsWith(":embed")) {
                                    embedId = parser.getAttributeValue(i)
                                    break
                                }
                            }
                            val target = embedId?.let { rels[it]?.target }
                            if (target != null && target.exists()) {
                                val isPng = target.extension.lowercase() in setOf("png", "gif", "bmp")
                                currentMimeType = if (isPng) "image/png" else "image/jpeg"
                                currentImageFile = target
                            }
                        }
                    }
                }
                XmlPullParser.END_TAG -> {
                    when (parser.name) {
                        "bg" -> inBg = false
                        "grpSpPr" -> {
                            inGrpSpPr = false
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
                        "spPr", "xfrm" -> {
                            inSpPr = false
                            var geom: ShapeGeom? = if (offX != null && offY != null && extW != null && extH != null) {
                                toAbs(offX!!, offY!!, extW!!, extH!!)
                            } else null

                            if (geom == null) {
                                lookupInherited(inheritedPh, phType, phIdx)?.let { geom = it }
                            }
                            currentShapeGeom = geom

                            val skip = renderOnlyBackgroundShapes && (phType != null || phIdx != null) && !hasText
                            if (!skip && geom != null) {
                                if (shapeType == "ellipse") {
                                    shapes.add(SlideShape.Ellipse(geom!!.x, geom!!.y, geom!!.w, geom!!.h, shapeBgColor))
                                } else if (shapeType == "roundRect") {
                                    shapes.add(SlideShape.Rectangle(geom!!.x, geom!!.y, geom!!.w, geom!!.h, shapeBgColor, 12.0))
                                } else if (shapeBgColor != null) {
                                    shapes.add(SlideShape.Rectangle(geom!!.x, geom!!.y, geom!!.w, geom!!.h, shapeBgColor, null))
                                }
                            }
                        }
                        "p" -> {
                            if (currentRuns.isNotEmpty()) {
                                currentParagraphs.add(SlideShape.TextBlock.Paragraph(currentRuns.toList(), currentAlign))
                                currentRuns = mutableListOf()
                            }
                        }
                        "sp", "graphicFrame", "cxnSp" -> {
                            val skip = renderOnlyBackgroundShapes && (phType != null || phIdx != null) && !hasText
                            if (!skip && currentShapeGeom != null && currentParagraphs.isNotEmpty()) {
                                shapes.add(SlideShape.TextBlock(
                                    x = currentShapeGeom!!.x, y = currentShapeGeom!!.y,
                                    w = currentShapeGeom!!.w, h = currentShapeGeom!!.h,
                                    paragraphs = currentParagraphs.toList()
                                ))
                            }
                            currentParagraphs.clear()
                        }
                        "pic" -> {
                            val skip = renderOnlyBackgroundShapes && (phType != null || phIdx != null) && !hasText
                            if (!skip && currentShapeGeom != null && currentImageFile != null && currentMimeType != null) {
                                shapes.add(SlideShape.Image(
                                    x = currentShapeGeom!!.x, y = currentShapeGeom!!.y,
                                    w = currentShapeGeom!!.w, h = currentShapeGeom!!.h,
                                    imageFile = currentImageFile!!,
                                    mimeType = currentMimeType!!
                                ))
                            }
                            currentImageFile = null
                            currentMimeType = null
                        }
                        "grpSp" -> if (groupStack.isNotEmpty()) groupStack.removeLast()
                        "rPr" -> inRPr = false
                        "defRPr" -> inDefRPr = false
                        "pPr" -> inPPr = false
                        "style" -> inStyle = false
                    }
                }
            }
            event = if (event == XmlPullParser.START_TAG && parser.name == "t") parser.eventType else parser.next()
        }
        return ShapeTreeResult(shapes, slideBgColor)
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
