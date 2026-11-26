package com.kaizen.viewer

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast

class MainActivity : Activity() {
    private lateinit var selectedFileText: TextView

    @Suppress("DEPRECATION")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(32, 40, 32, 40)
            setBackgroundColor(0xFF101820.toInt())
        }
        val title = TextView(this).apply {
            text = "KAIZEN 3D VIEWER"
            textSize = 26f
            gravity = Gravity.CENTER
            setTextColor(0xFFFFFFFF.toInt())
        }
        val subtitle = TextView(this).apply {
            text = "Mobile engineering model viewer"
            textSize = 15f
            gravity = Gravity.CENTER
            setTextColor(0xFFB8C7D1.toInt())
            setPadding(0, 12, 0, 32)
        }
        val chooseButton = Button(this).apply {
            text = "OPEN 3D FILE"
            setOnClickListener {
                val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "*/*"
                }
                startActivityForResult(intent, REQUEST_OPEN_FILE)
            }
        }
        selectedFileText = TextView(this).apply {
            text = "No file selected"
            textSize = 14f
            gravity = Gravity.CENTER
            setTextColor(0xFFFFFFFF.toInt())
            setPadding(0, 28, 0, 0)
        }
        val note = TextView(this).apply {
            text = "STEP and IFC 3D rendering will be added in a later development phase."
            textSize = 12f
            gravity = Gravity.CENTER
            setTextColor(0xFFFFCC80.toInt())
            setPadding(0, 36, 0, 0)
        }
        root.addView(title, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        root.addView(subtitle, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        root.addView(chooseButton, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        root.addView(selectedFileText, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        root.addView(note, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        setContentView(root)
    }

    @Deprecated("Deprecated by Android; retained for broad platform compatibility")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_OPEN_FILE && resultCode == RESULT_OK) {
            val uri: Uri? = data?.data
            if (uri != null) {
                selectedFileText.text = "Selected file:\n" + (uri.lastPathSegment ?: uri.toString())
                Toast.makeText(this, "File selected", Toast.LENGTH_SHORT).show()
            }
        }
    }

    companion object {
        private const val REQUEST_OPEN_FILE = 1001
    }
}
