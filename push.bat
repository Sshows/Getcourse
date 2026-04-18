@echo off
echo Starting GitHub push for GetCourse...
cd /d "%~dp0"
git remote remove origin
git remote add origin https://github.com/Sshows/Getcourse.git
git add .
git commit -m "feat: redesign securecourse UI with premium dark theme"
git branch -M main
git push -u origin main --force
echo.
echo All done! You can close this window and check Vercel.
pause
