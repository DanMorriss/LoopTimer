/** Formats minutes and seconds as zero-padded `mm:ss`. */
export function formatTime(minutes: number, seconds: number): string {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
