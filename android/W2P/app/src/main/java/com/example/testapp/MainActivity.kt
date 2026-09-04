package com.example.testapp

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.docx2pdf.OfflineDocConverterImpl
import com.example.docx2pdf.parser.DocumentElement
import com.example.docx2pdf.parser.UnifiedDocumentState
import kotlinx.coroutines.launch
import android.webkit.WebView
import android.widget.ScrollView
import android.widget.FrameLayout
import android.view.View

class MainActivity : AppCompatActivity() {

    private lateinit var statusText: TextView
    private lateinit var fileInfoHeader: TextView
    private var inputDocxUri: Uri? = null

    private lateinit var webViewPreview: WebView
    private lateinit var scrollPreview: ScrollView
    private lateinit var textPreview: TextView
    private lateinit var pdfPreview: android.widget.ImageView

    private val selectDocxLauncher = registerForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        if (uri != null) {
            inputDocxUri = uri
            val fileName = getFileName(uri)
            fileInfoHeader.text = "File: $fileName"
            fileInfoHeader.visibility = View.VISIBLE
            statusText.text = "Loading preview for: \n$fileName"
            loadPreview(uri)
        }
    }

    // Launcher to create the destination PDF file
    private val createPdfLauncher = registerForActivityResult(ActivityResultContracts.CreateDocument("application/pdf")) { uri: Uri? ->
        if (uri != null && inputDocxUri != null) {
            performConversion(inputDocxUri!!, uri)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Setup simple UI programmatically to avoid layout XML
        val layout = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(50, 50, 50, 50)
        }

        fileInfoHeader = TextView(this).apply {
            textSize = 18f
            setTypeface(null, android.graphics.Typeface.BOLD)
            visibility = View.GONE
            setPadding(0, 0, 0, 20)
        }

        statusText = TextView(this).apply {
            text = "Step 1: Select a document file to test the conversion."
            textSize = 16f
            setPadding(0, 0, 0, 50)
        }

        val selectButton = Button(this).apply {
            text = "1. Select Document File"
            setOnClickListener {
                selectDocxLauncher.launch("*/*")
            }
        }

        val convertButton = Button(this).apply {
            text = "2. Convert to PDF"
            setOnClickListener {
                if (inputDocxUri == null) {
                    Toast.makeText(this@MainActivity, "Select a document first!", Toast.LENGTH_SHORT).show()
                } else {
                    createPdfLauncher.launch("Converted_Document.pdf")
                }
            }
        }

        val previewContainer = FrameLayout(this).apply {
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                0, 1.0f // Weight 1 to fill available space
            )
            setPadding(0, 50, 0, 50)
        }

        webViewPreview = WebView(this).apply {
            visibility = View.GONE
            settings.javaScriptEnabled = false
            settings.loadWithOverviewMode = true
            settings.useWideViewPort = true
            settings.builtInZoomControls = true
            settings.displayZoomControls = false
        }

        textPreview = TextView(this).apply {
            textSize = 12f
            setPadding(20, 20, 20, 20)
            setBackgroundColor(android.graphics.Color.parseColor("#F0F0F0"))
        }

        var scaleFactor = 1.0f
        val scaleGestureDetector = android.view.ScaleGestureDetector(this, object : android.view.ScaleGestureDetector.SimpleOnScaleGestureListener() {
            override fun onScale(detector: android.view.ScaleGestureDetector): Boolean {
                scaleFactor *= detector.scaleFactor
                scaleFactor = Math.max(0.1f, Math.min(scaleFactor, 10.0f))
                textPreview.textSize = 12f * scaleFactor
                return true
            }
        })
        textPreview.setOnTouchListener { _, event ->
            scaleGestureDetector.onTouchEvent(event)
            false
        }

        scrollPreview = ScrollView(this).apply {
            visibility = View.GONE
            addView(textPreview)
        }

        pdfPreview = android.widget.ImageView(this).apply {
            visibility = View.GONE
            scaleType = android.widget.ImageView.ScaleType.FIT_CENTER
        }

        previewContainer.addView(webViewPreview)
        previewContainer.addView(scrollPreview)
        previewContainer.addView(pdfPreview)

        layout.addView(fileInfoHeader)
        layout.addView(statusText)
        layout.addView(selectButton)
        layout.addView(convertButton)
        layout.addView(previewContainer)
        setContentView(layout)
    }

    private fun loadPreview(uri: Uri) {
        webViewPreview.visibility = View.GONE
        scrollPreview.visibility = View.GONE
        pdfPreview.visibility = View.GONE
        textPreview.text = ""
        
        lifecycleScope.launch {
            val result = OfflineDocConverterImpl.previewDocument(this@MainActivity, uri)
            if (result.isSuccess) {
                statusText.text = "Preview loaded. Now, press Convert to select where to save the PDF."
                when (val state = result.getOrNull()!!) {
                    is UnifiedDocumentState.HtmlState -> {
                        webViewPreview.visibility = View.VISIBLE
                        webViewPreview.loadDataWithBaseURL(null, state.htmlContent, "text/html", "UTF-8", null)
                    }
                    is UnifiedDocumentState.StreamState -> {
                        scrollPreview.visibility = View.VISIBLE
                        val sb = StringBuilder()
                        var count = 0
                        state.elements.collect { element ->
                            if (count < 500) {
                                when (element) {
                                    is DocumentElement.TextLine -> sb.appendLine(element.text)
                                    is DocumentElement.TableRow -> sb.appendLine(element.columns.joinToString(" | "))
                                }
                                count++
                            }
                        }
                        if (count >= 500) {
                            sb.appendLine("\n... (Preview truncated to 500 lines for memory safety) ...")
                        }
                        textPreview.text = sb.toString()
                    }
                    is UnifiedDocumentState.PdfState -> {
                        val fileDescriptor = contentResolver.openFileDescriptor(state.uri, "r")
                        if (fileDescriptor != null) {
                            val renderer = android.graphics.pdf.PdfRenderer(fileDescriptor)
                            if (renderer.pageCount > 0) {
                                val page = renderer.openPage(0)
                                val bitmap = android.graphics.Bitmap.createBitmap(
                                    page.width, page.height, android.graphics.Bitmap.Config.ARGB_8888
                                )
                                val canvas = android.graphics.Canvas(bitmap)
                                canvas.drawColor(android.graphics.Color.WHITE)
                                page.render(bitmap, null, null, android.graphics.pdf.PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                                pdfPreview.setImageBitmap(bitmap)
                                pdfPreview.visibility = View.VISIBLE
                                page.close()
                            }
                            renderer.close()
                            fileDescriptor.close()
                        }
                    }
                    is UnifiedDocumentState.ImageState -> {
                        pdfPreview.setImageURI(null) // clear cache
                        pdfPreview.setImageURI(state.uri)
                        pdfPreview.visibility = View.VISIBLE
                    }
                }
            } else {
                val error = result.exceptionOrNull()
                statusText.text = "Preview failed!\nError: ${error?.localizedMessage}"
            }
        }
    }

    private fun performConversion(inputUri: Uri, outputUri: Uri) {
        statusText.text = "Converting...\nPlease wait..."
        
        // Launch Coroutine using lifecycleScope
        lifecycleScope.launch {
            val result = OfflineDocConverterImpl.convertWordToPdf(
                context = this@MainActivity,
                inputUri = inputUri,
                outputUri = outputUri
            )

            if (result.isSuccess) {
                statusText.text = "Success!\nPDF saved to:\n$outputUri"
                Toast.makeText(this@MainActivity, "Conversion Successful!", Toast.LENGTH_LONG).show()
            } else {
                val error = result.exceptionOrNull()
                statusText.text = "Failed!\nError: ${error?.localizedMessage}"
                error?.printStackTrace()
            }
        }
    }

    private fun getFileName(uri: Uri): String {
        var result: String? = null
        if (uri.scheme == "content") {
            contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    val index = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                    if (index != -1) {
                        result = cursor.getString(index)
                    }
                }
            }
        }
        if (result == null) {
            result = uri.path
            val cut = result?.lastIndexOf('/') ?: -1
            if (cut != -1) {
                result = result?.substring(cut + 1)
            }
        }
        return result ?: "Unknown File"
    }
}
