package com.example.myapplication

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.location.Location
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.example.myapplication.databinding.ActivityCamBinding
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.common.InputImage
import org.json.JSONObject
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
    private var oldValue: String = ""
    lateinit var app: MyApplication
    private lateinit var fusedLocationClient: FusedLocationProviderClient

    // Lokacija
    private var latitude: Double? = null
    private var longitude: Double? = null

    // Svetloba
    private var lightLevel: Float? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityCamBinding.inflate(layoutInflater)
        setContentView(binding.root)
        app = application as MyApplication
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)

        binding.webView.setBackgroundColor(android.graphics.Color.TRANSPARENT)
        binding.webView.setLayerType(android.view.View.LAYER_TYPE_SOFTWARE, null)

        // Svetlobni senzor
        val sensorManager = getSystemService(SENSOR_SERVICE) as SensorManager
        val lightSensor = sensorManager.getDefaultSensor(Sensor.TYPE_LIGHT)
        if (lightSensor != null) {
            val lightListener = object : SensorEventListener {
                override fun onSensorChanged(event: SensorEvent?) {
                    lightLevel = event?.values?.get(0)
                }

                override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
            }
            sensorManager.registerListener(lightListener, lightSensor, SensorManager.SENSOR_DELAY_NORMAL)
        } else {
            Toast.makeText(this, "Senzor svetlobe ni na voljo", Toast.LENGTH_SHORT).show()
        }

        // Dovoljenja
        if (isCameraPermissionGranted()) {
            startCamera()
        } else {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA), 10)
        }

        if (isLocationPermissionGranted()) {
            requestCurrentLocation()
        } else {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION),
                11
            )
        }

        binding.back.setOnClickListener {
            finish()
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)

        when (requestCode) {
            10 -> {
                if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    startCamera()
                } else {
                    Toast.makeText(this, "Dovoljenje za kamero zavrnjeno", Toast.LENGTH_SHORT).show()
                }
            }

            11 -> {
                if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    requestCurrentLocation()
                } else {
                    Toast.makeText(this, "Dovoljenje za lokacijo zavrnjeno", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun requestCurrentLocation() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
            ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED
        ) {
            return
        }

        fusedLocationClient.lastLocation
            .addOnSuccessListener { location: Location? ->
                location?.let {
                    latitude = it.latitude
                    longitude = it.longitude
                    Log.d("Lokacija", "Trenutna lokacija: $latitude, $longitude")
                    Toast.makeText(this, "Lokacija: $latitude, $longitude", Toast.LENGTH_SHORT).show()
                } ?: run {
                    Log.w("Lokacija", "Lokacija ni na voljo")
                }
            }
    }

    private fun isLocationPermissionGranted(): Boolean {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
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

        binding.webView.settings.javaScriptEnabled = true

        val image = InputImage.fromBitmap(bitmap, 0)
        val scanner = BarcodeScanning.getClient()

        scanner.process(image)
            .addOnSuccessListener { barcodes ->
                for (barcode in barcodes) {
                    val rawValue = barcode.rawValue
                    if (rawValue != null) {
                        Toast.makeText(this, "QR najden: $rawValue", Toast.LENGTH_LONG).show()
                        Log.d("QR", "Najdeno: $rawValue")

                        val json = JSONObject().apply {
                            put("qr", rawValue)
                            put("lat", latitude ?: "ni na voljo")
                            put("lon", longitude ?: "ni na voljo")
                            put("light", lightLevel ?: "ni na voljo")
                        }

                        app.sendMessage("QR", json.toString())

                        if (rawValue != oldValue) {
                            binding.webView.loadUrl("https://z7.si/wisfi/izdelek?id=$rawValue")
                            oldValue = rawValue
                        }

                        break
                    }
                }
            }
            .addOnFailureListener {
                Log.e("QR", "Napaka pri branju QR kode: ${it.message}", it)
            }
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
        handler.removeCallbacksAndMessages(null)
    }
}
