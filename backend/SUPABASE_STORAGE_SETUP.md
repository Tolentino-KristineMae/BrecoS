# Supabase Storage Setup Guide

This guide will help you configure Supabase Storage for your Laravel application to store images, receipts, and other files.

## Prerequisites

- A Supabase project (create one at https://supabase.com)
- Your Supabase project URL and API keys

## Step 1: Create Storage Bucket in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New Bucket**
4. Create a bucket with these settings:
   - **Name**: `breco-storage` (or your preferred name)
   - **Public bucket**: ✅ **Enable** (so images are publicly accessible)
   - Click **Create bucket**

## Step 2: Set Bucket Policies (Important!)

After creating the bucket, you need to set up policies to allow file operations:

1. Click on your bucket (`breco-storage`)
2. Go to **Policies** tab
3. Click **New Policy**

### Policy 1: Public Read Access
```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'breco-storage');
```

### Policy 2: Authenticated Upload
```sql
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'breco-storage');
```

### Policy 3: Authenticated Update
```sql
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'breco-storage');
```

### Policy 4: Authenticated Delete
```sql
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'breco-storage');
```

**Alternative: Use the Supabase UI**
- Click "New Policy" → "For full customization"
- Select the appropriate operation (SELECT, INSERT, UPDATE, DELETE)
- Set the policy to allow operations on your bucket

## Step 3: Get Your Supabase Credentials

1. Go to **Project Settings** (gear icon in sidebar)
2. Navigate to **API** section
3. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (for client-side access)
   - **service_role key** (for server-side access - **keep this secret!**)

## Step 4: Configure Laravel Environment

Update your `.env` file with Supabase credentials:

```env
# Change filesystem disk to supabase
FILESYSTEM_DISK=supabase

# Add Supabase configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-service-role-key-here
SUPABASE_BUCKET=breco-storage
```

**Important Notes:**
- Use the **service_role key** (not the anon key) for `SUPABASE_KEY` since this is server-side
- The service_role key bypasses Row Level Security (RLS) policies
- Never commit your `.env` file or expose the service_role key publicly

## Step 5: Test the Configuration

Run a simple test to ensure everything works:

```bash
cd backend
php artisan tinker
```

Then in tinker:
```php
// Test file upload
Storage::put('test.txt', 'Hello Supabase!');

// Get URL
Storage::url('test.txt');

// Should return: https://your-project.supabase.co/storage/v1/object/public/breco-storage/test.txt

// Clean up
Storage::delete('test.txt');
```

## Step 6: Verify File Access

After uploading a file through your API:

1. Check the Supabase Storage dashboard to see if files appear
2. Try accessing the file URL directly in your browser
3. The URL format should be:
   ```
   https://your-project.supabase.co/storage/v1/object/public/breco-storage/path/to/file.jpg
   ```

## Folder Structure in Supabase

Your files will be organized as:
```
breco-storage/
├── category-logos/
│   └── logo-xxxxx.png
├── payment-receipts/
│   └── receipt-xxxxx.jpg
├── cash-receipts/
│   └── receipt-xxxxx.pdf
├── cash-proofs/
│   └── proof-xxxxx.jpg
└── cash-proof_of_payments/
    └── pop-xxxxx.jpg
```

## Troubleshooting

### Files not uploading
- Check that your `SUPABASE_KEY` is the **service_role key**, not the anon key
- Verify bucket policies are set correctly
- Check Laravel logs: `tail -f storage/logs/laravel.log`

### Files uploading but not accessible
- Ensure the bucket is set to **Public**
- Verify the SELECT policy allows public access
- Check the file URL format is correct

### 403 Forbidden errors
- Check bucket policies in Supabase dashboard
- Ensure the service_role key is correct
- Verify the bucket name matches in `.env` and Supabase

### URLs not working in API responses
- Clear Laravel config cache: `php artisan config:clear`
- Restart your Laravel server
- Check that models have the URL accessors (e.g., `logo_url`, `receipt_url`, `file_url`)

## Migration from Local Storage

If you have existing files in `storage/app/public/`, you'll need to migrate them:

### Option 1: Manual Upload via Supabase Dashboard
1. Go to Storage → your bucket
2. Click **Upload files**
3. Upload files maintaining the folder structure

### Option 2: Programmatic Migration
Create a migration script:

```php
// database/migrations/xxxx_migrate_files_to_supabase.php
use Illuminate\Support\Facades\Storage;

// Get all files from local storage
$localDisk = Storage::disk('public');
$supabaseDisk = Storage::disk('supabase');

$files = $localDisk->allFiles();

foreach ($files as $file) {
    $contents = $localDisk->get($file);
    $supabaseDisk->put($file, $contents);
    echo "Migrated: {$file}\n";
}
```

## Security Best Practices

1. **Never expose service_role key** in client-side code
2. **Use environment variables** for all sensitive credentials
3. **Set appropriate bucket policies** - don't make everything public if not needed
4. **Validate file uploads** - check file types, sizes, and content
5. **Use signed URLs** for private files (if needed in the future)

## Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Storage Policies Guide](https://supabase.com/docs/guides/storage/security/access-control)
- [Laravel Filesystem Documentation](https://laravel.com/docs/filesystem)

## Support

If you encounter issues:
1. Check Supabase dashboard for error logs
2. Review Laravel logs: `storage/logs/laravel.log`
3. Test with Supabase API directly using curl/Postman
4. Verify all environment variables are set correctly
