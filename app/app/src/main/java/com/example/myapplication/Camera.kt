package com.example.myapplication.utils

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import java.io.ByteArrayOutputStream
import java.io.File
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class MyCamera(
    private val context: Context,
    private val lifecycleOwner: LifecycleOwner,
    private val previewView: PreviewView,
    private val isFrontCamera: Boolean = false,
    private val captureIntervalMs: Long = 500L,
    private val onImageCaptured: (Bitmap) -> Unit
) {
    private lateinit var imageCapture: ImageCapture
    private val handler = Handler(Looper.getMainLooper())
    private var cameraExecutor: ExecutorService = Executors.newSingleThreadExecutor()

    fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)

        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()
            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(previewView.surfaceProvider)
            }

            imageCapture = ImageCapture.Builder().build()
            val cameraSelector = if (isFrontCamera) {
                CameraSelector.DEFAULT_FRONT_CAMERA
            } else {
                CameraSelector.DEFAULT_BACK_CAMERA
            }

            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(lifecycleOwner, cameraSelector, preview, imageCapture)
                startRepeatingCapture()
            } catch (e: Exception) {
                Log.e("Camera", "Napaka pri zagonu kamere: ${e.message}", e)
            }
        }, ContextCompat.getMainExecutor(context))
    }

    private fun startRepeatingCapture() {
        handler.post(object : Runnable {
            override fun run() {
                takePhoto()
                handler.postDelayed(this, captureIntervalMs)
            }
        })
    }

    private fun takePhoto() {
        val photoFile = File(
            context.externalCacheDir,
            "IMG_${SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(System.currentTimeMillis())}.jpg"
        )

        val outputOptions = ImageCapture.OutputFileOptions.Builder(photoFile).build()

        imageCapture.takePicture(
            outputOptions,
            ContextCompat.getMainExecutor(context),
            object : ImageCapture.OnImageSavedCallback {
                override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                    val bitmap = BitmapFactory.decodeFile(photoFile.absolutePath)
                    onImageCaptured(bitmap)
                }

                override fun onError(exception: ImageCaptureException) {
                    Log.e("Camera", "Napaka pri zajemu slike: ${exception.message}", exception)
                }
            }
        )
    }

    fun stop() {
        handler.removeCallbacksAndMessages(null)
        cameraExecutor.shutdown()
    }
}
