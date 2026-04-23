/** @odoo-module **/

import { _t } from "@web/core/l10n/translation";
import { PaymentInterface } from "@point_of_sale/app/payment/payment_interface";
import { register_payment_method } from "@point_of_sale/app/store/pos_store";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { LakipayQrPopup } from "@pos_lakipay/app/lakipay_qr_popup/lakipay_qr_popup";

export class PaymentLakipay extends PaymentInterface {
    setup() {
        super.setup(...arguments);
        this.dialog = this.pos.env.services.dialog;
        this.orm = this.pos.env.services.orm;
        this.notification = this.pos.env.services.notification;
    }

    get fast_payments() {
        return false;
    }

    async send_payment_request(cid) {
        await super.send_payment_request(cid);
        const order = this.pos.get_order();
        const line = order?.get_selected_paymentline();
        if (!line) {
            return false;
        }
        if (line.amount <= 0) {
            line.set_payment_status("retry");
            this.dialog.add(AlertDialog, {
                title: _t("LakiPay"),
                body: _t("Amount must be greater than zero."),
            });
            return false;
        }

        line.set_payment_status("waiting");
        const payload = {
            amount: line.amount,
            order_name: order.name,
            partner_id: order.get_partner()?.id || false,
            // Phone must be provided by the customer after scanning QR.
            phone_number: "",
            medium: "TELEBIRR",
        };

        try {
            const response = await this.orm.silent.call(
                "pos.payment.method",
                "lakipay_create_qr",
                [[line.payment_method_id.id], payload]
            );

            if (!response || response.error) {
                line.set_payment_status("retry");
                this.dialog.add(AlertDialog, {
                    title: _t("LakiPay Error"),
                    body: response?.error || _t("Failed to initiate LakiPay payment."),
                });
                return false;
            }

            let wasCancelled = false;
            const paymentUrl = response.qr_code || response.payment_url || "";
            const qrImageUrl = paymentUrl
                ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(paymentUrl)}`
                : "";
            // Show the QR code popup (inherits from ConfirmationDialog)
            const closeQrPopup = this.dialog.add(LakipayQrPopup, {
                formattedAmount: `${line.amount} Br`,
                orderName: order.name,
                phoneNumber: "",
                paymentUrl,
                qrImageUrl,
                confirm: () => {
                    // "I have paid" button clicked
                    // We don't return true here yet, we let polling finish or 
                    // we could force a final check.
                },
                cancel: () => {
                    wasCancelled = true;
                    line.set_payment_status("retry");
                }
            });

            const isPaid = await this._waitForLakipayPayment(response.transaction_id, line);
            if (!wasCancelled) {
                closeQrPopup();
            }

            if (isPaid) {
                line.set_payment_status("done");
                this._notifyPaymentValidated(order?.name);
                return true;
            }
            line.set_payment_status("retry");
            return false;
        } catch (error) {
            line.set_payment_status("retry");
            this.dialog.add(AlertDialog, {
                title: _t("LakiPay Error"),
                body: error?.message || _t("Could not contact Odoo server."),
            });
            return false;
        }
    }



    send_payment_cancel(order, cid) {
        const line = this._getLineByCid(cid);
        if (line) {
            line.set_payment_status("retry");
        }
        return super.send_payment_cancel(order, cid);
    }


    _getLineByCid(cid) {
        const order = this.pos.get_order();
        return order?.payment_ids?.find((paymentLine) => paymentLine.cid === cid);
    }
    //this function is used to wait for the payment to be completed so we can check the status of the payment
    // also this is what helps me to poopup the qr but stay until lpayment is done in lakipay

    async _waitForLakipayPayment(transactionId, trackedLine) {
        if (!transactionId) {
            this.dialog.add(AlertDialog, {
                title: _t("LakiPay Error"),
                body: _t("Missing transaction ID for status tracking."),
            });
            return false;
        }

        const maxPolls = 240; // ~4 minutes at 1s interval
        for (let i = 0; i < maxPolls; i++) {
            const line = trackedLine;
            if (!line) {
                return false;
            }
            if (line.get_payment_status() === "retry") {
                return false;
            }

            const result = await this.orm.silent.call(
                "pos.payment.method",
                "lakipay_get_status",
                [[line.payment_method_id.id], transactionId]
            );
            if (result?.error) {
                this.dialog.add(AlertDialog, {
                    title: _t("LakiPay Error"),
                    body: result.error,
                });
                return false;
            }
            if (result?.state === "done") {
                return true;
            }
            if (["cancel", "error"].includes(result?.state)) {
                this.dialog.add(AlertDialog, {
                    title: _t("LakiPay"),
                    body: result?.message || _t("Payment was canceled or failed."),
                });
                return false;
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        this.dialog.add(AlertDialog, {
            title: _t("LakiPay"),
            body: _t("Payment is still pending. Please try again after confirming payment."),
        });
        return false;
    }

    _notifyPaymentValidated(orderName) {
        const body = orderName
            ? _t("Payment validated for %s.", orderName)
            : _t("Payment validated.");
        if (this.notification?.add) {
            this.notification.add(body, { type: "success" });
            return;
        }
        this.dialog.add(AlertDialog, {
            title: _t("LakiPay"),
            body,
        });
    }

    close() {
        super.close();
    }
}

register_payment_method("lakipay", PaymentLakipay);
