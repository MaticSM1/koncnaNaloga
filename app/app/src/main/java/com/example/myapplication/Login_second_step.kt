package com.example.myapplication

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.example.myapplication.databinding.ActivityLoginSecondStepBinding
import com.example.myapplication.utils.MyCamera
import java.io.ByteArrayOutputStream

class Login_second_step : AppCompatActivity() {

    private lateinit var binding: ActivityLoginSecondStepBinding
    private lateinit var app: MyApplication
    private var myCamera: MyCamera? = null

    override fun onCreate(savedInstanceState: Bundle?) {

        super.onCreate(savedInstanceState)
        binding = ActivityLoginSecondStepBinding.inflate(layoutInflater)
        setContentView(binding.root)
        Toast.makeText(this, "Prosim počakajte", Toast.LENGTH_LONG).show()
        app = application as MyApplication
        val sharedPreferences = getSharedPreferences("prefs", Context.MODE_PRIVATE)
        val email = sharedPreferences.getString("username", "")
        app.onMqttMessage = { topic, message ->
            if (topic == email) {
                runOnUiThread {
                    if (message == "ok") {
                        myCamera?.stop()
                        app.setUUID()
                        val intent = Intent(this, MainActivity::class.java)
                        startActivity(intent)
                    } else {
                        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }


        if (isCameraPermissionGranted()) startCamera()
        else ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA), 1)

        binding.buttonSkip.setOnClickListener {
            myCamera?.stop()
            startActivity(Intent(this, MainActivity::class.java))
        }
    }

    private fun isCameraPermissionGranted(): Boolean {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
    }

    private fun startCamera() {
        myCamera = MyCamera(
            context = this,
            lifecycleOwner = this,
            previewView = binding.previewView,
            isFrontCamera = true,
            captureIntervalMs = 500L
        ) { bitmap ->

            app.sendRawBytesMessage("imageRegister", bitmap)
        }
        myCamera?.startCamera()
    }

    override fun onDestroy() {
        super.onDestroy()
        myCamera?.stop()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 1 && grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) {
            startCamera()
        }
    }
}
