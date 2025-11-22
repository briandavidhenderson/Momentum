@echo off
echo Setting Google Calendar Configuration for Firebase Functions...
echo.
echo Please enter your Google Client ID:
set /p CLIENT_ID=
echo.
echo Please enter your Google Client Secret:
set /p CLIENT_SECRET=
echo.
echo Setting configuration...
call firebase functions:config:set google.calendar.client_id="%CLIENT_ID%" google.calendar.client_secret="%CLIENT_SECRET%"
echo.
echo Configuration set. You may need to redeploy functions for changes to take effect:
echo npm run deploy:functions
echo.
pause
