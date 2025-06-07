package com.example.myapplication

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.example.myapplication.databinding.ActivityLoginBinding

class Login : AppCompatActivity() {
    private lateinit var binding: ActivityLoginBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.signOrLog.setOnClickListener {
            binding.signOrLog.text = if (binding.signOrLog.text == "Already a member? Log in")
                "Not a member yet? Register"
            else
                "Already a member? Log in"

            binding.loginButton.text = if (binding.loginButton.text == "Log in")
                "Sign in"
            else
                "Log in"
        }

        binding.loginButton.setOnClickListener {
            val email = binding.emailEditText.text.toString()
            val password = binding.passwordEditText.text.toString()

            if (email.isEmpty() || password.isEmpty()) {
                Toast.makeText(this, "Please enter email and password", Toast.LENGTH_SHORT).show()
                return@setOnClickListener // <- Ustavi naprej
            }

            if (binding.loginButton.text == "Log in")
                signInUser(email, password)
            else
                createUser(email, password)
        }
    }

    private fun signInUser(email: String, password: String) {
        Toast.makeText(this, "Logging in user: $email", Toast.LENGTH_SHORT).show()
    }

    private fun createUser(email: String, password: String) {
        Toast.makeText(this, "Creating user: $email", Toast.LENGTH_SHORT).show()
    }
}
