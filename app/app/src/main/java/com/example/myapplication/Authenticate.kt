package com.example.myapplication

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.example.myapplication.databinding.ActivityAuthenticateBinding
import java.io.ByteArrayOutputStream
import java.io.File
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class Authenticate : AppCompatActivity() {

    private lateinit var binding: ActivityAuthenticateBinding
    private lateinit var imageCapture: ImageCapture
    private lateinit var cameraExecutor: ExecutorService
    private lateinit var app: MyApplication
    private var isWaitingForResponse = false
    private var hasReceivedResponse = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityAuthenticateBinding.inflate(layoutInflater)
        setContentView(binding.root)
        app = application as MyApplication

        app.subscribe()

        app.onMqttMessage = { topic, message ->
            if (!hasReceivedResponse) {
                hasReceivedResponse = true
                handleAuthResult(message)
            }
        }

        if (allPermissionsGranted()) {
            startCamera()
        } else {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA), 1)
        }

        cameraExecutor = Executors.newSingleThreadExecutor()
    }

    private fun allPermissionsGranted(): Boolean {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) ==
                PackageManager.PERMISSION_GRANTED
    }

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)

        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()

            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(binding.previewView.surfaceProvider)
            }

            imageCapture = ImageCapture.Builder().build()
            val cameraSelector = CameraSelector.DEFAULT_FRONT_CAMERA

            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(this, cameraSelector, preview, imageCapture)

                takePhoto()

            } catch (e: Exception) {
                Log.e("CameraX", "Napaka pri zagonu kamere", e)
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private fun takePhoto() {
        if (isWaitingForResponse) return

        isWaitingForResponse = true
        hasReceivedResponse = false

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
                    sendImage(bitmap)
                }

                override fun onError(exception: ImageCaptureException) {
                    Log.e("CameraX", "Napaka pri zajemu slike: ${exception.message}", exception)
                    isWaitingForResponse = false
                }
            }
        )
    }

    private fun sendImage(bitmap: Bitmap) {
        val outputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 80, outputStream)
        val byteArray = outputStream.toByteArray()
        app.sendRawBytesMessage("imageLogin", byteArray)
    }

    private fun handleAuthResult(message: String) {
        runOnUiThread {
            if (message == "ok") {
                isWaitingForResponse = false
                app.setUUID()
                val intent = Intent(this, Cam::class.java)
                startActivity(intent)
                finish()
            } else {
                Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
                isWaitingForResponse = false
                takePhoto()
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
        app.onMqttMessage = null
    }
}
