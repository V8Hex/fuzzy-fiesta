import ExpoModulesCore
import Vision
import UIKit
import ImageIO

public class FridgefulOcrModule: Module {
  public func definition() -> ModuleDefinition {
    Name("FridgefulOcr")
    AsyncFunction("recognize") { (uri: String) -> String in
      guard let url = URL(string: uri), url.isFileURL,
            let image = UIImage(contentsOfFile: url.path), let cgImage = image.cgImage else {
        throw NSError(domain: "FridgefulOcr", code: 1, userInfo: [NSLocalizedDescriptionKey: "Could not open this receipt image."])
      }
      let orientations: [UIImage.Orientation: CGImagePropertyOrientation] = [
        .up: .up, .down: .down, .left: .left, .right: .right,
        .upMirrored: .upMirrored, .downMirrored: .downMirrored,
        .leftMirrored: .leftMirrored, .rightMirrored: .rightMirrored
      ]
      let request = VNRecognizeTextRequest()
      request.recognitionLevel = .accurate
      request.usesLanguageCorrection = false
      request.recognitionLanguages = ["en-US"]
      let handler = VNImageRequestHandler(cgImage: cgImage, orientation: orientations[image.imageOrientation] ?? .up, options: [:])
      try handler.perform([request])
      let results = (request.results ?? []).sorted { $0.boundingBox.midY > $1.boundingBox.midY }
      var groups: [[VNRecognizedTextObservation]] = []
      for observation in results {
        if let last = groups.last, let first = last.first,
           abs(first.boundingBox.midY - observation.boundingBox.midY) < max(first.boundingBox.height, observation.boundingBox.height) * 0.6 {
          groups[groups.count - 1].append(observation)
        } else { groups.append([observation]) }
      }
      return groups.map { row in
        row.sorted { $0.boundingBox.minX < $1.boundingBox.minX }.compactMap { $0.topCandidates(1).first?.string }.joined(separator: " ")
      }.joined(separator: "\n")
    }
  }
}
