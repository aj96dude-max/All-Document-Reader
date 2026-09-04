package com.example.docx2pdf.parser

import android.content.Context
import android.net.Uri
import android.webkit.MimeTypeMap
import java.util.Locale

/**
 * Factory for creating DocumentParsers based on the file extension or MIME type.
 */
object DocumentParserFactory {
    fun createParser(context: Context, uri: Uri): DocumentParser {
        val extension = getExtension(context, uri).lowercase(Locale.ROOT)
        
        return when (extension) {
            "txt", "tex", "json", "xml", "java", "kt", "py", "c", "cpp", "html", "js", "css", 
            "yaml", "yml", "sh", "swift", "rb", "go", "rs", "php" -> PlainTextParser(isMonospace = (extension != "txt" && extension != "tex"))
            "csv", "tsv" -> DelimitedParser(delimiter = if (extension == "csv") "," else "\t")
            "rtf" -> RichTextParser()
            "md" -> MarkdownParser()
            "docx" -> DocxParser()
            "pptx" -> PptxParser()
            "xlsx" -> XlsxParser()
            "epub" -> EpubParser()
            "pdf" -> PdfParser()
            "jpg", "jpeg", "png", "webp", "bmp", "gif" -> ImageParser()
            "ppt", "xls" -> throw IllegalArgumentException("The older binary format is not supported. Please use the modern .pptx or .xlsx format.")
            else -> {
                throw IllegalArgumentException("Unsupported file format: .$extension")
            }
        }
    }

    private fun getExtension(context: Context, uri: Uri): String {
        val contentResolver = context.contentResolver
        
        // 1. Try querying the Display Name from SAF
        if (uri.scheme == "content") {
            try {
                contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                    if (cursor.moveToFirst()) {
                        val index = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                        if (index != -1) {
                            val displayName = cursor.getString(index)
                            if (displayName != null && displayName.contains(".")) {
                                return displayName.substringAfterLast('.')
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                // Ignore and fall back
            }
        }

        // 2. Try MimeTypeMap
        val mimeType = contentResolver.getType(uri)
        if (mimeType != null) {
            val extension = MimeTypeMap.getSingleton().getExtensionFromMimeType(mimeType)
            if (extension != null) {
                return extension
            }
        }
        
        // 3. Fallback to checking the URI path
        val path = uri.path ?: return ""
        val dotIndex = path.lastIndexOf('.')
        return if (dotIndex >= 0) {
            path.substring(dotIndex + 1)
        } else {
            ""
        }
    }
}
