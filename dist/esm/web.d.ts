import { WebPlugin } from '@capacitor/core';
import type { DatePickerOptions, DatePickerPlugin, DatePickerRangeOptions, DatePickerRangeResult, DatePickerResult, PluginVersionResult } from './definitions';
export declare class DatePickerWeb extends WebPlugin implements DatePickerPlugin {
    private activePicker?;
    present(options?: DatePickerOptions): Promise<DatePickerResult>;
    presentRange(options?: DatePickerRangeOptions): Promise<DatePickerRangeResult>;
    hide(): Promise<void>;
    getPluginVersion(): Promise<PluginVersionResult>;
    private createOverlay;
    private openOverlay;
    private closeActive;
}
