#!/usr/bin/env python3
"""
Database Reset Script
Drops all tables and recreates the schema
"""

import os
import sys
from pathlib import Path
import psycopg2
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    print('❌ ERROR: DATABASE_URL not found in .env file')
    sys.exit(1)

def main():
    """Reset database by dropping all tables"""
    conn = None
    try:
        print('🔌 Connecting to NeonDB...')
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cursor = conn.cursor()
        print('✅ Connected successfully!\n')

        print('⚠️  WARNING: This will delete ALL data in the database!')
        
        # Confirm before proceeding (skip if --force flag is used)
        if '--force' not in sys.argv and '-f' not in sys.argv:
            response = input('Are you sure you want to continue? (yes/no): ')
            if response.lower() not in ['yes', 'y']:
                print('❌ Reset cancelled')
                return

        print('🗑️  Dropping all tables...')

        # Drop all tables in correct order
        drop_sql = """
            DROP TABLE IF EXISTS notifications CASCADE;
            DROP TABLE IF EXISTS transactions CASCADE;
            DROP TABLE IF EXISTS messages CASCADE;
            DROP TABLE IF EXISTS reviews CASCADE;
            DROP TABLE IF EXISTS bids CASCADE;
            DROP TABLE IF EXISTS tasks CASCADE;
            DROP TABLE IF EXISTS user_skills CASCADE;
            DROP TABLE IF EXISTS users CASCADE;
            
            -- Drop views
            DROP VIEW IF EXISTS tasks_with_poster CASCADE;
            DROP VIEW IF EXISTS user_portfolio CASCADE;
            DROP VIEW IF EXISTS user_stats CASCADE;
            
            -- Drop function
            DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
            
            -- Drop extension if needed
            DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;
        """

        cursor.execute(drop_sql)
        print('✅ All tables, views, and functions dropped successfully!\n')
        print('💡 Run "python setup.py --seed" to recreate the database with sample data')

    except psycopg2.OperationalError as e:
        print('\n❌ Database connection failed:')
        print(f'   {str(e)}')
        sys.exit(1)
    except Exception as e:
        print(f'\n❌ Reset failed: {str(e)}')
        sys.exit(1)
    finally:
        if conn:
            cursor.close()
            conn.close()
            print('🔌 Database connection closed')

if __name__ == '__main__':
    main()
