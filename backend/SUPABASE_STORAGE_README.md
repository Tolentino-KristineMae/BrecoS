# Supabase Storage Integration

## Overview

Your Laravel application has been configured to use **Supabase Storage** instead of local file storage. This means all uploaded files (category logos, payment receipts, cash transaction files) are now stored in Supabase's cloud storage and served via their CDN.

## Quick Start

### 1. Create Supabase Storage Bucket

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Storage** → **New Bucket**
4. Create a bucket named: `breco-storage`
5. Make it **Public** ✅
6. Set up bucket policies (see detailed guide below)

### 2. Configure Environment Variables

Add these to your `.env` file:

```env
FILESYSTEM_DISK=supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-service-role-key-here
SUPABASE_BUCKET=breco-storage
```

**Where to find these:**
- Go to Project Settings → API
- Copy **Project URL** for `SUPABASE_URL` 
- Copy **service_role key** for `SUPABASE_KEY` (⚠️ Keep this secret!)
- Use your bucket name for `SUPABASE_BUCKET`

### 3. Test the Configuration

Run the test command:

```bash
php artisan storage:test-supabase
```

This will verify:
- ✓ Environment variables are set
- ✓ Files can be uploaded
- ✓ Files can be read
- ✓ URLs are generated correctly
- ✓ Files can be deleted

### 4. Set Up Bucket Policies

In Supabase Dashboard → Storage → Your Bucket → Policies:

**Quick Setup (Permissive - Good for Development):**
```sql
-- Allow public read
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'breco-storage');

-- Allow authenticated operations
CREATE POLICY "Authenticated Upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'breco-storage');

CREATE POLICY "Authenticated Update" ON storage.objects
FOR UPDATE USING (bucket_id = 'breco-storage');

CREATE POLICY "Authenticated Delete" ON storage.objects
FOR DELETE USING (bucket_id = 'breco-storage');
```

## What Changed?

### File Storage
- **Before**: Files stored in `storage/app/public/`
- **After**: Files stored in Supabase Storage bucket

### File URLs
- **Before**: `http://localhost/storage/category-logos/logo.png`
- **After**: `https://xxxxx.supabase.co/storage/v1/object/public/breco-storage/category-logos/logo.png`

### API Responses
All file URLs in API responses now point to Supabase CDN:
```json
{
  "logo_url": "https://xxxxx.supabase.co/storage/v1/object/public/breco-storage/category-logos/abc.png",
  "receipt_url": "https://xxxxx.supabase.co/storage/v1/object/public/breco-storage/payment-receipts/xyz.jpg"
}
```

## File Organization

Files are organized in folders within your bucket:

```
breco-storage/
├── category-logos/          # Bill category logos
├── payment-receipts/        # Bill payment receipts  
├── cash-receipts/           # Cash transaction receipts
├── cash-proofs/             # Cash transaction proofs
└── cash-proof_of_payments/  # Cash proof of payments
```

## Benefits

✅ **Persistent Storage** - Files survive deployments  
✅ **CDN Delivery** - Fast global access  
✅ **Scalability** - No local disk limits  
✅ **Automatic Backups** - Handled by Supabase  
✅ **Access Control** - Fine-grained policies  
✅ **Cost-Effective** - 1GB free tier  

## Troubleshooting

### Files not uploading?
```bash
# Check configuration
php artisan config:clear
php artisan storage:test-supabase

# Check logs
tail -f storage/logs/laravel.log
```

**Common issues:**
- Using `anon` key instead of `service_role` key
- Bucket policies not configured
- Bucket name mismatch in `.env`

### Files uploading but not accessible?
- Ensure bucket is set to **Public**
- Check bucket policies allow SELECT
- Verify URL format in browser

### 403 Forbidden errors?
- Check bucket policies in Supabase Dashboard
- Verify `SUPABASE_KEY` is the service_role key
- Ensure bucket name matches

## Documentation

📖 **Detailed Setup Guide**: `SUPABASE_STORAGE_SETUP.md`  
📝 **Technical Changes**: `STORAGE_CHANGES.md`  

## Testing Checklist

- [ ] Environment variables configured
- [ ] Supabase bucket created and public
- [ ] Bucket policies set up
- [ ] `php artisan storage:test-supabase` passes
- [ ] Upload category with logo via API
- [ ] Upload bill payment with receipt via API
- [ ] Upload cash transaction with files via API
- [ ] Verify files appear in Supabase Dashboard
- [ ] Verify URLs are accessible in browser
- [ ] Test file deletion via API

## Support

If you encounter issues:

1. Run the test command: `php artisan storage:test-supabase`
2. Check Laravel logs: `storage/logs/laravel.log`
3. Check Supabase Dashboard for errors
4. Review the detailed setup guide: `SUPABASE_STORAGE_SETUP.md`

## Security Notes

⚠️ **Important:**
- Never commit `.env` file
- Never expose `service_role` key in client-side code
- Use environment variables for all credentials
- Review bucket policies for production use
- Validate all file uploads (type, size, content)

## Rollback

To revert to local storage:

1. Change `.env`: `FILESYSTEM_DISK=public`
2. Run: `php artisan storage:link`
3. Files will be stored locally again

(Note: You'll need to revert code changes - see `STORAGE_CHANGES.md`)
