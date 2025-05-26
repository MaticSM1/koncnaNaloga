package com.example.myapplication

import android.os.Bundle
import android.widget.Button
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import okhttp3.*
import org.eclipse.paho.android.service.MqttAndroidClient
import org.eclipse.paho.client.mqttv3.IMqttActionListener
import org.eclipse.paho.client.mqttv3.IMqttToken
import org.eclipse.paho.client.mqttv3.MqttConnectOptions
import java.io.IOException

class Settings : AppCompatActivity() {

    private val client = OkHttpClient()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)

        enableEdgeToEdge()

        val pingButton = findViewById<Button>(R.id.ping)
        pingButton.setOnClickListener {
            sendPingRequest()
        }

        val mqttButton = findViewById<Button>(R.id.mqtt)
        mqttButton.setOnClickListener {
            connectToMqttBroker()
        }

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }
    }

    private fun sendPingRequest() {
        val request = Request.Builder()
            .url("http://10.0.2.2:3000/ping")
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                runOnUiThread {
                    Toast.makeText(this@Settings, "Ping failed: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }

            override fun onResponse(call: Call, response: Response) {
                runOnUiThread {
                    if (response.isSuccessful) {
                        Toast.makeText(this@Settings, "Ping success!", Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(this@Settings, "Ping error: ${response.code}", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        })
    }

    private fun connectToMqttBroker() {
        val mqttClient = MqttAndroidClient(
            applicationContext,
            "tcp://broker.hivemq.com:1883",
            "AndroidClient" + System.currentTimeMillis()
        )
        val options = MqttConnectOptions().apply {
            isCleanSession = true
        }

        mqttClient.connect(options, null, object : IMqttActionListener {
            override fun onSuccess(asyncActionToken: IMqttToken?) {
                runOnUiThread {
                    Toast.makeText(this@Settings, "Connected to MQTT broker!", Toast.LENGTH_SHORT).show()
                }
            }

            override fun onFailure(asyncActionToken: IMqttToken?, exception: Throwable?) {
                runOnUiThread {
                    Toast.makeText(this@Settings, "Failed to connect: ${exception?.message}", Toast.LENGTH_SHORT).show()
                }
            }
        })
    }
}