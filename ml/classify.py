import sys

# Try to import torch, but make it optional for now
try:
    import torch
    from torch.serialization import safe_globals
    import torchvision.transforms as transforms
    import torchvision.models as models
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    print("WARNING: PyTorch not installed. Using mock predictions for testing.")

from PIL import Image

# Helper to load a model checkpoint safely
def _load_model_checkpoint(model_instance, checkpoint_path):
    """Attempt to load a state_dict. Fall back to full model object if needed."""
    try:
        checkpoint = torch.load(checkpoint_path, map_location=torch.device("cpu"))

        # If checkpoint is a dict and contains model keys, load state_dict.
        if isinstance(checkpoint, dict) and not any(key in checkpoint for key in ["_modules", "_parameters"]):
            model_instance.load_state_dict(checkpoint)
            return model_instance

        # Otherwise, checkpoint may be the full model object.
        if hasattr(checkpoint, "eval"):
            return checkpoint

        # Fallback: assume checkpoint is state_dict-like
        model_instance.load_state_dict(checkpoint)
        return model_instance
    except Exception as exc:
        raise RuntimeError(f"Failed to load model checkpoint from {checkpoint_path}: {exc}")


# Load models if torch is available
if TORCH_AVAILABLE:
    try:
        safe_globals(["torchvision.models.efficientnet.EfficientNet"])
    except Exception:
        pass

    efficientnet = None
    resnet = None
    mobilenet = None

    try:
        # Build model architectures first, then load state_dict
        efficientnet = models.efficientnet_b0(pretrained=False)
        efficientnet.classifier[1] = torch.nn.Linear(efficientnet.classifier[1].in_features, 8)
        efficientnet = _load_model_checkpoint(efficientnet, "models/efficientnet.pth")
        efficientnet.eval()

        resnet = models.resnet18(pretrained=False)
        resnet.fc = torch.nn.Linear(resnet.fc.in_features, 8)
        resnet = _load_model_checkpoint(resnet, "models/resnet.pth")
        resnet.eval()

        mobilenet = models.mobilenet_v3_small(pretrained=False)
        mobilenet.classifier[3] = torch.nn.Linear(mobilenet.classifier[3].in_features, 8)
        mobilenet = _load_model_checkpoint(mobilenet, "models/mobilenet.pth")
        mobilenet.eval()

        MODELS_LOADED = True
    except Exception as e:
        print(f"WARNING: Could not load models: {e}. Using mock predictions.")
        MODELS_LOADED = False
        efficientnet = None
        resnet = None
        mobilenet = None
else:
    MODELS_LOADED = False
    efficientnet = None
    resnet = None
    mobilenet = None

# Class Labels
classes = ["Cellulitis", "Impetigo", "Athlete-foot", "Nail-fungus",
           "Ringworm", "Cutaneous-larva-migrans", "Chickenpox", "Shingles"]

# Preprocess the image
def preprocess_image(image: Image.Image):
    if TORCH_AVAILABLE:
        transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])
        return transform(image).unsqueeze(0)  # Add batch dimension
    else:
        # Mock preprocessing when torch is not available
        image.thumbnail((224, 224))
        return image

# Ensemble classification
def ensemble_classify(img: Image.Image) -> list:
    """
    Classify skin disease using ensemble of models
    Returns top 3 predictions with probabilities
    """
    
    if not TORCH_AVAILABLE or not MODELS_LOADED:
        # Return mock predictions for testing when torch is not available
        import random
        mock_probs = [random.random() for _ in classes]
        total = sum(mock_probs)
        mock_probs = [p / total for p in mock_probs]  # Normalize
        
        top_3_indices = sorted(range(len(mock_probs)), key=lambda i: mock_probs[i], reverse=True)[:3]
        top_3_predictions = [(classes[i], float(round(mock_probs[i], 4))) for i in top_3_indices]
        print(f"[TEST MODE] Using mock predictions: {top_3_predictions}")
        return top_3_predictions
    
    # Original torch-based implementation
    if not (efficientnet and resnet and mobilenet):
        raise RuntimeError("Models are not loaded for torch-based inference")

    image_tensor = preprocess_image(img)

    # Get predictions from each model
    with torch.no_grad():
        output1 = efficientnet(image_tensor)
        output2 = resnet(image_tensor)
        output3 = mobilenet(image_tensor)

    # Average the predictions
    final_output = (output1 + output2 + output3) / 3
    probabilities = torch.nn.functional.softmax(final_output, dim=1).squeeze().tolist()

    # Get top 3 predictions
    top_3_indices = sorted(range(len(probabilities)), key=lambda i: probabilities[i], reverse=True)[:3]
    top_3_predictions = [(classes[i], probabilities[i]) for i in top_3_indices]

    return top_3_predictions
