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
            $data['logo_path'] = $request->file('logo')->store('category-logos');
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
                Storage::delete($billCategory->logo_path);
            }
            $data['logo_path'] = $request->file('logo')->store('category-logos');
        }

        unset($data['logo']);
        $billCategory->update($data);

        return response()->json($billCategory);
    }

    public function destroy(BillCategory $billCategory): JsonResponse
    {
        // Check if category is being used by any bills
        if ($billCategory->bills()->exists()) {
            return response()->json([
                'message' => 'Cannot delete category because it is being used by one or more bills.',
                'error' => 'CATEGORY_IN_USE'
            ], 422);
        }

        // Delete logo file if exists
        if ($billCategory->logo_path) {
            try {
                Storage::delete($billCategory->logo_path);
            } catch (\Exception $e) {
                // Continue even if file deletion fails
            }
        }

        $billCategory->delete();
        return response()->json(['message' => 'Category deleted successfully.']);
    }
}
