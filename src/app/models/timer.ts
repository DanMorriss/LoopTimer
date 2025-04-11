export interface Timer {
    id: number;
    title: string;
    timerMinutes: number;
    timerSeconds: number;
    restMinutes: number;
    restSeconds: number;
    repeats: number;
    isTimerActive: boolean;
    isRestActive: boolean;
    isComplete: boolean;
}