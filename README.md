# LoopTimer

## Overview

LoopTimer is a customizable interval timer designed to help with tasks that require timed repetitions, such as workouts, study sessions, or other structured activities. It allows users to create timers with adjustable durations for exercises and breaks, set specific repetition cycles, or run timers indefinitely.

The app focuses on usability and flexibility, offering features like different alarm notifications for each interval, progress tracking, and the ability to save and reuse custom timers.

## User Stories

1. As a user I want to be able to create an alarm telling me when to start and end a 'x' second exercise with a 'y' second break that repeats 'z' times.

2. As a user I want to be able to create an alarm telling me when to start and end a 'x' second exercise with a 'y' second break that repeats until I turn it off manually.

3. As a user I want to be able to set different notifications for each different interval of time so I know when I am entering a different period of time.

4. As a user I want the timers to continue if my phone screen locks so I can workout with my phone in my pocket.

5. As a user I want to be able to see the alarms I have created in the past so I can reuse them.

## Core Features

- Custom Alarms:
    - Allow users to configure multiple alarms with specific durations (e.g., 30 seconds, then 45 seconds).
        - Support for cycles: The sequence repeats a specified number of times.
        - Support for ongoing timers (no specified number of loops)
    - Alarm Notifications:
        - Trigger different visual, audio, or vibration feedback for each alarm.
    - Cycle Tracking:
        - Display the current cycle and total cycles remaining.
- Library of Alarms:
    - Allow users to save alarms
    - Allow users to reuse alarms
    - Allow users to edit/delete alarms

## High-Level Architecture

### Components

1. Timer Setup Component:
    - UI for users to configure alarm durations and cycles.
    - Form inputs for time intervals and cycle count.
    - Option to save or reset configurations.
2. Timer Display Component:
    - Displays the current countdown and cycle progress.
    - Buttons for starting, pausing, and resetting the timer.
3. Timer Library Component:
    - List of saved timers
    - Ability to edit/delete existing timers


## Wireframes

### Descriptions

1. Home Screen
    - Purpose: Landing page with title and links to other screens
    - Sections:
        - Header: Title and navigation button.
        - List of pages:
            - Set Timer
            - Timer Library
            - Settings
    

2. Setup Screen
    - Purpose: Configure timers and cycles.
    - Sections:
        - Header: App name and navigation button.
        - Alarm Configuration:
            - Add multiple intervals with a "+ Add Interval" button.
            - Each interval has a duration input (in seconds/minutes) and a delete icon.
        - Cycle Input: Input to set the number of cycles.
            - A button for infinite loop that once selected will disable cycle input
        - Controls: "Start Timer", "Reset" and "Save" buttons.
    
3. Save Modal
    - Purpose: Save a timer to the library.
    - Sections:
        - Name input
        - "Save" and "Cancel" buttons

4. Active Timer Screen
    - Purpose: Display the active timer and cycle progress.
    - Sections:
        - Header: Current screen title (e.g., "Active Timer").
        - Timer Display:
            - Big countdown timer showing the current interval's remaining time.
            - Smaller text showing the current interval and cycle (e.g., "Interval 2 of 3, Cycle 1 of 5").
        - Progress Bar: Visual indicator of the overall progress through cycles and intervals.
        - Controls:
            - Pause/Resume button.
            - Stop button to reset the timer.
            - Save button.

5. Timer Library Screen
    - Purpose: Allow users to view all their saved timers.
    - Sections:
        - Header: App name and navigation button.
        - List of saved timers:
            - "Edit" and "Delete" buttons

6. Confirm Delete Timer Modal
    - Purpose: Confirming the user wants to delete a timer.
    - Sections:
        - "Do you want to delete the timer {name}?" text.
        - "Yes" and "No" buttons.

5. Settings Screen (Optional)
    - Purpose: Allow users to customize notifications and theme.
    - Sections:
        - Default Alarm Order
            - A list of sound titles that can dragged to reorder.
            - A play button to hear the alarm sound.
        - Theme Selection:
            - Light/Dark mode toggle.
        - Other Settings:
            - Enable/disable vibration.

5. History Screen (Optional)
    - Purpose: Log of completed timer cycles.
    - Sections:
        - Header: Screen title (e.g., "Timer History").
        - List of Logs:
            - Each entry shows the start time, number of cycles, and total duration.
            - Option to delete logs.


--------

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.1.4.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
