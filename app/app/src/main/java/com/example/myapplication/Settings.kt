package com.example.myapplication

import android.content.Context
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.widget.addTextChangedListener
import com.example.myapplication.databinding.ActivitySettingsBinding

class Settings : AppCompatActivity() {

    private lateinit var binding: ActivitySettingsBinding
    lateinit var app: MyApplication
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)
        app = application as MyApplication

        val sharedPrefs = getSharedPreferences("prefs", Context.MODE_PRIVATE)
        val addr = sharedPrefs.getString("addr", "")
        val port = sharedPrefs.getString("port", "")
        val server = addr+ ':' + port
        binding.MqqtAddr.setText(server)

        fun connectToMqqt(input:String){
            val server = input.split(':')
            val addr = server[0];
            val port = server[1];
            val sharedPrefs = getSharedPreferences("prefs", Context.MODE_PRIVATE)
            sharedPrefs.edit().putString("addr", addr).apply()
            sharedPrefs.edit().putString("port", port).apply()
            app.initMqttClient()
        }

        binding.ping.setOnClickListener {
            Toast.makeText(this, "Ping poslan iz Settings", Toast.LENGTH_SHORT).show()
        }

//        binding.MqqtAddr.setOnFocusChangeListener { _, hasFocus ->
//            if (!hasFocus) {
//                val input = binding.MqqtAddr.text.toString().trim()
//                connectToMqqt(input)
//            }
//        }

        binding.server.setOnClickListener{
            val server ="193.95.229.123:1883"
            binding.MqqtAddr.setText(server)
            connectToMqqt(server)
        }

        binding.local.setOnClickListener{
            val local = "10.0.2.2:1883"
            binding.MqqtAddr.setText(local)
            connectToMqqt(local)
        }

        binding.back.setOnClickListener{
            finish()
        }
        binding.logout.setOnClickListener{
            app.logout()
            finish()
        }
    }
}