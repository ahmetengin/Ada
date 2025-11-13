"""Add user profile customization fields and activity logging

Revision ID: 001
Revises:
Create Date: 2025-11-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add user profile customization fields and create activity log table."""

    # Add password_hash column to users table
    op.add_column('users',
        sa.Column('password_hash', sa.String(length=255), nullable=True,
                 comment='Hashed password for user authentication'))

    # Add group column to users table
    op.add_column('users',
        sa.Column('group', sa.String(length=50), nullable=True,
                 comment="User group (e.g., 'Helm', 'Bridge', 'Engineering', 'Deck')"))

    # Create user_activity_logs table
    op.create_table('user_activity_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_unique_id', sa.String(length=255), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('activity_type', sa.String(length=50), nullable=False,
                 comment='Activity type (login, logout, watch_start, watch_end, event)'),
        sa.Column('description', sa.Text(), nullable=False,
                 comment='Human-readable description of the activity'),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True,
                 comment='Additional metadata about the activity'),
        sa.Column('location', postgresql.JSONB(astext_type=sa.Text()), nullable=True,
                 comment='Location data when activity occurred'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for user_activity_logs
    op.create_index('ix_user_activity_logs_created_at', 'user_activity_logs', ['created_at'])
    op.create_index('ix_user_activity_logs_id', 'user_activity_logs', ['id'])
    op.create_index('ix_user_activity_logs_tenant_id', 'user_activity_logs', ['tenant_id'])
    op.create_index('ix_user_activity_logs_tenant_unique_id', 'user_activity_logs', ['tenant_unique_id'])
    op.create_index('ix_user_activity_logs_updated_at', 'user_activity_logs', ['updated_at'])
    op.create_index('ix_user_activity_logs_user_id', 'user_activity_logs', ['user_id'])
    op.create_index('ix_user_activity_logs_activity_type', 'user_activity_logs', ['activity_type'])

    # Create composite indexes
    op.create_index('ix_user_activity_tenant_user', 'user_activity_logs', ['tenant_id', 'user_id'])
    op.create_index('ix_user_activity_tenant_type', 'user_activity_logs', ['tenant_id', 'activity_type'])
    op.create_index('ix_user_activity_user_created', 'user_activity_logs', ['user_id', 'created_at'])

    # Create unique constraint on tenant_unique_id
    op.create_index('ix_users_activity_tenant_unique', 'user_activity_logs',
                   ['tenant_id', 'tenant_unique_id'], unique=True)


def downgrade() -> None:
    """Remove user profile customization fields and activity log table."""

    # Drop user_activity_logs table and its indexes
    op.drop_index('ix_users_activity_tenant_unique', table_name='user_activity_logs')
    op.drop_index('ix_user_activity_user_created', table_name='user_activity_logs')
    op.drop_index('ix_user_activity_tenant_type', table_name='user_activity_logs')
    op.drop_index('ix_user_activity_tenant_user', table_name='user_activity_logs')
    op.drop_index('ix_user_activity_logs_activity_type', table_name='user_activity_logs')
    op.drop_index('ix_user_activity_logs_user_id', table_name='user_activity_logs')
    op.drop_index('ix_user_activity_logs_updated_at', table_name='user_activity_logs')
    op.drop_index('ix_user_activity_logs_tenant_unique_id', table_name='user_activity_logs')
    op.drop_index('ix_user_activity_logs_tenant_id', table_name='user_activity_logs')
    op.drop_index('ix_user_activity_logs_id', table_name='user_activity_logs')
    op.drop_index('ix_user_activity_logs_created_at', table_name='user_activity_logs')
    op.drop_table('user_activity_logs')

    # Remove columns from users table
    op.drop_column('users', 'group')
    op.drop_column('users', 'password_hash')
