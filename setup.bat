@echo off
echo Устанавливаем необходимые зависимости (ThreeJS, Tailwind, TypeScript, Lucide)...
npm install three next-themes lucide-react clsx tailwind-merge typescript @types/node @types/react @types/three tailwindcss postcss autoprefixer
echo.
echo Инициализируем Tailwind CSS...
npx tailwindcss init -p
echo.
echo Все готово! Теперь можете запускать push.bat
pause
