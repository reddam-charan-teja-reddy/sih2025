"""
Simple GCS file verification without app dependencies
"""
from google.cloud import storage
from google.oauth2 import service_account
import json
import os
from pathlib import Path

def list_bucket_files():
    """List all files in the GCS bucket"""
    try:
        # Load credentials from .env
        env_path = Path(".env")
        if not env_path.exists():
            print(f"❌ .env file not found at {env_path}")
            return
        
        # Read .env file
        env_vars = {}
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip().strip('"').strip("'")
        
        # Get GCS config
        bucket_name = env_vars.get('GOOGLE_CLOUD_BUCKET_NAME', 'sih-media-reeiver')
        project_id = env_vars.get('GOOGLE_CLOUD_PROJECT_ID')
        keyfile_json = env_vars.get('GOOGLE_CLOUD_KEYFILE')
        
        if not all([project_id, keyfile_json]):
            print(f"❌ Missing GCS configuration in .env")
            print(f"   GOOGLE_CLOUD_PROJECT_ID: {project_id}")
            print(f"   GOOGLE_CLOUD_KEYFILE: {'Found' if keyfile_json else 'Not found'}")
            return
        
        # Parse credentials JSON
        try:
            creds_dict = json.loads(keyfile_json)
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON in GOOGLE_CLOUD_KEYFILE: {e}")
            return
        
        credentials = service_account.Credentials.from_service_account_info(creds_dict)
        client = storage.Client(credentials=credentials, project=project_id)
        
        print(f"\n{'='*80}")
        print(f"Files in GCS Bucket: {bucket_name}")
        print(f"Project: {project_id}")
        print(f"{'='*80}\n")
        
        bucket = client.bucket(bucket_name)
        blobs = list(bucket.list_blobs())
        
        if not blobs:
            print("❌ No files found in bucket.")
            print("   The uploads may have failed or files were deleted.")
            return
        
        print(f"✓ Total files: {len(blobs)}\n")
        
        for i, blob in enumerate(blobs, 1):
            print(f"{i}. {blob.name}")
            print(f"   Size: {blob.size:,} bytes ({blob.size / 1024:.2f} KB)")
            print(f"   Created: {blob.time_created}")
            print(f"   Content-Type: {blob.content_type}")
            print(f"   MD5: {blob.md5_hash}")
            print(f"   Public URL: https://storage.googleapis.com/{bucket_name}/{blob.name}")
            print()
        
        print(f"{'='*80}")
        print(f"✓ Successfully verified {len(blobs)} files in GCS bucket")
        print(f"{'='*80}\n")
        
    except Exception as e:
        print(f"\n❌ Error accessing GCS bucket: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    list_bucket_files()
