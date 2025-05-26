package com.example.myapplication
import android.os.Bundle
import android.util.Log
import android.widget.Button
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.hivemq.client.mqtt.MqttClient
import com.hivemq.client.mqtt.mqtt3.Mqtt3AsyncClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class Settings : AppCompatActivity() {

    private lateinit var client: Mqtt3AsyncClient

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)

        val mqttButton = findViewById<Button>(R.id.mqtt)
        mqttButton.setOnClickListener {
            connectToMqttBroker()
        }
    }

    private fun connectToMqttBroker() {
        client = MqttClient.builder()
            .useMqttVersion3()
            .serverHost("broker.hivemq.com")
            .serverPort(1883)
            .buildAsync()

        lifecycleScope.launch(Dispatchers.IO) {
            try {
                client.connect().get()

                withContext(Dispatchers.Main) {
                    Toast.makeText(this@Settings, "Povezava uspešna", Toast.LENGTH_SHORT).show()
                }

                client.subscribeWith()
                    .topicFilter("test/topic")
                    .callback { publish ->
                        val payloadOpt = publish.payload
                        val msg = if (payloadOpt.isPresent) {
                            val buffer = payloadOpt.get()
                            val bytes = ByteArray(buffer.remaining())
                            buffer.get(bytes)
                            String(bytes, Charsets.UTF_8)
                        } else {
                            "Ni podatka"
                        }
                        // Ker smo že v korutini, z uporabo lifecycleScope, lahko Toast kličemo na UI niti
                        lifecycleScope.launch(Dispatchers.Main) {
                            Toast.makeText(this@Settings, "Prejeto: $msg", Toast.LENGTH_SHORT).show()
                        }
                    }
                    .send()
                    .get()

            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(this@Settings, "Napaka: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }
}


