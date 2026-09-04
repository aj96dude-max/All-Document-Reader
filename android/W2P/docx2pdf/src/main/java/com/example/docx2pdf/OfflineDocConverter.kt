package com.example.docx2pdf

import android.content.Context
import android.net.Uri
import com.example.docx2pdf.internal.PdfRenderingEngine
import com.example.docx2pdf.parser.DocumentParserFactory
import com.example.docx2pdf.parser.UnifiedDocumentState
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Public facade for the Offline DOC to PDF converter.
 * 
 * All conversions are completely offline and performed strictly on-device without any API calls.
 */
interface OfflineDocConverter {
    /**
     * Converts a document file represented by [inputUri] into a PDF file written to [outputUri].
     *
     * This function runs on `Dispatchers.IO` to ensure it does not block the main thread.
     * 
     * @param context The Android application or activity context needed for ContentResolver.
     * @param inputUri The URI of the source file (e.g., .txt, .csv, .docx).
     * @param outputUri The URI of the destination `.pdf` file where the result will be written.
     * @return [Result] containing a Boolean indicating success (true), or an Exception if failure occurs.
     */
    suspend fun convertWordToPdf(context: Context, inputUri: Uri, outputUri: Uri): Result<Boolean>

    /**
     * Parses the document and returns the [UnifiedDocumentState] for previewing.
     * Does not convert to PDF.
     */
    suspend fun previewDocument(context: Context, inputUri: Uri): Result<UnifiedDocumentState>
}

/**
 * Singleton implementation of [OfflineDocConverter].
 */
object OfflineDocConverterImpl : OfflineDocConverter {

    override suspend fun convertWordToPdf(
        context: Context,
        inputUri: Uri,
        outputUri: Uri
    ): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val parser = DocumentParserFactory.createParser(context, inputUri)
            val state = parser.parse(context, inputUri)
            
            if (state is UnifiedDocumentState.PdfState) {
                // Fast-path: Just copy the PDF directly
                context.contentResolver.openInputStream(state.uri)?.use { input ->
                    context.contentResolver.openOutputStream(outputUri)?.use { output ->
                        input.copyTo(output)
                    }
                }
            } else {
                val engine = PdfRenderingEngine(context)
                engine.process(state, outputUri)
            }
            
            Result.success(true)
        } catch (e: Exception) {
            e.printStackTrace()
            Result.failure(e)
        }
    }

    override suspend fun previewDocument(
        context: Context,
        inputUri: Uri
    ): Result<UnifiedDocumentState> = withContext(Dispatchers.IO) {
        try {
            val parser = DocumentParserFactory.createParser(context, inputUri)
            val state = parser.parse(context, inputUri)
            Result.success(state)
        } catch (e: Exception) {
            e.printStackTrace()
            Result.failure(e)
        }
    }
}
