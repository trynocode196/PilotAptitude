# Aviation Pilot Aptitude Screening Platform

Windows **native** desktop application (WPF + WebView2) inspired by COMPASS™.  
Keyboard-only controls with configurable key bindings. Full module suite.

## Modules

| Module | Status | Notes |
|--------|--------|--------|
| Introduction | MVP | Candidate registration |
| Memory | MVP | Short-term recall of A/S/H/R |
| Control | MVP | Compensatory tracking (needle + ball) |
| Mathematics | MVP | Timed aviation mental math |
| Slalom | Strong | Path tracking between markers |
| Orientation | Strong | Instrument → aircraft match |
| Task Manager | Complete | Autopilot updates + alerts |

## Requirements

- Windows 10/11
- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [WebView2 Evergreen Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) (usually preinstalled on Win11)

## Build & run

```bash
cd PilotAptitude
dotnet restore
dotnet build
dotnet run
```

Executable output:

`bin\Debug\net10.0-windows\PilotAptitude.exe`

## Keyboard settings

Open **Keys** in the app to rebind:

- Steer / track axes (left, right, up, down)
- Confirm
- Alert cancel 1–3

Defaults: Arrow keys + Enter + Digit1/2/3.

## Data storage

Candidate profile, key bindings, and results are stored locally in WebView localStorage (JSON export available on Results).

## Project layout

```
PilotAptitude/
  App.xaml / MainWindow.xaml   # WPF + WebView2 host
  wwwroot/                     # UI (HTML/CSS/JS modules)
  PilotAptitude.csproj
```

## Brief alignment (v2.0)

- Windows native executable
- Keyboard only (no joystick required)
- Configurable key bindings
- Practice + Assessment modes
- Results dashboard + local storage
- Minimum viable + full suite modules implemented
