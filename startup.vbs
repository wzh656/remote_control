Dim wsh, fso, file
set wsh = WScript.CreateObject("WScript.Shell")
set fso = CreateObject("Scripting.FileSystemObject")

startPath = wsh.SpecialFolders("startup") & "\RemoteControl.vbs"
targetPath = wsh.CurrentDirectory & "\RemoteControl.exe"

if not fso.FileExists(startPath) then '未创建
	set file = fso.createtextfile( startPath )
	file.write "Dim wsh" & chr(13) & chr(10)
	file.write "Set wsh = CreateObject(""Wscript.Shell"")" & chr(13) & chr(10)
	file.write "wsh.run """"""" & targetPath & """"""", 0"
	file.close
end if