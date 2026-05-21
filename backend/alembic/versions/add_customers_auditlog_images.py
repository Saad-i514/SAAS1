"""add customers, audit_log, product images, supplier payment tracking

Revision ID: a1b2c3d4e5f6
Revises: add_production_indexes
Create Date: 2026-05-22

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = '9f22156fca55'
branch_labels = None
depends_on = None


def upgrade():
    # ── customers table ──────────────────────────────────────────────────────
    op.create_table(
        'customers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('company_id', sa.Integer(), sa.ForeignKey('companies.id'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('address', sa.String(), nullable=True),
        sa.Column('credit_limit', sa.Float(), nullable=True, server_default='0'),
        sa.Column('outstanding_balance', sa.Float(), nullable=True, server_default='0'),
        sa.Column('total_purchased', sa.Float(), nullable=True, server_default='0'),
        sa.Column('total_paid', sa.Float(), nullable=True, server_default='0'),
        sa.Column('status', sa.String(), nullable=True, server_default='Active'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_customers_id', 'customers', ['id'])
    op.create_index('ix_customers_company_id', 'customers', ['company_id'])
    op.create_index('ix_customers_name', 'customers', ['name'])
    op.create_index('ix_customers_status', 'customers', ['status'])

    # ── audit_logs table ─────────────────────────────────────────────────────
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('company_id', sa.Integer(), sa.ForeignKey('companies.id'), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('user_email', sa.String(), nullable=True),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('resource_type', sa.String(), nullable=False),
        sa.Column('resource_id', sa.String(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_audit_logs_id', 'audit_logs', ['id'])
    op.create_index('ix_audit_logs_company_id', 'audit_logs', ['company_id'])
    op.create_index('ix_audit_logs_action', 'audit_logs', ['action'])
    op.create_index('ix_audit_logs_resource_type', 'audit_logs', ['resource_type'])
    op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'])

    # ── products: add image_url ───────────────────────────────────────────────
    op.add_column('products', sa.Column('image_url', sa.String(), nullable=True))

    # ── suppliers: add payment tracking columns ───────────────────────────────
    op.add_column('suppliers', sa.Column('outstanding_balance', sa.Float(), nullable=True, server_default='0'))
    op.add_column('suppliers', sa.Column('payment_due_date', sa.DateTime(), nullable=True))
    op.add_column('suppliers', sa.Column('total_purchased', sa.Float(), nullable=True, server_default='0'))
    op.add_column('suppliers', sa.Column('total_paid', sa.Float(), nullable=True, server_default='0'))

    # ── transactions: add customer_id FK ─────────────────────────────────────
    op.add_column('transactions', sa.Column('customer_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_transactions_customer_id', 'transactions', 'customers', ['customer_id'], ['id'])
    op.create_index('ix_transactions_customer_id', 'transactions', ['customer_id'])


def downgrade():
    op.drop_index('ix_transactions_customer_id', 'transactions')
    op.drop_constraint('fk_transactions_customer_id', 'transactions', type_='foreignkey')
    op.drop_column('transactions', 'customer_id')

    op.drop_column('suppliers', 'total_paid')
    op.drop_column('suppliers', 'total_purchased')
    op.drop_column('suppliers', 'payment_due_date')
    op.drop_column('suppliers', 'outstanding_balance')

    op.drop_column('products', 'image_url')

    op.drop_index('ix_audit_logs_created_at', 'audit_logs')
    op.drop_index('ix_audit_logs_resource_type', 'audit_logs')
    op.drop_index('ix_audit_logs_action', 'audit_logs')
    op.drop_index('ix_audit_logs_company_id', 'audit_logs')
    op.drop_index('ix_audit_logs_id', 'audit_logs')
    op.drop_table('audit_logs')

    op.drop_index('ix_customers_status', 'customers')
    op.drop_index('ix_customers_name', 'customers')
    op.drop_index('ix_customers_company_id', 'customers')
    op.drop_index('ix_customers_id', 'customers')
    op.drop_table('customers')
