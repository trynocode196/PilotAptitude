# Pilot Aptitude Screening Platform

Modern web-based pilot aptitude assessment inspired by COMPASS™ (EPST). Built with **ASP.NET Core Razor Pages** (.NET 10).

## Features

- **Landing page** — overview of Memory and Control modules
- **MEMORY** — short-term recall of altitude, speed, heading, radio (practice + assessment)
- **CONTROL** — compensatory tracking with turbulence drift (keyboard / mouse / gamepad)
- **Results dashboard** — accuracy, time-on-target, charts, session history
- **Local scoring** — results stored in browser `localStorage` (exportable JSON)
- Aviation-inspired dark instrument UI, desktop + tablet friendly

## Requirements

- [.NET 10 SDK](https://dotnet.microsoft.com/download)

## Run

```bash
cd PilotAptitude
dotnet run --launch-profile http
```

Open **http://localhost:5234**

HTTPS profile (optional):

```bash
dotnet run --launch-profile https
```

## Modules

| Module  | Practice mode        | Assessment mode                          |
|---------|---------------------|------------------------------------------|
| Memory  | Unlimited rounds    | 8 rounds, shorter display, more blanks   |
| Control | 45s run             | 75s run, stronger drift                  |

### Memory scoring
- % correct across blanked fields
- Average recall time (ms)

### Control scoring
- Time-on-target %
- Mean absolute deviation from center
- Correction count (input onset edges)

## Project layout

```
PilotAptitude/
  Pages/           # Razor pages (Index, Memory, Control, Results)
  wwwroot/css/     # Aviation UI styles
  wwwroot/js/      # memory.js, control.js, scoring.js, results.js
```

## Stretch included

- Practice vs assessment modes
- Gamepad API support (optional joystick)
- JSON export of results history

## Design notes

Dark instrument panels with cyan/amber/green accents (PFD-inspired). Canvas + `requestAnimationFrame` for Control physics; noise-based drift with keyboard/WASD and pointer input.
