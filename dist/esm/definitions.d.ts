export type DatePickerMode = 'time' | 'date' | 'dateAndTime' | 'countDownTimer' | 'yearAndMonth' | 'range';
export type DatePickerTheme = 'light' | 'dark' | string;
export type DatePickerIosStyle = 'wheels' | 'inline' | 'compact' | 'automatic';
export interface DatePickerBaseOptions {
    /**
     * Output and custom input format. Common Unicode/Java patterns and Moment-style
     * aliases such as YYYY-MM-DD are accepted.
     *
     * @default "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
     */
    format?: string;
    /**
     * Locale identifier. If omitted, the device/browser locale is used.
     */
    locale?: string;
    /**
     * Picker mode.
     *
     * @default "dateAndTime"
     */
    mode?: DatePickerMode;
    /**
     * Picker theme.
     */
    theme?: DatePickerTheme;
    /**
     * IANA timezone identifier, GMT offset, or UTC. Date-only values stay on the
     * chosen calendar day instead of drifting across timezones.
     */
    timezone?: string;
    /**
     * Dialog title.
     */
    title?: string;
    /**
     * Done button text.
     *
     * @default "OK"
     */
    doneText?: string;
    /**
     * Cancel button text.
     *
     * @default "Cancel"
     */
    cancelText?: string;
    /**
     * Force a 24-hour time picker where the platform allows it.
     */
    is24h?: boolean;
    /**
     * Minute increment for time and dateAndTime modes. For example, 15 yields
     * 00, 15, 30, and 45.
     *
     * @default 1
     */
    minuteStep?: number;
    /**
     * Backward-compatible alias for minuteStep.
     *
     * @deprecated Use minuteStep.
     */
    steps?: number;
}
export interface DatePickerIosOptions extends DatePickerBaseOptions {
    /**
     * iOS picker style.
     *
     * @default "inline"
     */
    style?: DatePickerIosStyle;
    titleFontColor?: string;
    titleBgColor?: string;
    bgColor?: string;
    fontColor?: string;
    buttonBgColor?: string;
    buttonFontColor?: string;
    /**
     * Show date and time in one UIDatePicker when possible.
     */
    mergedDateAndTime?: boolean;
}
export interface DatePickerAndroidOptions extends DatePickerBaseOptions {
    /**
     * Android dialog theme resource name or built-in theme key.
     */
    theme?: DatePickerTheme;
}
export interface DatePickerOptions extends DatePickerBaseOptions {
    /**
     * Minimum selectable value.
     */
    min?: string;
    /**
     * Maximum selectable value.
     */
    max?: string;
    /**
     * Initial selected value.
     */
    date?: string;
    /**
     * Platform-specific iOS options override top-level options.
     */
    ios?: DatePickerIosOptions;
    /**
     * Platform-specific Android options override top-level options.
     */
    android?: DatePickerAndroidOptions;
}
export interface DatePickerRangeOptions extends DatePickerOptions {
    /**
     * Initial range start value.
     */
    start?: string;
    /**
     * Initial range end value.
     */
    end?: string;
    /**
     * Title used while choosing the start date.
     */
    startTitle?: string;
    /**
     * Title used while choosing the end date.
     */
    endTitle?: string;
}
export interface DatePickerResult {
    /**
     * Formatted value. Null means the picker was dismissed.
     */
    value: string | null;
}
export interface DatePickerRangeResult {
    /**
     * Formatted start value. Null means the picker was dismissed.
     */
    start: string | null;
    /**
     * Formatted end value. Null means the picker was dismissed.
     */
    end: string | null;
    /**
     * Convenience "start/end" value when both dates are selected.
     */
    value: string | null;
}
export interface PluginVersionResult {
    version: string;
}
export interface DatePickerPlugin {
    /**
     * Present the date picker.
     */
    present(options?: DatePickerOptions): Promise<DatePickerResult>;
    /**
     * Present a range picker. Native platforms use two native date selections;
     * web shows start and end controls in one dialog.
     */
    presentRange(options?: DatePickerRangeOptions): Promise<DatePickerRangeResult>;
    /**
     * Close the currently visible picker, if any.
     */
    hide(): Promise<void>;
    /**
     * Returns the platform implementation version marker.
     */
    getPluginVersion(): Promise<PluginVersionResult>;
}
