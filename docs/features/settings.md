# Settings

## Stories

- **SET-1** As a user I want a dark, light or match-my-device theme.
- **SET-2** As a user I want to turn sound, vibration, and keeping the screen on, on or off.
- **SET-3** As a user I want to hear what each alarm sounds like before a workout.

## Rules

| Section      | Setting             | Default | Hint                                                          | Notes                                                                        |
| ------------ | ------------------- | ------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Appearance   | Theme               | Dark    | —                                                             | Dark, Light or System. System follows the device, including when it changes. |
| Alarms       | Sound               | On      | Beeps as each phase starts                                    |                                                                              |
| Alarms       | Vibration           | On      | Buzzes as each phase starts                                   | Disabled, saying "This device can't vibrate", where it can't.                |
| Alarms       | Keep screen on      | On      | Stops the phone locking mid-workout                           | Disabled, saying "This browser can't keep the screen on", where it can't.    |
| Alarm sounds | Timed, Rest, Finish | —       | Two short high beeps / One long low tone / Three rising notes | A Play button for each.                                                      |

- Changes are **saved at once** and apply at once, mid-workout too (e.g. turning sound off silences alarms already booked).
- **Play** plays that alarm straight away, even with Sound turned off (it was asked for), without touching any booked alarms.
- Switching theme **fades** from one to the other, unless reduced motion is on, when it changes at once.

## Acceptance criteria

- Given a first visit, then the theme is Dark and every switch is on.
- Given I choose Light and reload, then Light is still chosen.
- Given System is chosen and the device switches to dark, then the app does too.
- Given Sound is off, when I press Play on Rest, then the rest alarm plays.
- Given saved settings are broken, then the defaults are used.

## Platform notes

- **Web:** `SettingsStore` (`src/app/shared/state/settings-store.service.ts`), `SettingsComponent` (`src/app/settings/`), `ThemeService`.
- **iOS:** `@AppStorage` for each setting. The theme maps onto `preferredColorScheme` (nil for System). Vibration would always be available on an iPhone, so its disabled state goes.
