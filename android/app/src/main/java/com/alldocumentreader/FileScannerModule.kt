package com.alldocumentreader

import android.content.ContentResolver
import android.database.Cursor
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import com.facebook.react.bridge.*

class FileScannerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "FileScannerModule"

    private fun getMimeTypesForFileType(fileType: String): List<String> {
        return when (fileType) {
            "all" -> listOf(
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/vnd.ms-excel",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.ms-powerpoint",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                "text/plain",
                "application/epub+zip",
                "application/rtf",
                "text/rtf"
            )
            "pdf" -> listOf("application/pdf")
            "word" -> listOf(
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            )
            "excel" -> listOf(
                "application/vnd.ms-excel",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
            "ppt" -> listOf(
                "application/vnd.ms-powerpoint",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation"
            )
            "txt" -> listOf("text/plain")
            "epub" -> listOf("application/epub+zip")
            "rtf" -> listOf("application/rtf", "text/rtf")
            else -> emptyList()
        }
    }

    private fun getExtensionFromMime(mimeType: String): String {
        return when (mimeType) {
            "application/pdf" -> "pdf"
            "application/msword" -> "doc"
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" -> "docx"
            "application/vnd.ms-excel" -> "xls"
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" -> "xlsx"
            "application/vnd.ms-powerpoint" -> "ppt"
            "application/vnd.openxmlformats-officedocument.presentationml.presentation" -> "pptx"
            "text/plain" -> "txt"
            "application/epub+zip" -> "epub"
            "application/rtf", "text/rtf" -> "rtf"
            else -> ""
        }
    }

    @ReactMethod
    fun scanFiles(fileType: String, promise: Promise) {
        try {
            val mimeTypes = getMimeTypesForFileType(fileType)
            if (mimeTypes.isEmpty()) {
                promise.resolve(Arguments.createArray())
                return
            }

            val contentResolver: ContentResolver = reactApplicationContext.contentResolver
            val uri: Uri = MediaStore.Files.getContentUri("external")

            val projection = arrayOf(
                MediaStore.Files.FileColumns._ID,
                MediaStore.Files.FileColumns.DISPLAY_NAME,
                MediaStore.Files.FileColumns.MIME_TYPE,
                MediaStore.Files.FileColumns.SIZE,
                MediaStore.Files.FileColumns.DATE_MODIFIED
            )

            // Build selection for MIME types
            val placeholders = mimeTypes.joinToString(",") { "?" }
            val selection = "${MediaStore.Files.FileColumns.MIME_TYPE} IN ($placeholders)"
            val selectionArgs = mimeTypes.toTypedArray()

            val sortOrder = "${MediaStore.Files.FileColumns.DATE_MODIFIED} DESC"

            val results: WritableArray = Arguments.createArray()

            val cursor: Cursor? = contentResolver.query(
                uri,
                projection,
                selection,
                selectionArgs,
                sortOrder
            )

            cursor?.use {
                val idColumn = it.getColumnIndexOrThrow(MediaStore.Files.FileColumns._ID)
                val nameColumn = it.getColumnIndexOrThrow(MediaStore.Files.FileColumns.DISPLAY_NAME)
                val mimeColumn = it.getColumnIndexOrThrow(MediaStore.Files.FileColumns.MIME_TYPE)
                val sizeColumn = it.getColumnIndexOrThrow(MediaStore.Files.FileColumns.SIZE)
                val dateColumn = it.getColumnIndexOrThrow(MediaStore.Files.FileColumns.DATE_MODIFIED)

                while (it.moveToNext()) {
                    val id = it.getLong(idColumn)
                    val name = it.getString(nameColumn) ?: "Unknown"
                    val mime = it.getString(mimeColumn) ?: ""
                    val size = it.getLong(sizeColumn)
                    val dateModified = it.getLong(dateColumn) * 1000 // Convert seconds to ms

                    val contentUri = Uri.withAppendedPath(
                        MediaStore.Files.getContentUri("external"),
                        id.toString()
                    )

                    val extension = getExtensionFromMime(mime)

                    val fileMap: WritableMap = Arguments.createMap().apply {
                        putString("id", id.toString())
                        putString("name", name)
                        putString("uri", contentUri.toString())
                        putString("mimeType", mime)
                        putString("extension", extension)
                        putDouble("size", size.toDouble())
                        putDouble("modifiedDate", dateModified.toDouble())
                    }

                    results.pushMap(fileMap)
                }
            }

            promise.resolve(results)
        } catch (e: Exception) {
            promise.reject("SCAN_ERROR", "Failed to scan files: ${e.message}", e)
        }
    }
}
