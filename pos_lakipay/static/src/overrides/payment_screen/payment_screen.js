/** @odoo-module **/

import { _t } from "@web/core/l10n/translation";
import { patch } from "@web/core/utils/patch";
import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";

patch(PaymentScreen.prototype, {
    async addNewPaymentLine(paymentMethod) {
        if (
            paymentMethod?.use_payment_terminal === "lakipay" &&
            this.currentOrder.get_orderlines().length === 0
        ) {
            this.dialog.add(AlertDialog, {
                title: _t("LakiPay"),
                body: _t("Add products first before requesting LakiPay payment."),
            });
            return false;
        }
        const result = await super.addNewPaymentLine(...arguments);
        if (result && paymentMethod?.use_payment_terminal === "lakipay") {
            const line = this.paymentLines.at(-1);
            if (line) {
                line.set_payment_status("pending");
            }
        }
        return result;
    },

    async _isOrderValid(isForceValidate) {
        const isValid = await super._isOrderValid(...arguments);
        if (!isValid) {
            return false;
        }

        const pendingLakipayLine = this.paymentLines.find(
            (line) =>
                line.payment_method_id?.use_payment_terminal === "lakipay" &&
                !["done", "reversed"].includes(line.get_payment_status())
        );
        if (pendingLakipayLine) {
            this.dialog.add(AlertDialog, {
                title: _t("LakiPay Payment Pending"),
                body: _t(
                    "Customer payment is still pending. Wait for LakiPay confirmation before validating."
                ),
            });
            return false;
        }

        return true;
    },
});
