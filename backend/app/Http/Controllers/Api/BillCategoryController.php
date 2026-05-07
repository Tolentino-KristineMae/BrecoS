<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BillCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class BillCategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $categories = BillCategory::where('is_active', true)->orderBy('name')->get();
        return response()->json($categories);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:100|unique:bill_categories,name',
            'description' => 'nullable|string|max:255',
            'is_active'   => 'boolean',
            // Use 'file' instead of 'image' so SVG (image/svg+xml) is accepted
            'logo'        => 'nullable|file|mimes:jpg,jpeg,png,svg,webp,gif|max:2048',
        ]);

        if ($request->hasFile('logo')) {
            $data['logo_path'] = $request->file('logo')->store('category-logos', 'public');
        }

        unset($data['logo']);
        $category = BillCategory::create($data);

        return response()->json($category, 201);
    }

    public function show(BillCategory $billCategory): JsonResponse
    {
        return response()->json($billCategory);
    }

    public function update(Request $request, BillCategory $billCategory): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'sometimes|required|string|max:100|unique:bill_categories,name,' . $billCategory->id,
            'description' => 'nullable|string|max:255',
            'is_active'   => 'boolean',
            'logo'        => 'nullable|file|mimes:jpg,jpeg,png,svg,webp,gif|max:2048',
        ]);

        if ($request->hasFile('logo')) {
            if ($billCategory->logo_path) {
                Storage::disk('public')->delete($billCategory->logo_path);
            }
            $data['logo_path'] = $request->file('logo')->store('category-logos', 'public');
        }

        unset($data['logo']);
        $billCategory->update($data);

        return response()->json($billCategory);
    }

    public function destroy(BillCategory $billCategory): JsonResponse
    {
        if ($billCategory->logo_path) {
            Storage::disk('public')->delete($billCategory->logo_path);
        }
        $billCategory->delete();
        return response()->json(['message' => 'Category deleted.']);
    }
}
