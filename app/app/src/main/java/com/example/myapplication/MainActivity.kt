package com.example.myapplication

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import com.example.myapplication.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        val sharedPrefs = getSharedPreferences("prefs", Context.MODE_PRIVATE)
        val UUID = sharedPrefs.getString("UUID", null)
        if(UUID != null) binding.loginButton.setText("MAIN")
        else binding.loginButton.setText("LOG IN")

        binding.settingsButton.setOnClickListener {
            val intent = Intent(this, Settings::class.java)
            startActivity(intent)
        }

        binding.authenticate.setOnClickListener {
            val intent = Intent(this, Authenticate::class.java)
            startActivity(intent)
        }
        binding.loginButton.setOnClickListener {

            val intent = if (binding.loginButton.text == "LOG IN") {
                Intent(this, Login::class.java)
            } else {
                Intent(this, Cam::class.java)
            }
            startActivity(intent)
        }


    }
}
