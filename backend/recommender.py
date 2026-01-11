import random
from utils.insights import generate_taste_insight 
import math

# At the top of your next() method or as a helper method
def is_meaningful_vector(vec, threshold=1e-6):
    """Check if vector has meaningful values (not all near-zero)"""
    if vec is None:
        return False
    return any(abs(x) > threshold for x in vec)

class SwipeBrain:
    def __init__(self, session_id, conn):
        self.session_id = session_id
        self.conn = conn
        self.memory = None

    # ---------------- Load or initialize session memory ----------------
    def _load_memory(self):
        if self.memory:
            return self.memory

        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT current_category, intent_vector
                FROM session_memory WHERE session_id=%s
            """, (self.session_id,))
            row = cur.fetchone()
            if row:
                self.memory = {"current_category": row[0], "intent_vector": row[1]}
            else:
                cur.execute("""
                    INSERT INTO session_memory(session_id, current_category, intent_vector)
                    VALUES (%s, NULL, NULL)
                    ON CONFLICT DO NOTHING
                """, (self.session_id,))
                self.memory = {"current_category": None, "intent_vector": None}

        return self.memory

    # ---------------- Save session memory ----------------
    def _save_memory(self):
        mem = self.memory
        with self.conn.cursor() as cur:
            cur.execute("""
                UPDATE session_memory
                SET current_category=%s, intent_vector=%s
                WHERE session_id=%s
            """, (mem["current_category"], mem["intent_vector"], self.session_id))
        self.conn.commit()

    # ---------------- Update swipe ----------------
    def update(self, item_id, swipe_type, item_type):
        mem = self._load_memory()
        with self.conn.cursor() as cur:
            if item_type == "category":
                cur.execute("""
                    INSERT INTO session_category(session_id, category_id, swipe_type)
                    VALUES (%s,%s,%s)
                """, (self.session_id, item_id, swipe_type))

                if swipe_type == "right":
                    # move to child if exists
                    cur.execute("SELECT id FROM categories WHERE parent_id=%s ORDER BY random() LIMIT 1", (item_id,))
                    child = cur.fetchone()
                    mem["current_category"] = child[0] if child else item_id
                else:
                    # left → pick sibling or parent
                    cur.execute("SELECT parent_id FROM categories WHERE id=%s", (item_id,))
                    par_row = cur.fetchone()
                    parent = par_row[0] if par_row else None
                    if parent is not None:
                        cur.execute("""
                            SELECT id FROM categories
                            WHERE parent_id=%s AND id != %s
                            ORDER BY random() LIMIT 1
                        """, (parent, item_id))
                        sibling = cur.fetchone()
                        mem["current_category"] = sibling[0] if sibling else parent
                    else:
                        # pick random root category
                        cur.execute("SELECT id FROM categories WHERE parent_id IS NULL AND id != %s ORDER BY random() LIMIT 1", (item_id,))
                        root = cur.fetchone()
                        mem["current_category"] = root[0] if root else None

            elif item_type == "food":
                cur.execute("""
                    INSERT INTO session_food(session_id, food_id, swipe_type)
                    VALUES (%s,%s,%s)
                """, (self.session_id, item_id, swipe_type))

                # fetch embedding
                cur.execute("SELECT embedding FROM food WHERE id=%s", (item_id,))
                row = cur.fetchone()
                embedding = row[0] if row else None

                if embedding is not None:
                    if mem["intent_vector"] is None:
                        mem["intent_vector"] = embedding
                    else:
                        # running average with positive or negative factor
                        cur.execute("""
                            SELECT COUNT(*) FROM session_food
                            WHERE session_id=%s
                        """, (self.session_id,))
                        n = cur.fetchone()[0] or 1
                        factor = 0
                        if swipe_type == "right":
                            factor = 1
                        elif swipe_type == "super":
                            factor = 3
                        else: 
                            factor = -1
                        mem["intent_vector"] = [
                            (a*(n-1) + factor*b)/n
                            for a,b in zip(mem["intent_vector"], embedding)
                        ]
        self._save_memory()

    # ---------------- Next recommendation ----------------
    def next(self):
        mem = self._load_memory()
        with self.conn.cursor() as cur:

            # ---------------- Pick category if no current category ----------------
            if not mem["current_category"]:
                cur.execute("""
                    SELECT id, name FROM categories
                    WHERE id NOT IN (
                        SELECT category_id FROM session_category WHERE session_id=%s
                    )
                    ORDER BY random()
                    LIMIT 1
                """, (self.session_id,))
                cat = cur.fetchone()
                if cat:
                    mem["current_category"] = cat[0]
                    self._save_memory()
                    return (cat[0], cat[1], []), "category"
                else:
                    # All categories exhausted
                    return None, None

            # ---------------- Check if category has children ----------------
            cur.execute("SELECT id FROM categories WHERE parent_id=%s LIMIT 1", (mem["current_category"],))
            child = cur.fetchone()
            if child:
                # Still has child categories → pick next unvisited child
                cur.execute("""
                    SELECT id, name FROM categories
                    WHERE parent_id=%s AND id NOT IN (
                        SELECT category_id FROM session_category WHERE session_id=%s
                    )
                    ORDER BY random()
                    LIMIT 1
                """, (mem["current_category"], self.session_id))
                next_cat = cur.fetchone()
                if next_cat:
                    return (next_cat[0], next_cat[1], []), "category"
                # No unvisited children → fall back to food

            # ---------------- Pick food in leaf category ----------------
            if is_meaningful_vector(mem["intent_vector"]) :
                cur.execute("""
                    SELECT id, name, key_ingredients
                    FROM food
                    WHERE id NOT IN (
                        SELECT food_id FROM session_food WHERE session_id=%s
                    )
                    ORDER BY embedding <-> %s::vector
                    LIMIT 1
                """, ( self.session_id, mem["intent_vector"]))
            else:
                cur.execute("""
                    SELECT id, name, key_ingredients
                    FROM food
                    WHERE category_id=%s AND id NOT IN (
                        SELECT food_id FROM session_food WHERE session_id=%s
                    )
                    ORDER BY random()
                    LIMIT 1
                """, (mem["current_category"], self.session_id))

            f = cur.fetchone()
            if f:
                return (f[0], f[1], f[2]), "food"

            # ---------------- No foods left → reset current_category ----------------
            mem["current_category"] = None
            self._save_memory()
            # Recursively call next to pick a new category
            return self.next()
    def get_insights(self):
        insights = ""
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT c.name
                FROM session_category sc
                JOIN categories c ON sc.category_id = c.id
                WHERE sc.session_id = %s
                AND sc.swipe_type = 'right';
                """,(self.session_id,))
            liked_categories = cur.fetchall()

            cur.execute("""
                SELECT f.name, f.key_ingredients
                FROM session_food sf
                JOIN food f ON sf.food_id = f.id
                WHERE sf.session_id = %s
                AND sf.swipe_type = 'right';

                """,(self.session_id,))
            
            liked_foods = cur.fetchall()

            cur.execute("""
                SELECT c.name
                FROM session_category sc
                JOIN categories c ON sc.category_id = c.id
                WHERE sc.session_id = %s
                AND sc.swipe_type = 'left';
                """,(self.session_id,))
            disliked_categories = cur.fetchall()

            cur.execute("""
                SELECT f.name, f.key_ingredients
                FROM session_food sf
                JOIN food f ON sf.food_id = f.id
                WHERE sf.session_id = %s
                AND sf.swipe_type = 'left';

                """,(self.session_id,))
            
            disliked_foods = cur.fetchall()

            cur.execute("""
                SELECT f.name, f.key_ingredients
                FROM session_food sf
                JOIN food f ON sf.food_id = f.id
                WHERE sf.session_id = %s
                AND sf.swipe_type = 'super';

                """,(self.session_id,))
            super = cur.fetchone()
            if not super :
                            
                cur.execute("""
                SELECT c.name
                FROM session_category sc
                JOIN categories c ON sc.category_id = c.id
                WHERE sc.session_id = %s
                AND sc.swipe_type = 'super';

                """,(self.session_id,))
                super = cur.fetchone()

            insights = generate_taste_insight(liked_foods, liked_categories,disliked_foods, disliked_categories,super)
            return insights, super[0]

    def get_stats(self) :
        stats = {}
        stats['total_swipes'] = 1
        with self.conn.cursor() as cur:

            cur.execute("""
                    SELECT COUNT(*) AS total_left_swipes
                    FROM (
                        SELECT 1
                        FROM session_food
                        WHERE session_id = %s AND swipe_type = 'left'

                        UNION ALL

                        SELECT 1
                        FROM session_category
                        WHERE session_id = %s AND swipe_type = 'left'
                    ) s
                """,(self.session_id,self.session_id))
            result = cur.fetchone()
            left_swipes = result[0] if result else None
            if left_swipes:
                stats['left_swipes'] = left_swipes
                stats['total_swipes'] += left_swipes

            cur.execute("""
                    SELECT COUNT(*) AS total_right_swipes
                    FROM (
                        SELECT 1
                        FROM session_food
                        WHERE session_id = %s AND swipe_type = 'right'

                        UNION ALL

                        SELECT 1
                        FROM session_category
                        WHERE session_id = %s AND swipe_type = 'right'
                    ) s
                """,(self.session_id,self.session_id))
            result = cur.fetchone()
            right_swipes = result[0] if result else None
            if right_swipes:
                stats['right_swipes'] = right_swipes
                stats['total_swipes'] += right_swipes
            
            stats['insights'],stats['super_food'] = self.get_insights()
            
            return stats    
