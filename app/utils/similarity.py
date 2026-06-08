import torch
import torch.nn.functional as F

def cosine_similarity(embedding1, embedding2):
    # Ensure tensors
    if not torch.is_tensor(embedding1):
        embedding1 = torch.tensor(embedding1)
    if not torch.is_tensor(embedding2):
        embedding2 = torch.tensor(embedding2)

    # Make sure tensors have a batch dimension
    if embedding1.dim() == 1:
        embedding1 = embedding1.unsqueeze(0)
    if embedding2.dim() == 1:
        embedding2 = embedding2.unsqueeze(0)

    similarity = F.cosine_similarity(embedding1, embedding2, dim=1)
    return float(similarity.item())