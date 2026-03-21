/** @odoo-module **/

import { PosOrderline } from "@point_of_sale/app/models/pos_order_line";
import { patch } from "@web/core/utils/patch";
import { _t } from "@web/core/l10n/translation";

patch(PosOrderline.prototype, {
    set_quantity(quantity, keep_price) {
        const cashier = window.posmodel?.get_cashier();
        const hasAccess = cashier?.pos_refund_full_access || false;

        const isRefund = !!this.refunded_orderline_id;

        console.log("[DEBUG][QTY] Refund:", isRefund, "Access:", hasAccess);

        if (isRefund && !hasAccess) {
            return {
                title: _t("Permission Denied"),
                body: _t("You are NOT allowed to change refund quantity."),
            };
        }

        return super.set_quantity(...arguments);
    },

    set_discount(discount) {
        const cashier = window.posmodel?.get_cashier();
        const hasAccess = cashier?.pos_refund_full_access || false;

        const isRefund = !!this.refunded_orderline_id;

        console.log("[DEBUG][DISC] Refund:", isRefund, "Access:", hasAccess);

        if (isRefund && !hasAccess) {
            alert(_t("You are NOT allowed to apply discount on refund."));
            return;
        }

        return super.set_discount(...arguments);
    },
});