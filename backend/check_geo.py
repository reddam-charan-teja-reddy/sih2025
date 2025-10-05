"""
Simple Python script to check geospatial configuration
Run this in your activated virtual environment: python check_geo.py
"""
print("Run this in your activated sih environment:")
print()
print("python -c \"import asyncio; from motor.motor_asyncio import AsyncIOMotorClient; import os; from dotenv import load_dotenv; load_dotenv('.env'); client = AsyncIOMotorClient(os.getenv('MONGODB_URI')); db = client.get_default_database(); async def check(): indexes = await db.reports.list_indexes().to_list(None); print('REPORTS INDEXES:'); [print(f'  {idx[\\\"name\\\"]}: {idx[\\\"key\\\"]}') for idx in indexes]; has_geo = any('2dsphere' in str(idx['key']) for idx in indexes); print(f'\\\\n  Geospatial index: {\\\"✅ FOUND\\\" if has_geo else \\\"❌ MISSING\\\"}'); total = await db.reports.count_documents({}); print(f'\\\\n  Total reports: {total}'); sample = await db.reports.find_one({'location': {'$exists': True}}); print(f'  Sample location: {sample.get(\\\"location\\\") if sample else \\\"None\\\"}'); asyncio.run(check())\"")
print()
print("This will show:")
print("  1. All indexes on reports collection")
print("  2. Whether geospatial index exists")
print("  3. Total reports count")
print("  4. Sample location data")
