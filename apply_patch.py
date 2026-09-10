import sys
import re

with open('d:/Adroid_apps/react_native_project/AllDocumentReader/android/W2P/docx2pdf/src/main/java/com/example/docx2pdf/parser/PptxParser.kt', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update CSS
css_old = 'htmlBuilder.append(".shape { margin: 15px auto; padding: 15px; max-width: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; overflow: hidden; box-sizing: border-box; }")'
css_new = 'htmlBuilder.append(".shape { position: absolute; overflow: visible; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; box-sizing: border-box; }")'
content = content.replace(css_old, css_new)

# 2. Add slide dimension parsing & Master parsing
slide_files_setup_regex = r'(val slidesDir = File\(tempDir, "ppt/slides"\).*?val relsDir = File\(tempDir, "ppt/slides/_rels"\).*?val mediaDir = File\(tempDir, "ppt/media"\))'
setup_replacement = r'''\1
                
                // Parse presentation.xml for slide dimensions
                var slideWidthPx = 960
                var slideHeightPx = 540
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
                                    slideWidthPx = (cx / 9525).toInt()
                                    slideHeightPx = (cy / 9525).toInt()
                                }
                                break
                            }
                            pEvent = pParser.next()
                        }
                    } catch (e: Exception) {}
                }
'''
content = re.sub(slide_files_setup_regex, setup_replacement, content, flags=re.DOTALL)

# 3. Add the parseShapeTree helper function at the end of the class
helper_func = '''
    private fun parseShapeTree(
        inputStream: java.io.InputStream,
        factory: XmlPullParserFactory,
        themeColorMap: Map<String, String>,
        relsMap: Map<String, String>,
        mediaDir: File
    ): Pair<String, String?> {
        val slideParser = factory.newPullParser()
        slideParser.setInput(inputStream, "UTF-8")
        
        var event = slideParser.eventType
        var inBg = false
        var inSpPr = false
        var inRPr = false
        
        var slideBgColor: String? = null
        var currentShapeBgColor: String? = null
        var currentShapeType: String? = null
        var currentTextColor: String? = null
        var currentShapeWidthPx: Int? = null
        var currentShapeHeightPx: Int? = null
        var currentShapeLeftPx: Int? = null
        var currentShapeTopPx: Int? = null
        
        var isBold = false
        var isItalic = false
        var inParagraph = false
        var inRun = false
        
        val slideHtml = java.lang.StringBuilder()
        
        while (event != XmlPullParser.END_DOCUMENT) {
            when (event) {
                XmlPullParser.START_TAG -> {
                    val tagName = slideParser.name
                    if (tagName == "bg") inBg = true
                    else if (tagName == "spPr") inSpPr = true
                    else if (tagName == "rPr") inRPr = true
                    
                    if (tagName == "srgbClr") {
                        val colorVal = slideParser.getAttributeValue(null, "val")
                        if (colorVal != null) {
                            val hexColor = "#"
                            if (inBg) slideBgColor = hexColor
                            else if (inSpPr) currentShapeBgColor = hexColor
                            else if (inRPr) currentTextColor = hexColor
                        }
                    } else if (tagName == "schemeClr") {
                        val schemeVal = slideParser.getAttributeValue(null, "val")
                        if (schemeVal != null) {
                            val resolved = themeColorMap[schemeVal] ?: resolveThemeColor(schemeVal)
                            if (resolved != null) {
                                if (inBg) slideBgColor = resolved
                                else if (inSpPr) currentShapeBgColor = resolved
                                else if (inRPr) currentTextColor = resolved
                            }
                        }
                    } else if (tagName == "ext" && inSpPr) {
                        val cx = slideParser.getAttributeValue(null, "cx")?.toLongOrNull()
                        val cy = slideParser.getAttributeValue(null, "cy")?.toLongOrNull()
                        if (cx != null && cy != null) {
                            currentShapeWidthPx = (cx / 9525).toInt()
                            currentShapeHeightPx = (cy / 9525).toInt()
                        }
                    } else if (tagName == "off" && inSpPr) {
                        val x = slideParser.getAttributeValue(null, "x")?.toLongOrNull()
                        val y = slideParser.getAttributeValue(null, "y")?.toLongOrNull()
                        if (x != null && y != null) {
                            currentShapeLeftPx = (x / 9525).toInt()
                            currentShapeTopPx = (y / 9525).toInt()
                        }
                    } else if (tagName == "prstGeom" && inSpPr) {
                        currentShapeType = slideParser.getAttributeValue(null, "prst")
                    } else if (tagName == "sp" || tagName == "pic" || tagName == "graphicFrame" || tagName == "cxnSp" || tagName == "grpSp") {
                        currentShapeBgColor = null
                        currentShapeType = null
                        currentShapeWidthPx = null
                        currentShapeHeightPx = null
                        currentShapeLeftPx = null
                        currentShapeTopPx = null
                    } else if (tagName == "p") {
                        inParagraph = true
                        slideHtml.append("<div class='text-block'>")
                    } else if (tagName == "r") {
                        inRun = true
                        isBold = false
                        isItalic = false
                        currentTextColor = null
                    } else if (tagName == "rPr") {
                        for (i in 0 until slideParser.attributeCount) {
                            if (slideParser.getAttributeName(i) == "b" && slideParser.getAttributeValue(i) == "1") isBold = true
                            if (slideParser.getAttributeName(i) == "i" && slideParser.getAttributeValue(i) == "1") isItalic = true
                        }
                    } else if (tagName == "t") {
                        val text = slideParser.nextText()
                        var styledText = text.replace("<", "&lt;").replace(">", "&gt;")
                        if (isBold) styledText = "<b></b>"
                        if (isItalic) styledText = "<i></i>"
                        if (currentTextColor != null) {
                            styledText = "<span style='color: ;'></span>"
                        }
                        slideHtml.append(styledText)
                    } else if (tagName == "blip") {
                        var embedId: String? = null
                        for (i in 0 until slideParser.attributeCount) {
                            if (slideParser.getAttributeName(i) == "embed") {
                                embedId = slideParser.getAttributeValue(i)
                                break
                            }
                        }
                        if (embedId != null) {
                            val target = relsMap[embedId]
                            if (target != null) {
                                val imageName = target.substringAfterLast("/")
                                val imageFile = File(mediaDir, imageName)
                                if (imageFile.exists()) {
                                    val base64 = downsampleImageToBase64(imageFile)
                                    if (base64 != null) {
                                        slideHtml.append("<div class='img-container' style='width: 100%; height: 100%;'><img src='data:image/jpeg;base64,' style='width: 100%; height: 100%; object-fit: contain;' /></div>")
                                    }
                                }
                            }
                        }
                    }
                }
                XmlPullParser.END_TAG -> {
                    val tagName = slideParser.name
                    if (tagName == "bg") inBg = false
                    else if (tagName == "spPr") {
                        inSpPr = false
                        val shapeStyle = StringBuilder()
                        if (currentShapeBgColor != null) shapeStyle.append("background-color: ; ")
                        if (currentShapeType == "ellipse") shapeStyle.append("border-radius: 50%; ")
                        else if (currentShapeType == "roundRect") shapeStyle.append("border-radius: 15px; ")
                        if (currentShapeWidthPx != null) shapeStyle.append("width: px; ")
                        if (currentShapeHeightPx != null) shapeStyle.append("height: px; ")
                        if (currentShapeLeftPx != null) shapeStyle.append("left: px; top: px; ")
                        
                        if (shapeStyle.isNotEmpty()) {
                            slideHtml.append("<div class='shape' style=''>")
                        } else {
                            slideHtml.append("<div class='shape'>")
                        }
                    }
                    else if (tagName == "sp" || tagName == "pic" || tagName == "graphicFrame" || tagName == "cxnSp" || tagName == "grpSp") {
                        slideHtml.append("</div>")
                    }
                    else if (tagName == "rPr") inRPr = false
                    else if (tagName == "p") {
                        inParagraph = false
                        slideHtml.append("</div>")
                    } else if (tagName == "r") {
                        inRun = false
                    }
                }
            }
            if (event != XmlPullParser.START_TAG || slideParser.name != "t") {
               event = slideParser.next()
            } else {
               event = slideParser.eventType
            }
        }
        return Pair(slideHtml.toString(), slideBgColor)
    }
'''
content = content.replace('private fun downsampleImageToBase64', helper_func + '\n    private fun downsampleImageToBase64')

# 4. Replace the inner loop in the main parse method with calls to the helper
old_inner_loop_regex = r'(// Parse slide XML\s+val slideParser = factory\.newPullParser\(\).*?)val slideContainerStyle = if \(slideBgColor != null\) "background-color: \;" else ""'
new_inner_loop = '''// Parse Master Layout (for background banner and colors)
                    var masterHtml = ""
                    var masterBgColor: String? = null
                    val masterFile = File(tempDir, "ppt/slideMasters/slideMaster1.xml")
                    if (masterFile.exists()) {
                        val mrelsFile = File(tempDir, "ppt/slideMasters/_rels/slideMaster1.xml.rels")
                        val mRelsMap = mutableMapOf<String, String>()
                        if (mrelsFile.exists()) {
                            val mrParser = factory.newPullParser()
                            mrParser.setInput(FileInputStream(mrelsFile), "UTF-8")
                            var mre = mrParser.eventType
                            while (mre != XmlPullParser.END_DOCUMENT) {
                                if (mre == XmlPullParser.START_TAG && mrParser.name == "Relationship") {
                                    val id = mrParser.getAttributeValue(null, "Id")
                                    val target = mrParser.getAttributeValue(null, "Target")
                                    if (id != null && target != null) mRelsMap[id] = target
                                }
                                mre = mrParser.next()
                            }
                        }
                        val (mHtml, mBg) = parseShapeTree(FileInputStream(masterFile), factory, themeColorMap, mRelsMap, mediaDir)
                        masterHtml = mHtml
                        masterBgColor = mBg
                    }

                    // Parse slide XML
                    val (sHtml, sBgColor) = parseShapeTree(FileInputStream(slideFile), factory, themeColorMap, relsMap, mediaDir)
                    
                    val finalBgColor = sBgColor ?: masterBgColor
                    val slideContainerStyle = "position: relative; width: px; height: px; overflow: hidden; margin: 0 auto; " + 
                                              (if (finalBgColor != null) "background-color: ;" else "")
'''
content = re.sub(old_inner_loop_regex, new_inner_loop, content, flags=re.DOTALL)

# Update HTML append to include master HTML underneath slide HTML
content = content.replace("htmlBuilder.append(slideHtml.toString())", "htmlBuilder.append(masterHtml)\n                    htmlBuilder.append(sHtml)")

with open('d:/Adroid_apps/react_native_project/AllDocumentReader/android/W2P/docx2pdf/src/main/java/com/example/docx2pdf/parser/PptxParser.kt', 'w', encoding='utf-8') as f:
    f.write(content)

print("Migration applied successfully!")
