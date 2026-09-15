package com.example.docx2pdf.parser

import android.content.Context
import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.apache.poi.hssf.usermodel.HSSFWorkbook
import org.apache.poi.ss.usermodel.CellType
import org.apache.poi.ss.usermodel.DateUtil

class XlsParser : DocumentParser {
    override suspend fun parse(context: Context, inputUri: Uri): UnifiedDocumentState {
        return withContext(Dispatchers.IO) {
            val htmlBuilder = java.lang.StringBuilder()
            htmlBuilder.append("<!DOCTYPE html><html><head><meta charset=\"UTF-8\">")
            htmlBuilder.append("<style>")
            htmlBuilder.append("body { font-family: sans-serif; margin: 10px; font-size: 9px; } ")
            htmlBuilder.append("table { border-collapse: collapse; table-layout: auto; margin-bottom: 20px; } ")
            htmlBuilder.append("th, td { border: 1px solid #d0d7de; padding: 3px 6px; text-align: left; vertical-align: top; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; } ")
            htmlBuilder.append("th { background-color: #f0f3f6; font-weight: bold; } ")
            htmlBuilder.append("tr:nth-child(even) { background-color: #f9fafb; } ")
            htmlBuilder.append("h2 { font-size: 12px; margin-top: 14px; margin-bottom: 6px; color: #333; }")
            htmlBuilder.append("</style></head><body>")

            context.contentResolver.openInputStream(inputUri)?.use { stream ->
                val workbook = HSSFWorkbook(stream)
                val sheetCount = workbook.numberOfSheets
                
                for (i in 0 until sheetCount) {
                    val sheet = workbook.getSheetAt(i)
                    val sheetName = sheet.sheetName ?: "Sheet ${i + 1}"
                    htmlBuilder.append("<h2>").append(escapeHtml(sheetName)).append("</h2>")
                    htmlBuilder.append("<table>")
                    
                    for (row in sheet) {
                        htmlBuilder.append("<tr>")
                        
                        val lastCellNum = if (row.lastCellNum.toInt() > 0) row.lastCellNum.toInt() else 0
                        for (c in 0 until lastCellNum) {
                            val cell = row.getCell(c)
                            if (cell == null) {
                                htmlBuilder.append("<td></td>")
                            } else {
                                val cellValue = when (cell.cellType) {
                                    CellType.STRING -> cell.stringCellValue
                                    CellType.NUMERIC -> {
                                        if (DateUtil.isCellDateFormatted(cell)) {
                                            cell.dateCellValue?.toString() ?: ""
                                        } else {
                                            val value = cell.numericCellValue
                                            // Strip trailing .0 if integer
                                            if (value == value.toLong().toDouble()) {
                                                value.toLong().toString()
                                            } else {
                                                value.toString()
                                            }
                                        }
                                    }
                                    CellType.BOOLEAN -> cell.booleanCellValue.toString()
                                    CellType.FORMULA -> {
                                        try {
                                            cell.stringCellValue
                                        } catch (e: Exception) {
                                            try {
                                                val value = cell.numericCellValue
                                                if (value == value.toLong().toDouble()) {
                                                    value.toLong().toString()
                                                } else {
                                                    value.toString()
                                                }
                                            } catch (e2: Exception) {
                                                cell.cellFormula
                                            }
                                        }
                                    }
                                    else -> ""
                                }
                                htmlBuilder.append("<td>").append(escapeHtml(cellValue)).append("</td>")
                            }
                        }
                        htmlBuilder.append("</tr>")
                    }
                    htmlBuilder.append("</table>")
                }
                workbook.close()
            }
            
            htmlBuilder.append("</body></html>")
            
            UnifiedDocumentState.HtmlState(
                htmlContent = htmlBuilder.toString(),
                landscape = true
            )
        }
    }

    private fun escapeHtml(text: String?): String {
        if (text == null) return ""
        return text.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#039;")
    }
}
