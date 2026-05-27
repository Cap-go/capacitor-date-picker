package app.capgo.datepicker;

import android.app.AlertDialog;
import android.app.DatePickerDialog;
import android.app.Dialog;
import android.app.TimePickerDialog;
import android.content.Context;
import android.content.res.Configuration;
import android.view.ContextThemeWrapper;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.NumberPicker;
import android.widget.TimePicker;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

class DatePicker {

    private final DatePickerOptions options;
    private final Context context;
    private final Context localizedContext;
    private final int theme;
    private Dialog activeDialog;
    private DatePickerCallback activeCallback;

    DatePicker(DatePickerOptions options, Context context) {
        this.options = options;
        this.context = context;
        this.theme = DatePickerTheme.get(options.theme, context);
        this.localizedContext = localizedContext(context, options.localeValue(), theme);
    }

    void open(DatePickerCallback callback) {
        activeCallback = callback;

        if (options.range) {
            launchRange(callback);
            return;
        }

        if (options.mode.equals("time") || options.mode.equals("countDownTimer")) {
            launchTime(options.date == null ? new Date() : options.date, callback);
            return;
        }

        launchDate(
            options.title,
            options.date == null ? new Date() : options.date,
            options.min,
            options.max,
            (selectedDate) -> {
                if (options.mode.equals("dateAndTime")) {
                    launchTime(selectedDate, callback);
                } else {
                    callback.resolveValue(DateParser.format(selectedDate, options));
                }
            },
            callback
        );
    }

    void dismissActive(boolean resolve) {
        if (resolve && activeCallback != null) {
            activeCallback.resolveValue(null);
        }

        if (activeDialog != null) {
            activeDialog.dismiss();
            activeDialog = null;
        }
    }

    private void launchRange(DatePickerCallback callback) {
        Date initialStart = options.start == null ? options.date : options.start;
        launchDate(
            titleOrDefault(options.startTitle, options.title, "Start date"),
            initialStart == null ? new Date() : initialStart,
            options.min,
            options.max,
            (startDate) -> {
                Date minEnd = latest(options.min, startDate);
                Date initialEnd = options.end == null ? startDate : options.end;
                launchDate(
                    titleOrDefault(options.endTitle, options.title, "End date"),
                    initialEnd,
                    minEnd,
                    options.max,
                    (endDate) -> {
                        callback.resolveRange(DateParser.format(startDate, options), DateParser.format(endDate, options));
                    },
                    callback
                );
            },
            callback
        );
    }

    private void launchDate(String title, Date initialDate, Date min, Date max, DateSelection selection, DatePickerCallback callback) {
        Calendar calendar = calendar(initialDate);

        DatePickerDialog dialog = new DatePickerDialog(
            localizedContext,
            theme,
            (view, year, month, dayOfMonth) -> {
                Calendar selected = calendar(new Date());
                selected.set(Calendar.YEAR, year);
                selected.set(Calendar.MONTH, month);
                selected.set(Calendar.DAY_OF_MONTH, dayOfMonth);
                selected.set(Calendar.HOUR_OF_DAY, calendar.get(Calendar.HOUR_OF_DAY));
                selected.set(Calendar.MINUTE, calendar.get(Calendar.MINUTE));
                selected.set(Calendar.SECOND, calendar.get(Calendar.SECOND));
                selected.set(Calendar.MILLISECOND, calendar.get(Calendar.MILLISECOND));
                selection.onSelected(selected.getTime());
            },
            calendar.get(Calendar.YEAR),
            calendar.get(Calendar.MONTH),
            calendar.get(Calendar.DAY_OF_MONTH)
        );

        if (title != null) {
            dialog.setTitle(title);
        }
        if (min != null) {
            dialog.getDatePicker().setMinDate(min.getTime());
        }
        if (max != null) {
            dialog.getDatePicker().setMaxDate(max.getTime());
        }

        configureDialog(dialog, callback);
        showDialog(dialog);
    }

    private void launchTime(Date initialDate, DatePickerCallback callback) {
        Calendar calendar = calendar(initialDate);
        int minute = minuteForStep(calendar.get(Calendar.MINUTE), false).minute;

        TimePickerDialog dialog = new TimePickerDialog(
            localizedContext,
            theme,
            (view, hourOfDay, selectedMinute) -> {
                MinuteValue minuteValue = minuteForStep(selectedMinute, true);
                calendar.set(Calendar.HOUR_OF_DAY, (hourOfDay + minuteValue.hourCarry) % 24);
                calendar.set(Calendar.MINUTE, minuteValue.minute);
                calendar.set(Calendar.SECOND, 0);
                calendar.set(Calendar.MILLISECOND, 0);
                callback.resolveValue(DateParser.format(calendar.getTime(), options));
            },
            calendar.get(Calendar.HOUR_OF_DAY),
            minute,
            options.is24h
        );

        if (options.title != null) {
            dialog.setTitle(options.title);
        }

        dialog.setOnShowListener((view) -> {
            configureButtons(dialog, callback);
            applyMinuteStep(dialog, minute);
            fillDialogWidth(dialog);
        });
        dialog.setOnCancelListener((view) -> callback.resolveValue(null));
        showDialog(dialog);
    }

