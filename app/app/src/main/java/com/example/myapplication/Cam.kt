package com.example.myapplication

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.RenderEffect
import android.graphics.Shader
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.example.myapplication.databinding.ActivityCamBinding
import java.io.File
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class Cam : AppCompatActivity() {

    private lateinit var binding: ActivityCamBinding
    private lateinit var imageCapture: ImageCapture
    private lateinit var cameraExecutor: ExecutorService
    private val handler = Handler(Looper.getMainLooper())
    private val interval: Long = 5000 // 5 sekund

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityCamBinding.inflate(layoutInflater)
        setContentView(binding.root)

        if (allPermissionsGranted()) {
            startCamera()
        } else {
            ActivityCompat.requestPermissions(
                this, arrayOf(Manifest.permission.CAMERA), 1
            )
        }

        cameraExecutor = Executors.newSingleThreadExecutor()
    }

    private fun allPermissionsGranted(): Boolean {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
    }

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)

        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()

            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(binding.previewView.surfaceProvider)
            }

            imageCapture = ImageCapture.Builder().build()

            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(this, cameraSelector, preview, imageCapture)
                startRepeatingCapture()
            } catch (e: Exception) {
                Log.e("CameraX", "Error starting camera", e)
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private fun startRepeatingCapture() {
        handler.post(object : Runnable {
            override fun run() {
                takePhoto()
                handler.postDelayed(this, interval)
            }
        })
    }

    private fun takePhoto() {
        val photoFile = File(
            externalCacheDir,
            "IMG_${SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(System.currentTimeMillis())}.jpg"
        )

        val outputOptions = ImageCapture.OutputFileOptions.Builder(photoFile).build()

        imageCapture.takePicture(
            outputOptions,
            ContextCompat.getMainExecutor(this),
            object : ImageCapture.OnImageSavedCallback {
                override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                    val bitmap = BitmapFactory.decodeFile(photoFile.absolutePath)

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        val blurEffect = RenderEffect.createBlurEffect(20f, 20f, Shader.TileMode.CLAMP)

                        val colorMatrix = ColorMatrix().apply {
                            set(
                                floatArrayOf(
                                    1f, 0f, 0f, 0f, 60f,
                                    0f, 1f, 0f, 0f, 60f,
                                    0f, 0f, 1f, 0f, 60f,
                                    0f, 0f, 0f, 1f, 0f
                                )
                            )
                        }
                        val colorFilterEffect = RenderEffect.createColorFilterEffect(ColorMatrixColorFilter(colorMatrix))

                        // Združimo blur in pobelitev
                        val combinedEffect = RenderEffect.createChainEffect(blurEffect, colorFilterEffect)

                        binding.imageView.setImageBitmap(bitmap)
                        binding.imageView.setRenderEffect(combinedEffect)

                        // Skrijemo previewView, ker prikazujemo samo obdelano sliko
                        binding.previewView.visibility = View.GONE
                        binding.imageView.visibility = View.VISIBLE

                        // HTML vsebina za WebView
                        val htmlContent = """
                            <html>
                            <body style="background-color:#ffffff;">
                                <h3 style="text-align:center;">Slika je bila obdelana</h3>
                                <p style="text-align:center;">Zamegljena in pobeljena uspešno</p>
                            </body>
                            </html>
                        """.trimIndent()

                        binding.webView.settings.javaScriptEnabled = true
                        binding.webView.loadDataWithBaseURL(null, htmlContent, "text/html", "UTF-8", null)
                        binding.webView.visibility = View.VISIBLE

                    } else {
                        Log.w("CameraX", "RenderEffect zahteva Android 12 (API 31)+")
                    }
                }

                override fun onError(exception: ImageCaptureException) {
                    Log.e("CameraX", "Photo capture failed: ${exception.message}", exception)
                }
            }
        )
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
        handler.removeCallbacksAndMessages(null)
    }
}
