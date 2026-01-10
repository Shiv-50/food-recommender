🍽️ Swipe-Based Food Recommendation System

A Tinder-style food discovery app where users swipe categories and food items.
The system progressively understands user intent and recommends more specific foods using an intent vector + hierarchical category traversal.

🧠 How It Works

App starts with a random root category

User swipes:

Right (Like) → go deeper into child categories / update intent vector

Left (Nope) → move to sibling / parent category

When a leaf category is reached → food items are shown

Food swipes update the intent vector embedding

Similar foods are retrieved using pgvector similarity search

If foods are exhausted → system returns to categories automatically

🏗️ Architecture
Next.js Frontend  →  FastAPI Backend  →  PostgreSQL + pgvector

Component	Tech
Frontend	Next.js (React)
Backend	FastAPI
Database	PostgreSQL + pgvector
Recommendation Engine	SwipeBrain (intent vector + category tree)
Similarity Search	embedding <-> intent_vector
📂 Database Tables
categories
column	type
id	int
name	text
parent_id	int (nullable)
food
column	type
id	int
name	text
category_id	int
key_ingredients	text[]
embedding	vector
swipe_sessions

| id | uuid |

session_category

| session_id | uuid |
| category_id | int |
| swipe_type | text |

session_food

| session_id | uuid |
| food_id | int |
| swipe_type | text |

session_memory

| session_id | uuid |
| current_category | int |
| intent_vector | vector |

🔥 API Endpoints
Endpoint	Method	Description
/start/{sid}	GET	Start swipe session
/next/{sid}	GET	Get next recommendation
/swipe/{sid}/{item_id}/{action}?item_type=	POST	Register swipe
/super/{sid}	POST	Reset session
⚡ Environment Variables

Create a .env file in backend/:

DATABASE_URL=postgresql://postgres:password@localhost:5432/food_recommender
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx


Create a .env.local file in frontend/:

NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

▶️ Running Locally
Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload

Frontend
cd frontend
npm install
npm run dev

🧬 Intent Vector Logic
Swipe	Effect on Intent Vector
Food 👍	Add embedding
Food ❌	Subtract embedding
Category 👍	Move deeper in hierarchy
Category ❌	Move sideways / up hierarchy

Similarity query:

ORDER BY embedding <-> intent_vector

🎯 Why This Works

This is not just a recommender — it is a guided exploration system that:

Learns preferences progressively

Avoids cold start

Supports explainable behavior

Feels natural like real human discovery

🚀 Future Enhancements

Nutrition based filters

User profiles & favorites

Enchance category selection with separate intent vectors
