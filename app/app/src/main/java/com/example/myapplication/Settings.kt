package com.example.myapplication

import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.example.myapplication.databinding.ActivitySettingsBinding

class Settings : AppCompatActivity() {

    private lateinit var binding: ActivitySettingsBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.ping.setOnClickListener {
            // Pridobi instanco Application in pokliči funkcijo
            val app = application as MyApplication
            app.sendMessage("nigger", "nigger")
            Toast.makeText(this, "Ping poslan iz Settings", Toast.LENGTH_SHORT).show()
        }
    }
}

