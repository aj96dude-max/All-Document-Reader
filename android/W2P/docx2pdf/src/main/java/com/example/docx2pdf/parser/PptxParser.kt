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

/**
 * Parses .pptx files directly into HTML format.
 * This extracts slides, text styling, and images without external dependencies.
 */
class PptxParser : DocumentParser {
    override suspend fun parse(context: Context, inputUri: Uri): UnifiedDocumentState {
        return withContext(Dispatchers.IO) {
            val tempDir = File(context.cacheDir, "pptx_temp_${System.currentTimeMillis()}")
            try {
                tempDir.mkdirs()
                
                // 1. Unzip the file securely
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
                                    FileOutputStream(destFile).use { fos ->
                                        zis.copyTo(fos)
                                    }
                                }
                            }
                            zis.closeEntry()
                            entry = zis.nextEntry
                        }
                    }
                }
                
                val slidesDir = File(tempDir, "ppt/slides")
                val relsDir = File(tempDir, "ppt/slides/_rels")
                val mediaDir = File(tempDir, "ppt/media")
                
                val slideFiles = slidesDir.listFiles { _, name -> name.startsWith("slide") && name.endsWith(".xml") } 
                    ?: emptyArray()
                    
                // Sort slides by number
                slideFiles.sortBy { 
                    it.name.substringAfter("slide").substringBefore(".xml").toIntOrNull() ?: 0 
                }
                
                val factory = XmlPullParserFactory.newInstance()
                factory.isNamespaceAware = true
                
                val htmlBuilder = java.lang.StringBuilder()
                htmlBuilder.append("<html><head><style>")
                htmlBuilder.append("body { font-family: sans-serif; margin: 0; padding: 0; }")
                htmlBuilder.append(".slide { border-bottom: 2px solid #ccc; padding: 20px; page-break-after: always; text-align: center; }")
                htmlBuilder.append(".shape { margin: 15px auto; padding: 15px; max-width: 90%; }")
                htmlBuilder.append(".text-block { margin: 10px 0; font-size: 16px; }")
                htmlBuilder.append(".img-container { margin: 10px 0; }")
                htmlBuilder.append("img { max-width: 100%; max-height: 800px; object-fit: contain; }")
                htmlBuilder.append("</style></head><body>")
                
                for (slideFile in slideFiles) {
                    
                    // Parse rels for this slide
                    val relsFile = File(relsDir, "${slideFile.name}.rels")
                    val relsMap = mutableMapOf<String, String>()
                    if (relsFile.exists()) {
                        val relsParser = factory.newPullParser()
                        relsParser.setInput(FileInputStream(relsFile), "UTF-8")
                        var event = relsParser.eventType
                        while (event != XmlPullParser.END_DOCUMENT) {
                            if (event == XmlPullParser.START_TAG && relsParser.name == "Relationship") {
                                val id = relsParser.getAttributeValue(null, "Id")
                                val target = relsParser.getAttributeValue(null, "Target")
                                if (id != null && target != null) {
                                    relsMap[id] = target
                                }
                            }
                            event = relsParser.next()
                        }
                    }
                    
                    // Parse slide XML
                    val slideParser = factory.newPullParser()
                    slideParser.setInput(FileInputStream(slideFile), "UTF-8")
                    
                    var event = slideParser.eventType
                    var inBg = false
                    var inSpPr = false
                    var inRPr = false
                    
                    var slideBgColor: String? = null
                    var currentShapeBgColor: String? = null
                    var currentShapeType: String? = null
                    var currentTextColor: String? = null
                    
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
                                        val hexColor = "#$colorVal"
                                        if (inBg) slideBgColor = hexColor
                                        else if (inSpPr) currentShapeBgColor = hexColor
                                        else if (inRPr) currentTextColor = hexColor
                                    }
                                } else if (tagName == "schemeClr") {
                                    val schemeVal = slideParser.getAttributeValue(null, "val")
                                    if (schemeVal != null) {
                                        val resolved = resolveThemeColor(schemeVal)
                                        if (resolved != null) {
                                            if (inBg) slideBgColor = resolved
                                            else if (inSpPr) currentShapeBgColor = resolved
                                            else if (inRPr) currentTextColor = resolved
                                        }
                                    }
                                } else if (tagName == "prstGeom" && inSpPr) {
                                    currentShapeType = slideParser.getAttributeValue(null, "prst")
                                } else if (tagName == "sp" || tagName == "pic" || tagName == "graphicFrame") {
                                    // Reset shape properties when a new visual element starts
                                    currentShapeBgColor = null
                                    currentShapeType = null
                                } else if (tagName == "txBody") {
                                    // txBody contains paragraphs for a shape. We can open the shape div here.
                                    val shapeStyle = StringBuilder()
                                    if (currentShapeBgColor != null) shapeStyle.append("background-color: $currentShapeBgColor; ")
                                    if (currentShapeType == "ellipse") shapeStyle.append("border-radius: 50%; ")
                                    else if (currentShapeType == "roundRect") shapeStyle.append("border-radius: 15px; ")
                                    
                                    if (shapeStyle.isNotEmpty()) {
                                        slideHtml.append("<div class='shape' style='$shapeStyle'>")
                                    } else {
                                        slideHtml.append("<div class='shape'>")
                                    }
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
                                    if (isBold) styledText = "<b>$styledText</b>"
                                    if (isItalic) styledText = "<i>$styledText</i>"
                                    if (currentTextColor != null) {
                                        styledText = "<span style='color: $currentTextColor;'>$styledText</span>"
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
                                                    slideHtml.append("<div class='img-container'><img src='data:image/jpeg;base64,$base64' /></div>")
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            XmlPullParser.END_TAG -> {
                                val tagName = slideParser.name
                                if (tagName == "bg") inBg = false
                                else if (tagName == "spPr") inSpPr = false
                                else if (tagName == "rPr") inRPr = false
                                else if (tagName == "txBody") {
                                    slideHtml.append("</div>") // Close the shape div
                                } else if (tagName == "p") {
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
                    
                    val slideContainerStyle = if (slideBgColor != null) "background-color: $slideBgColor;" else ""
                    htmlBuilder.append("<div class='slide' style='$slideContainerStyle'>")
                    htmlBuilder.append(slideHtml.toString())
                    htmlBuilder.append("</div>")
                }
                
                htmlBuilder.append("</body></html>")
                
                if (slideFiles.isEmpty()) {
                    htmlBuilder.append("<p>No slides found.</p>")
                }
                
                UnifiedDocumentState.HtmlState(htmlBuilder.toString())
                
            } catch (e: Exception) {
                e.printStackTrace()
                UnifiedDocumentState.HtmlState("<html><body><p>Error parsing presentation: ${e.message}</p></body></html>")
            } finally {
                tempDir.deleteRecursively()
            }
        }
    }

    private fun downsampleImageToBase64(file: File): String? {
        val options = BitmapFactory.Options()
        options.inJustDecodeBounds = true
        BitmapFactory.decodeFile(file.absolutePath, options)
        
        val reqWidth = 1024
        val reqHeight = 1024
        
        var inSampleSize = 1
        if (options.outHeight > reqHeight || options.outWidth > reqWidth) {
            val halfHeight = options.outHeight / 2
            val halfWidth = options.outWidth / 2
            while ((halfHeight / inSampleSize) >= reqHeight && (halfWidth / inSampleSize) >= reqWidth) {
                inSampleSize *= 2
            }
        }
        
        options.inJustDecodeBounds = false
        options.inSampleSize = inSampleSize
        
        val bitmap = BitmapFactory.decodeFile(file.absolutePath, options) ?: return null
        val outputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 80, outputStream)
        val bytes = outputStream.toByteArray()
        bitmap.recycle()
        return Base64.encodeToString(bytes, Base64.NO_WRAP)
    }

    private fun resolveThemeColor(scheme: String): String? {
        return when (scheme) {
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
}
