<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Error - Breco System</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .error-container {
      background: white;
      border-radius: 20px;
      padding: 40px;
      max-width: 600px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
    }
    .error-icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 40px;
      color: white;
    }
    h1 {
      font-size: 28px;
      color: #1e293b;
      margin-bottom: 10px;
    }
    .error-code {
      font-size: 16px;
      color: #64748b;
      margin-bottom: 20px;
      font-weight: 600;
    }
    .error-message {
      font-size: 14px;
      color: #475569;
      line-height: 1.6;
      margin-bottom: 30px;
    }
    .error-details {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 15px;
      margin-bottom: 30px;
      text-align: left;
      font-size: 12px;
      color: #64748b;
      font-family: 'Courier New', monospace;
      max-height: 200px;
      overflow-y: auto;
    }
    .btn {
      display: inline-block;
      padding: 12px 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 10px;
      font-weight: 600;
      transition: transform 0.2s;
    }
    .btn:hover {
      transform: translateY(-2px);
    }
  </style>
</head>
<body>
  <div class="error-container">
    <div class="error-icon">⚠️</div>
    <h1>Oops! Something Went Wrong</h1>
    <div class="error-code">Error 500 - Internal Server Error</div>
    <div class="error-message">
      {{ $message ?? 'The server encountered an error and could not complete your request.' }}
    </div>
    
    @if(isset($error) && $error)
    <div class="error-details">
      <strong>Error Details:</strong><br>
      {{ $error }}
    </div>
    @endif
    
    <a href="javascript:history.back()" class="btn">← Go Back</a>
    <a href="/" class="btn" style="margin-left: 10px;">Home</a>
  </div>
</body>
</html>
