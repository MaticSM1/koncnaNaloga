package com.example.myapplication

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.location.Location
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.example.myapplication.databinding.ActivityShoplistBinding
import com.example.myapplication.utils.MyCamera
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.common.InputImage
import org.json.JSONObject

class Shoplist : AppCompatActivity() {

    private lateinit var binding: ActivityShoplistBinding
    private lateinit var myCamera: MyCamera
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var app: MyApplication

    private var isCameraRunning = false
    private var oldValue: String = ""

    private var latitude: Double? = null
    private var longitude: Double? = null
    private var lightLevel: Float? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityShoplistBinding.inflate(layoutInflater)
        setContentView(binding.root)
        app = application as MyApplication
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)

        binding.webView.setBackgroundColor(android.graphics.Color.TRANSPARENT)
        binding.webView.setLayerType(View.LAYER_TYPE_SOFTWARE, null)
        binding.webView.loadUrl("https://z7.si/wisfi/seznam")

        setupLightSensor()

        binding.onOff.setOnClickListener {
            if (binding.onOff.text == "ON") {
                binding.previewView.visibility = View.VISIBLE
                binding.onOff.text = "OFF"
                if (isCameraPermissionGranted()) {
                    startCamera()
                } else {
                    ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA), 10)
                }
            } else {
                binding.previewView.visibility = View.INVISIBLE
                binding.onOff.text = "ON"
                stopCamera()
            }
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

    private fun setupLightSensor() {
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
    }

    private fun requestCurrentLocation() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
            ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED
        ) return

        fusedLocationClient.lastLocation
            .addOnSuccessListener { location: Location? ->
                location?.let {
                    latitude = it.latitude
                    longitude = it.longitude
                    Log.d("Lokacija", "Trenutna lokacija: $latitude, $longitude")
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
        if (isCameraRunning) return
        isCameraRunning = true

        myCamera = MyCamera(
            context = this,
            lifecycleOwner = this,
            previewView = binding.previewView,
            isFrontCamera = false,
            captureIntervalMs = 500L
        ) { bitmap ->
            processAndDisplayImage(bitmap)
        }

        myCamera.startCamera()
    }

    private fun stopCamera() {
        if (!isCameraRunning) return
        isCameraRunning = false
        myCamera.stop()
        Log.d("Camera", "Kamera ustavljena")
    }

    private fun processAndDisplayImage(bitmap: Bitmap) {
        binding.webView.settings.javaScriptEnabled = true

        val image = InputImage.fromBitmap(bitmap, 0)
        val scanner = BarcodeScanning.getClient()

        scanner.process(image)
            .addOnSuccessListener { barcodes ->
                for (barcode in barcodes) {
                    val rawValue = barcode.rawValue
                    if (rawValue != null) {
                        Log.d("QR", "Najdeno: $rawValue")

                        val json = JSONObject().apply {
                            put("qr", rawValue)
                            put("lat", latitude ?: "ni na voljo")
                            put("lon", longitude ?: "ni na voljo")
                            put("light", lightLevel ?: "ni na voljo")
                        }

                        app.sendMessage("QR", json.toString())

                        if (rawValue != oldValue) {
                            binding.webView.loadUrl("https://z7.si/wisfi/seznam")
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

    override fun onDestroy() {
        super.onDestroy()
        stopCamera()
    }
}
