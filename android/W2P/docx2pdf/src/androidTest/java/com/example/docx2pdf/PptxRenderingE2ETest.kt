package com.example.docx2pdf

import android.content.Context
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.io.FileOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

@RunWith(AndroidJUnit4::class)
class PptxRenderingE2ETest {

    private lateinit var context: Context
    private lateinit var inputPptx: File
    private lateinit var outputPdf: File

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext<Context>()
        val cacheDir = context.cacheDir
        inputPptx = File(cacheDir, "test_fixture.pptx")
        outputPdf = File(cacheDir, "output.pdf")

        if (inputPptx.exists()) inputPptx.delete()
        if (outputPdf.exists()) outputPdf.delete()

        // Create a dummy 3-slide PPTX
        ZipOutputStream(FileOutputStream(inputPptx)).use { zos ->
            // presentation.xml
            zos.putNextEntry(ZipEntry("ppt/presentation.xml"))
            zos.write(
                """<?xml version="1.0" encoding="UTF-8"?>
                <p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
                    <p:sldSz cx="9144000" cy="5143500"/>
                </p:presentation>""".trimIndent().toByteArray()
            )
            zos.closeEntry()

            // slides
            for (i in 1..3) {
                zos.putNextEntry(ZipEntry("ppt/slides/slide${i}.xml"))
                zos.write(
                    """<?xml version="1.0" encoding="UTF-8"?>
                    <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                        <p:cSld>
                            <p:spTree>
                                <p:sp>
                                    <p:spPr>
                                        <a:off x="1000000" y="1000000"/>
                                        <a:ext cx="2000000" cy="1000000"/>
                                        <a:prstGeom prst="rect"/>
                                        <a:solidFill><a:srgbClr val="FF0000"/></a:solidFill>
                                    </p:spPr>
                                </p:sp>
                            </p:spTree>
                        </p:cSld>
                    </p:sld>""".trimIndent().toByteArray()
                )
                zos.closeEntry()
            }
        }
    }

    @Test
    fun testPptxToPdfSlideCount() = runBlocking {
        val inputUri = Uri.fromFile(inputPptx)
        val outputUri = Uri.fromFile(outputPdf)

        val result = OfflineDocConverterImpl.convertWordToPdf(context, inputUri, outputUri)
        assertTrue("Conversion should succeed", result.isSuccess)
        assertTrue("Output PDF should exist", outputPdf.exists())

        // Verify with PdfRenderer
        val pfd = ParcelFileDescriptor.open(outputPdf, ParcelFileDescriptor.MODE_READ_ONLY)
        val pdfRenderer = PdfRenderer(pfd)
        
        try {
            assertEquals("PDF page count should exactly match PPTX slide count", 3, pdfRenderer.pageCount)
        } finally {
            pdfRenderer.close()
            pfd.close()
        }
    }
}
