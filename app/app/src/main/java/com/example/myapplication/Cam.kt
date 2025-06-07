package com.example.myapplication

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
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
    private val intervalMs = 100L
    private val cameraExecutor = Executors.newSingleThreadExecutor()
    private var once = true
    lateinit var app: MyApplication

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityCamBinding.inflate(layoutInflater)
        setContentView(binding.root)
        app = application as MyApplication

        if (isCameraPermissionGranted()) {
            startCamera()
        } else {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA), 10)
        }
    }

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
        val html = """
            <html>
                <body style="background-color:#ffffff;">
                    <h3 style="text-align:center;">Slika obdelana</h3>
                    <p style="text-align:center;">Vizualni efekt dodan brez spreminjanja slike.</p>
                </body>
            </html>
        """.trimIndent()
        binding.webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null)

        if (once) {
            sendImage(bitmap)
            once = false
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
                        break
                    }
                }
            }
            .addOnFailureListener {
                Log.e("QR", "Napaka pri branju QR kode: ${it.message}", it)
            }
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
