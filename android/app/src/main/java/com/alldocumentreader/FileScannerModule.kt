package com.alldocumentreader

import android.content.ContentResolver
import android.content.Intent
import android.database.Cursor
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.provider.Settings
import android.webkit.MimeTypeMap
import com.facebook.react.bridge.*
import java.io.File

class FileScannerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "FileScannerModule"

    // ── Permission helpers ──────────────────────────────────────────────

    @ReactMethod
    fun isAllFilesAccessGranted(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            promise.resolve(Environment.isExternalStorageManager())
        } else {
            // On Android 10 and below, READ_EXTERNAL_STORAGE is sufficient
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun requestAllFilesAccess(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            try {
                val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION).apply {
                    data = Uri.parse("package:${reactApplicationContext.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
            } catch (e: Exception) {
                // Fallback to generic all-files-access screen
                try {
                    val intent = Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    reactApplicationContext.startActivity(intent)
                    promise.resolve(true)
                } catch (e2: Exception) {
                    promise.reject("PERMISSION_ERROR", "Cannot open all-files-access settings", e2)
                }
            }
        } else {
            promise.resolve(true)
        }
    }

    // ── MIME / extension mapping ─────────────────────────────────────────

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

    private fun getExtensionsForFileType(fileType: String): Set<String> {
        return when (fileType) {
            "all" -> setOf("pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "epub", "rtf")
            "pdf" -> setOf("pdf")
            "word" -> setOf("doc", "docx")
            "excel" -> setOf("xls", "xlsx")
            "ppt" -> setOf("ppt", "pptx")
            "txt" -> setOf("txt")
            "epub" -> setOf("epub")
            "rtf" -> setOf("rtf")
            else -> emptySet()
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

    // ── Primary scan: MediaStore ─────────────────────────────────────────

    @ReactMethod
    fun scanFiles(fileType: String, promise: Promise) {
        try {
            val mimeTypes = getMimeTypesForFileType(fileType)
            if (mimeTypes.isEmpty()) {
                promise.resolve(Arguments.createArray())
                return
            }

            val results = scanViaMediaStore(mimeTypes)

            // If MediaStore returned nothing, try a filesystem walk as fallback
            if (results.size() == 0) {
                val fallbackResults = scanViaFileSystem(fileType)
                promise.resolve(fallbackResults)
            } else {
                promise.resolve(results)
            }
        } catch (e: Exception) {
            promise.reject("SCAN_ERROR", "Failed to scan files: ${e.message}", e)
        }
    }

    private fun scanViaMediaStore(mimeTypes: List<String>): WritableArray {
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

        return results
    }

    // ── Fallback scan: walk the filesystem ───────────────────────────────

    private fun scanViaFileSystem(fileType: String): WritableArray {
        val results: WritableArray = Arguments.createArray()
        val extensions = getExtensionsForFileType(fileType)
        if (extensions.isEmpty()) return results

        val searchRoots = mutableListOf<File>()

        // Common document directories
        val externalStorage = Environment.getExternalStorageDirectory()
        if (externalStorage.exists()) {
            searchRoots.add(externalStorage)
        }

        // Also check standard public directories explicitly
        val publicDirs = arrayOf(
            Environment.DIRECTORY_DOWNLOADS,
            Environment.DIRECTORY_DOCUMENTS
        )
        for (dir in publicDirs) {
            val d = Environment.getExternalStoragePublicDirectory(dir)
            if (d.exists() && !searchRoots.any { d.absolutePath.startsWith(it.absolutePath) }) {
                searchRoots.add(d)
            }
        }

        val foundFiles = mutableListOf<File>()
        val visited = mutableSetOf<String>()

        for (root in searchRoots) {
            walkDirectory(root, extensions, foundFiles, visited)
        }

        // Sort by modified date descending
        foundFiles.sortByDescending { it.lastModified() }

        for (file in foundFiles) {
            val ext = file.extension.lowercase()
            val mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext) ?: ""

            val fileMap: WritableMap = Arguments.createMap().apply {
                putString("id", file.absolutePath.hashCode().toString())
                putString("name", file.name)
                putString("uri", Uri.fromFile(file).toString())
                putString("mimeType", mimeType)
                putString("extension", ext)
                putDouble("size", file.length().toDouble())
                putDouble("modifiedDate", file.lastModified().toDouble())
            }

            results.pushMap(fileMap)
        }

        return results
    }

    private fun walkDirectory(
        dir: File,
        extensions: Set<String>,
        results: MutableList<File>,
        visited: MutableSet<String>
    ) {
        val canonicalPath = try { dir.canonicalPath } catch (e: Exception) { return }
        if (!visited.add(canonicalPath)) return

        // Skip hidden directories and Android system directories
        if (dir.name.startsWith(".") || dir.name == "Android") return

        val children = dir.listFiles() ?: return
        for (child in children) {
            if (child.isDirectory) {
                walkDirectory(child, extensions, results, visited)
            } else if (child.isFile && child.extension.lowercase() in extensions) {
                results.add(child)
            }
        }
    }
}
