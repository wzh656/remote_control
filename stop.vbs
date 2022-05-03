Dim wsh
Set wsh = CreateObject("Wscript.Shell")
wsh.run "taskkill /f /im RemoteControl.exe", 0