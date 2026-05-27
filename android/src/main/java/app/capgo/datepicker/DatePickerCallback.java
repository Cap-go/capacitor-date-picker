package app.capgo.datepicker;

interface DatePickerCallback {
    void resolveValue(String value);

    void resolveRange(String start, String end);

    void reject(String message);
}
