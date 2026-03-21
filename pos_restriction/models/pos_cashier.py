from odoo import models, fields, api


class ResUsers(models.Model):
    _inherit = 'res.users'

    pos_refund_full_access = fields.Boolean(
        string="POS Refund Full Access (Qty & Discount)",
        compute='_compute_pos_refund_access',
    )

    @api.depends('groups_id')
    def _compute_pos_refund_access(self):
        group = self.env.ref(
            'pos_restriction.group_pos_refund_full_access',
            raise_if_not_found=False
        )
        for user in self:
            user.pos_refund_full_access = group in user.groups_id if group else False

    @api.model
    def _load_pos_data_fields(self, config_id):
        fields = super()._load_pos_data_fields(config_id)
        fields.append('pos_refund_full_access')
        return fields


class HrEmployee(models.Model):
    _inherit = 'hr.employee'

    pos_refund_full_access = fields.Boolean(
        related='user_id.pos_refund_full_access',
        store=False,
    )

    @api.model
    def _load_pos_data_fields(self, config_id):
        fields = super()._load_pos_data_fields(config_id)
        fields.append('pos_refund_full_access')
        return fields