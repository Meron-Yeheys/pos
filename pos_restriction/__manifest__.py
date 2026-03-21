{
    'name': 'POS Refund Restrict Custom',
    'version': '18.0.1.0.0',
    'category': 'Sales/Point of Sale',
    'summary': 'Hide quantity and discount in POS refund screen for cashiers',
    'depends': ['point_of_sale', 'hr'],
    'data': [
        'security/pos_refund_groups.xml',
        
    ],
    'assets': {
        'point_of_sale._assets_pos': [
            'pos_restriction/static/src/js/pos_refund_patch.js',
        ],
    },
    'installable': True,
    'application': False,
    'license': 'LGPL-3',
}