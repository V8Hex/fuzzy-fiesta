package com.fridgeful.ocr

import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class FridgefulOcrModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("FridgefulOcr")
    AsyncFunction("recognize") { uri: String, promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.reject("NO_CONTEXT", "The camera context is unavailable.", null)
      } else {
        try {
          val image = InputImage.fromFilePath(context, Uri.parse(uri))
          val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
          recognizer.process(image)
            .addOnSuccessListener { result ->
              // Row order, rather than ML Kit's text-block order, keeps product prices nearby.
              val rows = result.textBlocks.flatMap { it.lines }.sortedWith(compareBy({ it.boundingBox?.top ?: 0 }, { it.boundingBox?.left ?: 0 }))
              val grouped = mutableListOf<Pair<Int, MutableList<com.google.mlkit.vision.text.Text.Line>>>()
              for (row in rows) {
                val rect = row.boundingBox
                val center = rect?.centerY() ?: 0
                val tolerance = ((rect?.height() ?: 12) * 0.6).toInt().coerceAtLeast(4)
                val current = grouped.lastOrNull()
                if (current != null && kotlin.math.abs(current.first - center) <= tolerance) current.second.add(row)
                else grouped.add(center to mutableListOf(row))
              }
              promise.resolve(grouped.joinToString("\n") { (_, row) -> row.sortedBy { it.boundingBox?.left ?: 0 }.joinToString(" ") { it.text } })
              recognizer.close()
            }
            .addOnFailureListener { error ->
              promise.reject("OCR_FAILED", error.message ?: "Could not read the receipt.", error)
              recognizer.close()
            }
        } catch (error: Exception) {
          promise.reject("INVALID_IMAGE", error.message ?: "Could not open this photo.", error)
        }
      }
    }
  }
}
