import logging
from odoo import http
from odoo.http import request

_logger = logging.getLogger(__name__)

class PosLakipayController(http.Controller):

    @http.route('/payment/lakipay/pos/<int:tx_id>', type='http', auth='public', csrf=False)
    def lakipay_pos_checkout(self, tx_id, **kwargs):
        """
        This route is triggered when a customer scans the QR code from the POS screen.
        It redirects them to the LakiPay payment page or Odoo's payment status.
        """
        tx = request.env['payment.transaction'].sudo().browse(tx_id)
        if not tx.exists():
            return "Transaction not found"

        # Redirect to the standard Odoo payment status page
        # This page will show the payment options if not yet paid
        return request.redirect(f'/payment/status?transaction_id={tx.id}')

    @http.route('/payment/lakipay/pos_legacy/<int:tx_id>', type='http', auth='public', website=True, csrf=False)
    def lakipay_pos_legacy(self, tx_id, **kwargs):
        return request.redirect(f'/payment/lakipay/pos/{tx_id}')
