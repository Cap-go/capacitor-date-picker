import Foundation
import UIKit

@objc public class DatePicker: NSObject {
    @objc public func getPluginVersion() -> String {
        return "ios"
    }
}

final class DatePickerView: UIView {
    let picker = UIDatePicker()

    var onDone: ((Date) -> Void)?
    var onCancel: (() -> Void)?

    private let options: DatePickerOptions
    private let panel = UIView()
    private let titleLabel = UILabel()
    private let doneButton = UIButton(type: .system)
    private let cancelButton = UIButton(type: .system)
    private let blur = UIVisualEffectView(effect: UIBlurEffect(style: .dark))
    private lazy var bottomConstraint = panel.bottomAnchor.constraint(equalTo: safeAreaLayoutGuide.bottomAnchor)
    private lazy var centerConstraint = panel.centerYAnchor.constraint(equalTo: centerYAnchor)

    init(options: DatePickerOptions) {
        self.options = options
        super.init(frame: .zero)
        build()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        return nil
    }

    func present(in parent: UIView) {
        translatesAutoresizingMaskIntoConstraints = false
        parent.addSubview(self)
        NSLayoutConstraint.activate([
            leadingAnchor.constraint(equalTo: parent.leadingAnchor),
            trailingAnchor.constraint(equalTo: parent.trailingAnchor),
            topAnchor.constraint(equalTo: parent.topAnchor),
            bottomAnchor.constraint(equalTo: parent.bottomAnchor)
        ])

        layoutIfNeeded()
        panel.alpha = 0
        if options.style == "inline" {
            panel.transform = CGAffineTransform(scaleX: 0.92, y: 0.92)
        } else {
            panel.transform = CGAffineTransform(translationX: 0, y: panel.bounds.height)
        }

        UIView.animate(withDuration: 0.22, delay: 0, options: [.curveEaseOut]) {
            self.panel.alpha = 1
            self.panel.transform = .identity
            self.blur.alpha = 1
        }
    }

    func dismiss(completion: (() -> Void)? = nil) {
        UIView.animate(withDuration: 0.2, delay: 0, options: [.curveEaseIn]) {
            self.panel.alpha = 0
            self.blur.alpha = 0
            self.panel.transform = self.options.style == "inline"
                ? CGAffineTransform(scaleX: 0.92, y: 0.92)
                : CGAffineTransform(translationX: 0, y: self.panel.bounds.height)
        } completion: { _ in
            self.removeFromSuperview()
            completion?()
        }
    }

