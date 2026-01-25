# push.ps1

# --- 1. 检查是否有文件变更 ---
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "⚡以此目录没有检测到任何变更 (Nothing to commit)" -ForegroundColor Yellow
    exit 0
}

# --- 2. 获取输入 (支持默认值) ---
$inputMsg = Read-Host "请输入 commit 信息 (直接回车将使用默认时间戳)"

if ([string]::IsNullOrWhiteSpace($inputMsg)) {
    # 如果用户没输入，生成一个默认信息
    $dateStr = Get-Date -Format "yyyy-MM-dd HH:mm"
    $commitMsg = "Update: $dateStr"
    Write-Host "ℹ️ 未检测到输入，使用默认信息: $commitMsg" -ForegroundColor DarkGray
} else {
    $commitMsg = $inputMsg
}

# --- 3. 执行 Git 流程 ---
try {
    Write-Host "📝 正在添加文件..." -ForegroundColor Cyan
    git add .

    Write-Host "✅ 正在提交: $commitMsg" -ForegroundColor Green
    git commit -m "$commitMsg"

    Write-Host "📤 正在获取分支并推送..." -ForegroundColor Yellow
    # 获取当前分支名称，并去除首尾空格
    $branch = (git branch --show-current).Trim()
    
    # 打印目标分支
    Write-Host "   目标分支: origin/$branch" -ForegroundColor DarkGray

    # 执行推送
    git push origin $branch --set-upstream

    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n🎉 [推送成功] 代码已同步到 GitHub!" -ForegroundColor Green
    } else {
        throw "Git push 返回了错误码"
    }
}
catch {
    Write-Host "`n❌ [操作失败] 发生错误：" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}