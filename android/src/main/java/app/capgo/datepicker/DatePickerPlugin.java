package app.capgo.datepicker;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.text.ParseException;

@CapacitorPlugin(name = "DatePicker")
public class DatePickerPlugin extends Plugin {

    private DatePickerOptions options;
    private DatePicker activePicker;

    @Override
    public void load() {
        options = DatePickerOptions.fromConfig(getConfig());
    }

    @PluginMethod
    public void present(PluginCall call) {
        open(call, false);
    }

    @PluginMethod
    public void presentRange(PluginCall call) {
        open(call, true);
    }

    @PluginMethod
    public void hide(PluginCall call) {
        if (activePicker != null) {
            activePicker.dismissActive(true);
            activePicker = null;
        }
        call.resolve();
    }

    @PluginMethod
    public void getPluginVersion(PluginCall call) {
        JSObject response = new JSObject();
        response.put("version", "android");
        call.resolve(response);
    }

    private void open(PluginCall call, boolean range) {
        try {
            if (activePicker != null) {
                activePicker.dismissActive(true);
                activePicker = null;
            }

            DatePickerOptions callOptions = options.copyWithCall(call, range);
            activePicker = new DatePicker(callOptions, getActivity());
            activePicker.open(new Callback(call, range));
        } catch (ParseException exception) {
            call.reject(exception.getMessage());
        }
    }

    private final class Callback implements DatePickerCallback {

        private final PluginCall call;
        private final boolean range;

        private Callback(PluginCall call, boolean range) {
            this.call = call;
            this.range = range;
        }

        @Override
        public void resolveValue(String value) {
            JSObject response = new JSObject();
            if (range) {
                response.put("start", JSObject.NULL);
                response.put("end", JSObject.NULL);
                response.put("value", JSObject.NULL);
            } else {
                response.put("value", value == null ? JSObject.NULL : value);
            }
            activePicker = null;
            call.resolve(response);
        }

        @Override
        public void resolveRange(String start, String end) {
            JSObject response = new JSObject();
            response.put("start", start == null ? JSObject.NULL : start);
            response.put("end", end == null ? JSObject.NULL : end);
            response.put("value", start == null || end == null ? JSObject.NULL : start + "/" + end);
            activePicker = null;
            call.resolve(response);
        }

        @Override
        public void reject(String message) {
            activePicker = null;
            call.reject(message);
        }
    }
}
