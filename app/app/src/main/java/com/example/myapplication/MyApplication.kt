package com.example.myapplication

import android.app.Application
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.widget.Toast
import com.hivemq.client.mqtt.MqttClient
import com.hivemq.client.mqtt.MqttClientState
import com.hivemq.client.mqtt.MqttGlobalPublishFilter
import com.hivemq.client.mqtt.mqtt3.Mqtt3BlockingClient
import com.hivemq.client.mqtt.datatypes.MqttQos
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.nio.charset.StandardCharsets
import java.util.UUID

class MyApplication : Application() {

    private lateinit var mqttClient: Mqtt3BlockingClient

    var onMqttMessage: ((topic: String, message: String) -> Unit)? = null

    override fun onCreate() {
        super.onCreate()


        initMqttClient()

    }

    fun initMqttClient() {
        val sharedPrefs = getSharedPreferences("prefs", Context.MODE_PRIVATE)
        val editor = sharedPrefs.edit()
        val defaultAddr = "193.95.229.123"
        val defaultPort = "1883"
        val addr = sharedPrefs.getString("addr", null) ?: run {
            editor.putString("addr", defaultAddr)
            defaultAddr
        }
        val port = sharedPrefs.getString("port", null) ?: run {
            editor.putString("port", defaultPort)
            defaultPort
        }
        val uuid = setUUID()
        editor.apply()

        // Launch on IO thread
        CoroutineScope(Dispatchers.IO).launch {
            try {
                mqttClient = MqttClient.builder()
                    .useMqttVersion3()
                    .serverHost(addr)
                    .serverPort(port.toInt())
                    .identifier("android-client-${System.currentTimeMillis()}")
                    .buildBlocking()

                mqttClient.connect()
                sendMessage("UUID", uuid)

                withContext(Dispatchers.Main) {
                    Toast.makeText(this@MyApplication, "Povezava uspešna", Toast.LENGTH_SHORT).show()

                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(this@MyApplication, "Povezava ni uspešna", Toast.LENGTH_SHORT).show()
                }
            }
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
                .payload(data)
                .send()

            Toast.makeText(this, "Sporočilo poslano na '$topic'", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Log.e("MQTT", "Napaka pri pošiljanju: ${e.message}")
            Toast.makeText(this, "Napaka pri pošiljanju: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    fun subscribe() {
        val sharedPreferences = getSharedPreferences("prefs", Context.MODE_PRIVATE)
        val username = sharedPreferences.getString("username", "") ?: ""
        try {
            mqttClient.subscribeWith()
                .topicFilter(username)
                .qos(MqttQos.AT_MOST_ONCE)
                .send()

            Thread {
                while (true) {
                    try {
                        val publish = mqttClient.publishes(MqttGlobalPublishFilter.ALL).receive()
                        val message = String(publish.payloadAsBytes, StandardCharsets.UTF_8)

                        if (publish.topic.toString() == username) {
                            Log.d("MQTT", "Prejeto sporočilo na temi '$username': $message")

                            Handler(Looper.getMainLooper()).post {
                                onMqttMessage?.invoke(username, message)
                            }
                        }
                    } catch (e: Exception) {
                        Log.e("MQTT", "Napaka pri sprejemu: ${e.message}")
                    }
                }
            }.start()

        } catch (e: Exception) {
            Log.e("MQTT", "Napaka pri naročanju: ${e.message}")
        }
    }

    fun setUUID(): String {
        val sharedPreferences = getSharedPreferences("prefs", Context.MODE_PRIVATE)
        val existingUUID = sharedPreferences.getString("UUID", null)

        if (existingUUID != null) {
            return existingUUID
        } else {
            val uuid = UUID.randomUUID().toString()
            sharedPreferences.edit().putString("UUID", uuid).apply()
            return uuid
        }
    }

    fun logout() {
        val sharedPreferences = getSharedPreferences("prefs", Context.MODE_PRIVATE)
        val editor = sharedPreferences.edit()
        editor.clear()
        editor.apply()
        Toast.makeText(this, "Odjava uspesna", Toast.LENGTH_LONG).show()
    }


}