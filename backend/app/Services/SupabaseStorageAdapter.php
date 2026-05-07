<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use League\Flysystem\Config;
use League\Flysystem\FileAttributes;
use League\Flysystem\FilesystemAdapter;
use League\Flysystem\UnableToDeleteFile;
use League\Flysystem\UnableToReadFile;
use League\Flysystem\UnableToWriteFile;

class SupabaseStorageAdapter implements FilesystemAdapter
{
    protected string $url;
    protected string $key;
    protected string $bucket;

    public function __construct(string $url, string $key, string $bucket)
    {
        $this->url = rtrim($url, '/');
        $this->key = $key;
        $this->bucket = $bucket;
    }

    public function getUrl(string $path): string
    {
        return "{$this->url}/storage/v1/object/public/{$this->bucket}/{$path}";
    }

    public function fileExists(string $path): bool
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => "Bearer {$this->key}",
            ])->head("{$this->url}/storage/v1/object/{$this->bucket}/{$path}");

            return $response->successful();
        } catch (\Exception $e) {
            return false;
        }
    }

    public function directoryExists(string $path): bool
    {
        return true; // Supabase doesn't have real directories
    }

    public function write(string $path, string $contents, Config $config): void
    {
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$this->key}",
            'Content-Type' => $config->get('mimetype', 'application/octet-stream'),
        ])->withBody($contents, $config->get('mimetype', 'application/octet-stream'))
            ->post("{$this->url}/storage/v1/object/{$this->bucket}/{$path}");

        if (!$response->successful()) {
            throw UnableToWriteFile::atLocation($path, $response->body());
        }
    }

    public function writeStream(string $path, $contents, Config $config): void
    {
        $this->write($path, stream_get_contents($contents), $config);
    }

    public function read(string $path): string
    {
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$this->key}",
        ])->get("{$this->url}/storage/v1/object/{$this->bucket}/{$path}");

        if (!$response->successful()) {
            throw UnableToReadFile::fromLocation($path, $response->body());
        }

        return $response->body();
    }

    public function readStream(string $path)
    {
        $resource = fopen('php://temp', 'r+');
        fwrite($resource, $this->read($path));
        rewind($resource);
        return $resource;
    }

    public function delete(string $path): void
    {
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$this->key}",
            'Content-Type' => 'application/json',
        ])->delete("{$this->url}/storage/v1/object/{$this->bucket}/{$path}");

        if (!$response->successful()) {
            throw UnableToDeleteFile::atLocation($path, $response->body());
        }
    }

    public function deleteDirectory(string $path): void
    {
        // Supabase requires listing and deleting files individually
        // For simplicity, we'll just return - implement if needed
    }

    public function createDirectory(string $path, Config $config): void
    {
        // Supabase doesn't require directory creation
    }

    public function setVisibility(string $path, string $visibility): void
    {
        // Visibility is set at bucket level in Supabase
    }

    public function visibility(string $path): FileAttributes
    {
        return new FileAttributes($path, null, 'public');
    }

    public function mimeType(string $path): FileAttributes
    {
        return new FileAttributes($path);
    }

    public function lastModified(string $path): FileAttributes
    {
        return new FileAttributes($path);
    }

    public function fileSize(string $path): FileAttributes
    {
        return new FileAttributes($path);
    }

    public function listContents(string $path, bool $deep): iterable
    {
        return [];
    }

    public function move(string $source, string $destination, Config $config): void
    {
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$this->key}",
            'Content-Type' => 'application/json',
        ])->post("{$this->url}/storage/v1/object/{$this->bucket}/move", [
            'bucketId' => $this->bucket,
            'sourceKey' => $source,
            'destinationKey' => $destination,
        ]);

        if (!$response->successful()) {
            throw UnableToWriteFile::atLocation($destination, $response->body());
        }
    }

    public function copy(string $source, string $destination, Config $config): void
    {
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$this->key}",
            'Content-Type' => 'application/json',
        ])->post("{$this->url}/storage/v1/object/{$this->bucket}/copy", [
            'bucketId' => $this->bucket,
            'sourceKey' => $source,
            'destinationKey' => $destination,
        ]);

        if (!$response->successful()) {
            throw UnableToWriteFile::atLocation($destination, $response->body());
        }
    }
}
