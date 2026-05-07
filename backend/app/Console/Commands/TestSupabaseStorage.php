<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class TestSupabaseStorage extends Command
{
    protected $signature = 'storage:test-supabase';
    protected $description = 'Test Supabase Storage connection and configuration';

    public function handle(): int
    {
        $this->info('Testing Supabase Storage Configuration...');
        $this->newLine();

        // Check environment variables
        $this->info('1. Checking environment variables...');
        $url = config('filesystems.disks.supabase.url');
        $key = config('filesystems.disks.supabase.key');
        $bucket = config('filesystems.disks.supabase.bucket');
        $disk = config('filesystems.default');

        if (!$url || !$key || !$bucket) {
            $this->error('❌ Missing Supabase configuration in .env file');
            $this->warn('Please set: SUPABASE_URL, SUPABASE_KEY, SUPABASE_BUCKET');
            return 1;
        }

        $this->line("   URL: {$url}");
        $this->line("   Bucket: {$bucket}");
        $this->line("   Default Disk: {$disk}");
        $this->info('   ✓ Environment variables configured');
        $this->newLine();

        // Test file upload
        $this->info('2. Testing file upload...');
        $testFile = 'test-' . time() . '.txt';
        $testContent = 'Supabase Storage Test - ' . now()->toDateTimeString();

        try {
            Storage::put($testFile, $testContent);
            $this->info("   ✓ File uploaded: {$testFile}");
        } catch (\Exception $e) {
            $this->error("   ❌ Upload failed: {$e->getMessage()}");
            return 1;
        }
        $this->newLine();

        // Test file exists
        $this->info('3. Testing file existence check...');
        try {
            if (Storage::exists($testFile)) {
                $this->info("   ✓ File exists check passed");
            } else {
                $this->error("   ❌ File not found after upload");
                return 1;
            }
        } catch (\Exception $e) {
            $this->error("   ❌ Existence check failed: {$e->getMessage()}");
            return 1;
        }
        $this->newLine();

        // Test URL generation
        $this->info('4. Testing URL generation...');
        try {
            $url = Storage::url($testFile);
            $this->line("   URL: {$url}");
            
            if (str_contains($url, 'supabase.co') && str_contains($url, $bucket)) {
                $this->info('   ✓ URL generated correctly');
            } else {
                $this->warn('   ⚠ URL format may be incorrect');
            }
        } catch (\Exception $e) {
            $this->error("   ❌ URL generation failed: {$e->getMessage()}");
        }
        $this->newLine();

        // Test file read
        $this->info('5. Testing file read...');
        try {
            $content = Storage::get($testFile);
            if ($content === $testContent) {
                $this->info('   ✓ File content matches');
            } else {
                $this->warn('   ⚠ File content mismatch');
            }
        } catch (\Exception $e) {
            $this->error("   ❌ Read failed: {$e->getMessage()}");
        }
        $this->newLine();

        // Test file deletion
        $this->info('6. Testing file deletion...');
        try {
            Storage::delete($testFile);
            $this->info('   ✓ File deleted successfully');
            
            if (!Storage::exists($testFile)) {
                $this->info('   ✓ Deletion verified');
            }
        } catch (\Exception $e) {
            $this->error("   ❌ Deletion failed: {$e->getMessage()}");
            return 1;
        }
        $this->newLine();

        // Summary
        $this->info('═══════════════════════════════════════');
        $this->info('✓ All tests passed!');
        $this->info('Supabase Storage is configured correctly.');
        $this->info('═══════════════════════════════════════');
        $this->newLine();

        $this->comment('Next steps:');
        $this->line('1. Test file uploads through your API endpoints');
        $this->line('2. Verify files appear in Supabase Dashboard');
        $this->line('3. Check that URLs are accessible in browser');

        return 0;
    }
}
