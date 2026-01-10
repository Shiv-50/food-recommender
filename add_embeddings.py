import os
import json
import time
from utils.db import get_conn
from dotenv import load_dotenv
from utils.embedder import embed
load_dotenv()

conn = get_conn()
cur = conn.cursor()

BATCH_SIZE = 20     # Number of items per API call
RATE_LIMIT_SLEEP = 1.5   # Seconds to sleep between batches to avoid rate limits


cur.execute("SELECT id, name, key_ingredients, category_id FROM food")
foods = cur.fetchall()  # [(id, name, key_ingredients, category_id), ...]


def prepare_embedding_text(name, key_ingredients, category_id):
    """
    What to include for embeddings:
    - Food name
    - Key ingredients
    - Category path (optional, can help hierarchical recommendation)
    """
    text = f"{name}. Ingredients: {key_ingredients}."
    # Optionally, include category ID as context (or full category path if available)
    text += f" Category ID: {category_id}."
    return text


for i in range(0, len(foods), BATCH_SIZE):
    batch = foods[i:i+BATCH_SIZE]
    texts = [prepare_embedding_text(f[1], f[2], f[3]) for f in batch]

    # Call OpenAI embeddings


    embeddings = embed(texts)
    print(len(embeddings))

    # Insert embeddings into DB (assuming pgvector column: embedding vector(1536))
    for food, emb in zip(batch, embeddings):
        
        cur.execute(
            "UPDATE food SET embedding=%s WHERE id=%s",
            (emb, food[0])
        )

    conn.commit()
    time.sleep(RATE_LIMIT_SLEEP)  # respect rate limits

cur.close()
conn.close()
print("Food embeddings added successfully!")
