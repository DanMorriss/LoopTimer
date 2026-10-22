# Settings

## Stories

- **SET-1** As a user I want a dark, light or match-my-device theme.
- **SET-2** As a user I want to turn sound, vibration, and keeping the screen on, on or off.
- **SET-3** As a user I want to hear what each alarm sounds like before a workout.
- **SET-4** As a user I want to see and pick weights in kg or lb, whichever I lift in.
- **SET-5** As a user I want the body map to show a male or female figure, whichever I prefer.

## Rules

| Section      | Setting             | Default | Hint                                                          | Notes                                                                                      |
| ------------ | ------------------- | ------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Appearance   | Theme               | Dark    | —                                                             | Dark, Light or System. System follows the device, including when it changes.               |
| Appearance   | Body figure         | Male    | Shows which muscles an exercise works                         | Male or Female: the figure the body map draws (see [exercises](exercises.md)).             |
| Units        | Weight              | kg      | —                                                             | Kilograms (kg) or Pounds (lb). Weights are always saved in kg, so switching loses nothing. |
| Alarms       | Sound               | On      | Beeps as each phase starts                                    |                                                                                            |
| Alarms       | Vibration           | On      | Buzzes as each phase starts                                   | Disabled, saying "This device can't vibrate", where it can't.                              |
| Alarms       | Keep screen on      | On      | Stops the phone locking mid-workout                           | Disabled, saying "This browser can't keep the screen on", where it can't.                  |
| Alarm sounds | Timed, Rest, Finish | —       | Two short high beeps / One long low tone / Three rising notes | A Play button for each.                                                                    |
| Your data    | Export, Import      | —       | Your workouts and history are saved on this device only…      | Export backup and Import backup buttons; see [backup-and-sync](backup-and-sync.md).        |

- **Your equipment** and **Only what I have** are saved with the settings too, but set on the Exercises page (see [exercises](exercises.md#the-exercises-list-exr-6)), not here.
- Changes are **saved at once** and apply at once, mid-workout too (e.g. turning sound off silences alarms already booked).
- **Play** plays that alarm straight away, even with Sound turned off (it was asked for), without touching any booked alarms.
- Switching theme **fades** from one to the other, unless reduced motion is on, when it changes at once.

## Acceptance criteria

- Given a first visit, then the theme is Dark and every switch is on.
- Given I choose Light and reload, then Light is still chosen.
- Given System is chosen and the device switches to dark, then the app does too.
- Given Sound is off, when I press Play on Rest, then the rest alarm plays.
- Given saved settings are broken, then the defaults are used.
- Given weights in kg, when I choose Pounds, then a step saved at 61.235 kg shows as 135 lb on the workout and in setup.
- Given a first visit, then the body figure is Male; given I choose Female and reload, then Female is still chosen.

## Platform notes

- **Web:** `SettingsStore` (`src/app/shared/state/settings-store.service.ts`), `SettingsComponent` (`src/app/settings/`), `ThemeService`. Export and import: `BackupService` (`src/app/shared/backup/`).
- **iOS:** `@AppStorage` for each setting. The theme maps onto `preferredColorScheme` (nil for System). Vibration would always be available on an iPhone, so its disabled state goes.
