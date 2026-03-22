/** @odoo-module **/

import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";
import { PosOrderline } from "@point_of_sale/app/models/pos_order_line";
import { TicketScreen } from "@point_of_sale/app/screens/ticket_screen/ticket_screen";
import { patch } from "@web/core/utils/patch";
import { _t } from "@web/core/l10n/translation";

// 1. Block the "Refund" button in the Ticket Screen for users without access
patch(TicketScreen.prototype, {
    async onDoRefund() {
        const cashier = this.pos.get_cashier();
        const hasAccess = cashier?.pos_refund_full_access || false;

        console.log("[POS Restriction] TicketScreen onDoRefund - Access:", hasAccess);

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

// 2. Block switching to "Price" mode in the ProductScreen numpad
patch(ProductScreen.prototype, {
    onNumpadClick(buttonValue) {
        if (buttonValue === 'price') {
            console.log("[POS Restriction] Price mode activation attempted – blocked");
            this.pos.popup.add("ErrorPopup", {
                title: _t("Permission Denied"),
                body: _t("You are NOT allowed to change the product price. Price must come from the product definition."),
            });
            return;
        }
        return super.onNumpadClick(...arguments);
    },
});

// 3. Block changing quantity or discount on existing refund lines, and ALWAYS block price changes
patch(PosOrderline.prototype, {
    set_quantity(quantity, keep_price) {
        const order = this.order;
        const pos = order?.pos;
        const current_cashier = pos?.get_cashier();
        const hasAccess = current_cashier?.pos_refund_full_access || false;
        
        // Detect refund line with: refunded_orderline_id OR current quantity < 0 OR new quantity < 0
        const isRefund = !!this.refunded_orderline_id || this.get_quantity() < 0 || quantity < 0;

        if (isRefund && !hasAccess && quantity !== 0) {
            console.log("[POS Restriction] Refund qty change attempted – blocked");
            if (pos && pos.popup) {
                pos.popup.add("ErrorPopup", {
                    title: _t("Permission Denied"),
                    body: _t("You are NOT allowed to change refund quantity."),
                });
            } else {
                 alert(_t("You are NOT allowed to change refund quantity."));
            }
            return;
        }
        
        if (!isRefund) {
             console.log("[POS Restriction] Normal qty change allowed");
        }

        return super.set_quantity(...arguments);
    },

    set_discount(discount) {
        const order = this.order;
        const pos = order?.pos;
        const current_cashier = pos?.get_cashier();
        const hasAccess = current_cashier?.pos_refund_full_access || false;
        const isRefund = !!this.refunded_orderline_id || this.get_quantity() < 0;

        if (isRefund && !hasAccess) {
            console.log("[POS Restriction] Refund discount change attempted – blocked");
            if (pos && pos.popup) {
                pos.popup.add("ErrorPopup", {
                    title: _t("Permission Denied"),
                    body: _t("You are NOT allowed to apply discount on refund."),
                });
            } else {
                alert(_t("You are NOT allowed to apply discount on refund."));
            }
            return;
        }

        return super.set_discount(...arguments);
    },

    set_unit_price(price) {
        const order = this.order;
        const pos = order?.pos;
        
        // Stricter price check: if it's manual (numpad) or any attempt to override existing price
        if (pos?.numpadMode === 'price' || (this.unit_price !== undefined && parseFloat(this.unit_price) !== parseFloat(price))) {
             console.log("[POS Restriction] Price change attempted (set_unit_price) – blocked");
             if (pos && pos.popup) {
                 pos.popup.add("ErrorPopup", {
                    title: _t("Permission Denied"),
                    body: _t("You are NOT allowed to change the product price. Price must come from the product definition."),
                });
             } else {
                 alert(_t("You are NOT allowed to change the product price."));
             }
             return;
        }
        return super.set_unit_price(...arguments);
    },

    set_price(price) {
        const order = this.order;
        const pos = order?.pos;
        if (pos?.numpadMode === 'price') {
             console.log("[POS Restriction] Price change attempted (set_price) – blocked");
             if (pos && pos.popup) {
                 pos.popup.add("ErrorPopup", {
                    title: _t("Permission Denied"),
                    body: _t("You are NOT allowed to change the product price. Price must come from the product definition."),
                });
             }
             return;
        }
        return super.set_price(...arguments);
    },
});
