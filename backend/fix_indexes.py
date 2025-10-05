"""
Script to fix MongoDB indexes
Run this once to drop conflicting indexes before starting the server
"""

# already executed
# executed 2nd edit 
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

MONGODB_URI = os.getenv('MONGODB_URI')


async def fix_indexes():
    """Drop conflicting indexes and let the app recreate them correctly"""
    print("🔧 Connecting to MongoDB...")
    client = AsyncIOMotorClient(MONGODB_URI)
    database = client.get_default_database()
    
    try:
        print("\n🗑️ Dropping old conflicting indexes from users collection...")
        
        # List of indexes to drop and recreate
        indexes_to_fix = [
            ("phone_1", [("phone", 1)], {"unique": True, "sparse": True, "background": True}),
            ("verificationToken_1", [("verificationToken", 1)], {"background": True}),
            ("passwordResetToken_1", [("passwordResetToken", 1)], {"background": True}),
        ]
        
        for index_name, keys, options in indexes_to_fix:
            try:
                await database.users.drop_index(index_name)
                print(f"  ✅ Dropped {index_name}")
            except Exception as e:
                print(f"  ⚠️ Could not drop {index_name}: {e}")
            
            # Recreate with correct settings
            try:
                await database.users.create_index(keys, **options)
                print(f"  ✅ Recreated {index_name} with correct settings")
            except Exception as e:
                print(f"  ⚠️ Could not create {index_name}: {e}")
        
        print("\n📋 Final indexes on users collection:")
        indexes = await database.users.list_indexes().to_list(None)
        for idx in indexes:
            print(f"  - Name: {idx['name']}")
            print(f"    Keys: {idx['key']}")
            if 'unique' in idx:
                print(f"    Unique: {idx['unique']}")
            if 'sparse' in idx:
                print(f"    Sparse: {idx['sparse']}")
            if 'background' in idx:
                print(f"    Background: {idx['background']}")
            print()
        
        # Create geospatial index for reports collection
        print("\n🌍 Creating geospatial index for reports collection...")
        try:
            # Check if index already exists
            existing_indexes = await database.reports.list_indexes().to_list(None)
            has_geo_index = any('location_2dsphere' in idx['name'] for idx in existing_indexes)
            
            if has_geo_index:
                print("  ℹ️ Geospatial index already exists")
            else:
                await database.reports.create_index(
                    [("location", "2dsphere")],
                    name="location_2dsphere",
                    background=True
                )
                print("  ✅ Created 2dsphere index on location field")
        except Exception as e:
            print(f"  ⚠️ Could not create geospatial index: {e}")
        
        # Create geospatial index for alerts collection
        print("\n🚨 Creating geospatial index for alerts collection...")
        try:
            existing_indexes = await database.alerts.list_indexes().to_list(None)
            has_geo_index = any('affectedArea_2dsphere' in idx['name'] for idx in existing_indexes)
            
            if has_geo_index:
                print("  ℹ️ Geospatial index already exists")
            else:
                await database.alerts.create_index(
                    [("affectedArea", "2dsphere")],
                    name="affectedArea_2dsphere",
                    background=True
                )
                print("  ✅ Created 2dsphere index on affectedArea field")
        except Exception as e:
            print(f"  ⚠️ Could not create geospatial index: {e}")
        
        print("\n✅ All index operations completed successfully!")
        print("\n💡 You can now start the server with: python sih\\main.py")
        
    except Exception as e:
        print(f"❌ Error fixing indexes: {e}")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(fix_indexes())
