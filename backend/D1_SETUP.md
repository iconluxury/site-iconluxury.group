# Cloudflare D1 Setup for S3 Configuration

To use Cloudflare D1 for storing S3 configurations, you need to set up the following environment variables in your `.env` file (or backend environment):

```bash
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_D1_DATABASE_ID=your_database_id
CLOUDFLARE_API_TOKEN=your_api_token
```

## 1. Create D1 Database

If you haven't created a D1 database yet, you can do so using `wrangler`:

```bash
npx wrangler d1 create iconluxury-s3-config
```

This will output the `database_id`.

## 2. Create API Token

Create an API Token in the Cloudflare Dashboard with permissions to access D1.
- Go to My Profile > API Tokens
- Create Token
- Template: Edit Cloudflare Workers (or Custom)
- Permissions: Account > D1 > Edit

## 3. Initialize Database Schema

Run the following SQL command in your D1 database to create the `S3Configuration` table. You can use the Cloudflare Dashboard or `wrangler`:

```bash
npx wrangler d1 execute iconluxury-s3-config --command "CREATE TABLE IF NOT EXISTS S3Configuration (id TEXT PRIMARY KEY, name TEXT UNIQUE, bucket_name TEXT, endpoint_url TEXT, region_name TEXT, access_key_id TEXT, secret_access_key TEXT);"
```

## 4. Update Environment Variables

Add the variables to your `.env` file.