    private void configureDialog(DatePickerDialog dialog, DatePickerCallback callback) {
        dialog.setOnShowListener((view) -> {
            configureButtons(dialog, callback);
            fillDialogWidth(dialog);
        });
        dialog.setOnCancelListener((view) -> callback.resolveValue(null));
    }

    private void configureButtons(AlertDialog dialog, DatePickerCallback callback) {
        Button doneButton = dialog.getButton(Dialog.BUTTON_POSITIVE);
        Button cancelButton = dialog.getButton(Dialog.BUTTON_NEGATIVE);

        if (doneButton != null && options.doneText != null) {
            doneButton.setText(options.doneText);
        }
        if (cancelButton != null) {
            if (options.cancelText != null) {
                cancelButton.setText(options.cancelText);
            }
            cancelButton.setOnClickListener((view) -> {
                callback.resolveValue(null);
                dialog.dismiss();
            });
        }
    }

    private void showDialog(Dialog dialog) {
        activeDialog = dialog;
        dialog.setOnDismissListener((view) -> {
            if (activeDialog == dialog) {
                activeDialog = null;
            }
        });
        dialog.show();
    }

    private void fillDialogWidth(Dialog dialog) {
        Window window = dialog.getWindow();
        if (window != null) {
            window.setLayout(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.WRAP_CONTENT);
        }
    }

    private void applyMinuteStep(TimePickerDialog dialog, int initialMinute) {
        if (options.minuteStep <= 1) {
            return;
        }

        int minutePickerId = context.getResources().getIdentifier("minute", "id", "android");
        NumberPicker minutePicker = dialog.findViewById(minutePickerId);
        if (minutePicker == null) {
            return;
        }

        int[] values = minuteValues();
        String[] labels = new String[values.length];
        for (int i = 0; i < values.length; i++) {
            labels[i] = String.format(Locale.US, "%02d", values[i]);
        }

        int selectedIndex = nearestMinuteIndex(values, initialMinute);
        minutePicker.setDisplayedValues(null);
        minutePicker.setMinValue(0);
        minutePicker.setMaxValue(values.length - 1);
        minutePicker.setDisplayedValues(labels);
        minutePicker.setValue(selectedIndex);

        int timePickerId = context.getResources().getIdentifier("timePicker", "id", "android");
        TimePicker timePicker = dialog.findViewById(timePickerId);
        if (timePicker != null) {
            timePicker.setMinute(values[selectedIndex]);
        }

        minutePicker.setOnValueChangedListener((picker, oldValue, newValue) -> {
            if (timePicker != null) {
                timePicker.setMinute(values[newValue]);
            }
        });
    }

    private int[] minuteValues() {
        int length = Math.max(1, (int) Math.ceil(60d / options.minuteStep));
        int[] values = new int[length];
        for (int i = 0; i < length; i++) {
            values[i] = Math.min(59, i * options.minuteStep);
        }
        return values;
    }

    private int nearestMinuteIndex(int[] values, int minute) {
        int selectedIndex = 0;
        int smallestDistance = 60;
        for (int i = 0; i < values.length; i++) {
            int distance = Math.abs(values[i] - minute);
            if (distance < smallestDistance) {
                selectedIndex = i;
                smallestDistance = distance;
            }
        }
        return selectedIndex;
    }

    private MinuteValue minuteForStep(int minute, boolean roundUp) {
        if (options.minuteStep <= 1) {
            return new MinuteValue(minute, 0);
        }

        int snapped = roundUp
            ? Math.round((float) minute / options.minuteStep) * options.minuteStep
            : (minute / options.minuteStep) * options.minuteStep;
        if (snapped >= 60) {
            return new MinuteValue(0, 1);
        }
        return new MinuteValue(snapped, 0);
    }

    private Calendar calendar(Date date) {
        Calendar calendar = Calendar.getInstance(options.timeZoneValue(), options.localeValue());
        calendar.setTime(date);
        return calendar;
    }

    private Context localizedContext(Context base, Locale locale, int theme) {
        Configuration configuration = new Configuration(base.getResources().getConfiguration());
        configuration.setLocale(locale);
        ContextThemeWrapper wrapper = new ContextThemeWrapper(base, theme);
        wrapper.applyOverrideConfiguration(configuration);
        return wrapper;
    }

    private Date latest(Date first, Date second) {
        if (first == null) {
            return second;
        }
        return first.after(second) ? first : second;
    }

    private String titleOrDefault(String value, String fallback, String defaultValue) {
        if (value != null) {
            return value;
        }
        return fallback == null ? defaultValue : fallback;
    }

    private interface DateSelection {
        void onSelected(Date date);
    }

    private static final class MinuteValue {

        private final int minute;
        private final int hourCarry;

        private MinuteValue(int minute, int hourCarry) {
            this.minute = minute;
            this.hourCarry = hourCarry;
        }
    }
}
