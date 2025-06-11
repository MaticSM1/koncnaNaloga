package com.example.myapplication

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.location.Location
import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.example.myapplication.databinding.ActivityCamBinding
import com.example.myapplication.utils.MyCamera
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.common.InputImage
import org.json.JSONObject

class Cam : AppCompatActivity() {

    private lateinit var binding: ActivityCamBinding
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var app: MyApplication
    private var lightLevel: Float? = null
    private var latitude: Double? = null
    private var longitude: Double? = null
    private var oldValue: String = ""
    private var flashEnabled: Boolean = false

    private var myCamera: MyCamera? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityCamBinding.inflate(layoutInflater)
        setContentView(binding.root)

        app = application as MyApplication
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)

        binding.webView.setBackgroundColor(Color.TRANSPARENT)
        binding.webView.setLayerType(android.view.View.LAYER_TYPE_SOFTWARE, null)

        setupLightSensor()

        binding.back.setOnClickListener { finish() }
        binding.history.setOnClickListener{
            val intent = Intent(this, History::class.java)
            startActivity(intent)
        }

        if (isCameraPermissionGranted()) startCamera()
        else ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA), 10)

        if (isLocationPermissionGranted()) requestCurrentLocation()
        else ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.ACCESS_FINE_LOCATION), 11)
    }

    private fun setupLightSensor() {
        val sensorManager = getSystemService(SENSOR_SERVICE) as SensorManager
        val lightSensor = sensorManager.getDefaultSensor(Sensor.TYPE_LIGHT)
        lightSensor?.let {
            sensorManager.registerListener(object : SensorEventListener {
                override fun onSensorChanged(event: SensorEvent?) {
                    lightLevel = event?.values?.get(0)
                }
                override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
            }, lightSensor, SensorManager.SENSOR_DELAY_NORMAL)
        } ?: Toast.makeText(this, "Senzor svetlobe ni na voljo", Toast.LENGTH_SHORT).show()
    }

    private fun isCameraPermissionGranted(): Boolean {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
    }

    private fun isLocationPermissionGranted(): Boolean {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
    }

    private fun requestCurrentLocation() {
        if (!isLocationPermissionGranted()) return

        try {
            fusedLocationClient.lastLocation.addOnSuccessListener { location: Location? ->
                location?.let {
                    latitude = it.latitude
                    longitude = it.longitude
                }
            }
        } catch (e: SecurityException) {
            Log.e("Cam", "Manjka dovoljenje za lokacijo: ${e.message}", e)
        }
    }

    private fun startCamera() {
        myCamera = MyCamera(
            context = this,
            lifecycleOwner = this,
            previewView = binding.previewView,
            isFrontCamera = false,
            captureIntervalMs = 100L
        ) { bitmap ->
            requestCurrentLocation()
            val image = InputImage.fromBitmap(bitmap, 0)
            val scanner = BarcodeScanning.getClient()
            scanner.process(image)
                .addOnSuccessListener { barcodes ->
                    for (barcode in barcodes) {
                        val rawValue = barcode.rawValue ?: continue
                        Toast.makeText(this, "QR najden: $rawValue", Toast.LENGTH_LONG).show()

                        val json = JSONObject().apply {
                            put("qr", rawValue)
                            put("lat", latitude ?: "ni na voljo")
                            put("lon", longitude ?: "ni na voljo")
                            put("light", lightLevel ?: "ni na voljo")
                        }

                        if (rawValue != oldValue) {
                            app.sendMessage("QR", json.toString())
                            binding.webView.loadUrl("https://z7.si/wisfi/izdelek?id=$rawValue")
                            oldValue = rawValue
                            val treshold = 10000000
                            if (lightLevel != null && lightLevel!! < treshold && !flashEnabled) {
                                myCamera?.flashOn(true)
                                flashEnabled = true
                            }
                            else if (lightLevel != null && lightLevel!! >= treshold && flashEnabled) {
                                myCamera?.flashOn(false)
                                flashEnabled = false
                            }

                        }

                        break
                    }
                }
                .addOnFailureListener {
                    Log.e("QR", "Napaka pri branju QR kode: ${it.message}", it)
                }
        }

        myCamera?.startCamera()
    }

    override fun onDestroy() {
        super.onDestroy()
        myCamera?.stop()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        when (requestCode) {
            10 -> if (grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) startCamera()
            11 -> if (grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) requestCurrentLocation()
        }
    }
}
