"""
Verify files in Google Cloud Storage bucket
This script lists all files in the GCS bucket to confirm uploads
"""
import sys
sys.path.append('sih')

from app.utils.storage import get_gcs_client
from app.config import get_settings

def list_bucket_files():
    """List all files in the GCS bucket"""
    try:
        settings = get_settings()
        client = get_gcs_client()
        bucket = client.bucket(settings.GOOGLE_CLOUD_BUCKET_NAME)
        
        print(f"\n{'='*80}")
        print(f"Files in GCS Bucket: {settings.GOOGLE_CLOUD_BUCKET_NAME}")
        print(f"{'='*80}\n")
        
        blobs = list(bucket.list_blobs())
        
        if not blobs:
            print("No files found in bucket.")
            return
        
        print(f"Total files: {len(blobs)}\n")
        
        for i, blob in enumerate(blobs, 1):
            print(f"{i}. {blob.name}")
            print(f"   Size: {blob.size:,} bytes")
            print(f"   Created: {blob.time_created}")
            print(f"   Content-Type: {blob.content_type}")
            print(f"   Public URL: https://storage.googleapis.com/{settings.GOOGLE_CLOUD_BUCKET_NAME}/{blob.name}")
            print()
        
        print(f"{'='*80}")
        print(f"✓ Successfully verified {len(blobs)} files in GCS")
        print(f"{'='*80}\n")
        
    except Exception as e:
        print(f"\n❌ Error accessing GCS bucket: {str(e)}")
        print(f"   Make sure your GCS credentials are configured correctly in .env")

if __name__ == "__main__":
    list_bucket_files()
