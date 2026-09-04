package com.example.docx2pdf.parser

import android.content.Context
import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.InputStreamReader

/**
 * A parser for RTF (.rtf) files.
 * Uses a lightweight state machine to extract raw text and ignore RTF control structures
 * like font tables and style sheets, maintaining a low memory footprint.
 */
class RichTextParser : DocumentParser {
    override suspend fun parse(context: Context, inputUri: Uri): UnifiedDocumentState {
        return withContext(Dispatchers.IO) {
            val flow = flow {
                val inputStream = context.contentResolver.openInputStream(inputUri)
                    ?: throw IllegalArgumentException("Could not open InputStream for $inputUri")
                
                inputStream.use { stream ->
                    BufferedReader(InputStreamReader(stream)).use { reader ->
                        var depth = 0
                        var ignoredDepth = -1
                        val lineBuffer = java.lang.StringBuilder()
                        
                        var isBold = false
                        var isItalic = false

                        var charCode = reader.read()
                        while (charCode != -1) {
                            val c = charCode.toChar()
                            
                            if (c == '{') {
                                depth++
                                charCode = reader.read()
                            } else if (c == '}') {
                                if (depth == ignoredDepth) {
                                    ignoredDepth = -1
                                }
                                depth--
                                charCode = reader.read()
                            } else if (c == '\\') {
                                charCode = reader.read()
                                if (charCode != -1) {
                                    val nextC = charCode.toChar()
                                    if (nextC == '{' || nextC == '}' || nextC == '\\') {
                                        if (ignoredDepth == -1) lineBuffer.append(nextC)
                                        charCode = reader.read()
                                    } else if (nextC == '\'') {
                                        // Hex char skip (e.g. \'e4)
                                        reader.read() // char 1
                                        charCode = reader.read() // char 2
                                        if (charCode != -1) {
                                            charCode = reader.read() // move to next
                                        }
                                    } else if (nextC == '*') {
                                        // Destination group
                                        if (ignoredDepth == -1) ignoredDepth = depth
                                        charCode = reader.read()
                                    } else if (nextC == '\n' || nextC == '\r') {
                                        // escaped newline, ignore
                                        charCode = reader.read()
                                    } else {
                                        // Control word
                                        val cwBuilder = StringBuilder()
                                        while (charCode != -1 && charCode.toChar().isLetter()) {
                                            cwBuilder.append(charCode.toChar())
                                            charCode = reader.read()
                                        }
                                        
                                        // Capture optional numeric parameter
                                        val paramBuilder = StringBuilder()
                                        if (charCode != -1 && charCode.toChar() == '-') {
                                            paramBuilder.append('-')
                                            charCode = reader.read()
                                        }
                                        while (charCode != -1 && charCode.toChar().isDigit()) {
                                            paramBuilder.append(charCode.toChar())
                                            charCode = reader.read()
                                        }
                                        val param = paramBuilder.toString()
                                        
                                        // Space is consumed if it acts as a delimiter
                                        if (charCode != -1 && charCode.toChar() == ' ') {
                                            charCode = reader.read()
                                        }

                                        val cw = cwBuilder.toString()
                                        if (ignoredDepth == -1) {
                                            when (cw) {
                                                "par", "line", "row" -> {
                                                    if (lineBuffer.isNotEmpty()) {
                                                        emit(DocumentElement.TextLine(lineBuffer.toString(), isBold, isItalic))
                                                        lineBuffer.clear()
                                                    } else {
                                                        emit(DocumentElement.TextLine("", isBold, isItalic)) // Empty line
                                                    }
                                                }
                                                "tab" -> lineBuffer.append("\t")
                                                "b" -> isBold = param != "0"
                                                "i" -> isItalic = param != "0"
                                                "fonttbl", "colortbl", "stylesheet", "info", "pict", "xmlnstbl", "listtable", "listoverridetable" -> {
                                                    ignoredDepth = depth
                                                }
                                            }
                                        }
                                    }
                                }
                            } else if (c == '\n' || c == '\r') {
                                // RTF ignores literal newlines in the file
                                charCode = reader.read()
                            } else {
                                if (ignoredDepth == -1) {
                                    lineBuffer.append(c)
                                }
                                charCode = reader.read()
                            }
                        }
                        
                        // Emit any remaining text
                        if (lineBuffer.isNotEmpty()) {
                            emit(DocumentElement.TextLine(lineBuffer.toString(), isBold, isItalic))
                        }
                    }
                }
            }
            UnifiedDocumentState.StreamState(flow)
        }
    }
}
