package com.alldocumentreader

import android.content.ContentResolver
import android.content.ContentValues
import android.content.Intent
import android.database.Cursor
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.provider.Settings
import android.webkit.MimeTypeMap
import android.view.WindowManager
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
                "text/rtf",
                "text/markdown", "text/x-tex",
                "text/csv", "text/comma-separated-values", "text/tab-separated-values",
                "application/json", "application/xml", "text/xml",
                "image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/svg+xml",
                "text/x-java-source", "text/x-java", "text/x-kotlin", "text/x-python",
                "text/x-c", "text/x-c++", "text/html", "application/javascript", "text/javascript",
                "text/css", "application/x-yaml", "text/yaml", "application/x-sh",
                "text/x-swift", "text/x-ruby", "text/x-go", "text/rust", "application/x-httpd-php", "text/x-php",
                "application/vnd.oasis.opendocument.spreadsheet",
                "application/vnd.oasis.opendocument.text",
                "application/vnd.oasis.opendocument.presentation",
                "message/rfc822",
                "application/vnd.comicbook+zip", "application/x-cbz"
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
            "image" -> listOf("image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp")
            "code" -> listOf(
                "text/x-java-source", "text/x-java", "text/x-kotlin", "text/x-python",
                "text/x-c", "text/x-c++", "text/html", "application/javascript", "text/javascript",
                "text/css", "application/x-yaml", "text/yaml", "application/x-sh",
                "text/x-swift", "text/x-ruby", "text/x-go", "text/rust", "application/x-httpd-php", "text/x-php"
            )
            "markup" -> listOf("application/json", "application/xml", "text/xml", "text/markdown", "text/x-tex")
            "csv" -> listOf("text/csv", "text/comma-separated-values", "text/tab-separated-values")
            "psd" -> listOf("image/vnd.adobe.photoshop", "image/x-photoshop", "application/x-photoshop")
            "svg" -> listOf("image/svg+xml")
            "ods" -> listOf("application/vnd.oasis.opendocument.spreadsheet")
            "odt" -> listOf("application/vnd.oasis.opendocument.text")
            "odp" -> listOf("application/vnd.oasis.opendocument.presentation")
            "eml" -> listOf("message/rfc822")
            "cbz" -> listOf("application/vnd.comicbook+zip", "application/x-cbz")
            "html" -> listOf("text/html")
            "md" -> listOf("text/markdown")
            else -> emptyList()
        }
    }

    private fun getExtensionsForFileType(fileType: String): Set<String> {
        return when (fileType) {
            "all" -> setOf(
                "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "epub", "rtf",
                "md", "tex", "csv", "tsv", "json", "xml",
                "jpg", "jpeg", "png", "webp", "gif", "bmp", "psd", "svg",
                "ods", "odt", "odp", "eml", "cbz",
                "java", "kt", "py", "c", "cpp", "html", "htm", "js", "css", "yaml", "yml", "sh", "swift", "rb", "go", "rs", "php"
            )
            "pdf" -> setOf("pdf")
            "word" -> setOf("doc", "docx")
            "excel" -> setOf("xls", "xlsx")
            "ppt" -> setOf("ppt", "pptx")
            "txt" -> setOf("txt")
            "epub" -> setOf("epub")
            "rtf" -> setOf("rtf")
            "image" -> setOf("jpg", "jpeg", "png", "webp", "gif", "bmp")
            "code" -> setOf("java", "kt", "py", "c", "cpp", "html", "htm", "js", "css", "yaml", "yml", "sh", "swift", "rb", "go", "rs", "php")
            "markup" -> setOf("json", "xml", "md", "tex")
            "csv" -> setOf("csv", "tsv")
            "psd" -> setOf("psd")
            "svg" -> setOf("svg")
            "ods" -> setOf("ods")
            "odt" -> setOf("odt")
            "odp" -> setOf("odp")
            "eml" -> setOf("eml")
            "cbz" -> setOf("cbz")
            "html" -> setOf("html", "htm")
            "md" -> setOf("md")
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
            "text/markdown" -> "md"
            "text/x-tex" -> "tex"
            "text/csv", "text/comma-separated-values" -> "csv"
            "text/tab-separated-values" -> "tsv"
            "application/json" -> "json"
            "application/xml", "text/xml" -> "xml"
            "image/jpeg" -> "jpg"
            "image/png" -> "png"
            "image/webp" -> "webp"
            "image/gif" -> "gif"
            "image/bmp" -> "bmp"
            "image/svg+xml" -> "svg"
            "application/vnd.oasis.opendocument.spreadsheet" -> "ods"
            "application/vnd.oasis.opendocument.text" -> "odt"
            "application/vnd.oasis.opendocument.presentation" -> "odp"
            "message/rfc822" -> "eml"
            "application/vnd.comicbook+zip", "application/x-cbz" -> "cbz"
            "text/x-java-source", "text/x-java" -> "java"
            "text/x-kotlin" -> "kt"
            "text/x-python" -> "py"
            "text/x-c" -> "c"
            "text/x-c++" -> "cpp"
            "text/html" -> "html"
            "application/javascript", "text/javascript" -> "js"
            "text/css" -> "css"
            "application/x-yaml", "text/yaml" -> "yaml"
            "application/x-sh" -> "sh"
            "text/x-swift" -> "swift"
            "text/x-ruby" -> "rb"
            "text/x-go" -> "go"
            "text/rust" -> "rs"
            "application/x-httpd-php", "text/x-php" -> "php"
            "image/vnd.adobe.photoshop", "image/x-photoshop", "application/x-photoshop" -> "psd"
            else -> ""
        }
    }

    // ── Helper to resolve physical path from any URI ─────────────────────

    private fun getRealPathFromUri(uri: Uri): String? {
        if (uri.scheme == "file") {
            return uri.path
        }

        if (uri.scheme == "content") {
            val projection = arrayOf(MediaStore.Files.FileColumns.DATA)
            try {
                val cursor = reactApplicationContext.contentResolver.query(uri, projection, null, null, null)
                cursor?.use {
                    if (it.moveToFirst()) {
                        val index = it.getColumnIndex(MediaStore.Files.FileColumns.DATA)
                        if (index != -1) {
                            val path = it.getString(index)
                            if (!path.isNullOrEmpty() && File(path).exists()) {
                                return path
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                // Ignore query error
            }

            // Fallback: try querying external files table with ID
            try {
                val id = uri.lastPathSegment
                if (id != null && id.all { it.isDigit() }) {
                    val cursor = reactApplicationContext.contentResolver.query(
                        MediaStore.Files.getContentUri("external"),
                        projection,
                        "${MediaStore.Files.FileColumns._ID} = ?",
                        arrayOf(id),
                        null
                    )
                    cursor?.use {
                        if (it.moveToFirst()) {
                            val index = it.getColumnIndex(MediaStore.Files.FileColumns.DATA)
                            if (index != -1) {
                                val path = it.getString(index)
                                if (!path.isNullOrEmpty() && File(path).exists()) {
                                    return path
                                }
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                // Ignore query error
            }
        }

        // Direct path check
        val raw = uri.toString().removePrefix("file://")
        if (File(raw).exists()) {
            return raw
        }

        return null
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
            MediaStore.Files.FileColumns.DATE_MODIFIED,
            MediaStore.Files.FileColumns.DATA
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
            val dataColumn = it.getColumnIndex(MediaStore.Files.FileColumns.DATA)

            while (it.moveToNext()) {
                val id = it.getLong(idColumn)
                val name = it.getString(nameColumn) ?: "Unknown"
                val mime = it.getString(mimeColumn) ?: ""
                val size = it.getLong(sizeColumn)
                val dateModified = it.getLong(dateColumn) * 1000 // Convert seconds to ms
                val filePath = if (dataColumn != -1) it.getString(dataColumn) else null

                // Prefer file:// URI when physical path exists
                val fileUriString = if (!filePath.isNullOrEmpty() && File(filePath).exists()) {
                    Uri.fromFile(File(filePath)).toString()
                } else {
                    Uri.withAppendedPath(
                        MediaStore.Files.getContentUri("external"),
                        id.toString()
                    ).toString()
                }

                val extension = getExtensionFromMime(mime)

                val fileMap: WritableMap = Arguments.createMap().apply {
                    putString("id", if (!filePath.isNullOrEmpty()) filePath.hashCode().toString() else id.toString())
                    putString("name", name)
                    putString("uri", fileUriString)
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

    // ── Delete File ──────────────────────────────────────────────────────

    @ReactMethod
    fun deleteFile(uriString: String, promise: Promise) {
        try {
            val uri = Uri.parse(uriString)
            val filePath = getRealPathFromUri(uri)
            var deleted = false

            // 1. Delete physical file on disk
            if (filePath != null) {
                val file = File(filePath)
                if (file.exists()) {
                    deleted = file.delete()
                    if (!deleted) {
                        try {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                java.nio.file.Files.deleteIfExists(file.toPath())
                                deleted = !file.exists()
                            }
                        } catch (e: Exception) {
                            // ignore
                        }
                    }
                } else {
                    deleted = true
                }
            }

            // 2. Delete entry from MediaStore
            try {
                if (uri.scheme == "content") {
                    reactApplicationContext.contentResolver.delete(uri, null, null)
                } else if (filePath != null) {
                    reactApplicationContext.contentResolver.delete(
                        MediaStore.Files.getContentUri("external"),
                        "${MediaStore.Files.FileColumns.DATA} = ?",
                        arrayOf(filePath)
                    )
                }
            } catch (e: Exception) {
                // Ignore MediaStore delete exception
            }

            // 3. Trigger media scanner to refresh Android media database
            if (filePath != null) {
                MediaScannerConnection.scanFile(
                    reactApplicationContext,
                    arrayOf(filePath),
                    null,
                    null
                )
            }

            if (deleted) {
                promise.resolve(true)
            } else {
                promise.reject("DELETE_ERROR", "Failed to delete file from storage. Please verify file permissions.")
            }
        } catch (e: Exception) {
            promise.reject("DELETE_ERROR", "Delete failed: ${e.message}", e)
        }
    }

    // ── Rename File ──────────────────────────────────────────────────────

    @ReactMethod
    fun renameFile(uriString: String, newName: String, promise: Promise) {
        try {
            val uri = Uri.parse(uriString)
            val filePath = getRealPathFromUri(uri)

            if (filePath == null) {
                promise.reject("RENAME_ERROR", "Could not locate file path on storage for: $uriString")
                return
            }

            val oldFile = File(filePath)
            if (!oldFile.exists()) {
                promise.reject("RENAME_ERROR", "File does not exist: $filePath")
                return
            }

            val oldExt = oldFile.extension.lowercase()
            var finalName = newName.trim()
            val hasExt = finalName.contains(".") && finalName.substringAfterLast(".").isNotEmpty()
            if (!hasExt && oldExt.isNotEmpty()) {
                finalName = "$finalName.$oldExt"
            }

            val parentDir = oldFile.parentFile ?: run {
                promise.reject("RENAME_ERROR", "Parent directory not found")
                return
            }

            val newFile = File(parentDir, finalName)
            if (newFile.exists() && newFile.canonicalPath != oldFile.canonicalPath) {
                promise.reject("RENAME_ERROR", "A file with the name '$finalName' already exists")
                return
            }

            // Perform rename with multi-tier fallback
            var renamed = oldFile.renameTo(newFile)
            if (!renamed) {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        java.nio.file.Files.move(
                            oldFile.toPath(),
                            newFile.toPath(),
                            java.nio.file.StandardCopyOption.REPLACE_EXISTING
                        )
                        renamed = newFile.exists()
                    }
                } catch (nioEx: Exception) {
                    try {
                        oldFile.copyTo(newFile, overwrite = true)
                        if (newFile.exists() && newFile.length() == oldFile.length()) {
                            oldFile.delete()
                            renamed = true
                        }
                    } catch (copyEx: Exception) {
                        // ignore
                    }
                }
            }

            if (!renamed || !newFile.exists()) {
                promise.reject("RENAME_ERROR", "Failed to rename file on storage. Please check storage permissions.")
                return
            }

            val newExt = newFile.extension.lowercase()
            var mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(newExt) ?: ""
            if (mimeType.isEmpty()) {
                mimeType = getMimeTypesForFileType(newExt).firstOrNull() ?: "application/octet-stream"
            }

            // Update MediaStore entry
            try {
                val values = ContentValues().apply {
                    put(MediaStore.Files.FileColumns.DISPLAY_NAME, finalName)
                    put(MediaStore.Files.FileColumns.DATA, newFile.absolutePath)
                    put(MediaStore.Files.FileColumns.MIME_TYPE, mimeType)
                    put(MediaStore.Files.FileColumns.SIZE, newFile.length())
                    put(MediaStore.Files.FileColumns.DATE_MODIFIED, System.currentTimeMillis() / 1000)
                }

                if (uri.scheme == "content") {
                    reactApplicationContext.contentResolver.update(uri, values, null, null)
                } else {
                    reactApplicationContext.contentResolver.update(
                        MediaStore.Files.getContentUri("external"),
                        values,
                        "${MediaStore.Files.FileColumns.DATA} = ?",
                        arrayOf(oldFile.absolutePath)
                    )
                }
            } catch (e: Exception) {
                // MediaStore will be refreshed by scanner
            }

            // Rescan both old and new paths in MediaStore
            MediaScannerConnection.scanFile(
                reactApplicationContext,
                arrayOf(oldFile.absolutePath, newFile.absolutePath),
                null,
                null
            )

            val newUriString = Uri.fromFile(newFile).toString()

            val resultMap: WritableMap = Arguments.createMap().apply {
                putString("id", newFile.absolutePath.hashCode().toString())
                putString("name", finalName)
                putString("uri", newUriString)
                putString("mimeType", mimeType)
                putString("extension", newExt)
                putDouble("size", newFile.length().toDouble())
                putDouble("modifiedDate", newFile.lastModified().toDouble())
            }

            promise.resolve(resultMap)
        } catch (e: Exception) {
            promise.reject("RENAME_ERROR", "Rename failed: ${e.message}", e)
        }
    }

    // ── Share File ───────────────────────────────────────────────────────

    @ReactMethod
    fun shareFile(uriString: String, mimeType: String?, title: String?, promise: Promise) {
        try {
            val uri = Uri.parse(uriString)
            val filePath = getRealPathFromUri(uri)
            val file = if (filePath != null) File(filePath) else null

            val shareUri: Uri = if (file != null && file.exists()) {
                androidx.core.content.FileProvider.getUriForFile(
                    reactApplicationContext,
                    "${reactApplicationContext.packageName}.provider",
                    file
                )
            } else if (uri.scheme == "content") {
                uri
            } else {
                promise.reject("SHARE_ERROR", "File not found for sharing: $uriString")
                return
            }

            val resolvedMime = if (!mimeType.isNullOrEmpty() && mimeType != "application/octet-stream" && mimeType != "") {
                mimeType
            } else {
                val ext = if (file != null) file.extension.lowercase() else MimeTypeMap.getFileExtensionFromUrl(uriString)
                MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext) ?: "*/*"
            }

            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = resolvedMime
                putExtra(Intent.EXTRA_STREAM, shareUri)
                putExtra(Intent.EXTRA_SUBJECT, title ?: file?.name ?: "Document")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            val chooser = Intent.createChooser(shareIntent, title ?: "Share Document").apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            val currentActivity = reactApplicationContext.currentActivity
            if (currentActivity != null) {
                currentActivity.startActivity(chooser)
            } else {
                shareIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactApplicationContext.startActivity(chooser)
            }

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SHARE_ERROR", "Failed to share file: ${e.message}", e)
        }
    }

    // ── Keep Screen On ──────────────────────────────────────────────────

    @ReactMethod
    fun setKeepScreenOn(enable: Boolean, promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.resolve(false)
            return
        }

        activity.runOnUiThread {
            try {
                if (enable) {
                    activity.window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                } else {
                    activity.window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                }
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("KEEP_SCREEN_ON_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun isKeepScreenOn(promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.resolve(false)
            return
        }

        activity.runOnUiThread {
            try {
                val flags = activity.window?.attributes?.flags ?: 0
                val isKeepingOn = (flags and WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) != 0
                promise.resolve(isKeepingOn)
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }
    }
}


