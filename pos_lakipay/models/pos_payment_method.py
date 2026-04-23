from odoo import _, models
from odoo.exceptions import UserError
import time
from urllib.parse import urlparse

class PosPaymentMethod(models.Model):
    _inherit = 'pos.payment.method'

    def _get_payment_terminal_selection(self):
        return super(PosPaymentMethod, self)._get_payment_terminal_selection() + [('lakipay', 'LakiPay')]

    def _get_lakipay_public_base_url(self):
        icp = self.env['ir.config_parameter'].sudo()
        base_url = (
            icp.get_param('lakipay.public.base.url')
            or icp.get_param('web.base.url')
            or ''
        ).strip()
        if not base_url:
            raise UserError(
                _("Missing base URL for LakiPay QR links. Set 'lakipay.public.base.url' to a public URL.")
            )

        parsed = urlparse(base_url)
        host = (parsed.hostname or '').lower()
        if host in {'localhost', '127.0.0.1', '0.0.0.0'}:
            raise UserError(
                _(
                    "LakiPay QR URL is not public (%s). Set System Parameter "
                    "'lakipay.public.base.url' to your phone-reachable domain/IP."
                ) % base_url
            )
        return base_url.rstrip('/')

    def lakipay_create_qr(self, data):
        """Create a LakiPay payment transaction and return QR/payment URL for POS."""
        self.ensure_one()
        if self.use_payment_terminal != 'lakipay':
            raise UserError(_("This payment method is not configured for LakiPay."))

        provider = self.env['payment.provider'].sudo().search([
            ('code', '=', 'lakipay'),
            ('company_id', '=', self.company_id.id),
            ('state', 'in', ['enabled', 'test']),
        ], limit=1)
        if not provider:
            provider = self.env['payment.provider'].sudo().search([
                ('code', '=', 'lakipay'),
                ('state', 'in', ['enabled', 'test']),
            ], limit=1)
        if not provider:
            raise UserError(_("No active LakiPay payment provider found for this company."))

        payment_method = self.env.ref('payment_lakipay.payment_method_lakipay', raise_if_not_found=False)
        if not payment_method:
            payment_method = self.env['payment.method'].sudo().search([('code', '=', 'lakipay')], limit=1)
        if not payment_method:
            raise UserError(_("LakiPay payment method is missing. Please upgrade payment_lakipay."))

        amount = float((data or {}).get('amount') or 0.0)
        if amount <= 0:
            raise UserError(_("Amount must be greater than zero."))

        order_name = (data or {}).get('order_name') or _("POS Order")
        ts = int(time.time() % 1000000)
        tx_reference = self.env['payment.transaction']._compute_reference(
            'lakipay',
            prefix=f"{order_name}-POS-{ts}",
        )
        partner_id = (data or {}).get('partner_id') or self.env.company.partner_id.id
        phone_number = (data or {}).get('phone_number') or ''
        medium = (data or {}).get('medium') or 'TELEBIRR'

        tx = self.env['payment.transaction'].sudo().create({
            'provider_id': provider.id,
            'payment_method_id': payment_method.id,
            'reference': tx_reference,
            'amount': amount,
            'currency_id': self.env.company.currency_id.id,
            'partner_id': partner_id,
            'operation': 'online_direct',
            'lakipay_phone': phone_number,
            'lakipay_medium': medium,
        })

        base_url = self._get_lakipay_public_base_url()
        pos_checkout_url = f"{base_url}/payment/lakipay/pos/{tx.id}"

        # We no longer initiate the push-to-phone automatically here.
        # Instead, we just return the QR code. When the customer scans it,
        # they will be redirected to the payment page where they can pay.
        
        return {
            'reference': tx.reference,
            'transaction_id': tx.id,
            'qr_code': pos_checkout_url,
            'payment_url': pos_checkout_url,
        }

    def lakipay_get_status(self, transaction_id):
        """Fetch latest LakiPay state for a POS-created transaction."""
        self.ensure_one()
        tx = self.env['payment.transaction'].sudo().browse(int(transaction_id))
        if not tx.exists() or tx.provider_code != 'lakipay':
            return {'error': _("LakiPay transaction not found.")}

        # Pull a fresh state from LakiPay when possible.
        tx._lakipay_fetch_latest_status()

        # Map Odoo transaction states to POS-friendly states
        state_map = {
            'done': 'done',
            'cancel': 'cancel',
            'error': 'error',
            'draft': 'pending',
            'pending': 'pending',
            'authorized': 'pending',
        }
        mapped_state = state_map.get(tx.state, 'pending')

        return {
            'state': mapped_state,
            'message': tx.state_message or '',
            'reference': tx.reference,
            'lakipay_transaction_id': tx.lakipay_tx_id or '',
        }
