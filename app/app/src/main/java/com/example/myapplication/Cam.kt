package com.example.myapplication

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.*
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.util.Log
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.example.myapplication.databinding.ActivityCamBinding
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.common.InputImage
import java.io.ByteArrayOutputStream
import java.io.File
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.Executors

class Cam : AppCompatActivity() {

    private lateinit var binding: ActivityCamBinding
    private lateinit var imageCapture: ImageCapture
    private val handler = Handler(Looper.getMainLooper())
    private val intervalMs = 5000L  // 5 sekund
    private val cameraExecutor = Executors.newSingleThreadExecutor()
    private var once = true

    override fun onCreate(savedInstanceState: Bundle?) {

        super.onCreate(savedInstanceState)
        binding = ActivityCamBinding.inflate(layoutInflater)
        setContentView(binding.root)


        if (isCameraPermissionGranted()) {
            startCamera()
        } else {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA), 10)
        }
    }
    val app = application as MyApplication
    private fun isCameraPermissionGranted(): Boolean {
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

            cameraProvider.unbindAll()
            cameraProvider.bindToLifecycle(this, cameraSelector, preview, imageCapture)
            startTakingPhotosRepeatedly()
        }, ContextCompat.getMainExecutor(this))
    }

    private fun startTakingPhotosRepeatedly() {
        handler.post(object : Runnable {
            override fun run() {
                takeAndShowPhoto()
                handler.postDelayed(this, intervalMs)
            }
        })
    }

    private fun takeAndShowPhoto() {
        val photoFile = File(externalCacheDir, createFileName())

        val outputOptions = ImageCapture.OutputFileOptions.Builder(photoFile).build()

        imageCapture.takePicture(
            outputOptions,
            ContextCompat.getMainExecutor(this),
            object : ImageCapture.OnImageSavedCallback {
                override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                    processAndDisplayImage(photoFile.absolutePath)
                }

                override fun onError(exception: ImageCaptureException) {
                    Log.e("CameraX", "Napaka pri zajemu slike: ${exception.message}", exception)
                }
            }
        )
    }

    private fun createFileName(): String {
        val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(System.currentTimeMillis())
        return "IMG_$timeStamp.jpg"
    }

    private fun processAndDisplayImage(imagePath: String) {
        val bitmap = BitmapFactory.decodeFile(imagePath)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val blurEffect = RenderEffect.createBlurEffect(20f, 20f, Shader.TileMode.CLAMP)

            val matrix = ColorMatrix().apply {
                set(
                    floatArrayOf(
                        1f, 0f, 0f, 0f, 60f,
                        0f, 1f, 0f, 0f, 60f,
                        0f, 0f, 1f, 0f, 60f,
                        0f, 0f, 0f, 1f, 0f
                    )
                )
            }
            val colorFilter = RenderEffect.createColorFilterEffect(ColorMatrixColorFilter(matrix))
            val combinedEffect = RenderEffect.createChainEffect(blurEffect, colorFilter)

            binding.imageView.setImageBitmap(bitmap)
            binding.imageView.setRenderEffect(combinedEffect)

            binding.previewView.visibility = View.GONE
            binding.imageView.visibility = View.VISIBLE

            val html = """
                <html>
                    <body style="background-color:#ffffff;">
                        <h3 style="text-align:center;">Slika obdelana</h3>
                        <p style="text-align:center;">Zamegljena in posvetljena uspešno.</p>
                    </body>
                </html>
            """.trimIndent()
            binding.webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null)
            binding.webView.visibility = View.VISIBLE

            if (once) {
                sendImage(bitmap)
                once = false
            }
        } else {
            Log.w("CameraX", "RenderEffect deluje samo od Android 12 (API 31) dalje.")
        }

        // QR skeniranje
        val image = InputImage.fromBitmap(bitmap, 0)
        val scanner = BarcodeScanning.getClient()

        scanner.process(image)
            .addOnSuccessListener { barcodes ->
                for (barcode in barcodes) {
                    val rawValue = barcode.rawValue
                    if (rawValue != null) {
                        Toast.makeText(this, "QR najden: $rawValue", Toast.LENGTH_LONG).show()
                        Log.d("QR", "Najdeno: $rawValue")
                        app.sendMessage("QR", barcode.rawValue.toString())
                        break // samo prvi QR
                    }
                }
            }
            .addOnFailureListener {
                Log.e("QR", "Napaka pri branju QR kode: ${it.message}", it)
            }
    }

    private fun bitmapToBase64(bitmap: Bitmap): String {
        val outputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 80, outputStream)
        val byteArray = outputStream.toByteArray()
        return Base64.encodeToString(byteArray, Base64.DEFAULT)
    }

    private fun sendImage(bitmap: Bitmap) {
        val outputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 80, outputStream)
        val byteArray = outputStream.toByteArray()

        app.sendRawBytesMessage("images2", byteArray)
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
        handler.removeCallbacksAndMessages(null)
    }
}
