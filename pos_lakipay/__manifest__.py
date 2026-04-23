{
    'name': 'POS LakiPay Payment Terminal',
    'version': '1.0',
    'category': 'Sales/Point of Sale',
    'sequence': 6,
    'summary': 'Integrate LakiPay with the Point of Sale',
    'description': """
Allow LakiPay payments in the Point of Sale.
============================================
This module adds a LakiPay payment terminal to the POS.
When selected, it generates a QR code on the cashier screen
for the customer to scan and complete the payment.
""",
    'depends': ['point_of_sale', 'payment_lakipay', 'pos_restriction'],
    'data': [
        'views/pos_payment_method_views.xml',
    ],
    'assets': {
        'point_of_sale._assets_pos': [
            'web/static/lib/zxing-library/zxing-library.js',
            'pos_lakipay/static/src/app/lakipay_qr_popup/lakipay_qr_popup.js',
            'pos_lakipay/static/src/app/lakipay_qr_popup/lakipay_qr_popup.xml',
            'pos_lakipay/static/src/app/payment_lakipay.js',
        ],
    },
    'installable': True,
    'auto_install': False,
    'license': 'LGPL-3',
}
