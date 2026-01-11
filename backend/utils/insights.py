from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI()

def generate_taste_insight(liked_foods, liked_categories, disliked_foods, disliked_categories,super):
    liked_food_text = ", ".join(
        f"{name} ({', '.join(ings or [])})" for name, ings in liked_foods
    )
    liked_cat_text = ", ".join(c[0] for c in liked_categories)

    disliked_food_text = ", ".join(
        f"{name} ({', '.join(ings or [])})" for name, ings in disliked_foods
    )
    disliked_cat_text = ", ".join(c[0] for c in disliked_categories)
    super_text = f" {super[0]} ({', '.join(super[1] or [])})  "
    prompt = f"""
User liked the following foods: {liked_food_text}
User liked the following categories: {liked_cat_text}
User disliked the following foods: {disliked_food_text}
User disliked the following categories: {disliked_cat_text}
Final chosen food or category (super swiped): {super_text}
Infer the user's taste preference and current food mood in 2 short sentences.
Be friendly, natural and non-repetitive.
"""

    res = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7
    )

    return res.choices[0].message.content.strip()
