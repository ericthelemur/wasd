# NodeCG Speedcontrol uses Livesplit-Core to time things
# Livesplit core has a really annoying line: process.on("unhandledRejection", abort), which will make the program crash and flood the console on any unhandled promise
# I don't know of a good way to remove this line otherwise. This will just remove the line from the file
# I recommend running it on a fresh install and on updating nodecg-speedcontrol

(Get-Content .\bundles\nodecg-speedcontrol\node_modules\livesplit-core\livesplit_core.js).Replace('process["on"]("unhandledRejection",abort);', '').Replace('process["on"]("uncaughtException",(function(ex){if(!(ex instanceof ExitStatus)){throw ex}}));', '') | Set-Content .\bundles\nodecg-speedcontrol\node_modules\livesplit-core\livesplit_core.js
