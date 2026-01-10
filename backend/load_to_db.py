import json
import time
from utils.db import get_conn
from utils.embedder import embed

with open("allrecipes_data.json") as f:
    foods=json.load(f)

conn=get_conn()
cur=conn.cursor()



for i, food in enumerate(foods):
    text = f"{food['name']}. Ingredients: {', '.join(food['ingredients'])}. Category: {' > '.join(food['category'])}"
    vec = embed(text)

    cur.execute("""
        INSERT INTO recipes(name, ingredients, category, nutrition, embedding)
        VALUES (%s,%s,%s,%s,%s)
    """, (
        food["name"],
        food["ingredients"],
        food["category"],
        json.dumps(food["nutrition"]),
        vec
    ))

    if (i+1) % 50 == 0:
        print("Sleeping for 60s to avoid quota...")
        time.sleep(60)


conn.commit()
cur.close(); conn.close()
print("Loaded to Neon.")
