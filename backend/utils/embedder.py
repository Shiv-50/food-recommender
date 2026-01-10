import google.genai as genai
from google.genai import types
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# ---------------------------
# Setup
# ---------------------------
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))



def embed(texts: list):

    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=texts
    )

    embeddings = [r.embedding for r in response.data]

    return embeddings
