import os
from dotenv import load_dotenv
from pgvector.psycopg import register_vector
from psycopg_pool import ConnectionPool

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

       
pool = ConnectionPool(
    DATABASE_URL,
    min_size=1,
    max_size=100,
    kwargs={"autocommit": True}
)



def get_conn():
  # closes all idle connections

    conn = pool.getconn()
    register_vector(conn)
    return conn
