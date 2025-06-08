package com.example.myapplication

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.os.Bundle
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.example.myapplication.databinding.ActivityLoginSecondStepBinding
import com.example.myapplication.utils.MyCamera
import java.io.ByteArrayOutputStream

class Login_second_step : AppCompatActivity() {

    private lateinit var binding: ActivityLoginSecondStepBinding
    private lateinit var app: MyApplication
    private var cameraHelper: MyCamera? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginSecondStepBinding.inflate(layoutInflater)
        setContentView(binding.root)

        app = application as MyApplication

        if (isCameraPermissionGranted()) startCamera()
        else ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA), 1)

        binding.buttonSkip.setOnClickListener {
            cameraHelper?.stop()
            startActivity(Intent(this, MainActivity::class.java))
        }
    }

    private fun isCameraPermissionGranted(): Boolean {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
    }

    private fun startCamera() {
        cameraHelper = MyCamera(
            context = this,
            lifecycleOwner = this,
            previewView = binding.previewView,
            isFrontCamera = true,
            captureIntervalMs = 500L
        ) { bitmap ->
            app.sendRawBytesMessage("imageRegister", bitmap)
        }
        cameraHelper?.startCamera()
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraHelper?.stop()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 1 && grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) {
            startCamera()
        }
    }
}
