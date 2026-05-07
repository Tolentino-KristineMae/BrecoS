# Storage Implementation Changes

## Summary
Migrated from local file storage to Supabase Storage for all file uploads (category logos, payment receipts, cash transaction files).

## Files Created

### 1. `app/Services/SupabaseStorageAdapter.php`
Custom Flysystem adapter that implements Supabase Storage API:
- Handles file upload, read, delete operations
- Generates public URLs for stored files
- Uses Supabase REST API for storage operations

### 2. `app/Providers/SupabaseStorageServiceProvider.php`
Service provider that registers the Supabase storage driver:
- Extends Laravel's Storage facade
- Registers 'supabase' disk driver
- Provides URL generation for stored files

## Files Modified

### Configuration Files

#### `config/filesystems.php`
- Added 'supabase' disk configuration
- Uses environment variables for credentials

#### `.env.example`
- Changed `FILESYSTEM_DISK` from `local` to `supabase`
- Added Supabase configuration variables:
  - `SUPABASE_URL`
  - `SUPABASE_KEY`
  - `SUPABASE_BUCKET`

#### `bootstrap/providers.php`
- Registered `SupabaseStorageServiceProvider`

### Controllers

#### `app/Http/Controllers/Api/BillCategoryController.php`
**Changes:**
- `store()`: Changed from `->store('category-logos', 'public')` to `->store('category-logos')`
- `update()`: Changed from `Storage::disk('public')->delete()` to `Storage::delete()`
- `destroy()`: Changed from `Storage::disk('public')->delete()` to `Storage::delete()`

#### `app/Http/Controllers/Api/BillPaymentController.php`
**Changes:**
- `store()`: Changed from `->store('payment-receipts', 'public')` to `->store('payment-receipts')`
- `update()`: Changed from `Storage::disk('public')->delete()` to `Storage::delete()`
- `destroy()`: Changed from `Storage::disk('public')->delete()` to `Storage::delete()`

#### `app/Http/Controllers/Api/CashTransactionController.php`
**Changes:**
- `storeFiles()`: Changed from `->store("cash-{$type}s", 'public')` to `->store("cash-{$type}s")`
- `destroy()`: Changed from `Storage::disk('public')->delete()` to `Storage::delete()`
- `destroyFile()`: Changed from `Storage::disk('public')->delete()` to `Storage::delete()`

### Models

#### `app/Models/BillCategory.php`
**Changes:**
- `getLogoUrlAttribute()`: Changed from `asset('storage/...')` to `\Storage::url($this->logo_path)`
- Now returns full Supabase CDN URL

#### `app/Models/BillPayment.php`
**Changes:**
- `getReceiptUrlAttribute()`: Changed from `asset('storage/...')` to `\Storage::url($this->receipt_path)`
- Now returns full Supabase CDN URL

#### `app/Models/CashTransactionFile.php`
**Changes:**
- `getFileUrlAttribute()`: Changed from `asset('storage/...')` to `\Storage::url($this->file_path)`
- Now returns full Supabase CDN URL

## How It Works

### File Upload Flow
1. File is uploaded via API endpoint
2. Laravel validates the file
3. `Storage::put()` or `$file->store()` is called
4. SupabaseStorageAdapter intercepts the call
5. File is uploaded to Supabase Storage via REST API
6. File path is stored in database
7. Model accessor generates public URL when accessed

### URL Generation
```php
// Before (Local Storage)
asset('storage/category-logos/logo.png')
// Returns: http://localhost/storage/category-logos/logo.png

// After (Supabase Storage)
Storage::url('category-logos/logo.png')
// Returns: https://your-project.supabase.co/storage/v1/object/public/breco-storage/category-logos/logo.png
```

### File Structure in Supabase
```
breco-storage/
├── category-logos/          # Bill category logos
├── payment-receipts/        # Bill payment receipts
├── cash-receipts/           # Cash transaction receipts
├── cash-proofs/             # Cash transaction proofs
└── cash-proof_of_payments/  # Cash transaction proof of payments
```

## Environment Variables Required

```env
FILESYSTEM_DISK=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
SUPABASE_BUCKET=breco-storage
```

## API Response Changes

### Before (Local Storage)
```json
{
  "logo_path": "category-logos/abc123.png",
  "logo_url": "http://localhost/storage/category-logos/abc123.png"
}
```

### After (Supabase Storage)
```json
{
  "logo_path": "category-logos/abc123.png",
  "logo_url": "https://xxxxx.supabase.co/storage/v1/object/public/breco-storage/category-logos/abc123.png"
}
```

## Benefits

1. **Persistent Storage**: Files survive deployments and server restarts
2. **CDN Delivery**: Fast global file delivery via Supabase CDN
3. **Scalability**: No local disk space limitations
4. **Backup**: Supabase handles backups automatically
5. **Security**: Fine-grained access control via bucket policies
6. **Cost-Effective**: Supabase free tier includes 1GB storage

## Testing

### Test File Upload
```bash
php artisan tinker
```

```php
// Upload test file
Storage::put('test.txt', 'Hello World');

// Get URL
$url = Storage::url('test.txt');
echo $url; // Should show Supabase URL

// Delete test file
Storage::delete('test.txt');
```

### Test via API
```bash
# Upload category with logo
curl -X POST http://localhost:8000/api/bill-categories \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "name=Test Category" \
  -F "logo=@/path/to/image.png"

# Response should include logo_url with Supabase URL
```

## Rollback Instructions

If you need to rollback to local storage:

1. Change `.env`:
   ```env
   FILESYSTEM_DISK=public
   ```

2. Revert controller changes to use `Storage::disk('public')`

3. Revert model accessors to use `asset('storage/...')`

4. Run: `php artisan storage:link`

## Next Steps

1. Set up Supabase project and bucket (see SUPABASE_STORAGE_SETUP.md)
2. Configure environment variables
3. Test file uploads
4. Migrate existing files (if any)
5. Update frontend to handle new URL format
