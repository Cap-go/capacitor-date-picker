import UIKit

enum DatePickerTheming {
    static func applyFontColor(_ color: UIColor, to picker: UIDatePicker) {
        picker.tintColor = color
        applyLabelTextColor(color, in: picker)
    }

    static func applyLabelTextColor(_ color: UIColor, in view: UIView) {
        if let label = view as? UILabel {
            label.textColor = color
        }
        for subview in view.subviews {
            applyLabelTextColor(color, in: subview)
        }
    }
}
