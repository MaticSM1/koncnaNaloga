package com.example.myapplication

import android.content.Context
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.example.myapplication.databinding.ActivityHistoryBinding


class History : AppCompatActivity() {

    private lateinit var binding: ActivityHistoryBinding
    private lateinit var app: MyApplication

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityHistoryBinding.inflate(layoutInflater)
        setContentView(binding.root)

        app = application as MyApplication

        binding.webView.setBackgroundColor(android.graphics.Color.TRANSPARENT)
        binding.webView.setLayerType(View.LAYER_TYPE_SOFTWARE, null)
        binding.webView.settings.javaScriptEnabled = true
        val sharedPreferences = getSharedPreferences("prefs", Context.MODE_PRIVATE)
        val user = sharedPreferences.getString("username", null)
        Toast.makeText(this, user, Toast.LENGTH_SHORT).show()
        binding.webView.loadUrl("https://z7.si/wisfi/history?id=$user")
        binding.back.setOnClickListener { finish() }
    }
}
