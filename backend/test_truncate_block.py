import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.tests.safety_db_guard import assert_test_database

TEST_DB_URL = "postgresql+asyncpg://postgres:123123@localhost:5432/graphmind_pb42_test"
assert_test_database(TEST_DB_URL)

async def test_migration():
    engine = create_async_engine(TEST_DB_URL)
    
    # Test 1: TRUNCATE
    async with engine.connect() as conn:
        print("Testing TRUNCATE block on graphmind_pb42_test...")
        blocked = False
        try:
            await conn.execute(text("TRUNCATE TABLE audit_logs;"))
            await conn.commit()
        except Exception as e:
            await conn.rollback()
            if "AuditLogImmutableError" in str(e):
                blocked = True
                print("TRUNCATE successfully blocked by trigger: AuditLogImmutableError")
        assert blocked, "TRUNCATE was NOT blocked!"

    # Test 2: UPDATE
    async with engine.connect() as conn:
        print("Testing UPDATE block on graphmind_pb42_test...")
        blocked_upd = False
        try:
            await conn.execute(text("UPDATE audit_logs SET detail = 'test' WHERE audit_id = 'a6c58c27-7d41-484c-b041-4212fd27ab8c';"))
            await conn.commit()
        except Exception as e:
            await conn.rollback()
            if "AuditLogImmutableError" in str(e):
                blocked_upd = True
                print("UPDATE successfully blocked by trigger: AuditLogImmutableError")
        assert blocked_upd, "UPDATE was NOT blocked!"

    # Test 3: DELETE
    async with engine.connect() as conn:
        print("Testing DELETE block on graphmind_pb42_test...")
        blocked_del = False
        try:
            await conn.execute(text("DELETE FROM audit_logs WHERE audit_id = 'a6c58c27-7d41-484c-b041-4212fd27ab8c';"))
            await conn.commit()
        except Exception as e:
            await conn.rollback()
            if "AuditLogImmutableError" in str(e):
                blocked_del = True
                print("DELETE successfully blocked by trigger: AuditLogImmutableError")
        assert blocked_del, "DELETE was NOT blocked!"

    await engine.dispose()
    print("ALL IMMUTABILITY CHECKS (TRUNCATE, UPDATE, DELETE) PASSED 100% ON TEST DATABASE!")

if __name__ == "__main__":
    asyncio.run(test_migration())
