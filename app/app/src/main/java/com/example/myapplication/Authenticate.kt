package com.example.myapplication

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.example.myapplication.databinding.ActivityAuthenticateBinding
import com.example.myapplication.utils.MyCamera

class Authenticate : AppCompatActivity() {

    private lateinit var binding: ActivityAuthenticateBinding
    private lateinit var app: MyApplication
    private lateinit var cameraHelper: MyCamera

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
    }

    private fun allPermissionsGranted(): Boolean {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) ==
                PackageManager.PERMISSION_GRANTED
    }

    private fun startCamera() {
        cameraHelper = MyCamera(
            context = this,
            lifecycleOwner = this,
            previewView = binding.previewView,
            isFrontCamera = true,
            captureIntervalMs = 1500L
        ) { bitmap ->
            if (!isWaitingForResponse) {
                isWaitingForResponse = true
                hasReceivedResponse = false
                app.sendRawBytesMessage("Authenticate", bitmap)
            }
        }


        cameraHelper.startCamera()
    }


    private fun handleAuthResult(message: String) {
        runOnUiThread {
            isWaitingForResponse = false
            if (message == "ok") {
                app.setUUID()
                val intent = Intent(this, Cam::class.java)
                startActivity(intent)
                finish()
            } else {
                Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
                Toast.makeText(this, "N beseda:", Toast.LENGTH_LONG).show()
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraHelper.stop()
        app.onMqttMessage = null
    }
}
