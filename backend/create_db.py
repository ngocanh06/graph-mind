import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Cấu hình kết nối tới database mặc định (postgres)
user = "postgres"
password = "12345678"
host = "localhost"
port = "5432"
dbname = "graph-mind"

try:
    # Kết nối vào db mặc định 'postgres' để có thể tạo db mới
    conn = psycopg2.connect(dbname="postgres", user=user, password=password, host=host, port=port)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()

    # Kiểm tra xem db đã tồn tại chưa
    cur.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{dbname}'")
    exists = cur.fetchone()
    
    if not exists:
        cur.execute(f'CREATE DATABASE "{dbname}"')
        print(f"Database '{dbname}' created successfully.")
    else:
        print(f"Database '{dbname}' already exists.")
        
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
