from PIL import Image
from torchvision import transforms
import numpy as np
import torch
import torchreid

#Load Pretrained OsNet Model for Person Re-Identification
model = torchreid.models.build_model(
    name="osnet_x1_0",
    num_classes=1000,
    pretrained=True
)

model.eval()

#Image Preprocessing
transform = transforms.Compose([transforms.Resize((256,128)),
                                transforms.ToTensor(),
                                transforms.Normalize(
                                    mean=[0.485, 0.456, 0.406],
                                    std=[0.229, 0.224, 0.225]
                                )])

def generate_embedding(image_input):
    
    if isinstance(image_input, np.ndarray):
        image_input = image_input[:, :, : :-1] # Convert BGR to RGB
        image = Image.fromarray(image_input)
    else:
        #Load Image
        image = Image.open(image_input).convert("RGB")

    #Transform Image
    image_tensor = transform(image)

    #Add Batch Dimension
    image_tensor = image_tensor.unsqueeze(0)

    #Generate Embedding
    with torch.no_grad():
        embedding = model(image_tensor)

    return embedding