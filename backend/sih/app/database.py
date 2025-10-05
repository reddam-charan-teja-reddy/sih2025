"""
Database initialization and configuration
"""
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import GEOSPHERE, ASCENDING, DESCENDING
from app.config import get_settings

settings = get_settings()

# Global database client
client: AsyncIOMotorClient = None
database = None


async def connect_to_mongo():
    """Connect to MongoDB"""
    global client, database
    try:
        client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            maxPoolSize=10,
            minPoolSize=1,
            serverSelectionTimeoutMS=5000
        )
        database = client.get_default_database()
        
        # Create indexes for performance
        await create_indexes()
        
        print("✅ Connected to MongoDB successfully")
    except Exception as e:
        print(f"❌ Error connecting to MongoDB: {e}")
        raise


async def close_mongo_connection():
    """Close MongoDB connection"""
    global client
    if client:
        client.close()
        print("✅ MongoDB connection closed")


async def create_indexes():
    """
    Create database indexes for optimal performance.
    Uses background=True to avoid blocking and creates indexes only if they don't exist.
    """
    try:
        # Get existing indexes to avoid conflicts
        existing_user_indexes = await database.users.list_indexes().to_list(None)
        existing_report_indexes = await database.reports.list_indexes().to_list(None)
        existing_alert_indexes = await database.alerts.list_indexes().to_list(None)
        
        # Extract index names
        user_index_names = {idx['name'] for idx in existing_user_indexes}
        report_index_names = {idx['name'] for idx in existing_report_indexes}
        alert_index_names = {idx['name'] for idx in existing_alert_indexes}
        
        # User indexes (matching original Next.js exactly)
        if 'email_1' not in user_index_names:
            await database.users.create_index([("email", ASCENDING)], unique=True, background=True)
        
        if 'phone_1' not in user_index_names:
            await database.users.create_index([("phone", ASCENDING)], unique=True, sparse=True, background=True)
        
        if 'verificationToken_1' not in user_index_names:
            await database.users.create_index([("verificationToken", ASCENDING)], background=True)
        
        if 'passwordResetToken_1' not in user_index_names:
            await database.users.create_index([("passwordResetToken", ASCENDING)], background=True)
        
        # Report indexes
        if 'location_2dsphere' not in report_index_names:
            await database.reports.create_index([("location", GEOSPHERE)], background=True)
        
        if 'createdAt_-1' not in report_index_names:
            await database.reports.create_index([("createdAt", DESCENDING)], background=True)
        
        if 'status_1' not in report_index_names:
            await database.reports.create_index([("status", ASCENDING)], background=True)
        
        if 'hazardType_1' not in report_index_names:
            await database.reports.create_index([("hazardType", ASCENDING)], background=True)
        
        if 'severity_1' not in report_index_names:
            await database.reports.create_index([("severity", ASCENDING)], background=True)
        
        if 'reportedBy_1' not in report_index_names:
            await database.reports.create_index([("reportedBy", ASCENDING)], background=True)
        
        if 'status_1_createdAt_-1' not in report_index_names:
            await database.reports.create_index([
                ("status", ASCENDING),
                ("createdAt", DESCENDING)
            ], background=True)
        
        # Alert indexes
        if 'affectedArea_2dsphere' not in alert_index_names:
            await database.alerts.create_index([("affectedArea", GEOSPHERE)], background=True)
        
        if 'createdAt_-1' not in alert_index_names:
            await database.alerts.create_index([("createdAt", DESCENDING)], background=True)
        
        if 'status_1' not in alert_index_names:
            await database.alerts.create_index([("status", ASCENDING)], background=True)
        
        if 'isActive_1' not in alert_index_names:
            await database.alerts.create_index([("isActive", ASCENDING)], background=True)
        
        if 'effectiveFrom_1' not in alert_index_names:
            await database.alerts.create_index([("effectiveFrom", ASCENDING)], background=True)
        
        if 'expiresAt_1' not in alert_index_names:
            await database.alerts.create_index([("expiresAt", ASCENDING)], background=True)
        
        if 'issuedBy_1' not in alert_index_names:
            await database.alerts.create_index([("issuedBy", ASCENDING)], background=True)
        
        print("✅ Database indexes verified/created successfully")
    except Exception as e:
        print(f"⚠️ Warning: Could not verify/create some indexes: {e}")


def get_database():
    """Get database instance"""
    return database
