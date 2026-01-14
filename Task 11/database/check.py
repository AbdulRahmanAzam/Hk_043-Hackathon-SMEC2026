#!/usr/bin/env python3
"""
Database Health Check Script
Verifies database connection and displays statistics
"""

import os
import sys
from pathlib import Path
import psycopg2
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    print('❌ ERROR: DATABASE_URL not found in .env file')
    sys.exit(1)

def main():
    """Check database health and display statistics"""
    conn = None
    try:
        print('🔌 Connecting to NeonDB...')
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        print('✅ Connected successfully!\n')

        # Check PostgreSQL version
        cursor.execute('SELECT version();')
        version = cursor.fetchone()[0]
        print(f'📦 PostgreSQL Version:')
        print(f'   {version}\n')

        # Check if tables exist
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()
        
        if not tables:
            print('⚠️  No tables found in database')
            print('💡 Run "python setup.py --seed" to create tables')
            return

        print(f'📋 Tables ({len(tables)}):')
        for (table_name,) in tables:
            print(f'   ✓ {table_name}')
        print()

        # Get record counts
        print('📊 Record Counts:')
        print('-' * 40)
        
        count_queries = {
            'Users': 'SELECT COUNT(*) FROM users',
            'User Skills': 'SELECT COUNT(*) FROM user_skills',
            'Tasks': 'SELECT COUNT(*) FROM tasks',
            'Bids': 'SELECT COUNT(*) FROM bids',
            'Reviews': 'SELECT COUNT(*) FROM reviews',
            'Notifications': 'SELECT COUNT(*) FROM notifications',
        }
        
        for name, query in count_queries.items():
            try:
                cursor.execute(query)
                count = cursor.fetchone()[0]
                print(f'  {name:<20} {count:>5} records')
            except psycopg2.Error:
                print(f'  {name:<20}  N/A (table may not exist)')
        
        print('-' * 40)

        # Get recent activity
        try:
            cursor.execute("""
                SELECT 
                    'Tasks' as type,
                    COUNT(*) as count,
                    MAX(created_at) as latest
                FROM tasks
                WHERE created_at > NOW() - INTERVAL '7 days'
                UNION ALL
                SELECT 
                    'Bids',
                    COUNT(*),
                    MAX(created_at)
                FROM bids
                WHERE created_at > NOW() - INTERVAL '7 days'
                ORDER BY type;
            """)
            recent = cursor.fetchall()
            
            if recent:
                print('\n📈 Recent Activity (Last 7 days):')
                for activity_type, count, latest in recent:
                    if latest:
                        latest_str = latest.strftime('%Y-%m-%d %H:%M')
                        print(f'   {activity_type}: {count} (Latest: {latest_str})')
                    else:
                        print(f'   {activity_type}: {count}')
        except psycopg2.Error:
            pass

        # Check indexes
        try:
            cursor.execute("""
                SELECT 
                    schemaname,
                    tablename,
                    COUNT(*) as index_count
                FROM pg_indexes
                WHERE schemaname = 'public'
                GROUP BY schemaname, tablename
                ORDER BY tablename;
            """)
            indexes = cursor.fetchall()
            
            if indexes:
                print('\n🔍 Indexes:')
                for schema, table, count in indexes:
                    print(f'   {table}: {count} indexes')
        except psycopg2.Error:
            pass

        print('\n✅ Database health check complete!')

    except psycopg2.OperationalError as e:
        print('\n❌ Database connection failed:')
        print(f'   {str(e)}')
        sys.exit(1)
    except Exception as e:
        print(f'\n❌ Health check failed: {str(e)}')
        sys.exit(1)
    finally:
        if conn:
            cursor.close()
            conn.close()
            print('🔌 Database connection closed')

if __name__ == '__main__':
    main()
