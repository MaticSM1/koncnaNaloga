package com.example.myapplication

import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.example.myapplication.databinding.ActivitySettingsBinding
import com.hivemq.client.mqtt.MqttClient
import com.hivemq.client.mqtt.datatypes.MqttQos
import java.nio.charset.StandardCharsets

class Settings : AppCompatActivity() {

    private lateinit var binding: ActivitySettingsBinding

    private val TAG = "SettingsMQTT"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.ping.setOnClickListener {
            connectAndPing()
        }
    }

    private fun connectAndPing() {
        val client = MqttClient.builder()
            .useMqttVersion3()
            .serverHost("193.95.229.123")
            .serverPort(1883)
            .identifier("android-client-${System.currentTimeMillis()}")
            .buildBlocking()


        try {
            Log.d(TAG, "Poskušam se povezati na MQTT broker...")
            client.connect()

            Log.d(TAG, "Povezava uspešna.")
            Log.d(TAG, "Pošiljam sporočilo 'ping' na test/ping...")
            client.publishWith()
                .topic("test/ping")
                .qos(MqttQos.AT_LEAST_ONCE)
                .payload("ping".toByteArray(StandardCharsets.UTF_8))
                .send()
            Log.d(TAG, "Sporočilo poslano.")

            Toast.makeText(this, "Ping objavljen (HiveMQ)", Toast.LENGTH_SHORT).show()

            client.disconnect()
            Log.d(TAG, "Odklopljen od MQTT brokerja.")
        } catch (e: Exception) {
            Log.e(TAG, "Napaka pri povezavi ali pošiljanju: ${e.message}", e)
            Toast.makeText(this, "Napaka pri povezavi: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }
}
