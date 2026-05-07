<?php

namespace App\Providers;

use App\Services\SupabaseStorageAdapter;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\ServiceProvider;
use League\Flysystem\Filesystem;

class SupabaseStorageServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Storage::extend('supabase', function ($app, $config) {
            $adapter = new SupabaseStorageAdapter(
                $config['url'],
                $config['key'],
                $config['bucket']
            );

            $filesystem = new Filesystem($adapter, $config);
            
            return new class($filesystem, $adapter, $config) extends FilesystemAdapter {
                protected $supabaseAdapter;

                public function __construct($filesystem, $supabaseAdapter, $config)
                {
                    parent::__construct($filesystem, $supabaseAdapter, $config);
                    $this->supabaseAdapter = $supabaseAdapter;
                }

                public function url($path)
                {
                    return $this->supabaseAdapter->getUrl($path);
                }
            };
        });
    }
}