    private func build() {
        backgroundColor = .clear
        blur.alpha = 0
        blur.translatesAutoresizingMaskIntoConstraints = false
        addSubview(blur)
        NSLayoutConstraint.activate([
            blur.leadingAnchor.constraint(equalTo: leadingAnchor),
            blur.trailingAnchor.constraint(equalTo: trailingAnchor),
            blur.topAnchor.constraint(equalTo: topAnchor),
            blur.bottomAnchor.constraint(equalTo: bottomAnchor)
        ])

        let tap = UITapGestureRecognizer(target: self, action: #selector(cancelTapped))
        blur.addGestureRecognizer(tap)

        configurePanel()
        configureTitle()
        configurePicker()
        configureButtons()
        configureTheme()
    }

    private func configurePanel() {
        panel.translatesAutoresizingMaskIntoConstraints = false
        panel.layer.cornerRadius = options.style == "inline" ? 12 : 0
        panel.layer.masksToBounds = true
        addSubview(panel)

        let width = options.style == "inline"
            ? panel.widthAnchor.constraint(lessThanOrEqualToConstant: 390)
            : panel.widthAnchor.constraint(equalTo: widthAnchor)
        width.priority = .required

        NSLayoutConstraint.activate([
            panel.centerXAnchor.constraint(equalTo: centerXAnchor),
            width
        ])

        if options.style == "inline" {
            centerConstraint.isActive = true
            panel.leadingAnchor.constraint(greaterThanOrEqualTo: leadingAnchor, constant: 16).isActive = true
            panel.trailingAnchor.constraint(lessThanOrEqualTo: trailingAnchor, constant: -16).isActive = true
        } else {
            bottomConstraint.isActive = true
        }
    }

    private func configureTitle() {
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.textAlignment = .center
        titleLabel.font = .preferredFont(forTextStyle: .headline)
        titleLabel.adjustsFontForContentSizeCategory = true
        titleLabel.text = titleText(for: picker.date)
        panel.addSubview(titleLabel)

        NSLayoutConstraint.activate([
            titleLabel.leadingAnchor.constraint(equalTo: panel.leadingAnchor, constant: 16),
            titleLabel.trailingAnchor.constraint(equalTo: panel.trailingAnchor, constant: -16),
            titleLabel.topAnchor.constraint(equalTo: panel.topAnchor, constant: 12),
            titleLabel.heightAnchor.constraint(greaterThanOrEqualToConstant: 28)
        ])
    }

    private func configurePicker() {
        picker.translatesAutoresizingMaskIntoConstraints = false
        picker.date = options.date ?? Date()
        picker.minimumDate = options.min
        picker.maximumDate = options.max
        picker.timeZone = options.timeZoneValue
        picker.locale = pickerLocale()
        var calendar = Calendar(identifier: .gregorian)
        calendar.locale = picker.locale
        calendar.timeZone = options.timeZoneValue
        picker.calendar = calendar
        picker.minuteInterval = options.minuteStep
        applyMode()
        applyStyle()
        picker.addTarget(self, action: #selector(dateChanged), for: .valueChanged)
        panel.addSubview(picker)

        NSLayoutConstraint.activate([
            picker.leadingAnchor.constraint(equalTo: panel.leadingAnchor, constant: 8),
            picker.trailingAnchor.constraint(equalTo: panel.trailingAnchor, constant: -8),
            picker.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 8)
        ])
    }

    private func configureButtons() {
        let separator = UIView()
        separator.translatesAutoresizingMaskIntoConstraints = false
        separator.backgroundColor = UIColor(white: 0.78, alpha: 1)

        let stack = UIStackView(arrangedSubviews: [cancelButton, doneButton])
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.axis = .horizontal
        stack.distribution = .fillEqually

        cancelButton.setTitle(options.cancelText, for: .normal)
        doneButton.setTitle(options.doneText, for: .normal)
        cancelButton.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        doneButton.addTarget(self, action: #selector(doneTapped), for: .touchUpInside)

        panel.addSubview(separator)
        panel.addSubview(stack)

        NSLayoutConstraint.activate([
            separator.leadingAnchor.constraint(equalTo: panel.leadingAnchor),
            separator.trailingAnchor.constraint(equalTo: panel.trailingAnchor),
            separator.topAnchor.constraint(equalTo: picker.bottomAnchor, constant: 8),
            separator.heightAnchor.constraint(equalToConstant: 1),
            stack.leadingAnchor.constraint(equalTo: panel.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: panel.trailingAnchor),
            stack.topAnchor.constraint(equalTo: separator.bottomAnchor),
            stack.heightAnchor.constraint(equalToConstant: 44),
            stack.bottomAnchor.constraint(equalTo: panel.safeAreaLayoutGuide.bottomAnchor)
        ])
    }

    private func configureTheme() {
        let dark = options.theme == "dark"
        let titleFont = UIColor(hex: options.titleFontColor) ?? (dark ? .white : .label)
        let titleBackground = UIColor(hex: options.titleBgColor) ?? (dark ? UIColor(white: 0.08, alpha: 1) : .systemBackground)
        let panelBackground = UIColor(hex: options.bgColor) ?? titleBackground
        let buttonBackground = UIColor(hex: options.buttonBgColor) ?? panelBackground
        let buttonFont = UIColor(hex: options.buttonFontColor) ?? (dark ? .white : .systemBlue)

        overrideUserInterfaceStyle = dark ? .dark : .light
        picker.overrideUserInterfaceStyle = dark ? .dark : .light
        if let fontColor = UIColor(hex: options.fontColor) {
            picker.setValue(fontColor, forKey: "textColor")
        }

        panel.backgroundColor = panelBackground
        titleLabel.textColor = titleFont
        titleLabel.backgroundColor = titleBackground
        cancelButton.backgroundColor = buttonBackground
        doneButton.backgroundColor = buttonBackground
        cancelButton.setTitleColor(buttonFont, for: .normal)
        doneButton.setTitleColor(buttonFont, for: .normal)
    }

    private func applyMode() {
        if options.mode == "yearAndMonth" {
            if #available(iOS 17.4, *) {
                picker.datePickerMode = .yearAndMonth
            } else {
                picker.datePickerMode = UIDatePicker.Mode(rawValue: 4269) ?? .date
            }
            return
        }

        if options.mode == "time" {
            picker.datePickerMode = .time
        } else if options.mode == "countDownTimer" {
            picker.datePickerMode = .countDownTimer
        } else if options.mode == "dateAndTime", options.mergedDateAndTime || options.style == "inline" {
            picker.datePickerMode = .dateAndTime
        } else {
            picker.datePickerMode = .date
        }
    }

    private func applyStyle() {
        switch options.style {
        case "wheels":
            picker.preferredDatePickerStyle = .wheels
        case "compact":
            picker.preferredDatePickerStyle = .compact
        case "automatic":
            picker.preferredDatePickerStyle = .automatic
        default:
            picker.preferredDatePickerStyle = .inline
        }
    }

    private func pickerLocale() -> Locale {
        if options.is24h && (options.mode == "time" || options.mode == "dateAndTime") {
            return Locale(identifier: "en_GB")
        }
        return options.localeValue
    }

    private func titleText(for date: Date) -> String {
        if let title = options.title {
            return title
        }

        let formatter = DateFormatter()
        formatter.locale = options.localeValue
        formatter.timeZone = options.timeZoneValue

        if options.mode == "time" {
            formatter.dateFormat = options.is24h ? "HH:mm" : "h:mm a"
        } else if options.mode == "yearAndMonth" {
            formatter.dateFormat = "LLLL yyyy"
        } else if options.mode == "date" || options.mode == "range" {
            formatter.dateStyle = .medium
        } else {
            formatter.dateFormat = options.is24h ? "EEE, MMM d, yyyy HH:mm" : "EEE, MMM d, yyyy h:mm a"
        }
        return formatter.string(from: date)
    }

    @objc private func dateChanged() {
        titleLabel.text = titleText(for: picker.date)
    }

    @objc private func doneTapped() {
        if options.mode == "dateAndTime",
           picker.datePickerMode == .date,
           !options.mergedDateAndTime,
           options.style != "inline" {
            let selected = picker.date
            picker.datePickerMode = .time
            picker.setDate(selected, animated: false)
            titleLabel.text = titleText(for: selected)
            return
        }

        onDone?(picker.date)
    }

    @objc private func cancelTapped() {
        onCancel?()
    }
}

private extension UIColor {
    convenience init?(hex: String?) {
        guard var hex, !hex.isEmpty else {
            return nil
        }
        if hex.hasPrefix("#") {
            hex.removeFirst()
        }
        guard hex.count == 6, let value = Int(hex, radix: 16) else {
            return nil
        }
        self.init(
            red: CGFloat((value >> 16) & 0xff) / 255,
            green: CGFloat((value >> 8) & 0xff) / 255,
            blue: CGFloat(value & 0xff) / 255,
            alpha: 1
        )
    }
}
