"""
Pluggable face embedding models.
Supports 'facenet' via facenet-pytorch if installed, else falls back to ReID embedding.
"""
from typing import Any
from app.core.logger import logger
from app.core.config import DEFAULT_TRACKER_SETTINGS

try:
    from facenet_pytorch import InceptionResnetV1
    import torch
    FACENET_AVAILABLE = True
except Exception:
    FACENET_AVAILABLE = False

from app.reid.reid_model import generate_embedding as reid_generate_embedding


class FaceModel:
    def __init__(self, model_name: str = 'facenet'):
        self.model_name = model_name
        self.model = None
        self.device = 'cpu'
        if model_name == 'facenet' and FACENET_AVAILABLE:
            try:
                import torch
                self.model = InceptionResnetV1(pretrained='vggface2').eval()
                if torch.cuda.is_available():
                    self.device = 'cuda'
                    self.model = self.model.to('cuda')
                else:
                    self.device = 'cpu'
            except Exception:
                logger.exception('Failed to load FaceNet model')
                self.model = None

    def generate(self, image: Any):
        # image expected as numpy array BGR
        if self.model_name == 'facenet' and self.model is not None:
            try:
                import numpy as np
                import torch
                from PIL import Image
                from torchvision import transforms

                if isinstance(image, np.ndarray):
                    # convert BGR->RGB
                    img = Image.fromarray(image[:, :, ::-1])
                else:
                    img = Image.open(image).convert('RGB')

                preprocess = transforms.Compose([
                    transforms.Resize((160, 160)),
                    transforms.ToTensor(),
                    transforms.Normalize([0.5, 0.5, 0.5], [0.5, 0.5, 0.5])
                ])
                tensor = preprocess(img).unsqueeze(0)
                with torch.no_grad():
                    emb = self.model(tensor)
                return emb
            except Exception:
                logger.exception('Facenet embedding failed, falling back to ReID')

        # fallback to reid embedding
        return reid_generate_embedding(image)

    def generate_batch(self, images: list):
        """Generate embeddings for a list of images (numpy BGR arrays).
        Uses batch inference when FaceNet is available, otherwise falls back to per-image generate().
        Returns list of tensors on CPU.
        """
        if self.model_name == 'facenet' and self.model is not None:
            try:
                import numpy as np
                import torch
                from PIL import Image
                from torchvision import transforms

                imgs = []
                for image in images:
                    if isinstance(image, np.ndarray):
                        img = Image.fromarray(image[:, :, ::-1])
                    else:
                        img = Image.open(image).convert('RGB')
                    imgs.append(img)

                preprocess = transforms.Compose([
                    transforms.Resize((160, 160)),
                    transforms.ToTensor(),
                    transforms.Normalize([0.5, 0.5, 0.5], [0.5, 0.5, 0.5])
                ])
                tensors = torch.stack([preprocess(im) for im in imgs])
                if self.device == 'cuda':
                    tensors = tensors.to('cuda')
                with torch.no_grad():
                    emb = self.model(tensors)
                emb = emb.cpu()
                return [e for e in emb]
            except Exception:
                logger.exception('Batch facenet embedding failed, falling back to per-image')

        # fallback: per-image
        outs = []
        for im in images:
            outs.append(self.generate(im))
        return outs


def get_face_model(name: str | None = None) -> FaceModel:
    cfg_name = name or DEFAULT_TRACKER_SETTINGS.get('face_model', 'facenet')
    return FaceModel(cfg_name)
