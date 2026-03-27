"""add production indexes for performance

Revision ID: prod_indexes_001
Revises: ebacf00c6f22
Create Date: 2026-03-27 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'prod_indexes_001'
down_revision = 'ebacf00c6f22'
branch_labels = None
depends_on = None


def upgrade():
    # Add indexes for frequently queried columns
    op.create_index('ix_suppliers_company_id', 'suppliers', ['company_id'])
    op.create_index('ix_suppliers_status', 'suppliers', ['status'])
    
    op.create_index('ix_products_company_id', 'products', ['company_id'])
    op.create_index('ix_products_status', 'products', ['status'])
    
    op.create_index('ix_transactions_company_id', 'transactions', ['company_id'])
    op.create_index('ix_transactions_supplier_id', 'transactions', ['supplier_id'])
    op.create_index('ix_transactions_type', 'transactions', ['type'])
    op.create_index('ix_transactions_date', 'transactions', ['date'])
    op.create_index('ix_transactions_product_name', 'transactions', ['product_name'])
    op.create_index('ix_transactions_customer_name', 'transactions', ['customer_name'])
    
    # Composite indexes for common queries
    op.create_index('ix_transactions_company_type_date', 'transactions', ['company_id', 'type', 'date'])
    op.create_index('ix_products_company_status', 'products', ['company_id', 'status'])


def downgrade():
    # Remove indexes
    op.drop_index('ix_suppliers_company_id', 'suppliers')
    op.drop_index('ix_suppliers_status', 'suppliers')
    
    op.drop_index('ix_products_company_id', 'products')
    op.drop_index('ix_products_status', 'products')
    
    op.drop_index('ix_transactions_company_id', 'transactions')
    op.drop_index('ix_transactions_supplier_id', 'transactions')
    op.drop_index('ix_transactions_type', 'transactions')
    op.drop_index('ix_transactions_date', 'transactions')
    op.drop_index('ix_transactions_product_name', 'transactions')
    op.drop_index('ix_transactions_customer_name', 'transactions')
    
    op.drop_index('ix_transactions_company_type_date', 'transactions')
    op.drop_index('ix_products_company_status', 'products')
