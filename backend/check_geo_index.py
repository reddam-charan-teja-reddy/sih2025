"""
Check geospatial index status and test query
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env')
MONGODB_URI = os.getenv('MONGODB_URI')


async def check_geospatial():
    """Check geospatial indexes and test queries"""
    print("🔍 Checking Geospatial Configuration...")
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client.get_default_database()
    
    try:
        # Check reports collection indexes
        print("\n📋 REPORTS COLLECTION INDEXES:")
        print("="*60)
        reports_indexes = await db.reports.list_indexes().to_list(None)
        
        has_geo_index = False
        for idx in reports_indexes:
            print(f"\n  Index Name: {idx['name']}")
            print(f"  Keys: {idx['key']}")
            if 'unique' in idx:
                print(f"  Unique: {idx['unique']}")
            if 'sparse' in idx:
                print(f"  Sparse: {idx['sparse']}")
            if '2dsphere' in str(idx['key']):
                has_geo_index = True
                print("  ✅ Geospatial Index Found!")
        
        if not has_geo_index:
            print("\n  ⚠️ No geospatial index found on reports collection!")
        
        # Check alerts collection indexes
        print("\n\n📋 ALERTS COLLECTION INDEXES:")
        print("="*60)
        alerts_indexes = await db.alerts.list_indexes().to_list(None)
        
        has_alert_geo_index = False
        for idx in alerts_indexes:
            print(f"\n  Index Name: {idx['name']}")
            print(f"  Keys: {idx['key']}")
            if '2dsphere' in str(idx['key']):
                has_alert_geo_index = True
                print("  ✅ Geospatial Index Found!")
        
        if not has_alert_geo_index:
            print("\n  ⚠️ No geospatial index found on alerts collection!")
        
        # Test geospatial query
        print("\n\n🧪 TESTING GEOSPATIAL QUERY:")
        print("="*60)
        
        # Count total reports
        total_reports = await db.reports.count_documents({})
        print(f"  Total reports in database: {total_reports}")
        
        # Test query without geo
        no_geo = await db.reports.count_documents({"isPublic": True})
        print(f"  Public reports (no geo filter): {no_geo}")
        
        # Test geospatial query with $geoWithin
        lat, lng = 19.0760, 72.8777  # Mumbai
        radius = 50000  # 50km
        
        geo_query = {
            "isPublic": True,
            "location": {
                "$geoWithin": {
                    "$centerSphere": [[lng, lat], radius / 6378100]
                }
            }
        }
        
        try:
            geo_count = await db.reports.count_documents(geo_query)
            print(f"  Reports within 50km of Mumbai: {geo_count}")
            print("  ✅ Geospatial query working!")
            
            # Get sample report with location
            sample = await db.reports.find_one({"location": {"$exists": True}})
            if sample:
                loc = sample.get('location', {})
                coords = loc.get('coordinates', [])
                print(f"\n  Sample report location: {coords}")
                print(f"  Location type: {loc.get('type')}")
            
        except Exception as e:
            print(f"  ❌ Geospatial query failed: {str(e)}")
        
        print("\n" + "="*60)
        print("✅ Check complete!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(check_geospatial())
