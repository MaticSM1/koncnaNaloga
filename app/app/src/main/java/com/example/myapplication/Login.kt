package com.example.myapplication

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.example.myapplication.databinding.ActivityLoginBinding
import org.json.JSONObject

class Login : AppCompatActivity() {
    private lateinit var binding: ActivityLoginBinding
    private lateinit var app: MyApplication
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        app = application as MyApplication
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.signOrLog.setOnClickListener {
            binding.signOrLog.text = if (binding.signOrLog.text == "Already a member? Log in")
                "Not a member yet? Register"
            else
                "Already a member? Log in"

            binding.loginButton.text = if (binding.loginButton.text == "Register")
                "Log in"
            else
                "Register"
        }

        binding.loginButton.setOnClickListener {
            val email = binding.emailEditText.text.toString()
            val password = binding.passwordEditText.text.toString()

            if (email.isEmpty() || password.isEmpty()) {
                Toast.makeText(this, "Please enter email and password", Toast.LENGTH_SHORT).show()
            }

            if (binding.loginButton.text == "Log in")
                signInUser(email, password)
            else
                createUser(email, password)
        }
    }

    private fun signInUser(email: String, password: String) {
        val sharedPreferences = getSharedPreferences("prefs", Context.MODE_PRIVATE)
        sharedPreferences.edit().putString("username", email).apply()
        app.subscribe()
        app.onMqttMessage = { topic, message ->
            if (topic == email) {
                runOnUiThread {
                    binding.signOrLog.text= message
                    if(message == "ok"){
                        app.setUUID()
                        val intent = Intent(this, Login_second_step::class.java)
                        startActivity(intent)
                    }else{
                        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }
        val uuid = app.setUUID()
        val jsonObject = JSONObject()
        jsonObject.put("username", email)
        jsonObject.put("password", password)
        jsonObject.put("UUID", uuid)

        app.sendMessage("login", jsonObject.toString())
    }


    private fun createUser(email: String, password: String) {
        val sharedPreferences = getSharedPreferences("prefs", Context.MODE_PRIVATE)
        sharedPreferences.edit().putString("username", email).apply()
        app.subscribe()
        app.onMqttMessage = { topic, message ->
            if (topic == email) {
                runOnUiThread {
                    binding.signOrLog.text= message
                    if(message == "ok"){
                        val intent = Intent(this, Login_second_step::class.java)
                        startActivity(intent)
                    }else{
                        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }


        val uuid = app.setUUID()
        val jsonObject = JSONObject()
        jsonObject.put("username", email)
        jsonObject.put("password", password)
        jsonObject.put("UUID", uuid)
        app.sendMessage("register", jsonObject.toString())

    }
}
