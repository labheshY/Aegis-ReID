from app.reid.reid_model import generate_embedding
import torch

embedding = generate_embedding("data/targets/person_1.jpg")

torch.save(embedding, "data/embeddings/person_1.pt")

print("Embedding saved!")