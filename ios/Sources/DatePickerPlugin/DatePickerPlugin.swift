import Capacitor
import Foundation

@objc(DatePickerPlugin)
public class DatePickerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "DatePickerPlugin"
    public let jsName = "DatePicker"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "present", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "presentRange", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hide", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPluginVersion", returnType: CAPPluginReturnPromise)
    ]

    private let implementation = DatePicker()
    private var baseOptions = DatePickerOptions()
    private var activeView: DatePickerView?
    private var activeCall: CAPPluginCall?
    private var activeIsRange = false

    override public func load() {
        baseOptions = DatePickerOptions.fromConfig(getConfig())
    }

    @objc func present(_ call: CAPPluginCall) {
        open(call, range: false)
    }

    @objc func presentRange(_ call: CAPPluginCall) {
        open(call, range: true)
    }

    @objc func hide(_ call: CAPPluginCall) {
        resolveActive(value: nil)
        call.resolve()
    }

    @objc func getPluginVersion(_ call: CAPPluginCall) {
        call.resolve([
            "version": implementation.getPluginVersion()
        ])
    }

    private func open(_ call: CAPPluginCall, range: Bool) {
        do {
            let options = try baseOptions.merged(with: call, range: range)
            resolveActive(value: nil)
            activeCall = call
            activeIsRange = options.range

            DispatchQueue.main.async {
                if options.range {
                    self.presentRangePicker(options)
                } else {
                    self.presentPicker(options) { date in
                        self.resolveActive(value: DateParser.format(date, options: options))
                    }
                }
            }
        } catch DatePickerError.parse(let message) {
            call.reject(message)
        } catch {
            call.reject(error.localizedDescription)
        }
    }

    private func presentRangePicker(_ options: DatePickerOptions) {
        let startOptions = options.clone()
        startOptions.mode = "date"
        startOptions.date = options.start ?? options.date
        startOptions.title = options.startTitle ?? options.title ?? "Start date"

        presentPicker(startOptions) { startDate in
            let endOptions = options.clone()
            endOptions.mode = "date"
            endOptions.date = options.end ?? startDate
            endOptions.min = [options.min, startDate].compactMap { $0 }.max()
            endOptions.title = options.endTitle ?? options.title ?? "End date"

            self.presentPicker(endOptions) { endDate in
                self.resolveActive(
                    start: DateParser.format(startDate, options: options),
                    end: DateParser.format(endDate, options: options)
                )
            }
        }
    }

    private func presentPicker(_ options: DatePickerOptions, completion: @escaping (Date) -> Void) {
        guard let parent = bridge?.viewController?.view else {
            activeCall?.reject("Unable to access viewController")
            activeCall = nil
            return
        }

        let pickerView = DatePickerView(options: options)
        activeView = pickerView
        pickerView.onDone = { [weak self, weak pickerView] date in
            pickerView?.dismiss {
                completion(date)
            }
            self?.activeView = nil
        }
        pickerView.onCancel = { [weak self, weak pickerView] in
            pickerView?.dismiss {
                self?.activeView = nil
                self?.resolveActive(value: nil)
            }
        }
        pickerView.present(in: parent)
    }

    private func resolveActive(value: String?) {
        guard let call = activeCall else {
            activeView?.dismiss()
            activeView = nil
            return
        }

        activeView?.dismiss()
        activeView = nil

        if activeIsRange {
            call.resolve([
                "start": NSNull(),
                "end": NSNull(),
                "value": NSNull()
            ])
        } else {
            call.resolve([
                "value": value ?? NSNull()
            ])
        }
        activeCall = nil
        activeIsRange = false
    }

    private func resolveActive(start: String, end: String) {
        guard let call = activeCall else {
            return
        }

        activeView?.dismiss()
        activeView = nil
        call.resolve([
            "start": start,
            "end": end,
            "value": "\(start)/\(end)"
        ])
        activeCall = nil
        activeIsRange = false
    }
}
