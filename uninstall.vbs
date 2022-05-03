Dim wsh, fs
set wsh = WScript.CreateObject("WScript.Shell")
set fs = WScript.CreateObject("Scripting.FileSystemObject")
set file = fs.getFile(wsh.SpecialFolders("startup") & "\RemoteControl.vbs")
fs.deleteFile file