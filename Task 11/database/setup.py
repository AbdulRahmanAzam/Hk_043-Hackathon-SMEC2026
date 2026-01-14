#!/usr/bin/env python3
"""
BidYourSkill Database Setup Script
Connects to NeonDB and executes schema and seed SQL files
"""

import os
import sys
from pathlib import Path
import psycopg2
from psycopg2 import sql
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    print('❌ ERROR: DATABASE_URL not found in .env file')
    print('Please add your NeonDB connection string to .env:')
    print('DATABASE_URL=postgresql://user:password@host/database')
    sys.exit(1)

def read_sql_file(filename):
    """Read SQL file and return its contents"""
    file_path = Path(__file__).parent / filename
    with open(file_path, 'r', encoding='utf-8') as f:
        return f.read()

def execute_sql(cursor, sql_content, description):
    """Execute SQL and handle errors"""
    try:
        print(f'🔨 {description}...')
        cursor.execute(sql_content)
        print(f'✅ {description} completed successfully!')
        return True
    except Exception as e:
        print(f'❌ Error during {description}:')
        print(f'   {str(e)}')
        return False

def get_table_counts(cursor):
    """Get count of records in each table"""
    query = """
        SELECT 'Users' as table_name, COUNT(*) as count FROM users
        UNION ALL
        SELECT 'User Skills', COUNT(*) FROM user_skills
        UNION ALL
        SELECT 'Tasks', COUNT(*) FROM tasks
        UNION ALL
        SELECT 'Bids', COUNT(*) FROM bids
        UNION ALL
        SELECT 'Reviews', COUNT(*) FROM reviews
        UNION ALL
        SELECT 'Notifications', COUNT(*) FROM notifications
        ORDER BY table_name;
    """
    cursor.execute(query)
    return cursor.fetchall()

def main():
    """Main setup function"""
    # Check for --seed flag
    should_seed = '--seed' in sys.argv or '-s' in sys.argv
    
    # Show help
    if '--help' in sys.argv or '-h' in sys.argv:
        print("""
BidYourSkill Database Setup

Usage:
  python setup.py [options]

Options:
  --seed, -s     Seed the database with sample data
  --help, -h     Show this help message

Examples:
  python setup.py              # Create schema only
  python setup.py --seed       # Create schema and seed data
        """)
        return

    conn = None
    try:
        print('🔌 Connecting to NeonDB...')
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = False  # Use transactions
        cursor = conn.cursor()
        print('✅ Connected successfully!\n')

        # Read and execute schema
        print('📄 Reading schema.sql...')
        schema_sql = read_sql_file('schema.sql')
        
        if execute_sql(cursor, schema_sql, 'Creating database schema'):
            conn.commit()
            print()
        else:
            conn.rollback()
            sys.exit(1)

        # Seed data if requested
        if should_seed:
            print('📄 Reading seed.sql...')
            seed_sql = read_sql_file('seed.sql')
            
            if execute_sql(cursor, seed_sql, 'Seeding database with sample data'):
                conn.commit()
                print()
            else:
                conn.rollback()
                sys.exit(1)

        # Display summary
        print('📊 Database Summary:')
        print('-' * 40)
        counts = get_table_counts(cursor)
        for table_name, count in counts:
            print(f'  {table_name:<20} {count:>5} records')
        print('-' * 40)

        print('\n✨ Database setup complete!')
        print('\n📝 Next steps:')
        print('   1. Update your backend API to use this database')
        print('   2. Test authentication endpoints')
        print('   3. Verify CRUD operations for tasks and bids')

    except psycopg2.OperationalError as e:
        print('\n❌ Database connection failed:')
        print(f'   {str(e)}')
        print('\n💡 Tip: Check your DATABASE_URL in .env file')
        sys.exit(1)
    except psycopg2.errors.DuplicateTable as e:
        print('\n❌ Tables already exist!')
        print(f'   {str(e)}')
        print('\n💡 Tip: Run "python reset.py" first to drop existing tables')
        if conn:
            conn.rollback()
        sys.exit(1)
    except FileNotFoundError as e:
        print(f'\n❌ SQL file not found: {str(e)}')
        print('💡 Make sure schema.sql and seed.sql are in the database/ directory')
        sys.exit(1)
    except Exception as e:
        print(f'\n❌ Unexpected error: {str(e)}')
        if conn:
            conn.rollback()
        sys.exit(1)
    finally:
        if conn:
            cursor.close()
            conn.close()
            print('\n🔌 Database connection closed')

if __name__ == '__main__':
    main()
