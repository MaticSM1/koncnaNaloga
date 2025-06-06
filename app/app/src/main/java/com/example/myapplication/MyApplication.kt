package com.example.myapplication

import android.app.Application
import android.util.Log
import android.widget.Toast
import com.hivemq.client.mqtt.MqttClient
import com.hivemq.client.mqtt.MqttClientState
import com.hivemq.client.mqtt.mqtt3.Mqtt3BlockingClient
import com.hivemq.client.mqtt.datatypes.MqttQos
import java.nio.charset.StandardCharsets

class MyApplication : Application() {

    private lateinit var mqttClient: Mqtt3BlockingClient
    override fun onCreate() {
        super.onCreate()
        initMqttClient()
    }

    private fun initMqttClient() {
        mqttClient = MqttClient.builder()
            .useMqttVersion3()
//            .serverHost("193.95.229.123")
            .serverHost("10.0.2.2")
            .serverPort(1883)
            .identifier("android-client-${System.currentTimeMillis()}")
            .buildBlocking()

        try {
            mqttClient.connect()
            Log.i("MQTT", "Povezan na strežnik MQTT")
        } catch (e: Exception) {
            Log.e("MQTT", "Napaka pri povezavi: ${e.message}")
        }
    }

    fun sendMessage(topic: String, message: String) {
        try {
            if (mqttClient.state != MqttClientState.CONNECTED) {
                mqttClient.connect()
            }

            mqttClient.publishWith()
                .topic(topic)
                .qos(MqttQos.AT_LEAST_ONCE)
                .payload(message.toByteArray(StandardCharsets.UTF_8))
                .send()

            Toast.makeText(this, "Sporočilo poslano na '$topic'", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Log.e("MQTT", "Napaka pri pošiljanju: ${e.message}")
            Toast.makeText(this, "Napaka pri pošiljanju: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    fun sendRawBytesMessage(topic: String, data: ByteArray) {
        try {
            if (mqttClient.state != MqttClientState.CONNECTED) {
                mqttClient.connect()
            }

            mqttClient.publishWith()
                .topic(topic)
                .qos(MqttQos.AT_LEAST_ONCE)
                .payload(data) // NE toString, NE Base64
                .send()

            Toast.makeText(this, "Sporočilo poslano na '$topic'", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Log.e("MQTT", "Napaka pri pošiljanju: ${e.message}")
            Toast.makeText(this, "Napaka pri pošiljanju: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }


}
