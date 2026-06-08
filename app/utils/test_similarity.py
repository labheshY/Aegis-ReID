import torch
from app.utils.similarity import cosine_similarity
from app.reid.reid_model import generate_embedding

#Load Target Embedding
target_embedding = torch.load("data/embeddings/person_1.pt")

#Generate Embedding to test similarity
test_embedding = generate_embedding("data/targets/person_1.jpg")

#Calculate Cosine Similarity
similarity_score = cosine_similarity(target_embedding, test_embedding)

print("Similrity: ",similarity_score)