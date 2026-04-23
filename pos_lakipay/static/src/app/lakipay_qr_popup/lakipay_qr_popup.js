import { Component } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";

export class LakipayQrPopup extends Component {
    static template = "pos_lakipay.LakipayQrPopup";
    static components = { Dialog };
    static props = {
        close: Function,
        orderName: String,
        formattedAmount: String,
        phoneNumber: { type: String, optional: true },
        paymentUrl: { type: String, optional: true },
        qrImageUrl: { type: String, optional: true },
        confirm: { type: Function, optional: true },
        cancel: { type: Function, optional: true },
    };
}
