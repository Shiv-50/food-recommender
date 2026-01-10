import  json, os
from psycopg import sql
from dotenv import load_dotenv
from utils.db import get_conn
load_dotenv()
conn=get_conn()
cur=conn.cursor()

with open("recipes_with_key_ingredients.json") as f:
    data = json.load(f)

category_cache = {}

def get_or_create_category(name, parent):
    key = (name,parent)
    if key in category_cache:
        return category_cache[key]

    cur.execute("""
        INSERT INTO categories(name,parent_id)
        VALUES(%s,%s)
        ON CONFLICT(name,parent_id) DO UPDATE SET name=EXCLUDED.name
        RETURNING id
    """,(name,parent))

    cid = cur.fetchone()[0]
    category_cache[key]=cid
    return cid

food_rows=[]

for r in data:
    parent=None
    for cat in r["category"]:
        parent=get_or_create_category(cat.strip(),parent)

    food_rows.append((
        r["name"],
        parent,
        r["key_ingredients"],
        json.dumps(r["nutrition"])
    ))

cur.executemany( """
INSERT INTO food(name,category_id,key_ingredients,nutrition)
VALUES (%s, %s, %s, %s)
""",food_rows)

conn.commit()
cur.close()
conn.close()
print("Food ingested.")
