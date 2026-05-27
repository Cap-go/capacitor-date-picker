package app.capgo.datepicker;

import android.content.Context;

final class DatePickerTheme {

    private DatePickerTheme() {}

    static int get(String theme, Context context) {
        if (theme == null || theme.equals("light")) {
            return android.R.style.Theme_Material_Light_Dialog_Alert;
        }
        if (theme.equals("dark")) {
            return android.R.style.Theme_Material_Dialog_Alert;
        }
        if (theme.equals("spinnerLight")) {
            return android.R.style.Theme_Holo_Light_Dialog;
        }
        if (theme.equals("spinnerDark")) {
            return android.R.style.Theme_Holo_Dialog;
        }

        int resourceId = context.getResources().getIdentifier(theme, "style", context.getPackageName());
        return resourceId == 0 ? android.R.style.Theme_Material_Light_Dialog_Alert : resourceId;
    }
}
