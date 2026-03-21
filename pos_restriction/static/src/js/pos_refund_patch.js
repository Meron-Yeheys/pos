/** @odoo-module **/

import { PosOrderline } from "@point_of_sale/app/models/pos_order_line";
import { TicketScreen } from "@point_of_sale/app/screens/ticket_screen/ticket_screen";
import { patch } from "@web/core/utils/patch";
import { _t } from "@web/core/l10n/translation";

// 1. Block the "Refund" button in the Ticket Screen
patch(TicketScreen.prototype, {
    async onDoRefund() {
        const cashier = this.pos.get_cashier();
        const hasAccess = cashier?.pos_refund_full_access || false;

        console.log("[DEBUG] TicketScreen onDoRefund - Access:", hasAccess);

        if (!hasAccess) {
            this.pos.popup.add("ErrorPopup", {
                title: _t("Permission Denied"),
                body: _t("You do not have permission to process refunds. Please contact your manager."),
            });
            return;
        }
        return super.onDoRefund(...arguments);
    },
});

// 2. Block changing quantity or discount on existing refund lines
patch(PosOrderline.prototype, {
    set_quantity(quantity, keep_price) {
        // 'this.pos' is available on the orderline model in Odoo 18
        const cashier = this.pos.get_cashier();
        const hasAccess = cashier?.pos_refund_full_access || false;
        const isRefund = !!this.refunded_orderline_id;

        if (isRefund && !hasAccess && quantity !== 0) {
            this.pos.popup.add("ErrorPopup", {
                title: _t("Permission Denied"),
                body: _t("You are NOT allowed to change refund quantity."),
            });
            return; // Block the execution of super.set_quantity
        }

        return super.set_quantity(...arguments);
    },

    set_discount(discount) {
        const cashier = this.pos.get_cashier();
        const hasAccess = cashier?.pos_refund_full_access || false;
        const isRefund = !!this.refunded_orderline_id;

        if (isRefund && !hasAccess) {
            this.pos.popup.add("ErrorPopup", {
                title: _t("Permission Denied"),
                body: _t("You are NOT allowed to apply discount on refund."),
            });
            return;
        }

        return super.set_discount(...arguments);
    },
});