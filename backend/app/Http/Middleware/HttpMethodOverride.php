<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class HttpMethodOverride
{
    public function handle(Request $request, Closure $next)
    {
        $override = $request->header('X-HTTP-Method-Override');

        if ($override && in_array(strtoupper($override), ['PUT', 'PATCH', 'DELETE'])) {
            // Swap the method so Laravel routes it correctly
            $request->setMethod(strtoupper($override));
        }

        return $next($request);
    }
}
