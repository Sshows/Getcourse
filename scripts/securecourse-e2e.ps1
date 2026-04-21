$ErrorActionPreference = "Stop"

$workspace = "C:\Users\User\Documents\Playground\getcourse-clean"
$port = 3020
$baseUrl = "http://127.0.0.1:$port"
$apiBase = "$baseUrl/api/securecourse"
$tempUpload = Join-Path $workspace ".tmp-upload-video.mp4"

Set-Location $workspace

$job = Start-Job -ScriptBlock {
  param($jobWorkspace, $jobPort)
  Set-Location $jobWorkspace
  node .\node_modules\next\dist\bin\next start -p $jobPort -H 127.0.0.1
} -ArgumentList $workspace, $port

try {
  Start-Sleep -Seconds 8

  $health = Invoke-RestMethod -Uri "$baseUrl/api/health"

  try {
    $adminLogin = Invoke-RestMethod -Method Post -Uri "$apiBase/admin-auth/login" -ContentType "application/json" -Body (
      @{
        login = "manager"
        password = "secretpass"
      } | ConvertTo-Json
    )
  } catch {
    $adminLogin = Invoke-RestMethod -Method Post -Uri "$apiBase/admin-auth/login" -ContentType "application/json" -Body (
      @{
        login = "admin"
        password = "admin123"
      } | ConvertTo-Json
    )
  }

  $adminHeaders = @{
    "x-securecourse-admin-session" = $adminLogin.session.id
  }

  $stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
  $studentEmail = "student+$stamp@site.local"
  $studentPhone = "+7777$($stamp.ToString().Substring([Math]::Max(0, $stamp.ToString().Length - 7)))"
  $registeredEmail = "registered+$stamp@site.local"
  $registeredPhone = "+7999$($stamp.ToString().Substring([Math]::Max(0, $stamp.ToString().Length - 7)))"

  $createdUser = Invoke-RestMethod -Method Post -Uri "$apiBase/admin/users" -Headers $adminHeaders -ContentType "application/json" -Body (
    @{
      fullName = "Aruzhan Test"
      email = $studentEmail
      phone = $studentPhone
      role = "STUDENT"
      status = "ACTIVE"
    } | ConvertTo-Json
  )

  $course = Invoke-RestMethod -Method Post -Uri "$apiBase/admin/courses" -Headers $adminHeaders -ContentType "application/json" -Body (
    @{
      title = "Test Admission Course $stamp"
      slug = "test-admission-course-$stamp"
      shortDescription = "Admission roadmap"
      description = "Admission roadmap"
      status = "PUBLISHED"
    } | ConvertTo-Json
  )

  $lesson = Invoke-RestMethod -Method Post -Uri "$apiBase/admin/courses/$($course.id)/lessons" -Headers $adminHeaders -ContentType "application/json" -Body (
    @{
      title = "Essay Strategy"
      slug = "essay-strategy-$stamp"
      status = "PUBLISHED"
      content = "Lesson content"
    } | ConvertTo-Json
  )

  $null = Invoke-RestMethod -Method Post -Uri "$apiBase/admin/lessons/$($lesson.id)/materials" -Headers $adminHeaders -ContentType "application/json" -Body (
    @{
      title = "Checklist"
      type = "TEXT"
      content = "Essay checklist"
    } | ConvertTo-Json
  )

  $enrollment = Invoke-RestMethod -Method Post -Uri "$apiBase/admin/enrollments" -Headers $adminHeaders -ContentType "application/json" -Body (
    @{
      userId = $createdUser.id
      courseId = $course.id
      note = "Assigned in automated QA"
    } | ConvertTo-Json
  )

  $issued = Invoke-RestMethod -Method Post -Uri "$apiBase/admin/tokens/issue" -Headers $adminHeaders -ContentType "application/json" -Body (
    @{
      userId = $createdUser.id
      enrollmentId = $enrollment.id
      activationExpiresAt = (Get-Date).AddHours(2).ToString("o")
      note = "Issued in automated QA"
    } | ConvertTo-Json
  )

  $activated = Invoke-RestMethod -Method Post -Uri "$apiBase/auth/activate" -ContentType "application/json" -Body (
    @{
      token = $issued.token
      deviceId = "qa-web"
      deviceFingerprint = "qa-web"
      deviceLabel = "QA browser"
      userAgent = "QA"
    } | ConvertTo-Json
  )

  $studentHeaders = @{
    "x-securecourse-user-id" = $activated.user.id
    "x-securecourse-session-id" = $activated.session.id
  }

  $studentCourses = Invoke-RestMethod -Method Get -Uri "$apiBase/student/courses" -Headers $studentHeaders

  $playbackBeforeUploadError = $null
  try {
    Invoke-RestMethod -Method Post -Uri "$apiBase/student/lessons/$($lesson.id)/playback-access" -Headers $studentHeaders -ContentType "application/json" -Body "{}" | Out-Null
  } catch {
    $playbackBeforeUploadError = $_.ErrorDetails.Message
  }

  $uploadIntent = Invoke-RestMethod -Method Post -Uri "$apiBase/admin/videos/upload-intents" -Headers $adminHeaders -ContentType "application/json" -Body (
    @{
      lessonId = $lesson.id
      provider = "RAILWAY_LOCAL"
    } | ConvertTo-Json
  )

  [System.IO.File]::WriteAllBytes($tempUpload, [byte[]](0..255))
  $uploadJson = & curl.exe -sS -X POST ($baseUrl + $uploadIntent.uploadUrl) -H ("x-securecourse-admin-session: " + $adminLogin.session.id) -F ("file=@" + $tempUpload + ";type=video/mp4")
  $uploadPayload = $uploadJson | ConvertFrom-Json

  Start-Sleep -Seconds 2
  $uploads = Invoke-RestMethod -Method Get -Uri "$apiBase/admin/videos/assets" -Headers $adminHeaders
  $readyAsset = $uploads | Where-Object { $_.id -eq $uploadIntent.assetId } | Select-Object -First 1

  $playback = Invoke-RestMethod -Method Post -Uri "$apiBase/student/lessons/$($lesson.id)/playback-access" -Headers $studentHeaders -ContentType "application/json" -Body "{}"
  $videoResponse = Invoke-WebRequest -Method Get -Uri ($baseUrl + $playback.playback.manifestUrl) -Headers $studentHeaders -UseBasicParsing

  $registered = Invoke-RestMethod -Method Post -Uri "$apiBase/auth/register" -ContentType "application/json" -Body (
    @{
      fullName = "Dana Registered"
      email = $registeredEmail
      phone = $registeredPhone
      password = "StrongPass123"
    } | ConvertTo-Json
  )

  $verified = Invoke-RestMethod -Method Post -Uri "$apiBase/auth/verify" -ContentType "application/json" -Body (
    @{
      login = $registeredEmail
      emailCode = $registered.verification.email.previewCode
      smsCode = $registered.verification.sms.previewCode
    } | ConvertTo-Json
  )

  $studentLogin = Invoke-RestMethod -Method Post -Uri "$apiBase/auth/login" -ContentType "application/json" -Body (
    @{
      login = $registeredEmail
      password = "StrongPass123"
    } | ConvertTo-Json
  )

  $usersAfterRegistration = Invoke-RestMethod -Method Get -Uri "$apiBase/admin/users" -Headers $adminHeaders
  $registeredInAdmin = $usersAfterRegistration | Where-Object { $_.email -eq $registeredEmail } | Select-Object -First 1
  $activeSessions = Invoke-RestMethod -Method Get -Uri "$apiBase/admin/sessions" -Headers $adminHeaders
  $activatedSession = $activeSessions | Where-Object { $_.id -eq $activated.session.id } | Select-Object -First 1

  [pscustomobject]@{
    health = $health.ok
    adminLogin = $adminLogin.user.email
    createdUser = $createdUser.email
    createdUserPhone = $createdUser.phone
    course = $course.title
    lesson = $lesson.title
    enrollmentStatus = $enrollment.status
    tokenStatus = $issued.status
    tokenPreview = $issued.preview
    studentCourses = $studentCourses.Count
    playbackBeforeUploadError = $playbackBeforeUploadError
    uploadStatusAfterPost = $uploadPayload.asset.status
    uploadStatusFinal = $readyAsset.status
    playbackManifest = $playback.playback.manifestUrl
    videoStatusCode = $videoResponse.StatusCode
    registeredEmail = $registeredEmail
    registeredPreviewEmailCode = $registered.verification.email.previewCode
    registeredPreviewSmsCode = $registered.verification.sms.previewCode
    verifySession = $verified.session.id
    loginSession = $studentLogin.session.id
    adminSeesRegisteredStudent = [bool]$registeredInAdmin
    adminRegisteredStudentPhone = if ($registeredInAdmin) { $registeredInAdmin.phone } else { "" }
    adminRegisteredStudentStatus = if ($registeredInAdmin) { $registeredInAdmin.studentAccount.status } else { "" }
    adminRegisteredStudentVerified = if ($registeredInAdmin) { $registeredInAdmin.studentAccount.fullyVerified } else { $false }
    activeSessionIdleExpiresAt = if ($activatedSession) { $activatedSession.idleExpiresAt } else { "" }
  } | ConvertTo-Json -Depth 6
}
finally {
  Stop-Job $job -ErrorAction SilentlyContinue | Out-Null
  Remove-Job $job -Force -ErrorAction SilentlyContinue | Out-Null
  Remove-Item $tempUpload -Force -ErrorAction SilentlyContinue
}
